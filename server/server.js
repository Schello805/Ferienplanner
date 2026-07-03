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
import { execSync } from 'node:child_process';
import {
  buildAllowedOrigins,
  clearSessionCookies,
  createCorsOptions,
  getPublicBaseUrl,
  securityHeadersMiddleware,
  setSessionCookies,
  validatePublicBaseUrl,
} from './lib/http.js';
import { getBearerToken, getRequestedCalendarSlug } from './lib/auth-context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeBuildValue = (value) => String(value || '').trim();
const getGitRevision = (cwd) => {
  const fromEnv = normalizeBuildValue(process.env.APP_GIT_REVISION || process.env.GIT_COMMIT || process.env.SOURCE_VERSION);
  if (fromEnv) return fromEnv.slice(0, 8);

  try {
    return normalizeBuildValue(execSync('git rev-parse --short=8 HEAD', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    })).slice(0, 8);
  } catch {
    return '';
  }
};
const getBuildVersion = (releaseVersion, cwd) => {
  const normalizedRelease = normalizeBuildValue(releaseVersion) || '0.0.0';
  const revision = getGitRevision(cwd);
  return revision ? `${normalizedRelease}+${revision}` : normalizedRelease;
};

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
export const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
const APP_BUILD_VERSION = getBuildVersion(process.env.npm_package_version || '0.0.0', path.join(__dirname, '..'));
const APP_SECRET_KEY_PATH = process.env.APP_SECRET_KEY_PATH || path.join(path.dirname(DB_PATH), 'app-secret.key');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const AUTH_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;
const authAttemptStore = new Map();

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;
const UNVERIFIED_USER_RETENTION_DAYS = 7;
const UNVERIFIED_USER_RETENTION_MS = UNVERIFIED_USER_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const HIBP_TIMEOUT_MS = 5000;
const HIBP_CACHE_TTL_MS = 1000 * 60 * 60;

const SMTP_CACHE_TTL_MS = 1000 * 60 * 5;
const ADMIN_LOG_RETENTION_DAYS = 90;
const ADMIN_LOG_DEFAULT_LIMIT = 200;

let cachedSmtpSettings = null;

const hibpCache = new Map();
const ADMIN_NOTIFICATION_EMAIL = 'info@schellenberger.biz';
const FEEDBACK_NOTIFICATION_EMAIL = process.env.FEEDBACK_NOTIFICATION_EMAIL || 'info@mein-ferienplaner.de';

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

let validatedPublicBaseUrl = null;
try {
  validatedPublicBaseUrl = validatePublicBaseUrl({
    publicBaseUrl: process.env.PUBLIC_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
  });
} catch (error) {
  process.stderr.write(`[ferienplaner] ${error.message}\n`);
  process.stderr.write('[ferienplaner] Please set PUBLIC_BASE_URL in the environment, e.g. PUBLIC_BASE_URL=https://mein-ferienplaner.de\n');
  process.exit(1);
}

if (!validatedPublicBaseUrl && process.env.NODE_ENV !== 'test') {
  process.stderr.write('[ferienplaner] Warning: PUBLIC_BASE_URL is not set. This is only safe for local development.\n');
}

const allowedOrigins = buildAllowedOrigins({ port: PORT, publicBaseUrl: validatedPublicBaseUrl });
const corsOptions = createCorsOptions(allowedOrigins);

export const app = express();
app.set('trust proxy', true);
app.use(cors(corsOptions));
app.use(express.json());
app.disable('x-powered-by');

app.use(securityHeadersMiddleware);

app.use('/api', async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (error) {
    res.status(500).json({ error: `Database initialization failed: ${error.message}` });
  }
});

app.get('/email-verified', (req, res) => {
  const status = typeof req.query?.status === 'string' ? req.query.status : '';
  const title = 'Mein Ferienplaner';
  let headline = 'E-Mail bestätigen';
  let message = 'E-Mail konnte nicht bestätigt werden.';

  if (status === 'success') {
    headline = 'E-Mail bestätigt';
    message = 'Danke! Deine E-Mail-Adresse wurde bestätigt. Du kannst dich jetzt anmelden.';
  } else if (status === 'expired') {
    headline = 'Link abgelaufen';
    message = 'Dieser Bestätigungslink ist abgelaufen. Bitte registriere dich erneut.';
  } else if (status === 'notfound') {
    headline = 'Ungültiger Link';
    message = 'Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.';
  } else if (status === 'conflict') {
    headline = 'E-Mail bereits verwendet';
    message = 'Diese E-Mail-Adresse wird bereits verwendet.';
  }

  res
    .status(200)
    .set('Content-Type', 'text/html; charset=utf-8')
    .send(`<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 32px; background: #0b1220; color: #e5e7eb; }
      .card { max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { margin: 0 0 18px; line-height: 1.5; color: #d1d5db; }
      a.button { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 14px; border-radius: 10px; font-weight: 600; }
      a.button:focus, a.button:hover { background: #1d4ed8; }
      .hint { margin-top: 14px; font-size: 12px; opacity: 0.8; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${headline}</h1>
      <p>${message}</p>
      <a class="button" href="/">Zur Startseite</a>
      <div class="hint">Du kannst dieses Fenster jetzt schließen.</div>
    </div>
  </body>
</html>`);
});

async function consumeEmailVerificationToken(db, token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const row = await dbGet(
    db,
    'SELECT userId, expiresAt, type, newEmail FROM email_verifications WHERE tokenHash = ?',
    [tokenHash]
  );
  if (!row) {
    return { ok: false, status: 'notfound', httpStatus: 404, error: 'Verification not found' };
  }
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    await dbRun(db, 'DELETE FROM email_verifications WHERE tokenHash = ?', [tokenHash]);
    return { ok: false, status: 'expired', httpStatus: 410, error: 'Verification expired' };
  }

  const now = new Date().toISOString();
  const verificationType = row.type || 'register';

  if (verificationType === 'change_email') {
    const normalizedNewEmail = normalizeEmail(row.newEmail);
    if (!normalizedNewEmail || !isValidEmail(normalizedNewEmail)) {
      await dbRun(db, 'DELETE FROM email_verifications WHERE tokenHash = ?', [tokenHash]);
      return { ok: false, status: 'invalid', httpStatus: 400, error: 'Invalid email' };
    }

    const existing = await dbGet(
      db,
      'SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?',
      [normalizedNewEmail, row.userId]
    );
    if (existing) {
      return { ok: false, status: 'conflict', httpStatus: 409, error: 'Email already in use' };
    }

    await dbRun(
      db,
      'UPDATE users SET email = ?, emailVerified = 1, updatedAt = ? WHERE id = ?',
      [normalizedNewEmail, now, row.userId]
    );
    await dbRun(db, 'DELETE FROM email_verifications WHERE userId = ?', [row.userId]);
    pushAdminLog('auth.change_email_verified', `Email changed for userId=${row.userId}`, { userId: row.userId });
    return { ok: true, status: 'success', httpStatus: 200 };
  }

  await dbRun(db, 'UPDATE users SET emailVerified = 1, updatedAt = ? WHERE id = ?', [now, row.userId]);
  await dbRun(db, 'DELETE FROM email_verifications WHERE userId = ?', [row.userId]);
  pushAdminLog('auth.verify_email', `Email verified for userId=${row.userId}`, { userId: row.userId });
  return { ok: true, status: 'success', httpStatus: 200 };
}

app.get('/', async (req, res, next) => {
  const token = typeof req.query?.verifyEmail === 'string' ? req.query.verifyEmail : '';
  if (!token) return next();

  try {
    await dbReady;
  } catch (error) {
    return res.redirect('/email-verified?status=error');
  }

  const db = openDb();
  try {
    const result = await consumeEmailVerificationToken(db, token);
    return res.redirect(`/email-verified?status=${encodeURIComponent(result.status)}`);
  } catch (error) {
    return res.redirect('/email-verified?status=error');
  } finally {
    db.close();
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
    await cleanupStaleUnverifiedUsers(db, now);

    const conflicts = await dbAll(
      db,
      `SELECT id, username, email, emailVerified, isAdmin, createdAt, updatedAt
       FROM users
       WHERE username = ? OR lower(email) = lower(?)`,
      [String(username).trim(), normalizedEmail]
    );

    const blockingConflict = conflicts.find((entry) => Boolean(entry?.isAdmin) || Boolean(entry?.emailVerified));
    if (blockingConflict) {
      registerAuthFailure(req, String(username));
      return res.status(409).json({ error: 'User already exists' });
    }

    const renewableConflicts = conflicts.filter((entry) => !entry?.isAdmin && !entry?.emailVerified);
    if (renewableConflicts.length > 1) {
      registerAuthFailure(req, String(username));
      return res.status(409).json({ error: 'Registration could not be refreshed automatically. Please contact support.' });
    }

    const { salt, hash } = hashPassword(password);
    const renewableUser = renewableConflicts[0] || null;
    let userId;

    if (renewableUser) {
      await dbRun(
        db,
        `UPDATE users
         SET username = ?, email = ?, passwordHash = ?, passwordSalt = ?, updatedAt = ?
         WHERE id = ?`,
        [String(username).trim(), normalizedEmail, hash, salt, now, renewableUser.id]
      );
      await dbRun(db, 'DELETE FROM email_verifications WHERE userId = ?', [renewableUser.id]);
      userId = renewableUser.id;
    } else {
      const result = await dbRun(
        db,
        `INSERT INTO users (username, email, emailVerified, passwordHash, passwordSalt, isAdmin, createdAt, updatedAt)
         VALUES (?, ?, 0, ?, ?, 0, ?, ?)`,
        [String(username).trim(), normalizedEmail, hash, salt, now, now]
      );
      userId = result.lastID;
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

    await dbRun(
      db,
      "INSERT INTO email_verifications (tokenHash, userId, type, newEmail, createdAt, expiresAt) VALUES (?, ?, 'register', NULL, ?, ?)",
      [tokenHash, userId, now, expiresAt]
    );

    await sendVerificationEmail({ req, to: normalizedEmail, token });
    pushAdminLog(
      renewableUser ? 'auth.register_refresh' : 'auth.register',
      renewableUser
        ? `Registrierung erneuert: ${String(username).trim()}`
        : `User registered: ${String(username).trim()}`,
      {
        username: String(username).trim(),
        email: normalizedEmail,
        userId,
        refreshed: Boolean(renewableUser),
      }
    );
    clearAuthFailures(req, String(username));
    return res.json({ success: true, verificationResent: Boolean(renewableUser) });
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

  const db = openDb();
  try {
    const result = await consumeEmailVerificationToken(db, token);
    if (!result.ok) {
      return res.status(result.httpStatus).json({ error: result.error });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/auth/verify-email', async (req, res) => {
  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  if (!token) {
    return res.redirect('/email-verified?status=invalid');
  }

  try {
    await dbReady;
  } catch {
    return res.redirect('/email-verified?status=error');
  }

  const db = openDb();
  try {
    const result = await consumeEmailVerificationToken(db, token);
    return res.redirect(`/email-verified?status=${encodeURIComponent(result.status)}`);
  } catch {
    return res.redirect('/email-verified?status=error');
  } finally {
    db.close();
  }
});

app.get('/api/calendar/members', requireAuth, requireCalendarRole('owner'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  if (!calendarId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }

  const db = openDb();
  try {
    const rows = await dbAll(
      db,
      `SELECT users.id, users.username, users.email, calendar_memberships.role, calendar_memberships.createdAt
       FROM calendar_memberships
       JOIN users ON users.id = calendar_memberships.userId
       WHERE calendar_memberships.calendarId = ?
       ORDER BY calendar_memberships.role = 'owner' DESC, lower(users.username) ASC`,
      [calendarId]
    );
    return res.json({ members: rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.delete('/api/calendar/members/:userId', requireAuth, requireCalendarRole('owner'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const actingUserId = req.auth?.user?.id;
  const targetUserId = Number(req.params.userId);

  if (!calendarId || !actingUserId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: 'Invalid userId' });
  }
  if (targetUserId === actingUserId) {
    return res.status(400).json({ error: 'Owner cannot remove self' });
  }

  const db = openDb();
  try {
    const membership = await dbGet(
      db,
      'SELECT role FROM calendar_memberships WHERE calendarId = ? AND userId = ?',
      [calendarId, targetUserId]
    );
    if (!membership) {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (String(membership.role) === 'owner') {
      return res.status(400).json({ error: 'Cannot remove owner' });
    }

    const calendarRow = await dbGet(db, 'SELECT name FROM calendars WHERE id = ? LIMIT 1', [calendarId]);
    const targetUser = await dbGet(db, 'SELECT username, email FROM users WHERE id = ? LIMIT 1', [targetUserId]);
    const targetEmail = normalizeEmail(targetUser?.email || '');
    const targetUsername = targetUser?.username || '';
    const targetSettings = await getNotificationSettings(db, targetUserId);

    await dbRun(
      db,
      'DELETE FROM calendar_memberships WHERE calendarId = ? AND userId = ?',
      [calendarId, targetUserId]
    );

    if (
      targetEmail &&
      isValidEmail(targetEmail) &&
      targetSettings.enabled &&
      targetSettings.membershipEmailsEnabled
    ) {
      await sendBrandedEmail({
        req,
        to: targetEmail,
        subject: 'Mein Ferienplaner: Zugriff entzogen',
        previewText: 'Dein Zugriff auf einen Kalender wurde entfernt.',
        headline: 'Zugriff entzogen',
        subline: 'Kalenderfreigabe',
        bodyHtml: `Dein Zugriff auf den Kalender <strong>${String(calendarRow?.name || 'Kalender')}</strong> wurde entfernt.`
          + (targetUsername ? `<div style="height:10px"></div><div>Benutzer: <strong>${String(targetUsername).replace(/</g, '&lt;')}</strong></div>` : ''),
        ctaUrl: `${getPublicBaseUrl(req, PORT)}/hilfe`,
        ctaText: 'Hilfe öffnen',
        footerReason: 'Du erhältst diese E-Mail, weil du Benachrichtigungen zu Kalenderfreigaben aktiviert hast.',
      });
    }
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

function getAdminLogCutoffIso(now = Date.now()) {
  return new Date(now - ADMIN_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function getUnverifiedUserCutoffIso(now = Date.now()) {
  return new Date(now - UNVERIFIED_USER_RETENTION_MS).toISOString();
}

async function cleanupStaleUnverifiedUsers(db, nowIso = new Date().toISOString()) {
  const cutoffIso = getUnverifiedUserCutoffIso(new Date(nowIso).getTime());
  const staleUsers = await dbAll(
    db,
    `SELECT id, username, email, createdAt, updatedAt
     FROM users
     WHERE emailVerified = 0
       AND isAdmin = 0
       AND COALESCE(updatedAt, createdAt, '') != ''
       AND COALESCE(updatedAt, createdAt) < ?`,
    [cutoffIso]
  );

  for (const user of staleUsers) {
    await dbRun(db, 'DELETE FROM email_verifications WHERE userId = ?', [user.id]);
    await dbRun(db, 'DELETE FROM users WHERE id = ?', [user.id]);
    pushAdminLog('auth.cleanup_unverified_user', `Unverifiziertes Konto entfernt: ${String(user.username || user.id)}`, {
      userId: user.id,
      username: user.username || null,
      email: user.email || null,
      createdAt: user.createdAt || null,
      updatedAt: user.updatedAt || null,
      retentionDays: UNVERIFIED_USER_RETENTION_DAYS,
    });
  }

  return staleUsers.length;
}

async function persistAdminLog(event, detail = '', meta = null) {
  await dbReady;
  const db = openDb();
  try {
    const ts = new Date().toISOString();
    await dbRun(
      db,
      `INSERT INTO admin_logs (ts, event, detail, metaJson)
       VALUES (?, ?, ?, ?)`,
      [
        ts,
        String(event),
        String(detail || ''),
        meta == null ? null : JSON.stringify(meta),
      ]
    );
    await dbRun(db, 'DELETE FROM admin_logs WHERE ts < ?', [getAdminLogCutoffIso()]);
  } finally {
    db.close();
  }
}

function pushAdminLog(event, detail = '', meta = null) {
  void persistAdminLog(event, detail, meta).catch((error) => {
    process.stderr.write(`Failed to persist admin log: ${error?.message || error}\n`);
  });
}

async function listAdminLogs(limit = ADMIN_LOG_DEFAULT_LIMIT) {
  await dbReady;
  const db = openDb();
  try {
    const normalizedLimit = Number.isFinite(Number(limit))
      ? Math.max(1, Math.min(500, Math.floor(Number(limit))))
      : ADMIN_LOG_DEFAULT_LIMIT;
    await dbRun(db, 'DELETE FROM admin_logs WHERE ts < ?', [getAdminLogCutoffIso()]);
    const rows = await dbAll(
      db,
      `SELECT ts, event, detail, metaJson
       FROM admin_logs
       ORDER BY ts DESC
       LIMIT ?`,
      [normalizedLimit]
    );
    return rows
      .slice()
      .reverse()
      .map((row) => ({
        ts: row.ts,
        event: row.event,
        detail: row.detail || '',
        meta: (() => {
          if (!row.metaJson) return null;
          try {
            return JSON.parse(row.metaJson);
          } catch {
            return null;
          }
        })(),
      }));
  } finally {
    db.close();
  }
}

function formatGermanDate(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = String(value.getFullYear());
    return `${day}.${month}.${year}`;
  }

  const str = String(value);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = String(parsed.getFullYear());
    return `${day}.${month}.${year}`;
  }

  return str;
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

    const firstAdmin = await dbGet(db, 'SELECT id FROM users ORDER BY id ASC LIMIT 1');
    if (firstAdmin?.id) {
      await dbRun(db, 'UPDATE users SET isAdmin = CASE WHEN id = ? THEN 1 ELSE 0 END', [firstAdmin.id]);
    }

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
        slug TEXT,
        stateCode TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (ownerUserId) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    const calendarColumns = await dbAll(db, 'PRAGMA table_info(calendars)');
    const calendarColumnNames = new Set(calendarColumns.map((row) => row.name));
    if (!calendarColumnNames.has('slug')) {
      await dbRun(db, 'ALTER TABLE calendars ADD COLUMN slug TEXT');
    }
    if (!calendarColumnNames.has('stateCode')) {
      await dbRun(db, "ALTER TABLE calendars ADD COLUMN stateCode TEXT");
    }
    await dbRun(
      db,
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_calendars_slug_nocase ON calendars(lower(slug)) WHERE slug IS NOT NULL AND slug != ''"
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS notification_settings (
        userId INTEGER PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 1,
        inviteEmailsEnabled INTEGER NOT NULL DEFAULT 1,
        membershipEmailsEnabled INTEGER NOT NULL DEFAULT 1,
        digestEnabled INTEGER NOT NULL DEFAULT 1,
        digestMode TEXT NOT NULL DEFAULT 'always',
        digestThresholdDays INTEGER NOT NULL DEFAULT 3,
        updatedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        newCalendarAdminEmailsEnabled INTEGER NOT NULL DEFAULT 0,
        updatedAt TEXT
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        event TEXT NOT NULL,
        detail TEXT,
        metaJson TEXT
      )`
    );

    await dbRun(
      db,
      'CREATE INDEX IF NOT EXISTS idx_admin_logs_ts ON admin_logs(ts)'
    );

    await cleanupStaleUnverifiedUsers(db);

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS digest_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startedAt TEXT NOT NULL,
        finishedAt TEXT,
        success INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        metaJson TEXT
      )`
    );

    await dbRun(
      db,
      `CREATE TABLE IF NOT EXISTS calendar_recurring_rules (
        calendarId INTEGER NOT NULL,
        userKey TEXT NOT NULL,
        rulesJson TEXT NOT NULL,
        updatedAt TEXT,
        PRIMARY KEY (calendarId, userKey),
        FOREIGN KEY (calendarId) REFERENCES calendars(id) ON DELETE CASCADE
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
        recipientEmail TEXT,
        role TEXT NOT NULL DEFAULT 'viewer',
        tokenHash TEXT NOT NULL UNIQUE,
        createdAt TEXT,
        expiresAt TEXT,
        revokedAt TEXT,
        usedAt TEXT,
        usedByUserId INTEGER,
        FOREIGN KEY (calendarId) REFERENCES calendars(id) ON DELETE CASCADE,
        FOREIGN KEY (invitedByUserId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (usedByUserId) REFERENCES users(id) ON DELETE SET NULL
      )`
    );

    const inviteColumns = new Set((await dbAll(db, 'PRAGMA table_info(calendar_invitations)')).map((row) => row.name));
    if (!inviteColumns.has('revokedAt')) {
      await dbRun(db, 'ALTER TABLE calendar_invitations ADD COLUMN revokedAt TEXT');
    }
    if (!inviteColumns.has('recipientEmail')) {
      await dbRun(db, 'ALTER TABLE calendar_invitations ADD COLUMN recipientEmail TEXT');
    }

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

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function isValidEmail(email) {
  if (!email) return false;
  if (email.length > 254) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
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

async function loadAdminSettingsFromDb() {
  const db = openDb();
  try {
    const row = await dbGet(db, 'SELECT * FROM admin_settings WHERE id = 1');
    if (!row) return null;
    return row;
  } finally {
    db.close();
  }
}

async function getEffectiveAdminSettings() {
  const row = await loadAdminSettingsFromDb();
  return {
    newCalendarAdminEmailsEnabled: Boolean(row?.newCalendarAdminEmailsEnabled),
    updatedAt: row?.updatedAt || null,
  };
}

function resolvePublicBaseUrl(req, smtp = null) {
  const smtpBaseUrl = String(smtp?.publicBaseUrl || '').trim();
  if (smtpBaseUrl) return smtpBaseUrl.replace(/\/$/, '');
  const configured = String(process.env.PUBLIC_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (req && typeof req.get === 'function') {
    return getPublicBaseUrl(req, PORT);
  }
  return `http://localhost:${PORT}`;
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMultilineHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

async function sendBrandedEmail({ req, to, cc = '', replyTo = '', subject, previewText, headline, subline, bodyHtml, ctaUrl, ctaText, footerReason }) {
  const smtp = await getEffectiveSmtpSettings();
  const baseUrl = resolvePublicBaseUrl(req, smtp);
  const safeBaseUrl = String(baseUrl).replace(/\/$/, '');
  const resolvedCtaUrl = (() => {
    if (!ctaUrl) return '';
    const raw = String(ctaUrl).trim();
    if (!raw) return '';
    if (raw.startsWith('/')) {
      return `${safeBaseUrl}${raw}`;
    }

    try {
      const parsed = new URL(raw);
      const hostname = String(parsed.hostname || '').toLowerCase();
      if ((hostname === 'localhost' || hostname === '127.0.0.1') && safeBaseUrl) {
        return `${safeBaseUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return parsed.toString();
    } catch {
      return raw;
    }
  })();
  const logoUrl = `${safeBaseUrl}/ferienplaner-logo-2026.png`;
  const helpUrl = `${safeBaseUrl}/hilfe`;
  const imprintUrl = `${safeBaseUrl}/impressum`;
  const privacyUrl = `${safeBaseUrl}/datenschutz`;
  const logoPath = path.join(__dirname, '..', 'Logo Ferienplaner.png');
  const hasLogo = fs.existsSync(logoPath);

  if (!smtp) {
    process.stderr.write('SMTP not configured; cannot send email.\n');
    process.stderr.write(`To: ${to} Subject: ${subject}\n`);
    if (cc) {
      process.stderr.write(`Cc: ${cc}\n`);
    }
    return;
  }

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const appName = 'Mein Ferienplaner';
  const resolvedLogoSrc = hasLogo ? 'cid:ferienplaner-logo' : logoUrl;
  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${appName}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${String(previewText || '').replace(/</g, '&lt;')}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <tr>
              <td style="padding:20px 20px 8px 20px;color:#0f172a">
                <div style="display:flex;align-items:center;gap:10px">
                  <img src="${resolvedLogoSrc}" width="32" height="32" alt="${appName}" style="display:block;width:32px;height:32px;max-width:32px;max-height:32px;border-radius:10px;border:1px solid #e2e8f0;background:#ffffff" />
                  <div style="min-width:0">
                    <div style="font-weight:800;font-size:18px;letter-spacing:-0.02em">${appName}</div>
                    <div style="margin-top:6px;font-size:13px;color:#64748b">${String(subline || '')}</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px 20px 20px;color:#0f172a">
                <div style="font-weight:800;font-size:16px;letter-spacing:-0.01em">${String(headline || '')}</div>
                <div style="height:10px"></div>
                <div style="font-size:14px;line-height:1.55;color:#334155">${bodyHtml || ''}</div>
                ${resolvedCtaUrl ? `
                <div style="height:16px"></div>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" bgcolor="#38bdf8" style="border-radius:12px">
                      <a href="${resolvedCtaUrl}" style="display:inline-block;padding:12px 16px;font-weight:800;font-size:14px;color:#0b1220;text-decoration:none">${String(ctaText || 'Öffnen')}</a>
                    </td>
                  </tr>
                </table>
                <div style="height:16px"></div>
                <div style="font-size:12px;line-height:1.5;color:#475569">
                  Falls der Button nicht funktioniert, öffne diesen Link:
                  <div style="margin-top:8px;word-break:break-all">
                    <a href="${resolvedCtaUrl}" style="color:#0284c7;text-decoration:underline">${resolvedCtaUrl}</a>
                  </div>
                </div>` : ''}
              </td>
            </tr>
          </table>
          <div style="max-width:560px;margin-top:10px;color:#64748b;font-size:11px;line-height:1.4">
            <div>${String(footerReason || '').replace(/</g, '&lt;')}</div>
            <div style="margin-top:6px">
              <a href="${helpUrl}" style="color:#64748b;text-decoration:underline">Hilfe</a>
              <span style="opacity:0.5"> · </span>
              <a href="${imprintUrl}" style="color:#64748b;text-decoration:underline">Impressum</a>
              <span style="opacity:0.5"> · </span>
              <a href="${privacyUrl}" style="color:#64748b;text-decoration:underline">Datenschutz</a>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const plainText = `${String(headline || '')}\n\n${String(previewText || '')}\n\n${resolvedCtaUrl ? `${resolvedCtaUrl}\n\n` : ''}${String(footerReason || '')}`;

  const fromValue = String(smtp.fromAddress || '').includes('<')
    ? smtp.fromAddress
    : `Mein Ferienkalender <${smtp.fromAddress}>`;

  const payload = {
    from: fromValue,
    to,
    ...(cc ? { cc } : {}),
    ...(replyTo ? { replyTo } : {}),
    subject,
    text: plainText,
    html,
    attachments: hasLogo
      ? [
        {
          filename: 'logo.png',
          path: logoPath,
          cid: 'ferienplaner-logo',
        },
      ]
      : [],
  };

  try {
    await transport.sendMail(payload);
  } catch (error) {
    if (!replyTo) {
      throw error;
    }

    process.stderr.write(`Mailversand mit Reply-To fehlgeschlagen, erneuter Versuch ohne Reply-To: ${error.message}\n`);
    const fallbackPayload = { ...payload };
    delete fallbackPayload.replyTo;
    await transport.sendMail(fallbackPayload);
  }
}

function getGermanRoleLabel(role) {
  if (role === 'editor') return 'Bearbeiter';
  return 'Leser';
}

function computeInvitationExpiresAt({ mode, days }) {
  const now = Date.now();
  if (mode === 'unlimited') return null;
  if (mode === 'year') {
    const date = new Date();
    date.setUTCMonth(11, 31);
    date.setUTCHours(23, 59, 59, 999);
    return date.toISOString();
  }

  const numericExpires = Number(days);
  const expiresDays = Number.isFinite(numericExpires) ? Math.max(1, Math.min(365, Math.floor(numericExpires))) : 14;
  return new Date(now + expiresDays * 24 * 60 * 60 * 1000).toISOString();
}

async function sendVerificationEmail({ req, to, token }) {
  const smtp = await getEffectiveSmtpSettings();
  const baseUrl = resolvePublicBaseUrl(req, smtp);
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

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
  const logoPath = path.join(__dirname, '..', 'Logo Ferienplaner.png');
  const hasLogo = fs.existsSync(logoPath);
  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${appName}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${previewText}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <tr>
              <td style="padding:20px 20px 8px 20px;color:#0f172a">
                <div style="display:flex;align-items:center;gap:10px">
                  ${hasLogo ? `<img src="cid:ferienplaner-logo" width="64" height="64" alt="${appName}" style="display:block;width:64px;height:64px;max-width:64px;max-height:64px;border-radius:10px" />` : ''}
                  <div>
                    <div style="font-weight:800;font-size:18px;letter-spacing:-0.02em">${appName}</div>
                    <div style="margin-top:4px;font-size:13px;color:#64748b">E-Mail bestätigen</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px 20px 20px;color:#0f172a">
                <div style="font-size:14px;line-height:1.5;color:#334155">
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
                <div style="font-size:12px;line-height:1.5;color:#475569">
                  Falls der Button nicht funktioniert, öffne diesen Link:
                  <div style="margin-top:8px;word-break:break-all">
                    <a href="${verifyUrl}" style="color:#0284c7;text-decoration:underline">${verifyUrl}</a>
                  </div>
                </div>
                <div style="height:16px"></div>
                <div style="font-size:12px;color:#64748b">Der Link ist 24 Stunden gültig.</div>
              </td>
            </tr>
          </table>
          <div style="max-width:560px;margin-top:10px;color:#64748b;font-size:11px;line-height:1.4">
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
    attachments: hasLogo
      ? [
        {
          filename: 'logo.png',
          path: logoPath,
          cid: 'ferienplaner-logo',
        },
      ]
      : [],
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

async function maybeNotifyAdminAboutNewCalendar({ userId, calendarId }) {
  const adminSettings = await getEffectiveAdminSettings();
  if (!adminSettings.newCalendarAdminEmailsEnabled) {
    return;
  }

  const db = openDb();
  try {
    const [userRow, calendarRow, smtp] = await Promise.all([
      dbGet(db, 'SELECT username, email FROM users WHERE id = ? LIMIT 1', [userId]),
      dbGet(db, 'SELECT name, slug, createdAt FROM calendars WHERE id = ? LIMIT 1', [calendarId]),
      getEffectiveSmtpSettings(),
    ]);

    if (!smtp) {
      pushAdminLog(
        'admin.calendar_created_email_skipped',
        `Hinweis zu neuem Kalender übersprungen: SMTP nicht konfiguriert (calendarId=${calendarId})`,
        { userId, calendarId, recipient: ADMIN_NOTIFICATION_EMAIL }
      );
      return;
    }

    const baseUrl = resolvePublicBaseUrl(null, smtp);
    const calendarLabel = calendarRow?.name || 'Mein Kalender';
    const calendarUrl = `${baseUrl}/app${calendarRow?.slug ? `?calendar=${encodeURIComponent(calendarRow.slug)}` : ''}`;
    const createdAt = calendarRow?.createdAt || new Date().toISOString();
    const safeEmail = normalizeEmail(userRow?.email || '');

    await sendBrandedEmail({
      req: null,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: 'Mein Ferienplaner: Neuer Kalender erstellt',
      previewText: `Ein neuer Kalender wurde von ${userRow?.username || 'einem Benutzer'} angelegt.`,
      headline: 'Neuer Kalender in der Instanz',
      subline: 'Admin-Benachrichtigung',
      bodyHtml: `
        <p>Es wurde ein neuer Kalender erstellt.</p>
        <ul style="margin:12px 0 0 18px;padding:0">
          <li><strong>Benutzer:</strong> ${String(userRow?.username || '—')}</li>
          <li><strong>E-Mail:</strong> ${safeEmail || '—'}</li>
          <li><strong>Kalender:</strong> ${String(calendarLabel)}</li>
          <li><strong>Kalender-ID:</strong> ${String(calendarId)}</li>
          <li><strong>Erstellt am:</strong> ${String(createdAt)}</li>
        </ul>
      `,
      ctaUrl: calendarUrl,
      ctaText: 'Zum Kalender',
      footerReason: 'Du erhältst diese E-Mail, weil die Admin-Benachrichtigung für neue Kalender aktiviert ist.',
    });

    pushAdminLog(
      'admin.calendar_created_email_sent',
      `Hinweis zu neuem Kalender an ${ADMIN_NOTIFICATION_EMAIL} gesendet`,
      { userId, calendarId, recipient: ADMIN_NOTIFICATION_EMAIL }
    );
  } catch (error) {
    pushAdminLog(
      'admin.calendar_created_email_failed',
      `Hinweis zu neuem Kalender fehlgeschlagen: ${error.message}`,
      { userId, calendarId, recipient: ADMIN_NOTIFICATION_EMAIL }
    );
  } finally {
    db.close();
  }
}

async function ensureUserCalendarContext(userId) {
  const db = openDb();
  try {
    let membership = await dbGet(
      db,
      `SELECT calendars.id, calendars.name, calendars.slug, calendar_memberships.role
       FROM calendar_memberships
       JOIN calendars ON calendars.id = calendar_memberships.calendarId
       WHERE calendar_memberships.userId = ?
       ORDER BY calendar_memberships.role = 'owner' DESC, calendars.id ASC
       LIMIT 1`,
      [userId]
    );

    let createdCalendarId = null;

    if (!membership) {
      const createdAt = new Date().toISOString();
      const calendarResult = await dbRun(
        db,
        `INSERT INTO calendars (name, ownerUserId, stateCode, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        ['Mein Kalender', userId, 'BY', createdAt, createdAt]
      );
      await dbRun(
        db,
        `INSERT INTO calendar_memberships (calendarId, userId, role, createdAt)
         VALUES (?, ?, 'owner', ?)`,
        [calendarResult.lastID, userId, createdAt]
      );
      membership = { id: calendarResult.lastID, name: 'Mein Kalender', role: 'owner' };
      createdCalendarId = calendarResult.lastID;
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

    if (createdCalendarId) {
      await maybeNotifyAdminAboutNewCalendar({ userId, calendarId: createdCalendarId });
    }

    return {
      id: membership.id,
      name: membership.name,
      slug: membership.slug || null,
      role: membership.role || 'owner',
    };
  } finally {
    db.close();
  }
}

function normalizeCalendarSlug(input) {
  const raw = String(input || '').trim().toLowerCase();
  const cleaned = raw
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned;
}

async function getCalendarContextBySlug(userId, slugRaw) {
  const slug = normalizeCalendarSlug(slugRaw);
  if (!slug) return null;

  const db = openDb();
  try {
    const row = await dbGet(
      db,
      `SELECT calendars.id, calendars.name, calendars.slug, calendar_memberships.role
       FROM calendars
       JOIN calendar_memberships ON calendar_memberships.calendarId = calendars.id
       WHERE calendar_memberships.userId = ? AND lower(calendars.slug) = lower(?)
       LIMIT 1`,
      [userId, slug]
    );
    if (!row) return null;
    return { id: row.id, name: row.name, slug: row.slug || null, role: row.role || 'viewer' };
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
      calendar: (await getCalendarContextBySlug(row.id, getRequestedCalendarSlug(req))) || (await ensureUserCalendarContext(row.id)),
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
  res.json({
    ok: true,
    version: APP_BUILD_VERSION,
  });
});

app.get('/api/auth/status', async (req, res) => {
  try {
    const authState = await getAuthState(req);
    if (authState.authenticated) {
      setSessionCookies(req, res, authState, SESSION_TTL_MS);
    } else {
      clearSessionCookies(req, res);
    }
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
    const calendar = await ensureUserCalendarContext(result.lastID);
    setSessionCookies(req, res, { token: session.token, calendar }, SESSION_TTL_MS);
    pushAdminLog('auth.bootstrap', `Bootstrap admin created: ${String(username).trim()}`, { username: String(username).trim(), userId: result.lastID });
    return res.json({
      success: true,
      token: session.token,
      user: { id: result.lastID, username: String(username).trim(), email: normalizedEmail || '', emailVerified: true, isAdmin: true },
      calendar,
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
    const calendar = await ensureUserCalendarContext(user.id);
    setSessionCookies(req, res, { token: session.token, calendar }, SESSION_TTL_MS);
    return res.json({
      success: true,
      token: session.token,
      user: { id: user.id, username: user.username, email: user.email || '', emailVerified: Boolean(user.emailVerified), isAdmin: Boolean(user.isAdmin) },
      calendar,
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
    clearSessionCookies(req, res);
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
  const { username, password } = req.body;
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
      [String(username).trim(), hash, salt, 0, now, now]
    );
    await ensureUserCalendarContext(result.lastID);
    pushAdminLog('admin.create_user', `Admin created user: ${String(username).trim()}`, { username: String(username).trim(), userId: result.lastID, isAdmin: false });
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

app.post('/api/auth/delete-account', requireAuth, async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  const userId = req.auth?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = openDb();
  try {
    const user = await dbGet(
      db,
      'SELECT id, passwordHash, passwordSalt FROM users WHERE id = ?',
      [userId]
    );
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    const ownedCalendars = await dbAll(db, 'SELECT id FROM calendars WHERE ownerUserId = ?', [userId]);
    const ownedCalendarIds = ownedCalendars
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    await dbRun(db, 'BEGIN TRANSACTION');
    try {
      if (ownedCalendarIds.length > 0) {
        const placeholders = ownedCalendarIds.map(() => '?').join(',');

        await dbRun(db, `DELETE FROM vacation_entries WHERE calendarId IN (${placeholders})`, ownedCalendarIds);
        await dbRun(db, `DELETE FROM vacations WHERE calendarId IN (${placeholders})`, ownedCalendarIds);
        await dbRun(db, `DELETE FROM child_free_days WHERE calendarId IN (${placeholders})`, ownedCalendarIds);
        await dbRun(db, `DELETE FROM children WHERE calendarId IN (${placeholders})`, ownedCalendarIds);
        await dbRun(db, `DELETE FROM calendar_invitations WHERE calendarId IN (${placeholders})`, ownedCalendarIds);
        await dbRun(db, `DELETE FROM calendar_memberships WHERE calendarId IN (${placeholders})`, ownedCalendarIds);
        await dbRun(db, `DELETE FROM calendars WHERE id IN (${placeholders})`, ownedCalendarIds);
      }

      await dbRun(db, 'DELETE FROM sessions WHERE userId = ?', [userId]);
      await dbRun(db, 'DELETE FROM email_verifications WHERE userId = ?', [userId]);
      await dbRun(db, 'DELETE FROM users WHERE id = ?', [userId]);

      await dbRun(db, 'COMMIT');
    } catch (error) {
      await dbRun(db, 'ROLLBACK');
      throw error;
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path === '/feedback') {
    return next();
  }
  return requireAuth(req, res, next);
});

app.get('/api/calendar/slug', (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  if (!calendarId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }
  return res.json({ slug: req.auth?.calendar?.slug || null });
});

app.post('/api/calendar/slug', requireCalendarRole('owner'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const userId = req.auth?.user?.id;
  if (!calendarId || !userId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }

  const requestedSlug = normalizeCalendarSlug(req.body?.slug || '');
  if (!requestedSlug || requestedSlug.length < 3) {
    return res.status(400).json({ error: 'Slug must be at least 3 characters (a-z, 0-9, -)' });
  }
  if (requestedSlug.length > 48) {
    return res.status(400).json({ error: 'Slug is too long (max 48)' });
  }

  const db = openDb();
  try {
    const existing = await dbGet(
      db,
      'SELECT id FROM calendars WHERE lower(slug) = lower(?) AND id != ? LIMIT 1',
      [requestedSlug, calendarId]
    );
    if (existing) {
      return res.status(409).json({ error: 'Slug already taken' });
    }

    const now = new Date().toISOString();
    await dbRun(
      db,
      'UPDATE calendars SET slug = ?, updatedAt = ? WHERE id = ?',
      [requestedSlug, now, calendarId]
    );

    const calendar = await ensureUserCalendarContext(userId);
    return res.json({ success: true, calendar });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/calendar/settings', async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  if (!calendarId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }

  const db = openDb();
  try {
    const row = await dbGet(db, 'SELECT stateCode FROM calendars WHERE id = ? LIMIT 1', [calendarId]);
    return res.json({ stateCode: row?.stateCode || 'BY' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/calendar/settings', requireCalendarRole('owner'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  if (!calendarId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }

  const stateCode = String(req.body?.stateCode || 'BY').toUpperCase();
  if (!VALID_STATE_CODES.has(stateCode)) {
    return res.status(400).json({ error: `Unsupported state: ${stateCode}` });
  }

  const db = openDb();
  try {
    await dbRun(db, 'UPDATE calendars SET stateCode = ?, updatedAt = ? WHERE id = ?', [stateCode, new Date().toISOString(), calendarId]);
    return res.json({ success: true, stateCode });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/calendar/recurring-rules', async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  if (!calendarId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }

  const db = openDb();
  try {
    const rows = await dbAll(
      db,
      'SELECT userKey, rulesJson, updatedAt FROM calendar_recurring_rules WHERE calendarId = ?',
      [calendarId]
    );
    const rules = { p1: [], p2: [] };
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.rulesJson || '[]');
        if (row.userKey === 'p1') rules.p1 = Array.isArray(parsed) ? parsed : [];
        if (row.userKey === 'p2') rules.p2 = Array.isArray(parsed) ? parsed : [];
      } catch {
        // ignore broken rows
      }
    }
    return res.json({ rules });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/calendar/recurring-rules', requireCalendarRole('editor'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const { userKey, rules } = req.body || {};

  if (!calendarId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }

  const normalizedUserKey = userKey === 'p1' || userKey === 'p2' ? userKey : null;
  if (!normalizedUserKey) {
    return res.status(400).json({ error: 'userKey must be p1 or p2' });
  }
  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: 'rules must be an array' });
  }

  const rulesJson = JSON.stringify(rules);
  if (rulesJson.length > 100_000) {
    return res.status(400).json({ error: 'rules payload too large' });
  }

  const db = openDb();
  try {
    const now = new Date().toISOString();
    await dbRun(
      db,
      `INSERT INTO calendar_recurring_rules (calendarId, userKey, rulesJson, updatedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(calendarId, userKey) DO UPDATE SET rulesJson = excluded.rulesJson, updatedAt = excluded.updatedAt`,
      [calendarId, normalizedUserKey, rulesJson, now]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

async function getNotificationSettings(db, userId) {
  const row = await dbGet(
    db,
    `SELECT enabled, inviteEmailsEnabled, membershipEmailsEnabled, digestEnabled, digestMode, digestThresholdDays
     FROM notification_settings WHERE userId = ?`,
    [userId]
  );
  if (!row) {
    return {
      enabled: true,
      inviteEmailsEnabled: true,
      membershipEmailsEnabled: true,
      digestEnabled: true,
      digestMode: 'always',
      digestThresholdDays: 3,
    };
  }
  return {
    enabled: Boolean(row.enabled),
    inviteEmailsEnabled: Boolean(row.inviteEmailsEnabled),
    membershipEmailsEnabled: Boolean(row.membershipEmailsEnabled),
    digestEnabled: Boolean(row.digestEnabled),
    digestMode: row.digestMode === 'threshold' ? 'threshold' : 'always',
    digestThresholdDays: Number.isFinite(Number(row.digestThresholdDays)) ? Math.max(0, Math.floor(Number(row.digestThresholdDays))) : 3,
  };
}

app.get('/api/notifications/settings', async (req, res) => {
  const userId = req.auth?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = openDb();
  try {
    const settings = await getNotificationSettings(db, userId);
    return res.json({ settings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/notifications/settings', async (req, res) => {
  const userId = req.auth?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const body = req.body || {};
  const enabled = body.enabled !== undefined ? Boolean(body.enabled) : true;
  const inviteEmailsEnabled = body.inviteEmailsEnabled !== undefined ? Boolean(body.inviteEmailsEnabled) : true;
  const membershipEmailsEnabled = body.membershipEmailsEnabled !== undefined ? Boolean(body.membershipEmailsEnabled) : true;
  const digestEnabled = body.digestEnabled !== undefined ? Boolean(body.digestEnabled) : true;
  const digestMode = body.digestMode === 'threshold' ? 'threshold' : 'always';
  const digestThresholdDaysRaw = Number(body.digestThresholdDays);
  const digestThresholdDays = Number.isFinite(digestThresholdDaysRaw) ? Math.max(0, Math.min(366, Math.floor(digestThresholdDaysRaw))) : 3;

  const db = openDb();
  try {
    const now = new Date().toISOString();
    await dbRun(
      db,
      `INSERT INTO notification_settings (
        userId,
        enabled,
        inviteEmailsEnabled,
        membershipEmailsEnabled,
        digestEnabled,
        digestMode,
        digestThresholdDays,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        enabled = excluded.enabled,
        inviteEmailsEnabled = excluded.inviteEmailsEnabled,
        membershipEmailsEnabled = excluded.membershipEmailsEnabled,
        digestEnabled = excluded.digestEnabled,
        digestMode = excluded.digestMode,
        digestThresholdDays = excluded.digestThresholdDays,
        updatedAt = excluded.updatedAt`,
      [
        userId,
        enabled ? 1 : 0,
        inviteEmailsEnabled ? 1 : 0,
        membershipEmailsEnabled ? 1 : 0,
        digestEnabled ? 1 : 0,
        digestMode,
        digestThresholdDays,
        now,
      ]
    );
    const settings = await getNotificationSettings(db, userId);
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
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
      serverVersion: APP_BUILD_VERSION,
      smtpConfigured,
      smtpUpdatedAt: smtpUpdatedAtRow?.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/admin/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = req.query?.limit;
    const entries = await listAdminLogs(limit);
    return res.json({ entries });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await getEffectiveAdminSettings();
    return res.json({ settings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  const settings = req.body || {};
  const newCalendarAdminEmailsEnabled = Boolean(settings.newCalendarAdminEmailsEnabled);
  const db = openDb();
  try {
    const now = new Date().toISOString();
    await dbRun(
      db,
      `INSERT INTO admin_settings (id, newCalendarAdminEmailsEnabled, updatedAt)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        newCalendarAdminEmailsEnabled = excluded.newCalendarAdminEmailsEnabled,
        updatedAt = excluded.updatedAt`,
      [newCalendarAdminEmailsEnabled ? 1 : 0, now]
    );
    pushAdminLog('admin.settings_update', 'Admin-Benachrichtigungen aktualisiert', {
      newCalendarAdminEmailsEnabled,
    });
    return res.json({
      success: true,
      settings: {
        newCalendarAdminEmailsEnabled,
        updatedAt: now,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

function formatDateOnlyUtc(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWeekendLocal(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function startOfWeekLocal(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekdayOccurrenceInMonthLocal(date) {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function parseLocalDateInput(value) {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function isRecurringDayMatchLocal(date, selectedDays = [], rule = { frequency: 'weekly' }) {
  if (!Array.isArray(selectedDays) || !selectedDays.includes(date.getDay())) return false;

  const frequency = rule?.frequency || 'weekly';
  if (frequency === 'weekly') return true;

  const anchorDate = parseLocalDateInput(rule?.anchorDate);
  if (!anchorDate) return true;
  if (date < anchorDate) return false;

  if (frequency === 'biweekly') {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekDiff = Math.round((startOfWeekLocal(date) - startOfWeekLocal(anchorDate)) / msPerWeek);
    return weekDiff % 2 === 0;
  }

  if (frequency === 'monthly') {
    return getWeekdayOccurrenceInMonthLocal(date) === getWeekdayOccurrenceInMonthLocal(anchorDate);
  }

  return true;
}

function matchesAnyRecurringRuleLocal(date, rules = []) {
  if (!Array.isArray(rules)) return false;
  return rules.some((rule) => isRecurringDayMatchLocal(date, rule?.days || [], rule));
}

async function loadCalendarRecurringRules(db, calendarId) {
  const rows = await dbAll(
    db,
    'SELECT userKey, rulesJson FROM calendar_recurring_rules WHERE calendarId = ?',
    [calendarId]
  );
  const rules = { p1: [], p2: [] };
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.rulesJson || '[]');
      if (row.userKey === 'p1') rules.p1 = Array.isArray(parsed) ? parsed : [];
      if (row.userKey === 'p2') rules.p2 = Array.isArray(parsed) ? parsed : [];
    } catch {
      // ignore
    }
  }
  return rules;
}

async function loadCalendarStateCode(db, calendarId) {
  const row = await dbGet(db, 'SELECT stateCode FROM calendars WHERE id = ? LIMIT 1', [calendarId]);
  const code = String(row?.stateCode || 'BY').toUpperCase();
  return VALID_STATE_CODES.has(code) ? code : 'BY';
}

async function getHolidaysForYear({ year, stateCode }) {
  const hd = new Holidays('DE', stateCode);
  const publicHolidaysRaw = hd.getHolidays(year);
  const publicHolidays = publicHolidaysRaw
    .filter((h) => h.type === 'public')
    .map((h) => ({ date: normalizeDateOnly(h.date) }))
    .filter((h) => h.date);

  let schoolHolidays = [];
  try {
    const response = await axios.get(`https://schulferien-api.de/api/v1/${year}/${stateCode}/`, { timeout: 3000 });
    schoolHolidays = (response.data || []).map((h) => ({
      start: normalizeDateOnly(h.start),
      end: normalizeDateOnly(h.end),
      name: h.name || h.title || h.slug || 'Ferien',
    })).filter((h) => h.start && h.end);
  } catch {
    schoolHolidays = (STATIC_HOLIDAYS[stateCode]?.[year]?.school || []).map((h) => ({
      start: normalizeDateOnly(h.start),
      end: normalizeDateOnly(h.end),
      name: h.name || 'Ferien',
    })).filter((h) => h.start && h.end);
  }

  return {
    public: publicHolidays,
    school: schoolHolidays,
  };
}

function isDateInSchoolHoliday(dateString, schoolHolidays) {
  return (schoolHolidays || []).some((h) => dateString >= h.start && dateString <= h.end);
}

function isPublicHoliday(dateString, publicHolidays) {
  return (publicHolidays || []).some((h) => h.date === dateString);
}

async function computeUnattendedDates({ db, calendarId, startDate, endDate }) {
  const stateCode = await loadCalendarStateCode(db, calendarId);
  const rules = await loadCalendarRecurringRules(db, calendarId);

  const years = new Set([startDate.getFullYear(), endDate.getFullYear()]);
  const holidaysByYear = new Map();
  for (const year of years) {
    holidaysByYear.set(year, await getHolidaysForYear({ year, stateCode }));
  }

  const children = await dbAll(
    db,
    'SELECT id, usesSchoolHolidays FROM children WHERE calendarId = ?',
    [calendarId]
  );
  const childrenById = new Map(children.map((c) => [Number(c.id), { id: Number(c.id), usesSchoolHolidays: Boolean(c.usesSchoolHolidays) }]));

  const childFreeDays = await dbAll(
    db,
    'SELECT childId, startDate, endDate, label FROM child_free_days WHERE calendarId = ? AND endDate >= ? AND startDate <= ?',
    [calendarId, formatDateOnlyUtc(new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()))), formatDateOnlyUtc(new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())))]
  );

  const vacations = await dbAll(
    db,
    'SELECT date, userId FROM vacation_entries WHERE calendarId = ? AND date >= ? AND date <= ?',
    [calendarId, normalizeDateOnly(formatDateOnlyUtc(new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())))), normalizeDateOnly(formatDateOnlyUtc(new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()))))]
  );
  const vacationsMap = new Map(vacations.map((v) => [String(v.date), String(v.userId || '')]));

  const unattendedDates = [];

  for (let d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()); d <= endDate; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const holidays = holidaysByYear.get(year);
    const dateString = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const weekend = isWeekendLocal(d);
    if (weekend) continue;

    if (isPublicHoliday(dateString, holidays?.public || [])) continue;

    const isSchoolHoliday = isDateInSchoolHoliday(dateString, holidays?.school || []);

    let requiresCare = false;

    if (childrenById.size === 0) {
      requiresCare = isSchoolHoliday;
    } else {
      if (isSchoolHoliday) {
        for (const child of childrenById.values()) {
          if (child.usesSchoolHolidays) {
            requiresCare = true;
            break;
          }
        }
      }

      if (!requiresCare && childFreeDays.length > 0) {
        for (const entry of childFreeDays) {
          const child = childrenById.get(Number(entry.childId));
          if (!child) continue;
          if (dateString >= String(entry.startDate) && dateString <= String(entry.endDate)) {
            requiresCare = true;
            break;
          }
        }
      }
    }

    if (!requiresCare) continue;

    const vacationUserId = vacationsMap.get(dateString) || '';
    const hasP1 = vacationUserId === 'p1' || vacationUserId === 'both';
    const hasP2 = vacationUserId === 'p2' || vacationUserId === 'both';
    const hasCare = vacationUserId === 'care';

    const isP1Free = matchesAnyRecurringRuleLocal(d, rules.p1);
    const isP2Free = matchesAnyRecurringRuleLocal(d, rules.p2);

    if (!hasP1 && !hasP2 && !hasCare && !isP1Free && !isP2Free) {
      unattendedDates.push(dateString);
    }
  }

  return unattendedDates;
}

async function sendDigestForCalendar({ req, db, calendarId, startDate, endDate, includeNextYearHint }) {
  const unattendedDates = await computeUnattendedDates({ db, calendarId, startDate, endDate });
  const calendarRow = await dbGet(db, 'SELECT name FROM calendars WHERE id = ? LIMIT 1', [calendarId]);
  const calendarName = String(calendarRow?.name || 'Kalender');

  const members = await dbAll(
    db,
    `SELECT users.id, users.email, users.username
     FROM calendar_memberships
     JOIN users ON users.id = calendar_memberships.userId
     WHERE calendar_memberships.calendarId = ?`,
    [calendarId]
  );

  for (const member of members) {
    const userId = Number(member.id);
    const email = normalizeEmail(member.email || '');
    if (!email || !isValidEmail(email)) continue;

    const settings = await getNotificationSettings(db, userId);
    if (!settings.enabled || !settings.digestEnabled) continue;

    if (settings.digestMode === 'threshold' && unattendedDates.length <= settings.digestThresholdDays) {
      continue;
    }

    const rangeLabel = `${formatGermanDate(startDate)} bis ${formatGermanDate(endDate)}`;
    const unattendedPreview = unattendedDates.slice(0, 25);
    const extraCount = unattendedDates.length - unattendedPreview.length;

    const listHtml = unattendedDates.length === 0
      ? '<div>Keine unbetreuten Tage gefunden. 👍</div>'
      : `<div>Unbetreute Tage: <strong>${unattendedDates.length}</strong></div>`
        + '<div style="height:10px"></div>'
        + `<ul style="margin:0;padding-left:18px">${unattendedPreview.map((d) => `<li>${formatGermanDate(d)}</li>`).join('')}</ul>`
        + (extraCount > 0 ? `<div style="height:10px"></div><div>… und ${extraCount} weitere.</div>` : '');

    const hintHtml = includeNextYearHint
      ? '<div style="height:14px"></div><div><strong>Hinweis:</strong> Ab Dezember lohnt es sich, bereits die Planung für das Folgejahr zu starten.</div>'
      : '';

    await sendBrandedEmail({
      req,
      to: email,
      subject: `Mein Ferienplaner: Jahresübersicht Betreuung (${new Date().getFullYear()})`,
      previewText: `Übersicht unbetreuter Tage (${rangeLabel}).`,
      headline: 'Betreuungs-Übersicht',
      subline: calendarName,
      bodyHtml: `<div>Zeitraum: <strong>${rangeLabel}</strong></div><div style="height:12px"></div>${listHtml}${hintHtml}`,
      ctaUrl: `${getPublicBaseUrl(req, PORT)}/app`,
      ctaText: 'Kalender öffnen',
      footerReason: 'Du erhältst diese E-Mail, weil du Benachrichtigungen (Jahresübersicht) aktiviert hast.',
    });
  }

  return {
    unattendedCount: unattendedDates.length,
  };
}

app.post('/api/admin/digest/run', requireAuth, requireAdmin, async (req, res) => {
  const db = openDb();
  try {
    const startedAt = new Date().toISOString();
    pushAdminLog('admin.digest_run_started', `Digest run started at ${startedAt}`, { startedAt });
    const runRow = await dbRun(
      db,
      'INSERT INTO digest_runs (startedAt, success) VALUES (?, 0)',
      [startedAt]
    );
    const digestRunId = Number(runRow?.lastID);

    const today = new Date();
    const year = today.getFullYear();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(year, 11, 31);
    const includeNextYearHint = today.getMonth() >= 11;

    const calendars = await dbAll(db, 'SELECT id FROM calendars ORDER BY id ASC');
    const results = [];
    for (const cal of calendars) {
      const calendarId = Number(cal.id);
      if (!Number.isInteger(calendarId) || calendarId <= 0) continue;
      const result = await sendDigestForCalendar({ req, db, calendarId, startDate: start, endDate: end, includeNextYearHint });
      results.push({ calendarId, ...result });
    }

    const finishedAt = new Date().toISOString();
    try {
      const metaJson = JSON.stringify({ year, calendars: results.length });
      if (Number.isInteger(digestRunId) && digestRunId > 0) {
        await dbRun(
          db,
          'UPDATE digest_runs SET finishedAt = ?, success = 1, error = NULL, metaJson = ? WHERE id = ?',
          [finishedAt, metaJson, digestRunId]
        );
      }
    } catch {
      // ignore
    }

    pushAdminLog('admin.digest_run_success', `Digest run success year=${year} calendars=${results.length}`, {
      startedAt,
      finishedAt,
      year,
      calendars: results.length,
    });

    return res.json({ success: true, year, range: { start: normalizeDateOnly(formatDateOnlyUtc(new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())))), end: `${year}-12-31` }, results });
  } catch (error) {
    const startedAt = new Date().toISOString();
    try {
      const finishedAt = new Date().toISOString();
      const safeError = String(error?.message || error || 'unknown error').slice(0, 2000);
      const last = await dbGet(db, 'SELECT id FROM digest_runs ORDER BY id DESC LIMIT 1');
      const digestRunId = Number(last?.id);
      if (Number.isInteger(digestRunId) && digestRunId > 0) {
        await dbRun(
          db,
          'UPDATE digest_runs SET finishedAt = ?, success = 0, error = ? WHERE id = ?',
          [finishedAt, safeError, digestRunId]
        );
      }

      pushAdminLog('admin.digest_run_failed', `Digest run failed: ${safeError}`, {
        startedAt,
        finishedAt,
      });
    } catch {
      // ignore
    }
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/admin/digest/status', requireAuth, requireAdmin, async (req, res) => {
  const db = openDb();
  try {
    const row = await dbGet(
      db,
      'SELECT id, startedAt, finishedAt, success, error, metaJson FROM digest_runs ORDER BY id DESC LIMIT 1'
    );
    if (!row) {
      return res.json({ status: null });
    }
    let meta = null;
    try {
      meta = row.metaJson ? JSON.parse(String(row.metaJson)) : null;
    } catch {
      meta = null;
    }
    return res.json({
      status: {
        id: Number(row.id),
        startedAt: row.startedAt || null,
        finishedAt: row.finishedAt || null,
        success: Boolean(row.success),
        error: row.error || null,
        meta,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
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

    const digestAdminTokenConfigured = Boolean(process.env.DIGEST_ADMIN_TOKEN);

    return res.json({
      generatedAt: nowIso,
      uptimeSeconds: Math.floor(process.uptime()),
      serverVersion: APP_BUILD_VERSION,
      digestAdminTokenConfigured,
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

app.post('/api/feedback', async (req, res) => {
  const smtp = await getEffectiveSmtpSettings();
  if (!smtp) {
    return res.status(503).json({ error: 'Feedback ist aktuell nicht verfügbar.' });
  }

  const {
    kind = 'feedback',
    contact = '',
    message = '',
    pageUrl = '',
    userAgent = '',
    website = '',
  } = req.body || {};

  if (String(website || '').trim()) {
    return res.json({ success: true });
  }

  const normalizedKind = kind === 'bug' ? 'bug' : 'feedback';
  const trimmedContact = String(contact || '').trim().slice(0, 300);
  const trimmedMessage = String(message || '').trim().slice(0, 5000);
  const trimmedPageUrl = String(pageUrl || '').trim().slice(0, 500);
  const trimmedUserAgent = String(userAgent || '').trim().slice(0, 500);

  if (!trimmedMessage || trimmedMessage.length < 5) {
    return res.status(400).json({ error: 'Bitte beschreibe dein Feedback oder den Fehler.' });
  }

  const kindLabel = normalizedKind === 'bug' ? 'Bugmeldung' : 'Feedback';
  const replyToMatch = trimmedContact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const replyTo = replyToMatch ? normalizeEmail(replyToMatch[0]) : '';
  const subject = normalizedKind === 'bug'
    ? 'Mein Ferienplaner: Neue Bugmeldung'
    : 'Mein Ferienplaner: Neues Feedback';

  try {
    await sendBrandedEmail({
      req,
      to: FEEDBACK_NOTIFICATION_EMAIL,
      replyTo,
      subject,
      previewText: `${kindLabel} wurde direkt aus der App gesendet.`,
      headline: kindLabel,
      subline: 'Feedback aus der App',
      bodyHtml:
        `<div><strong>Typ:</strong> ${kindLabel}</div>`
        + `<div style="height:10px"></div>`
        + `<div><strong>Kontakt für Rückfragen:</strong> ${trimmedContact ? escapeHtml(trimmedContact) : 'nicht angegeben'}</div>`
        + (trimmedPageUrl ? `<div style="height:10px"></div><div><strong>Seite:</strong> <a href="${escapeHtml(trimmedPageUrl)}" style="color:#93c5fd;text-decoration:underline">${escapeHtml(trimmedPageUrl)}</a></div>` : '')
        + (trimmedUserAgent ? `<div style="height:10px"></div><div><strong>Browser / Gerät:</strong> ${escapeHtml(trimmedUserAgent)}</div>` : '')
        + `<div style="height:14px"></div>`
        + `<div><strong>Nachricht:</strong></div>`
        + `<div style="margin-top:8px;padding:12px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;color:#0f172a">${formatMultilineHtml(trimmedMessage)}</div>`,
      footerReason: 'Diese Nachricht wurde über den Feedback-Dialog in Mein Ferienplaner gesendet.',
    });

    pushAdminLog('public.feedback_submit', `${kindLabel} gesendet`, {
      kind: normalizedKind,
      contact: trimmedContact || null,
      pageUrl: trimmedPageUrl || null,
      replyTo: replyTo || null,
      recipient: FEEDBACK_NOTIFICATION_EMAIL,
    });

    return res.json({ success: true });
  } catch (error) {
    pushAdminLog('public.feedback_failed', `Feedbackversand fehlgeschlagen: ${error.message}`, {
      kind: normalizedKind,
      contact: trimmedContact || null,
      replyTo: replyTo || null,
      recipient: FEEDBACK_NOTIFICATION_EMAIL,
      error: error.message,
    });
    return res.status(500).json({ error: 'Feedback konnte nicht gesendet werden. Bitte Mail-Ziel oder SMTP prüfen.' });
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
  const { role = 'viewer', expiresInDays = 3, expiresMode = 'days' } = req.body || {};

  const normalizedRole = ['viewer', 'editor'].includes(role) ? role : 'viewer';
  const normalizedMode = ['days', 'year', 'unlimited'].includes(expiresMode) ? expiresMode : 'days';

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const createdAt = new Date().toISOString();
  const expiresAt = computeInvitationExpiresAt({ mode: normalizedMode, days: expiresInDays });

  const db = openDb();
  try {
    await dbRun(
      db,
      `INSERT INTO calendar_invitations (calendarId, invitedByUserId, recipientEmail, role, tokenHash, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [calendarId, userId, null, normalizedRole, tokenHash, createdAt, expiresAt]
    );

    const baseUrl = process.env.PUBLIC_BASE_URL || req.get('origin') || `http://localhost:${PORT}`;
    const inviteUrl = `${String(baseUrl).replace(/\/$/, '')}/app?invite=${token}`;
    pushAdminLog('calendar.invite_create', `Invite created for calendarId=${calendarId} role=${normalizedRole}`, { calendarId, role: normalizedRole, expiresAt, expiresMode: normalizedMode });
    return res.json({ success: true, token, inviteUrl, role: normalizedRole, expiresAt });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.get('/api/invitations', requireAuth, requireCalendarRole('owner'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  if (!calendarId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }

  const db = openDb();
  try {
    const rows = await dbAll(
      db,
      `SELECT
         calendar_invitations.id,
         calendar_invitations.role,
         calendar_invitations.recipientEmail,
         calendar_invitations.createdAt,
         calendar_invitations.expiresAt,
         calendar_invitations.revokedAt,
         calendar_invitations.usedAt,
         calendar_invitations.usedByUserId,
         invitedBy.username AS invitedByUsername,
         invitedBy.email AS invitedByEmail,
         usedBy.username AS usedByUsername,
         usedBy.email AS usedByEmail
       FROM calendar_invitations
       JOIN users AS invitedBy ON invitedBy.id = calendar_invitations.invitedByUserId
       LEFT JOIN users AS usedBy ON usedBy.id = calendar_invitations.usedByUserId
       WHERE calendar_invitations.calendarId = ?
       ORDER BY calendar_invitations.createdAt DESC, calendar_invitations.id DESC`,
      [calendarId]
    );

    const now = Date.now();
    const withStatus = (rows || []).map((row) => {
      let status = 'pending';
      if (row.revokedAt) status = 'revoked';
      else if (row.usedAt) status = 'active';
      else if (row.expiresAt && new Date(row.expiresAt).getTime() < now) status = 'expired';
      return { ...row, status };
    });

    return res.json({ invitations: withStatus });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.delete('/api/invitations/:id', requireAuth, requireCalendarRole('owner'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const inviteId = Number(req.params.id);
  if (!calendarId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }
  if (!Number.isInteger(inviteId) || inviteId <= 0) {
    return res.status(400).json({ error: 'Invalid invitation id' });
  }

  const db = openDb();
  try {
    const row = await dbGet(
      db,
      `SELECT id, usedAt, revokedAt
       FROM calendar_invitations
       WHERE id = ? AND calendarId = ?`,
      [inviteId, calendarId]
    );
    if (!row) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    if (row.usedAt) {
      return res.status(409).json({ error: 'Invitation already used' });
    }
    if (row.revokedAt) {
      return res.json({ success: true });
    }

    const now = new Date().toISOString();
    await dbRun(db, 'UPDATE calendar_invitations SET revokedAt = ? WHERE id = ? AND calendarId = ?', [now, inviteId, calendarId]);
    pushAdminLog('calendar.invite_revoke', `Invite revoked id=${inviteId} calendarId=${calendarId}`, { calendarId, inviteId });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

app.post('/api/invitations/send-email', requireCalendarRole('owner'), async (req, res) => {
  const calendarId = req.auth?.calendar?.id;
  const userId = req.auth?.user?.id;
  const { role = 'viewer', expiresInDays = 3, expiresMode = 'days', email } = req.body || {};

  if (!calendarId || !userId) {
    return res.status(400).json({ error: 'Calendar context missing' });
  }

  const to = normalizeEmail(email);
  if (!to || !isValidEmail(to)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const normalizedRole = ['viewer', 'editor'].includes(role) ? role : 'viewer';
  const normalizedMode = ['days', 'year', 'unlimited'].includes(expiresMode) ? expiresMode : 'days';

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const createdAt = new Date().toISOString();
  const expiresAt = computeInvitationExpiresAt({ mode: normalizedMode, days: expiresInDays });

  const db = openDb();
  try {
    const calendarRow = await dbGet(db, 'SELECT name, slug FROM calendars WHERE id = ? LIMIT 1', [calendarId]);
    const ownerRow = await dbGet(db, 'SELECT username, email FROM users WHERE id = ? LIMIT 1', [userId]);

    await dbRun(
      db,
      `INSERT INTO calendar_invitations (calendarId, invitedByUserId, recipientEmail, role, tokenHash, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [calendarId, userId, to, normalizedRole, tokenHash, createdAt, expiresAt]
    );

    const baseUrl = process.env.PUBLIC_BASE_URL || req.get('origin') || `http://localhost:${PORT}`;
    const inviteUrl = `${String(baseUrl).replace(/\/$/, '')}/app?invite=${token}`;
    const calendarUrl = calendarRow?.slug
      ? `${String(baseUrl).replace(/\/$/, '')}/k/${String(calendarRow.slug)}`
      : `${String(baseUrl).replace(/\/$/, '')}/app`;

    const existingUser = await dbGet(db, 'SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1', [to]);
    if (existingUser?.id) {
      const settings = await getNotificationSettings(db, Number(existingUser.id));
      if (!settings.enabled || !settings.inviteEmailsEnabled) {
        pushAdminLog('calendar.invite_email_skipped', `Invite email skipped (disabled by recipient) calendarId=${calendarId}`, {
          calendarId,
          to,
          recipientUserId: Number(existingUser.id),
        });
        return res.json({
          success: true,
          token,
          inviteUrl,
          role: normalizedRole,
          expiresAt,
          emailSkipped: true,
          skipReason: 'recipient_disabled',
        });
      }
    }

    const roleLabel = getGermanRoleLabel(normalizedRole);
    const inviterName = String(ownerRow?.username || '').replace(/</g, '&lt;');
    const inviterEmail = normalizeEmail(ownerRow?.email || '');
    const inviterLabel = inviterEmail ? `${inviterName} &lt;${String(inviterEmail).replace(/</g, '&lt;')}&gt;` : inviterName;
    const ownerCc = inviterEmail && inviterEmail !== to ? inviterEmail : '';
    const validUntilLabel = expiresAt ? formatGermanDate(expiresAt) : 'unbegrenzt';

    await sendBrandedEmail({
      req,
      to,
      cc: ownerCc,
      subject: 'Mein Ferienplaner: Einladung zum Kalender',
      previewText: 'Du wurdest zu einem Kalender eingeladen.',
      headline: 'Einladung zum Kalender',
      subline: 'Kalender teilen',
      bodyHtml: `Du wurdest zu dem Kalender <strong>${String(calendarRow?.name || 'Kalender')}</strong> eingeladen.`
        + `<div style="height:10px"></div>`
        + `<div>Kalender-Link: <a href="${calendarUrl}" style="color:#93c5fd;text-decoration:underline">${calendarUrl}</a></div>`
        + `<div style="height:10px"></div>`
        + `<div>Rolle: <strong>${roleLabel}</strong></div>`
        + (inviterLabel ? `<div>Einladung von: <strong>${inviterLabel}</strong></div>` : '')
        + `<div>Gültig bis: <strong>${validUntilLabel}</strong></div>`,
      ctaUrl: inviteUrl,
      ctaText: 'Einladung annehmen',
      footerReason: 'Du erhältst diese E-Mail, weil dich jemand zu einem Kalender in Mein Ferienplaner eingeladen hat.',
    });

    pushAdminLog('calendar.invite_email_sent', `Invite email sent calendarId=${calendarId} role=${normalizedRole}`, {
      calendarId,
      role: normalizedRole,
      expiresAt,
      expiresMode: normalizedMode,
      to,
      cc: ownerCc || null,
    });

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
      `SELECT id, calendarId, role, expiresAt, revokedAt, usedAt
       FROM calendar_invitations
       WHERE tokenHash = ?`,
      [tokenHash]
    );

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    if (invite.revokedAt) {
      return res.status(410).json({ error: 'Invitation revoked' });
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

    try {
      const settings = await getNotificationSettings(db, userId);
      const userRow = await dbGet(db, 'SELECT username, email FROM users WHERE id = ? LIMIT 1', [userId]);
      const email = normalizeEmail(userRow?.email || '');
      if (email && isValidEmail(email) && settings.enabled && settings.membershipEmailsEnabled) {
        const calendarRow = await dbGet(db, 'SELECT name FROM calendars WHERE id = ? LIMIT 1', [invite.calendarId]);
        await sendBrandedEmail({
          req,
          to: email,
          subject: 'Mein Ferienplaner: Zugriff erhalten',
          previewText: 'Du hast Zugriff auf einen Kalender erhalten.',
          headline: 'Zugriff erhalten',
          subline: 'Kalenderfreigabe',
          bodyHtml: `Du hast Zugriff auf den Kalender <strong>${String(calendarRow?.name || 'Kalender')}</strong> erhalten.`
            + `<div style="height:10px"></div>`
            + `<div>Rolle: <strong>${membershipRole === 'editor' ? 'Editor' : membershipRole}</strong></div>`,
          ctaUrl: `${getPublicBaseUrl(req, PORT)}/app`,
          ctaText: 'Kalender öffnen',
          footerReason: 'Du erhältst diese E-Mail, weil du Benachrichtigungen zu Kalenderfreigaben aktiviert hast.',
        });
      }
    } catch {
      // ignore notification errors
    }

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

export function startServer(port = PORT, host) {
  const server = app.listen(port, host, () => {
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
