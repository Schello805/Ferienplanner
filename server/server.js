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
const APP_SECRET_KEY_PATH = process.env.APP_SECRET_KEY_PATH || path.join(path.dirname(DB_PATH), 'app-secret.key');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const AUTH_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;
const authAttemptStore = new Map();

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;
const HIBP_TIMEOUT_MS = 5000;
const HIBP_CACHE_TTL_MS = 1000 * 60 * 60;

const SMTP_CACHE_TTL_MS = 1000 * 60 * 5;

let cachedSmtpSettings = null;

const hibpCache = new Map();

const ADMIN_LOG_MAX_ENTRIES = 200;
const adminLogEntries = [];

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

function ensureAppSecretKeyFile() {
  if (process.env.APP_SECRET_KEY) return;
  try {
    if (fs.existsSync(APP_SECRET_KEY_PATH)) {
      return;
    }
    const key = crypto.randomBytes(32).toString('base64');
    fs.writeFileSync(APP_SECRET_KEY_PATH, `${key}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    process.stderr.write(`Generated APP_SECRET_KEY at ${APP_SECRET_KEY_PATH}\n`);
  } catch (error) {
    process.stderr.write(`Failed to generate APP_SECRET_KEY file: ${error?.message || error}\n`);
  }
}

ensureAppSecretKeyFile();

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

  const passwordError = await validatePasswordAsync(password, username);
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
      "INSERT INTO email_verifications (tokenHash, userId, type, newEmail, createdAt, expiresAt) VALUES (?, ?, 'register', NULL, ?, ?)",
      [tokenHash, result.lastID, now, expiresAt]
    );

    await sendVerificationEmail({ req, to: normalizedEmail, token });
    pushAdminLog('auth.register', `User registered: ${String(username).trim()}`, { username: String(username).trim(), email: normalizedEmail });
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
      'SELECT userId, expiresAt, type, newEmail FROM email_verifications WHERE tokenHash = ?',
      [tokenHash]
    );
    if (!row) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
      await dbRun(db, 'DELETE FROM email_verifications WHERE tokenHash = ?', [tokenHash]);
      return res.status(410).json({ error: 'Verification expired' });
    }

    const now = new Date().toISOString();
    const verificationType = row.type || 'register';

    if (verificationType === 'change_email') {
      const normalizedNewEmail = normalizeEmail(row.newEmail);
      if (!normalizedNewEmail || !isValidEmail(normalizedNewEmail)) {
        await dbRun(db, 'DELETE FROM email_verifications WHERE tokenHash = ?', [tokenHash]);
        return res.status(400).json({ error: 'Invalid email' });
      }

      const existing = await dbGet(
        db,
        'SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?',
        [normalizedNewEmail, row.userId]
      );
      if (existing) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      await dbRun(
        db,
        'UPDATE users SET email = ?, emailVerified = 1, updatedAt = ? WHERE id = ?',
        [normalizedNewEmail, now, row.userId]
      );
      await dbRun(db, 'DELETE FROM email_verifications WHERE userId = ?', [row.userId]);
      pushAdminLog('auth.change_email_verified', `Email changed for userId=${row.userId}`, { userId: row.userId });
      return res.json({ success: true });
    }

    await dbRun(db, 'UPDATE users SET emailVerified = 1, updatedAt = ? WHERE id = ?', [now, row.userId]);
    await dbRun(db, 'DELETE FROM email_verifications WHERE userId = ?', [row.userId]);
    pushAdminLog('auth.verify_email', `Email verified for userId=${row.userId}`, { userId: row.userId });
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

function isHibpCheckEnabled() {
  const raw = process.env.HIBP_CHECK;
  if (!raw) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function isHibpFailOpen() {
  const raw = process.env.HIBP_FAIL_OPEN;
  if (!raw) return true;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

async function checkPasswordNotPwned(password) {
  if (!isHibpCheckEnabled()) return null;

  const sha1 = crypto.createHash('sha1').update(String(password), 'utf8').digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const cached = hibpCache.get(prefix);
  if (cached && (Date.now() - cached.fetchedAt) < HIBP_CACHE_TTL_MS) {
    if (cached.suffixes.has(suffix)) {
      return 'Dieses Passwort taucht in bekannten Datenleaks auf. Bitte wähle ein anderes Passwort.';
    }
    return null;
  }

  try {
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      timeout: HIBP_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Ferienplaner',
        'Add-Padding': 'true',
      },
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status !== 200 || typeof response.data !== 'string') {
      if (isHibpFailOpen()) return null;
      return 'Passwortprüfung momentan nicht verfügbar. Bitte später erneut versuchen.';
    }

    const suffixes = new Set();
    for (const line of response.data.split(/\r?\n/)) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix && hashSuffix.length === 35) {
        suffixes.add(hashSuffix.trim().toUpperCase());
      }
    }

    hibpCache.set(prefix, { fetchedAt: Date.now(), suffixes });
    if (suffixes.has(suffix)) {
      return 'Dieses Passwort taucht in bekannten Datenleaks auf. Bitte wähle ein anderes Passwort.';
    }
    return null;
  } catch (error) {
    if (isHibpFailOpen()) return null;
    return 'Passwortprüfung momentan nicht verfügbar. Bitte später erneut versuchen.';
  }
}

async function validatePasswordAsync(password, username) {
  const localError = validatePassword(password, username);
  if (localError) return localError;
  return await checkPasswordNotPwned(password);
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

function pushAdminLog(event, detail = '', meta = null) {
  adminLogEntries.push({
    ts: new Date().toISOString(),
    event: String(event),
    detail: String(detail || ''),
    meta,
  });
  if (adminLogEntries.length > ADMIN_LOG_MAX_ENTRIES) {
    adminLogEntries.splice(0, adminLogEntries.length - ADMIN_LOG_MAX_ENTRIES);
  }
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
        type TEXT NOT NULL DEFAULT 'register',
        newEmail TEXT,
        createdAt TEXT,
        expiresAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    const verificationColumns = new Set((await dbAll(db, 'PRAGMA table_info(email_verifications)')).map((row) => row.name));
    if (!verificationColumns.has('type')) {
      await dbRun(db, "ALTER TABLE email_verifications ADD COLUMN type TEXT NOT NULL DEFAULT 'register'");
    }
    if (!verificationColumns.has('newEmail')) {
      await dbRun(db, 'ALTER TABLE email_verifications ADD COLUMN newEmail TEXT');
    }

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS smtp_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        publicBaseUrl TEXT,
        host TEXT,
        port INTEGER,
        secure INTEGER NOT NULL DEFAULT 0,
        user TEXT,
        passEnc TEXT,
        passIv TEXT,
        passTag TEXT,
        fromAddress TEXT,
        updatedAt TEXT
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

  if (typeof password !== 'string' || password.length < 8) {
    return 'Passwort muss mindestens 8 Zeichen lang sein.';
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

function getAppSecretKeyBytes() {
  let secret = process.env.APP_SECRET_KEY;
  if (!secret) {
    try {
      if (fs.existsSync(APP_SECRET_KEY_PATH)) {
        secret = String(fs.readFileSync(APP_SECRET_KEY_PATH, 'utf8')).trim();
      }
    } catch {
      secret = null;
    }
  }
  if (!secret) return null;
  return crypto.createHash('sha256').update(String(secret), 'utf8').digest();
}

function encryptSecret(plaintext) {
  const key = getAppSecretKeyBytes();
  if (!key) {
    throw new Error('APP_SECRET_KEY not configured');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

function decryptSecret({ enc, iv, tag }) {
  const key = getAppSecretKeyBytes();
  if (!key) {
    throw new Error('APP_SECRET_KEY not configured');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(enc, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

async function loadSmtpSettingsFromDb() {
  const db = openDb();
  try {
    const row = await dbGet(db, 'SELECT * FROM smtp_settings WHERE id = 1');
    if (!row) return null;
    return row;
  } finally {
    db.close();
  }
}

async function getEffectiveSmtpSettings() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (host && user && pass) {
    return {
      source: 'env',
      publicBaseUrl: process.env.PUBLIC_BASE_URL || null,
      host,
      port,
      secure,
      user,
      pass,
      fromAddress: from,
    };
  }

  if (cachedSmtpSettings && (Date.now() - cachedSmtpSettings.fetchedAt) < SMTP_CACHE_TTL_MS) {
    return cachedSmtpSettings.value;
  }

  const row = await loadSmtpSettingsFromDb();
  if (!row || !row.host || !row.user || !row.passEnc || !row.passIv || !row.passTag) {
    cachedSmtpSettings = { fetchedAt: Date.now(), value: null };
    return null;
  }

  try {
    const decryptedPass = decryptSecret({ enc: row.passEnc, iv: row.passIv, tag: row.passTag });
    const value = {
      source: 'db',
      publicBaseUrl: row.publicBaseUrl || null,
      host: row.host,
      port: row.port ? Number(row.port) : 587,
      secure: Boolean(row.secure),
      user: row.user,
      pass: decryptedPass,
      fromAddress: row.fromAddress || row.user,
    };
    cachedSmtpSettings = { fetchedAt: Date.now(), value };
    return value;
  } catch {
    cachedSmtpSettings = { fetchedAt: Date.now(), value: null };
    return null;
  }
}

function getMailerTransport() {
  throw new Error('getMailerTransport is deprecated');
}

async function sendVerificationEmail({ req, to, token }) {
  const smtp = await getEffectiveSmtpSettings();
  const baseUrl = smtp?.publicBaseUrl || getPublicBaseUrl(req);
  const verifyUrl = `${baseUrl}/?verifyEmail=${token}`;

  if (!smtp) {
    process.stderr.write('SMTP not configured; cannot send verification email.\n');
    process.stderr.write(`Verification link for ${to}: ${verifyUrl}\n`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const appName = 'Mein Ferienplaner';
  const previewText = 'Bitte bestätige deine E-Mail-Adresse.';
  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${appName}</title>
  </head>
  <body style="margin:0;padding:0;background:#0b1220;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${previewText}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0f172a;border:1px solid rgba(148,163,184,0.2);border-radius:16px;overflow:hidden">
            <tr>
              <td style="padding:20px 20px 8px 20px;color:#e2e8f0">
                <div style="font-weight:800;font-size:18px;letter-spacing:-0.02em">${appName}</div>
                <div style="margin-top:6px;font-size:13px;color:rgba(226,232,240,0.75)">E-Mail bestätigen</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px 20px 20px;color:#e2e8f0">
                <div style="font-size:14px;line-height:1.5;color:rgba(226,232,240,0.92)">
                  Bitte bestätige deine E-Mail-Adresse, damit dein Konto aktiviert bleibt.
                </div>
                <div style="height:16px"></div>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" bgcolor="#38bdf8" style="border-radius:12px">
                      <a href="${verifyUrl}" style="display:inline-block;padding:12px 16px;font-weight:800;font-size:14px;color:#0b1220;text-decoration:none">
                        E-Mail bestätigen
                      </a>
                    </td>
                  </tr>
                </table>
                <div style="height:16px"></div>
                <div style="font-size:12px;line-height:1.5;color:rgba(226,232,240,0.7)">
                  Falls der Button nicht funktioniert, öffne diesen Link:
                  <div style="margin-top:8px;word-break:break-all">
                    <a href="${verifyUrl}" style="color:#93c5fd;text-decoration:underline">${verifyUrl}</a>
                  </div>
                </div>
                <div style="height:16px"></div>
                <div style="font-size:12px;color:rgba(226,232,240,0.6)">Der Link ist 24 Stunden gültig.</div>
              </td>
            </tr>
          </table>
          <div style="max-width:560px;margin-top:10px;color:rgba(226,232,240,0.45);font-size:11px;line-height:1.4">
            Du erhältst diese E-Mail, weil du eine Adresse für ${appName} bestätigt hast.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await transport.sendMail({
    from: smtp.fromAddress,
    to,
    subject: 'Mein Ferienplaner: E-Mail bestätigen',
    text: `Bitte bestätige deine E-Mail-Adresse über diesen Link:\n\n${verifyUrl}\n\nDer Link ist 24 Stunden gültig.`,
    html,
  });
}

async function sendSmtpTestMail({ host, port, secure, user, pass, from, to, baseUrl }) {
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transport.sendMail({
    from,
    to,
    subject: 'Ferienplaner: SMTP Test',
    text: `SMTP Test erfolgreich.\n\nBase URL: ${baseUrl || ''}\n`,
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
      `SELECT sessions.token, users.id, users.username, users.email, users.emailVerified, users.isAdmin
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
        email: row.email || '',
        emailVerified: Boolean(row.emailVerified),
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

  const passwordError = await validatePasswordAsync(password, username);
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
    pushAdminLog('auth.bootstrap', `Bootstrap admin created: ${String(username).trim()}`, { username: String(username).trim(), userId: result.lastID });
    return res.json({
      success: true,
      token: session.token,
      user: { id: result.lastID, username: String(username).trim(), email: normalizedEmail || '', emailVerified: true, isAdmin: true },
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
      'SELECT id, username, email, emailVerified, passwordHash, passwordSalt, isAdmin FROM users WHERE username = ?',
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
      user: { id: user.id, username: user.username, email: user.email || '', emailVerified: Boolean(user.emailVerified), isAdmin: Boolean(user.isAdmin) },
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

  const passwordError = await validatePasswordAsync(password, username);
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
    pushAdminLog('admin.create_user', `Admin created user: ${String(username).trim()}`, { username: String(username).trim(), userId: result.lastID, isAdmin: Boolean(isAdmin) });
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

  const passwordError = await validatePasswordAsync(newPassword, req.auth.user.username);
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

app.post('/api/auth/change-email', requireAuth, async (req, res) => {
  const { password, newEmail } = req.body || {};
  if (!password || !newEmail) {
    return res.status(400).json({ error: 'password and newEmail are required' });
  }

  const normalizedEmail = normalizeEmail(newEmail);
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const db = openDb();
  try {
    const user = await dbGet(
      db,
      'SELECT id, passwordHash, passwordSalt FROM users WHERE id = ?',
      [req.auth.user.id]
    );

    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    const existing = await dbGet(
      db,
      'SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?',
      [normalizedEmail, user.id]
    );
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

    await dbRun(
      db,
      "INSERT INTO email_verifications (tokenHash, userId, type, newEmail, createdAt, expiresAt) VALUES (?, ?, 'change_email', ?, ?, ?)",
      [tokenHash, user.id, normalizedEmail, now, expiresAt]
    );

    await sendVerificationEmail({ req, to: normalizedEmail, token });
    pushAdminLog('auth.change_email_requested', `Email change requested userId=${user.id}`, { userId: user.id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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

app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  const db = openDb();
  try {
    const nowIso = new Date().toISOString();
    const [
      userCount,
      calendarCount,
      membershipCount,
      childCount,
      freeDayCount,
      entryCount,
      activeSessionCount,
      pendingInviteCount,
      pendingVerificationCount,
      unverifiedUserCount,
      smtpUpdatedAtRow,
    ] = await Promise.all([
      dbGet(db, 'SELECT COUNT(*) AS count FROM users'),
      dbGet(db, 'SELECT COUNT(*) AS count FROM calendars'),
      dbGet(db, 'SELECT COUNT(*) AS count FROM calendar_memberships'),
      dbGet(db, 'SELECT COUNT(*) AS count FROM children'),
      dbGet(db, 'SELECT COUNT(*) AS count FROM child_free_days'),
      dbGet(db, 'SELECT COUNT(*) AS count FROM vacation_entries'),
      dbGet(db, 'SELECT COUNT(*) AS count FROM sessions WHERE expiresAt > ?', [nowIso]),
      dbGet(db, 'SELECT COUNT(*) AS count FROM calendar_invitations WHERE expiresAt > ?', [nowIso]),
      dbGet(db, 'SELECT COUNT(*) AS count FROM email_verifications'),
      dbGet(db, 'SELECT COUNT(*) AS count FROM users WHERE emailVerified = 0'),
      dbGet(db, 'SELECT updatedAt FROM smtp_settings WHERE id = 1'),
    ]);

    let smtpConfigured = false;
    try {
      const effective = await getEffectiveSmtpSettings();
      smtpConfigured = Boolean(effective);
    } catch {
      smtpConfigured = false;
    }

    let dbSizeBytes = null;
    try {
      dbSizeBytes = fs.statSync(DB_PATH).size;
    } catch {
      dbSizeBytes = null;
    }

    return res.json({
      users: Number(userCount?.count || 0),
      calendars: Number(calendarCount?.count || 0),
      memberships: Number(membershipCount?.count || 0),
      children: Number(childCount?.count || 0),
      childFreeDays: Number(freeDayCount?.count || 0),
      vacationEntries: Number(entryCount?.count || 0),
      activeSessions: Number(activeSessionCount?.count || 0),
      pendingInvites: Number(pendingInviteCount?.count || 0),
      pendingEmailVerifications: Number(pendingVerificationCount?.count || 0),
      unverifiedUsers: Number(unverifiedUserCount?.count || 0),
      dbSizeBytes,
      uptimeSeconds: Math.floor(process.uptime()),
      serverVersion: process.env.npm_package_version || null,
      smtpConfigured,
      smtpUpdatedAt: smtpUpdatedAtRow?.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/admin/logs', requireAuth, requireAdmin, (req, res) => {
  res.json({ entries: adminLogEntries.slice(-ADMIN_LOG_MAX_ENTRIES) });
});

app.get('/api/admin/diagnostics', requireAuth, requireAdmin, async (req, res) => {
  const db = openDb();
  try {
    const nowIso = new Date().toISOString();
    const shortToken = (value) => {
      if (!value) return null;
      const str = String(value);
      if (str.length <= 10) return str;
      return `${str.slice(0, 6)}…${str.slice(-4)}`;
    };

    const [
      users,
      calendars,
      memberships,
      children,
      childFreeDays,
      vacationEntries,
      invitations,
      verifications,
      sessions,
    ] = await Promise.all([
      dbAll(db, 'SELECT id, username, email, emailVerified, isAdmin, createdAt, updatedAt FROM users ORDER BY id ASC LIMIT 200'),
      dbAll(db, 'SELECT id, name, ownerUserId, createdAt, updatedAt FROM calendars ORDER BY id ASC LIMIT 200'),
      dbAll(db, 'SELECT calendarId, userId, role, createdAt FROM calendar_memberships ORDER BY calendarId ASC, userId ASC LIMIT 500'),
      dbAll(db, 'SELECT id, calendarId, name, type, color, usesSchoolHolidays, createdAt, updatedAt FROM children ORDER BY id ASC LIMIT 500'),
      dbAll(db, 'SELECT id, calendarId, childId, startDate, endDate, label, createdAt, updatedAt FROM child_free_days ORDER BY id ASC LIMIT 500'),
      dbAll(db, 'SELECT calendarId, date, userId, createdAt, updatedAt FROM vacation_entries ORDER BY updatedAt DESC, date DESC LIMIT 1000'),
      dbAll(db, 'SELECT id, calendarId, invitedByUserId, role, tokenHash, createdAt, expiresAt, usedAt, usedByUserId FROM calendar_invitations ORDER BY createdAt DESC LIMIT 200'),
      dbAll(db, 'SELECT tokenHash, userId, type, newEmail, createdAt, expiresAt FROM email_verifications ORDER BY createdAt DESC LIMIT 200'),
      dbAll(db, 'SELECT token, userId, createdAt, expiresAt FROM sessions WHERE expiresAt > ? ORDER BY createdAt DESC LIMIT 200', [nowIso]),
    ]);

    let dbSizeBytes = null;
    try {
      dbSizeBytes = fs.statSync(DB_PATH).size;
    } catch {
      dbSizeBytes = null;
    }

    return res.json({
      generatedAt: nowIso,
      uptimeSeconds: Math.floor(process.uptime()),
      serverVersion: process.env.npm_package_version || null,
      dbSizeBytes,
      counts: {
        users: users.length,
        calendars: calendars.length,
        memberships: memberships.length,
        children: children.length,
        childFreeDays: childFreeDays.length,
        vacationEntries: vacationEntries.length,
        invitations: invitations.length,
        emailVerifications: verifications.length,
        activeSessions: sessions.length,
      },
      data: {
        users,
        calendars,
        memberships,
        children,
        childFreeDays,
        vacationEntries,
        invitations: invitations.map((row) => ({
          ...row,
          tokenHash: shortToken(row.tokenHash),
        })),
        emailVerifications: verifications.map((row) => ({
          ...row,
          tokenHash: shortToken(row.tokenHash),
        })),
        sessions: sessions.map((row) => ({
          ...row,
          token: shortToken(row.token),
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/admin/browse', requireAuth, requireAdmin, async (req, res) => {
  const db = openDb();
  try {
    const resource = String(req.query.resource || 'users');
    const query = String(req.query.query || '').trim();
    const limitRaw = Number(req.query.limit || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 50;

    if (!['users', 'calendars', 'vacation_entries'].includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }

    let sql = '';
    let params = [];

    if (resource === 'users') {
      sql = 'SELECT id, username, email, emailVerified, isAdmin, createdAt, updatedAt FROM users';
      if (query) {
        const id = Number(query);
        if (Number.isFinite(id)) {
          sql += ' WHERE id = ?';
          params = [id];
        } else {
          sql += ' WHERE username LIKE ? OR email LIKE ?';
          params = [`%${query}%`, `%${query}%`];
        }
      }
      sql += ' ORDER BY id DESC LIMIT ?';
      params.push(limit);
    }

    if (resource === 'calendars') {
      sql = 'SELECT id, name, ownerUserId, createdAt, updatedAt FROM calendars';
      if (query) {
        const id = Number(query);
        if (Number.isFinite(id)) {
          sql += ' WHERE id = ? OR ownerUserId = ?';
          params = [id, id];
        } else {
          sql += ' WHERE name LIKE ?';
          params = [`%${query}%`];
        }
      }
      sql += ' ORDER BY id DESC LIMIT ?';
      params.push(limit);
    }

    if (resource === 'vacation_entries') {
      sql = 'SELECT calendarId, date, userId, createdAt, updatedAt FROM vacation_entries';
      if (query) {
        const maybeNumber = Number(query);
        if (Number.isFinite(maybeNumber)) {
          sql += ' WHERE calendarId = ?';
          params = [maybeNumber];
        } else {
          sql += ' WHERE date LIKE ? OR userId LIKE ?';
          params = [`%${query}%`, `%${query}%`];
        }
      }
      sql += ' ORDER BY updatedAt DESC, date DESC LIMIT ?';
      params.push(limit);
    }

    const rows = await dbAll(db, sql, params);
    return res.json({ resource, query, limit, rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/admin/smtp/test', requireAuth, requireAdmin, async (req, res) => {
  const { to } = req.body || {};
  if (!to) {
    return res.status(400).json({ error: 'to is required' });
  }

  try {
    const smtp = await getEffectiveSmtpSettings();
    if (!smtp) {
      return res.status(400).json({ error: 'SMTP not configured' });
    }
    await sendSmtpTestMail({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      pass: smtp.pass,
      from: smtp.fromAddress,
      to: String(to),
      baseUrl: smtp.publicBaseUrl || '',
    });
    pushAdminLog('admin.smtp_test', `SMTP test sent to ${String(to)}`, { host: smtp.host, to: String(to) });
    return res.json({ success: true });
  } catch (error) {
    pushAdminLog('admin.smtp_test_failed', `SMTP test failed: ${error.message}`, { to: String(to) });
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/smtp', requireAuth, requireAdmin, async (req, res) => {
  try {
    const keyConfigured = Boolean(getAppSecretKeyBytes());
    const row = await loadSmtpSettingsFromDb();
    const envConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    const effective = await getEffectiveSmtpSettings();

    return res.json({
      keyConfigured,
      envConfigured,
      configured: Boolean(effective),
      source: effective?.source || null,
      settings: row ? {
        publicBaseUrl: row.publicBaseUrl || '',
        host: row.host || '',
        port: row.port || 587,
        secure: Boolean(row.secure),
        user: row.user || '',
        fromAddress: row.fromAddress || '',
        passConfigured: Boolean(row.passEnc),
        updatedAt: row.updatedAt || null,
      } : {
        publicBaseUrl: '',
        host: '',
        port: 587,
        secure: false,
        user: '',
        fromAddress: '',
        passConfigured: false,
        updatedAt: null,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/smtp', requireAuth, requireAdmin, async (req, res) => {
  try {
    const key = getAppSecretKeyBytes();
    if (!key) {
      return res.status(400).json({ error: 'APP_SECRET_KEY not configured' });
    }

    const {
      publicBaseUrl = '',
      host = '',
      port = 587,
      secure = false,
      user = '',
      pass = '',
      fromAddress = '',
    } = req.body || {};

    if (!host || !user) {
      return res.status(400).json({ error: 'host and user are required' });
    }

    const numericPort = Number(port);
    if (!Number.isFinite(numericPort) || numericPort <= 0 || numericPort > 65535) {
      return res.status(400).json({ error: 'Invalid port' });
    }

    const now = new Date().toISOString();
    const db = openDb();
    try {
      let current = await dbGet(db, 'SELECT passEnc, passIv, passTag FROM smtp_settings WHERE id = 1');
      let passEnc = current?.passEnc || null;
      let passIv = current?.passIv || null;
      let passTag = current?.passTag || null;

      if (pass && typeof pass === 'string') {
        const enc = encryptSecret(pass);
        passEnc = enc.enc;
        passIv = enc.iv;
        passTag = enc.tag;
      }

      await dbRun(
        db,
        `INSERT INTO smtp_settings (id, publicBaseUrl, host, port, secure, user, passEnc, passIv, passTag, fromAddress, updatedAt)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          publicBaseUrl = excluded.publicBaseUrl,
          host = excluded.host,
          port = excluded.port,
          secure = excluded.secure,
          user = excluded.user,
          passEnc = excluded.passEnc,
          passIv = excluded.passIv,
          passTag = excluded.passTag,
          fromAddress = excluded.fromAddress,
          updatedAt = excluded.updatedAt`,
        [
          String(publicBaseUrl || '').trim(),
          String(host).trim(),
          numericPort,
          secure ? 1 : 0,
          String(user).trim(),
          passEnc,
          passIv,
          passTag,
          String(fromAddress || '').trim(),
          now,
        ]
      );

      cachedSmtpSettings = null;
      pushAdminLog('admin.smtp_update', 'SMTP settings updated', { host: String(host).trim(), user: String(user).trim() });
      return res.json({ success: true });
    } finally {
      db.close();
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
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
    pushAdminLog('calendar.invite_create', `Invite created for calendarId=${calendarId} role=${normalizedRole}`, { calendarId, role: normalizedRole, expiresAt });
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

    pushAdminLog('calendar.invite_accept', `Invite accepted calendarId=${invite.calendarId} userId=${userId} role=${membershipRole}`, { calendarId: invite.calendarId, userId, role: membershipRole });

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
