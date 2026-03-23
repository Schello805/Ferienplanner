import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import Holidays from 'date-holidays';
import axios from 'axios';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
export const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const AUTH_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;
const authAttemptStore = new Map();

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

const ROLE_ORDER = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (e) {
  process.stderr.write(`Failed to ensure DB directory exists: ${e?.message || e}\n`);
  process.stderr.write(`DB_PATH=${DB_PATH}\n`);
  process.exit(1);
}

export const app = express();
app.use(cors());
app.use(express.json());
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV !== 'development') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use('/api', async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (error) {
    res.status(500).json({ error: `Database initialization failed: ${error.message}` });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (ensureAuthNotRateLimited(req, res, String(username))) {
    return;
  }

  const passwordError = validatePassword(password, username);
  if (passwordError) {
    registerAuthFailure(req, String(username));
    return res.status(400).json({ error: passwordError });
  }

  const db = openDb();
  const now = new Date().toISOString();
  try {
    const existing = await dbGet(
      db,
      'SELECT id FROM users WHERE username = ? OR lower(email) = lower(?)',
      [String(username).trim(), normalizedEmail]
    );
    if (existing) {
      registerAuthFailure(req, String(username));
      return res.status(409).json({ error: 'User already exists' });
    }

    const { salt, hash } = hashPassword(password);
    const result = await dbRun(
      db,
      `INSERT INTO users (username, email, emailVerified, passwordHash, passwordSalt, isAdmin, createdAt, updatedAt)
       VALUES (?, ?, 0, ?, ?, 0, ?, ?)`,
      [String(username).trim(), normalizedEmail, hash, salt, now, now]
    );

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

    await dbRun(
      db,
      'INSERT INTO email_verifications (tokenHash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)',
      [tokenHash, result.lastID, now, expiresAt]
    );

    await sendVerificationEmail({ req, to: normalizedEmail, token });
    clearAuthFailures(req, String(username));
    return res.json({ success: true });
  } catch (error) {
    registerAuthFailure(req, String(username));
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const db = openDb();
  try {
    const row = await dbGet(
      db,
      'SELECT userId, expiresAt FROM email_verifications WHERE tokenHash = ?',
      [tokenHash]
    );
    if (!row) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      await dbRun(db, 'DELETE FROM email_verifications WHERE tokenHash = ?', [tokenHash]);
      return res.status(410).json({ error: 'Verification expired' });
    }

    await dbRun(db, 'UPDATE users SET emailVerified = 1, updatedAt = ? WHERE id = ?', [new Date().toISOString(), row.userId]);
    await dbRun(db, 'DELETE FROM email_verifications WHERE userId = ?', [row.userId]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST) && process.env.NODE_ENV !== 'test') {
  app.use(express.static(CLIENT_DIST));
}

const VALID_STATE_CODES = new Set([
  'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV',
  'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH',
]);

function normalizeDateOnly(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function parseDateOnly(value) {
  const normalized = normalizeDateOnly(value);
  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValid ? date : null;
}

function openDb() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      process.stderr.write(`Failed to open SQLite DB: ${err?.message || err}\n`);
      process.stderr.write(`DB_PATH=${DB_PATH}\n`);
    }
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function initializeDatabase() {
  const db = openDb();
  try {
    await dbRun(db, 'PRAGMA foreign_keys = ON');

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        emailVerified INTEGER NOT NULL DEFAULT 0,
        passwordHash TEXT NOT NULL,
        passwordSalt TEXT NOT NULL,
        isAdmin INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      )`
    );

    const userColumns = await dbAll(db, 'PRAGMA table_info(users)');
    const userColumnNames = new Set(userColumns.map((row) => row.name));
    if (!userColumnNames.has('email')) {
      await dbRun(db, 'ALTER TABLE users ADD COLUMN email TEXT');
    }
    if (!userColumnNames.has('emailVerified')) {
      await dbRun(db, 'ALTER TABLE users ADD COLUMN emailVerified INTEGER NOT NULL DEFAULT 0');
    }

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        createdAt TEXT,
        expiresAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS email_verifications (
        tokenHash TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        createdAt TEXT,
        expiresAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS vacations (
        date TEXT PRIMARY KEY,
        userId TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS vacation_entries (
        calendarId INTEGER NOT NULL,
        date TEXT NOT NULL,
        userId TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        PRIMARY KEY (calendarId, date)
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS calendars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ownerUserId INTEGER NOT NULL,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (ownerUserId) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS calendar_memberships (
        calendarId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'owner',
        createdAt TEXT,
        PRIMARY KEY (calendarId, userId),
        FOREIGN KEY (calendarId) REFERENCES calendars(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS calendar_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calendarId INTEGER NOT NULL,
        invitedByUserId INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        tokenHash TEXT NOT NULL UNIQUE,
        createdAt TEXT,
        expiresAt TEXT,
        usedAt TEXT,
        usedByUserId INTEGER,
        FOREIGN KEY (calendarId) REFERENCES calendars(id) ON DELETE CASCADE,
        FOREIGN KEY (invitedByUserId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (usedByUserId) REFERENCES users(id) ON DELETE SET NULL
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS children (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calendarId INTEGER,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'school',
        color TEXT,
        usesSchoolHolidays INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT,
        updatedAt TEXT
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS child_free_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calendarId INTEGER,
        childId INTEGER NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        label TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (childId) REFERENCES children(id) ON DELETE CASCADE
      )`
    );

    const vacationColumns = new Set((await dbAll(db, 'PRAGMA table_info(vacations)')).map((row) => row.name));
    if (!vacationColumns.has('calendarId')) {
      await dbRun(db, 'ALTER TABLE vacations ADD COLUMN calendarId INTEGER');
    }
    if (!vacationColumns.has('createdAt')) {
      await dbRun(db, 'ALTER TABLE vacations ADD COLUMN createdAt TEXT');
    }
    if (!vacationColumns.has('updatedAt')) {
      await dbRun(db, 'ALTER TABLE vacations ADD COLUMN updatedAt TEXT');
    }

    const childColumns = new Set((await dbAll(db, 'PRAGMA table_info(children)')).map((row) => row.name));
    if (!childColumns.has('calendarId')) {
      await dbRun(db, 'ALTER TABLE children ADD COLUMN calendarId INTEGER');
    }

    const freeDayColumns = new Set((await dbAll(db, 'PRAGMA table_info(child_free_days)')).map((row) => row.name));
    if (!freeDayColumns.has('calendarId')) {
      await dbRun(db, 'ALTER TABLE child_free_days ADD COLUMN calendarId INTEGER');
    }

    const userColumnsSet = new Set((await dbAll(db, 'PRAGMA table_info(users)')).map((row) => row.name));
    if (!userColumnsSet.has('isAdmin')) {
      await dbRun(db, 'ALTER TABLE users ADD COLUMN isAdmin INTEGER NOT NULL DEFAULT 0');
    }

    const vacationEntryCount = await dbGet(db, 'SELECT COUNT(*) AS count FROM vacation_entries');
    if (Number(vacationEntryCount?.count || 0) === 0) {
      const legacyRows = await dbAll(
        db,
        'SELECT date, userId, createdAt, updatedAt, calendarId FROM vacations'
      );

      for (const row of legacyRows) {
        await dbRun(
          db,
          `INSERT OR IGNORE INTO vacation_entries (calendarId, date, userId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?)`,
          [row.calendarId || 0, row.date, row.userId, row.createdAt || null, row.updatedAt || null]
        );
      }
    }
  } finally {
    db.close();
  }
}

const dbReady = initializeDatabase();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const actualHash = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (actualHash.length !== expected.length) return false;
  return crypto.timingSafeEqual(actualHash, expected);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function validatePassword(password, username = '') {
  const normalizedUsername = String(username || '').trim().toLowerCase();

  if (typeof password !== 'string' || password.length < 10) {
    return 'Passwort muss mindestens 10 Zeichen lang sein.';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Passwort muss mindestens einen Buchstaben und eine Zahl enthalten.';
  }
  if (normalizedUsername && password.toLowerCase().includes(normalizedUsername)) {
    return 'Passwort darf den Benutzernamen nicht enthalten.';
  }
  return null;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getRateLimitKey(req, username = '') {
  return `${getClientIp(req)}:${String(username || '').trim().toLowerCase()}`;
}

function pruneAuthAttempts(now = Date.now()) {
  for (const [key, value] of authAttemptStore.entries()) {
    if ((now - value.firstAttemptAt) > AUTH_RATE_LIMIT_WINDOW_MS) {
      authAttemptStore.delete(key);
    }
  }
}

function registerAuthFailure(req, username = '') {
  const now = Date.now();
  pruneAuthAttempts(now);
  const key = getRateLimitKey(req, username);
  const current = authAttemptStore.get(key);
  if (!current || (now - current.firstAttemptAt) > AUTH_RATE_LIMIT_WINDOW_MS) {
    authAttemptStore.set(key, { attempts: 1, firstAttemptAt: now });
    return;
  }
  current.attempts += 1;
  authAttemptStore.set(key, current);
}

function clearAuthFailures(req, username = '') {
  authAttemptStore.delete(getRateLimitKey(req, username));
}

function ensureAuthNotRateLimited(req, res, username = '') {
  const now = Date.now();
  pruneAuthAttempts(now);
  const current = authAttemptStore.get(getRateLimitKey(req, username));
  if (!current || current.attempts < AUTH_RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  const retryAfterMs = Math.max(0, AUTH_RATE_LIMIT_WINDOW_MS - (now - current.firstAttemptAt));
  res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
  res.status(429).json({
    error: 'Zu viele Anmeldeversuche. Bitte spaeter erneut versuchen.',
  });
  return true;
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function isValidEmail(email) {
  if (!email) return false;
  if (email.length > 254) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function getPublicBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  const origin = req.get('origin');
  if (origin) return String(origin).replace(/\/$/, '');
  return `http://localhost:${PORT}`;
}

function getMailerTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendVerificationEmail({ req, to, token }) {
  const transport = getMailerTransport();
  const baseUrl = getPublicBaseUrl(req);
  const verifyUrl = `${baseUrl}/?verifyEmail=${token}`;

  if (!transport) {
    process.stderr.write('SMTP not configured; cannot send verification email.\n');
    process.stderr.write(`Verification link for ${to}: ${verifyUrl}\n`);
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from,
    to,
    subject: 'Ferienplaner: E-Mail bestätigen',
    text: `Bitte bestätige deine E-Mail-Adresse über diesen Link:\n\n${verifyUrl}\n\nDer Link ist 24 Stunden gültig.`,
  });
}

async function getUserCount() {
  const db = openDb();
  try {
    const row = await dbGet(db, 'SELECT COUNT(*) AS count FROM users');
    return Number(row?.count || 0);
  } finally {
    db.close();
  }
}

async function createSessionForUser(userId) {
  const db = openDb();
  const token = generateSessionToken();
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
  const createdAt = new Date(now).toISOString();

  try {
    await dbRun(db, 'DELETE FROM sessions WHERE expiresAt <= ?', [new Date().toISOString()]);
    await dbRun(
      db,
      `INSERT INTO sessions (token, userId, createdAt, expiresAt)
       VALUES (?, ?, ?, ?)`,
      [token, userId, createdAt, expiresAt]
    );
    return { token, expiresAt };
  } finally {
    db.close();
  }
}

async function ensureUserCalendarContext(userId) {
  const db = openDb();
  try {
    let membership = await dbGet(
      db,
      `SELECT calendars.id, calendars.name, calendar_memberships.role
       FROM calendar_memberships
       JOIN calendars ON calendars.id = calendar_memberships.calendarId
       WHERE calendar_memberships.userId = ?
       ORDER BY calendar_memberships.role = 'owner' DESC, calendars.id ASC
       LIMIT 1`,
      [userId]
    );

    if (!membership) {
      const createdAt = new Date().toISOString();
      const calendarResult = await dbRun(
        db,
        `INSERT INTO calendars (name, ownerUserId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?)`,
        ['Mein Kalender', userId, createdAt, createdAt]
      );
      await dbRun(
        db,
        `INSERT INTO calendar_memberships (calendarId, userId, role, createdAt)
         VALUES (?, ?, 'owner', ?)`,
        [calendarResult.lastID, userId, createdAt]
      );
      membership = { id: calendarResult.lastID, name: 'Mein Kalender', role: 'owner' };
    }

    const userCountRow = await dbGet(db, 'SELECT COUNT(*) AS count FROM users');
    const userCount = Number(userCountRow?.count || 0);

    if (userCount === 1) {
      await dbRun(
        db,
        'UPDATE vacations SET calendarId = ? WHERE calendarId IS NULL',
        [membership.id]
      );
      await dbRun(
        db,
        'UPDATE vacation_entries SET calendarId = ? WHERE calendarId = 0',
        [membership.id]
      );
      await dbRun(
        db,
        'UPDATE children SET calendarId = ? WHERE calendarId IS NULL',
        [membership.id]
      );
      await dbRun(
        db,
        'UPDATE child_free_days SET calendarId = ? WHERE calendarId IS NULL',
        [membership.id]
      );
    }

    return {
      id: membership.id,
      name: membership.name,
      role: membership.role || 'owner',
    };
  } finally {
    db.close();
  }
}

async function getCalendarMembership(userId, calendarId) {
  const db = openDb();
  try {
    const row = await dbGet(
      db,
      'SELECT role FROM calendar_memberships WHERE userId = ? AND calendarId = ?',
      [userId, calendarId]
    );
    if (!row) return null;
    return { role: row.role };
  } finally {
    db.close();
  }
}

function requireCalendarRole(minRole) {
  const minRank = ROLE_ORDER[minRole] ?? ROLE_ORDER.viewer;
  return async (req, res, next) => {
    try {
      const userId = req.auth?.user?.id;
      const calendarId = req.auth?.calendar?.id;
      if (!userId || !calendarId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const role = req.auth?.calendar?.role;
      if (role && (ROLE_ORDER[role] ?? -1) >= minRank) {
        return next();
      }

      const membership = await getCalendarMembership(userId, calendarId);
      const effectiveRole = membership?.role || role || 'viewer';
      if ((ROLE_ORDER[effectiveRole] ?? -1) < minRank) {
        return res.status(403).json({ error: 'Insufficient calendar permissions' });
      }
      return next();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
}

async function getAuthState(req) {
  const token = getBearerToken(req);
  const userCount = await getUserCount();
  const setupRequired = userCount === 0;

  if (!token) {
    return { setupRequired, authenticated: false, user: null, token: null };
  }

  const db = openDb();
  try {
    await dbRun(db, 'DELETE FROM sessions WHERE expiresAt <= ?', [new Date().toISOString()]);
    const row = await dbGet(
      db,
      `SELECT sessions.token, users.id, users.username, users.isAdmin
       FROM sessions
       JOIN users ON users.id = sessions.userId
       WHERE sessions.token = ? AND sessions.expiresAt > ?`,
      [token, new Date().toISOString()]
    );

    if (!row) {
      return { setupRequired, authenticated: false, user: null, token: null };
    }

    return {
      setupRequired,
      authenticated: true,
      token,
      user: {
        id: row.id,
        username: row.username,
        isAdmin: Boolean(row.isAdmin),
      },
      calendar: await ensureUserCalendarContext(row.id),
    };
  } finally {
    db.close();
  }
}

async function requireAuth(req, res, next) {
  try {
    const authState = await getAuthState(req);
    if (!authState.authenticated) {
      return res.status(401).json({
        error: 'Authentication required',
        setupRequired: authState.setupRequired,
      });
    }
    req.auth = authState;
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function requireAdmin(req, res, next) {
  if (!req.auth?.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  return next();
}



app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/status', async (req, res) => {
  try {
    const authState = await getAuthState(req);
    res.json({
      setupRequired: authState.setupRequired,
      authenticated: authState.authenticated,
      user: authState.user,
      calendar: authState.calendar || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/bootstrap', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (ensureAuthNotRateLimited(req, res, username)) {
    return;
  }

  const passwordError = validatePassword(password, username);
  if (passwordError) {
    registerAuthFailure(req, username);
    return res.status(400).json({ error: passwordError });
  }

  const existingUsers = await getUserCount();
  if (existingUsers > 0) {
    registerAuthFailure(req, username);
    return res.status(409).json({ error: 'Setup already completed' });
  }

  const db = openDb();
  const now = new Date().toISOString();

  try {
    const { salt, hash } = hashPassword(password);
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      registerAuthFailure(req, username);
      return res.status(400).json({ error: 'Invalid email' });
    }
    const result = await dbRun(
      db,
      `INSERT INTO users (username, email, emailVerified, passwordHash, passwordSalt, isAdmin, createdAt, updatedAt)
       VALUES (?, ?, 1, ?, ?, 1, ?, ?)`,
      [String(username).trim(), normalizedEmail || null, hash, salt, now, now]
    );
    db.close();

    const session = await createSessionForUser(result.lastID);
    clearAuthFailures(req, username);
    return res.json({
      success: true,
      token: session.token,
      user: { id: result.lastID, username: String(username).trim(), isAdmin: true },
      calendar: await ensureUserCalendarContext(result.lastID),
    });
  } catch (error) {
    db.close();
    registerAuthFailure(req, username);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (ensureAuthNotRateLimited(req, res, username)) {
    return;
  }

  const db = openDb();
  try {
    const user = await dbGet(
      db,
      'SELECT id, username, emailVerified, passwordHash, passwordSalt, isAdmin FROM users WHERE username = ?',
      [String(username).trim()]
    );
    db.close();

    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      registerAuthFailure(req, username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!Boolean(user.isAdmin) && !Boolean(user.emailVerified)) {
      registerAuthFailure(req, username);
      return res.status(403).json({ error: 'Email not verified' });
    }

    const session = await createSessionForUser(user.id);
    clearAuthFailures(req, username);
    return res.json({
      success: true,
      token: session.token,
      user: { id: user.id, username: user.username, isAdmin: Boolean(user.isAdmin) },
      calendar: await ensureUserCalendarContext(user.id),
    });
  } catch (error) {
    db.close();
    registerAuthFailure(req, username);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const db = openDb();
  try {
    await dbRun(db, 'DELETE FROM sessions WHERE token = ?', [req.auth.token]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const db = openDb();
  try {
    const rows = await dbAll(db, 'SELECT id, username, isAdmin, createdAt FROM users ORDER BY username ASC');
    res.json(rows.map((row) => ({
      ...row,
      isAdmin: Boolean(row.isAdmin),
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, isAdmin = false } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const passwordError = validatePassword(password, username);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const db = openDb();
  try {
    const now = new Date().toISOString();
    const { salt, hash } = hashPassword(password);
    const result = await dbRun(
      db,
      `INSERT INTO users (username, emailVerified, passwordHash, passwordSalt, isAdmin, createdAt, updatedAt)
       VALUES (?, 1, ?, ?, ?, ?, ?)`,
      [String(username).trim(), hash, salt, isAdmin ? 1 : 0, now, now]
    );
    await ensureUserCalendarContext(result.lastID);
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }

  const passwordError = validatePassword(newPassword, req.auth.user.username);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const db = openDb();
  try {
    const user = await dbGet(
      db,
      'SELECT id, passwordHash, passwordSalt FROM users WHERE id = ?',
      [req.auth.user.id]
    );
    if (!user || !verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const { salt, hash } = hashPassword(newPassword);
    await dbRun(
      db,
      'UPDATE users SET passwordHash = ?, passwordSalt = ?, updatedAt = ? WHERE id = ?',
      [hash, salt, new Date().toISOString(), req.auth.user.id]
    );
    await dbRun(
      db,
      'DELETE FROM sessions WHERE userId = ? AND token != ?',
      [req.auth.user.id, req.auth.token]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  return requireAuth(req, res, next);
});

app.get('/api/children', (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const db = openDb();
  db.all(
    `SELECT id, name, type, color, usesSchoolHolidays
     FROM children
     WHERE calendarId = ?
     ORDER BY id ASC`,
    [calendarId],
    (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map((row) => ({
        ...row,
        usesSchoolHolidays: Boolean(row.usesSchoolHolidays),
      })));
    }
  );
});

app.post('/api/children', requireCalendarRole('editor'), (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const { id, name, type = 'school', color = null, usesSchoolHolidays = true } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name required' });
  }

  const normalizedType = ['school', 'kita', 'other'].includes(type) ? type : 'school';
  const now = new Date().toISOString();
  const db = openDb();

  if (id) {
    db.run(
      `UPDATE children
       SET name = ?, type = ?, color = ?, usesSchoolHolidays = ?, updatedAt = ?
       WHERE id = ? AND calendarId = ?`,
      [name.trim(), normalizedType, color, usesSchoolHolidays ? 1 : 0, now, id, calendarId],
      function onUpdate(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
      }
    );
    return;
  }

  db.run(
      `INSERT INTO children (calendarId, name, type, color, usesSchoolHolidays, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [calendarId, name.trim(), normalizedType, color, usesSchoolHolidays ? 1 : 0, now, now],
    function onInsert(err) {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.delete('/api/children/:id', requireCalendarRole('editor'), (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const childId = Number(req.params.id);
  if (!Number.isInteger(childId) || childId <= 0) {
    return res.status(400).json({ error: 'Invalid child id' });
  }

  const db = openDb();
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('DELETE FROM child_free_days WHERE childId = ? AND calendarId = ?', [childId, calendarId]);
    db.run('DELETE FROM children WHERE id = ? AND calendarId = ?', [childId, calendarId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        db.close();
        return res.status(500).json({ error: err.message });
      }
      db.run('COMMIT', () => {
        db.close();
        res.json({ success: true });
      });
    });
  });
});

app.post('/api/invitations', requireCalendarRole('owner'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const userId = req.auth?.user?.id;
  const { role = 'viewer', expiresInDays = 14 } = req.body || {};

  const normalizedRole = ['viewer', 'editor'].includes(role) ? role : 'viewer';
  const numericExpires = Number(expiresInDays);
  const expiresDays = Number.isFinite(numericExpires) ? Math.max(1, Math.min(90, Math.floor(numericExpires))) : 14;

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

  const db = openDb();
  try {
    await dbRun(
      db,
      `INSERT INTO calendar_invitations (calendarId, invitedByUserId, role, tokenHash, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [calendarId, userId, normalizedRole, tokenHash, createdAt, expiresAt]
    );

    const baseUrl = process.env.PUBLIC_BASE_URL || req.get('origin') || `http://localhost:${PORT}`;
    const inviteUrl = `${String(baseUrl).replace(/\/$/, '')}/?invite=${token}`;
    return res.json({ success: true, token, inviteUrl, role: normalizedRole, expiresAt });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/invitations/accept', async (req, res) => {
  const userId = req.auth?.user?.id;
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const db = openDb();
  try {
    const invite = await dbGet(
      db,
      `SELECT id, calendarId, role, expiresAt, usedAt
       FROM calendar_invitations
       WHERE tokenHash = ?`,
      [tokenHash]
    );

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    if (invite.usedAt) {
      return res.status(409).json({ error: 'Invitation already used' });
    }
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Invitation expired' });
    }

    const invitationRole = ['viewer', 'editor'].includes(invite.role) ? invite.role : 'viewer';

    const existing = await dbGet(
      db,
      'SELECT role FROM calendar_memberships WHERE calendarId = ? AND userId = ?',
      [invite.calendarId, userId]
    );

    if (existing?.role === 'owner') {
      await dbRun(
        db,
        'UPDATE calendar_invitations SET usedAt = ?, usedByUserId = ? WHERE id = ?',
        [new Date().toISOString(), userId, invite.id]
      );
      return res.json({ success: true, calendarId: invite.calendarId, role: existing.role });
    }

    const membershipRole = existing ? invitationRole : invitationRole;
    await dbRun(
      db,
      `INSERT INTO calendar_memberships (calendarId, userId, role, createdAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(calendarId, userId) DO UPDATE SET role = excluded.role`,
      [invite.calendarId, userId, membershipRole, new Date().toISOString()]
    );

    await dbRun(
      db,
      'UPDATE calendar_invitations SET usedAt = ?, usedByUserId = ? WHERE id = ?',
      [new Date().toISOString(), userId, invite.id]
    );

    return res.json({ success: true, calendarId: invite.calendarId, role: membershipRole });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/child-free-days', (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const childId = req.query.childId ? Number(req.query.childId) : null;
  const year = req.query.year ? Number(req.query.year) : null;
  const db = openDb();

  const conditions = [];
  const params = [];

  if (childId && Number.isInteger(childId)) {
    conditions.push('childId = ?');
    params.push(childId);
  }

  if (year && Number.isInteger(year)) {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    conditions.push('endDate >= ? AND startDate <= ?');
    params.push(yearStart, yearEnd);
  }

  conditions.unshift('calendarId = ?');
  params.unshift(calendarId);
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  db.all(
    `SELECT id, childId, startDate, endDate, label
     FROM child_free_days
     ${whereClause}
     ORDER BY startDate ASC, id ASC`,
    params,
    (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/child-free-days', requireCalendarRole('editor'), (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const { id, childId, startDate, endDate, label = '' } = req.body;
  const normalizedStart = normalizeDateOnly(startDate);
  const normalizedEnd = normalizeDateOnly(endDate);
  const numericChildId = Number(childId);

  if (!Number.isInteger(numericChildId) || numericChildId <= 0) {
    return res.status(400).json({ error: 'Valid childId required' });
  }
  if (!normalizedStart || !normalizedEnd) {
    return res.status(400).json({ error: 'Valid startDate and endDate required' });
  }
  if (normalizedEnd < normalizedStart) {
    return res.status(400).json({ error: 'endDate must be on or after startDate' });
  }

  const now = new Date().toISOString();
  const db = openDb();

  if (id) {
    db.run(
      `UPDATE child_free_days
       SET childId = ?, startDate = ?, endDate = ?, label = ?, updatedAt = ?
       WHERE id = ? AND calendarId = ?`,
      [numericChildId, normalizedStart, normalizedEnd, label.trim(), now, id, calendarId],
      function onUpdate(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
      }
    );
    return;
  }

  db.run(
      `INSERT INTO child_free_days (calendarId, childId, startDate, endDate, label, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [calendarId, numericChildId, normalizedStart, normalizedEnd, label.trim(), now, now],
    function onInsert(err) {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.delete('/api/child-free-days/:id', requireCalendarRole('editor'), (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const freeDayId = Number(req.params.id);
  if (!Number.isInteger(freeDayId) || freeDayId <= 0) {
    return res.status(400).json({ error: 'Invalid free day id' });
  }

  const db = openDb();
  db.run('DELETE FROM child_free_days WHERE id = ? AND calendarId = ?', [freeDayId, calendarId], (err) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// GET /api/vacations
app.get('/api/vacations', (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const db = openDb();
  db.all('SELECT date, userId FROM vacation_entries WHERE calendarId = ?', [calendarId], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/vacations (Single day toggle/set)
app.post('/api/vacations', requireCalendarRole('editor'), (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const { date, userId } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required' });

  const db = openDb();
  const now = new Date().toISOString();

  if (userId === null) {
    // Delete
    db.run('DELETE FROM vacation_entries WHERE date = ? AND calendarId = ?', [date, calendarId], (err) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  } else {
    // Upsert
    db.run(
      `INSERT INTO vacation_entries (date, userId, createdAt, updatedAt, calendarId) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(calendarId, date) DO UPDATE SET userId = excluded.userId, updatedAt = excluded.updatedAt`,
      [date, userId, now, now, calendarId],
      (err) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  }
});

// POST /api/vacations/range (Range set)
app.post('/api/vacations/range', requireCalendarRole('editor'), (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const { startDate, endDate, userId } = req.body;
  if (!startDate || !endDate || !userId) {
    return res.status(400).json({ error: 'startDate, endDate, and userId are required' });
  }

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  
  if (!start || !end) {
     return res.status(400).json({ error: 'Invalid dates' });
  }

  const db = openDb();
  const now = new Date().toISOString();

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const stmt = db.prepare(`
      INSERT INTO vacation_entries (date, userId, createdAt, updatedAt, calendarId) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(calendarId, date) DO UPDATE SET userId = excluded.userId, updatedAt = excluded.updatedAt
    `);

    // Loop from start to end
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateStr = normalizeDateOnly(d);
        stmt.run(dateStr, userId, now, now, calendarId);
    }

    stmt.finalize((err) => {
      if (err) {
        db.run('ROLLBACK');
        db.close();
        return res.status(500).json({ error: err.message });
      }
      db.run('COMMIT', () => {
        db.close();
        res.json({ success: true });
      });
    });
  });
});

// Static fallback data for stability
const STATIC_HOLIDAYS = {
  BY: {
    2025: {
        school: [
            { start: "2024-12-23", end: "2025-01-03", name: "Weihnachtsferien" },
            { start: "2025-03-03", end: "2025-03-07", name: "Frühjahrsferien" },
            { start: "2025-04-14", end: "2025-04-25", name: "Osterferien" },
            { start: "2025-06-10", end: "2025-06-20", name: "Pfingstferien" },
            { start: "2025-08-01", end: "2025-09-15", name: "Sommerferien" },
            { start: "2025-11-03", end: "2025-11-07", name: "Herbstferien" },
            { start: "2025-12-22", end: "2026-01-05", name: "Weihnachtsferien" }
        ]
    },
    2026: {
        school: [
            { start: "2025-12-22", end: "2026-01-05", name: "Weihnachtsferien" },
            { start: "2026-02-16", end: "2026-02-20", name: "Frühjahrsferien" },
            { start: "2026-03-30", end: "2026-04-10", name: "Osterferien" },
            { start: "2026-05-26", end: "2026-06-05", name: "Pfingstferien" },
            { start: "2026-08-03", end: "2026-09-14", name: "Sommerferien" },
            { start: "2026-11-02", end: "2026-11-06", name: "Herbstferien" },
            { start: "2026-12-23", end: "2027-01-08", name: "Weihnachtsferien" }
        ]
    }
  }
};

const HOLIDAY_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const HOLIDAY_CACHE_MAX_STALE_MS = 1000 * 60 * 60 * 24 * 14;
const HOLIDAY_FALLBACK_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const schoolHolidayCache = new Map();

function buildHolidayMeta(source, message = null, fetchedAt = null) {
  return {
    source,
    message,
    cachedAt: fetchedAt ? new Date(fetchedAt).toISOString() : null,
  };
}

function getCachedSchoolHolidays(year, stateCode) {
  const cached = schoolHolidayCache.get(`${year}-${stateCode}`);
  if (!cached) {
    return null;
  }

  const age = Date.now() - cached.fetchedAt;
  return {
    ...cached,
    isFresh: age < (cached.ttlMs || HOLIDAY_CACHE_TTL_MS),
    isUsableStale: age < HOLIDAY_CACHE_MAX_STALE_MS,
  };
}

// GET /api/holidays (Dynamic with Fallback)
app.get('/api/holidays', async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const stateCode = String(req.query.state || 'BY').toUpperCase();
    if (!VALID_STATE_CODES.has(stateCode)) {
      return res.status(400).json({ error: `Unsupported state: ${stateCode}` });
    }
    
    // 1. Public Holidays (Calculated dynamically via date-holidays)
    // Note: hd.getHolidays returns date objects/strings. We ensure YYYY-MM-DD.
    const hd = new Holidays('DE', stateCode);
    const publicHolidaysRaw = hd.getHolidays(year);
    const publicHolidays = publicHolidaysRaw
      .filter(h => h.type === 'public')
      .map(h => ({
        date: normalizeDateOnly(h.date),
        name: h.name
      }))
      .filter(h => h.date);

    // 2. School Holidays (Fetched via API with fallback)
    let schoolHolidays = [];
    let meta = buildHolidayMeta('live');
    const cached = getCachedSchoolHolidays(year, stateCode);

    if (cached?.isFresh) {
      schoolHolidays = cached.school;
      meta = cached.source === 'live'
        ? buildHolidayMeta(
            'cache',
            'Ferien wurden aus dem Zwischenspeicher geladen, um unnötige Aufrufe der externen API zu vermeiden.',
            cached.fetchedAt
          )
        : buildHolidayMeta(cached.source, cached.message, cached.fetchedAt);
    } else {
      try {
          const response = await axios.get(`https://schulferien-api.de/api/v1/${year}/${stateCode}/`, { timeout: 3000 });
          schoolHolidays = response.data.map(h => ({
              start: normalizeDateOnly(h.start),
              end: normalizeDateOnly(h.end),
              name: h.name || h.title || h.slug || 'Ferien'
          })).filter(h => h.start && h.end);

          schoolHolidayCache.set(`${year}-${stateCode}`, {
            school: schoolHolidays,
            fetchedAt: Date.now(),
            ttlMs: HOLIDAY_CACHE_TTL_MS,
            source: 'live',
            message: null,
          });
      } catch (error) {
          console.warn(`API fetch failed for ${year}, using fallback if available. Error: ${error.message}`);
          if (cached?.isUsableStale) {
            schoolHolidays = cached.school;
            meta = buildHolidayMeta(
              'stale-cache',
              `Die Live-Quelle fuer ${stateCode} antwortete nicht (${error.message}). Es werden zuletzt erfolgreich geladene Feriendaten verwendet.`,
              cached.fetchedAt
            );
          } else if (STATIC_HOLIDAYS[stateCode]?.[year]) {
            schoolHolidays = STATIC_HOLIDAYS[stateCode][year].school;
            const fallbackMessage = `Die Live-Quelle fuer ${stateCode} antwortete nicht (${error.message}). Es werden hinterlegte Feriendaten verwendet.`;
            schoolHolidayCache.set(`${year}-${stateCode}`, {
              school: schoolHolidays,
              fetchedAt: Date.now(),
              ttlMs: HOLIDAY_FALLBACK_CACHE_TTL_MS,
              source: 'static-fallback',
              message: fallbackMessage,
            });
            meta = buildHolidayMeta(
              'static-fallback',
              fallbackMessage
            );
          } else {
            schoolHolidays = [];
            meta = buildHolidayMeta(
              'error',
              `Die Live-Quelle fuer ${stateCode} antwortete nicht (${error.message}) und es gibt keinen lokalen Fallback fuer ${year}.`
            );
          }
      }
    }

    res.json({
        public: publicHolidays,
        school: schoolHolidays,
        meta,
    });
});

if (fs.existsSync(CLIENT_DIST) && process.env.NODE_ENV !== 'test') {
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

export function startServer(port = PORT) {
  const server = app.listen(port, () => {
    const address = server.address();
    const actualPort =
      typeof address === 'object' && address && 'port' in address ? address.port : port;
    process.stdout.write(`Backend listening on http://localhost:${actualPort}\n`);
    process.stdout.write(`SQLite DB: ${DB_PATH}\n`);
  });
  return server;
}

if (process.env.NODE_ENV !== 'test' && process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer(PORT);
}
