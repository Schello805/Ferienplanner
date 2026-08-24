import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const DB_PATH = process.env.DB_PATH || path.join(path.dirname(__filename), 'data', 'database.sqlite');
const PORT = Number(process.env.PORT || 3000);
const HEALTH_URL = process.env.MONITOR_HEALTH_URL || `http://127.0.0.1:${PORT}/health`;
const APP_SECRET_KEY_PATH = process.env.APP_SECRET_KEY_PATH || path.join(path.dirname(DB_PATH), 'app-secret.key');
const ALERT_EMAIL = process.env.MONITOR_ALERT_EMAIL || 'info@schellenberger.biz';
const ERROR_RATE_THRESHOLD = Math.max(0, Number(process.env.MONITOR_ERROR_RATE_PERCENT || 5));
const ERROR_COUNT_THRESHOLD = Math.max(1, Number(process.env.MONITOR_ERROR_COUNT || 5));
const DISK_WARNING_PERCENT = Math.min(99, Math.max(1, Number(process.env.MONITOR_DISK_WARNING_PERCENT || 90)));
const DIGEST_MAX_AGE_DAYS = Math.max(31, Number(process.env.MONITOR_DIGEST_MAX_AGE_DAYS || 40));
const INVITATION_RETENTION_DAYS = Math.max(1, Number(process.env.INVITATION_RETENTION_DAYS || 90));
const DIGEST_RUN_RETENTION_DAYS = Math.max(1, Number(process.env.DIGEST_RUN_RETENTION_DAYS || 180));
const METRIC_RETENTION_DAYS = Math.max(1, Number(process.env.METRIC_RETENTION_DAYS || 90));
const ADMIN_LOG_RETENTION_DAYS = Math.max(1, Number(process.env.ADMIN_LOG_RETENTION_DAYS || 90));
const UNVERIFIED_USER_RETENTION_DAYS = Math.max(1, Number(process.env.UNVERIFIED_USER_RETENTION_DAYS || 7));

function openDb() {
  return new sqlite3.Database(DB_PATH);
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row))));
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows))));
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function closeDb(db) {
  return new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
}

function cutoffIso(days, now = Date.now()) {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(String(value)) : fallback;
  } catch {
    return fallback;
  }
}

function getSecretKey() {
  let secret = String(process.env.APP_SECRET_KEY || '').trim();
  if (!secret && fs.existsSync(APP_SECRET_KEY_PATH)) {
    secret = String(fs.readFileSync(APP_SECRET_KEY_PATH, 'utf8')).trim();
  }
  return secret ? crypto.createHash('sha256').update(secret, 'utf8').digest() : null;
}

function decryptSmtpPassword(row) {
  const key = getSecretKey();
  if (!key) throw new Error('APP_SECRET_KEY fehlt');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(row.passIv, 'base64'));
  decipher.setAuthTag(Buffer.from(row.passTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(row.passEnc, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

async function getSmtpSettings(db) {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT || 587);
    return {
      host: process.env.SMTP_HOST,
      port,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromAddress: process.env.SMTP_FROM || process.env.SMTP_USER,
    };
  }

  const row = await dbGet(db, 'SELECT * FROM smtp_settings WHERE id = 1');
  if (!row?.host || !row?.user || !row?.passEnc || !row?.passIv || !row?.passTag) return null;
  return {
    host: row.host,
    port: Number(row.port || 587),
    secure: Boolean(row.secure),
    user: row.user,
    pass: decryptSmtpPassword(row),
    fromAddress: row.fromAddress || row.user,
  };
}

export async function cleanupOperationalData(db, now = Date.now()) {
  const nowIso = new Date(now).toISOString();
  const invitationCutoff = cutoffIso(INVITATION_RETENTION_DAYS, now);
  const staleUserCutoff = cutoffIso(UNVERIFIED_USER_RETENTION_DAYS, now);
  const results = {};

  results.expiredSessions = (await dbRun(db, 'DELETE FROM sessions WHERE expiresAt IS NOT NULL AND expiresAt <= ?', [nowIso])).changes;
  results.expiredVerifications = (await dbRun(db, 'DELETE FROM email_verifications WHERE expiresAt IS NOT NULL AND expiresAt <= ?', [nowIso])).changes;
  results.oldInvitations = (await dbRun(
    db,
    `DELETE FROM calendar_invitations
     WHERE (usedAt IS NOT NULL AND usedAt < ?)
        OR (revokedAt IS NOT NULL AND revokedAt < ?)
        OR (usedAt IS NULL AND revokedAt IS NULL AND expiresAt IS NOT NULL AND expiresAt < ?)`,
    [invitationCutoff, invitationCutoff, invitationCutoff]
  )).changes;
  results.oldDigestRuns = (await dbRun(db, 'DELETE FROM digest_runs WHERE startedAt < ?', [cutoffIso(DIGEST_RUN_RETENTION_DAYS, now)])).changes;
  results.oldMetrics = (await dbRun(db, 'DELETE FROM runtime_metrics WHERE bucket < ?', [cutoffIso(METRIC_RETENTION_DAYS, now)])).changes;
  results.oldAdminLogs = (await dbRun(db, 'DELETE FROM admin_logs WHERE ts < ?', [cutoffIso(ADMIN_LOG_RETENTION_DAYS, now)])).changes;

  const staleUsers = await dbAll(
    db,
    `SELECT id FROM users
     WHERE emailVerified = 0 AND isAdmin = 0
       AND COALESCE(updatedAt, createdAt, '') != ''
       AND COALESCE(updatedAt, createdAt) < ?`,
    [staleUserCutoff]
  );
  for (const user of staleUsers) {
    await dbRun(db, 'DELETE FROM users WHERE id = ?', [user.id]);
  }
  results.staleUnverifiedUsers = staleUsers.length;
  return results;
}

async function checkHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(HEALTH_URL, { signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) throw new Error(`HTTP ${response.status}`);
    return { ok: true, version: body.version || null };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  } finally {
    clearTimeout(timeout);
  }
}

function checkDisk() {
  const stats = fs.statfsSync(path.dirname(DB_PATH));
  const totalBytes = Number(stats.blocks) * Number(stats.bsize);
  const freeBytes = Number(stats.bavail) * Number(stats.bsize);
  const usedPercent = totalBytes > 0 ? ((totalBytes - freeBytes) / totalBytes) * 100 : 0;
  return { totalBytes, freeBytes, usedPercent: Number(usedPercent.toFixed(1)) };
}

export function buildIssues({ health, disk, metrics, digest, calendarCount, installationAgeDays }) {
  const issues = [];
  if (!health.ok) issues.push({ key: 'health', title: 'Healthcheck fehlgeschlagen', detail: health.error || 'Backend nicht erreichbar' });
  if (disk.usedPercent >= DISK_WARNING_PERCENT) {
    issues.push({ key: 'disk', title: 'Speicherplatz wird knapp', detail: `${disk.usedPercent} % belegt, ${formatBytes(disk.freeBytes)} frei` });
  }

  const requestCount = Number(metrics?.requestCount || 0);
  const serverErrorCount = Number(metrics?.serverErrorCount || 0);
  const errorRate = requestCount > 0 ? (serverErrorCount / requestCount) * 100 : 0;
  if (serverErrorCount >= ERROR_COUNT_THRESHOLD && errorRate >= ERROR_RATE_THRESHOLD) {
    issues.push({ key: 'error-rate', title: 'Erhöhte API-Fehlerquote', detail: `${serverErrorCount} von ${requestCount} Anfragen (${errorRate.toFixed(1)} %) endeten mit HTTP 5xx` });
  }

  if (digest && !digest.success) {
    issues.push({ key: 'digest-failed', title: 'Letzter Digest-Lauf fehlgeschlagen', detail: digest.error || digest.startedAt || 'Unbekannter Fehler' });
  } else if (calendarCount > 0 && installationAgeDays >= DIGEST_MAX_AGE_DAYS) {
    const lastDigestAgeDays = digest?.startedAt ? (Date.now() - new Date(digest.startedAt).getTime()) / 86_400_000 : Infinity;
    if (lastDigestAgeDays > DIGEST_MAX_AGE_DAYS) {
      issues.push({ key: 'digest-overdue', title: 'Monatlicher Digest ist überfällig', detail: digest?.startedAt ? `Letzter Lauf: ${formatGermanDateTime(digest.startedAt)}` : 'Noch kein Lauf protokolliert' });
    }
  }
  return issues;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function formatGermanDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(date);
}

async function sendStatusEmail(db, { recovered, issues, result }) {
  const smtp = await getSmtpSettings(db);
  if (!smtp) throw new Error('SMTP ist nicht konfiguriert');
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass } });
  const subject = recovered ? 'Mein Ferienplaner: System wieder in Ordnung' : `Mein Ferienplaner: ${issues.length} Betriebswarnung${issues.length === 1 ? '' : 'en'}`;
  const issueText = recovered
    ? 'Die zuvor gemeldeten Betriebsprobleme sind nicht mehr aktiv.'
    : issues.map((issue) => `- ${issue.title}: ${issue.detail}`).join('\n');
  const text = `${issueText}\n\nHealthcheck: ${result.health.ok ? 'OK' : 'FEHLER'}\nSpeicher: ${result.disk.usedPercent} % belegt (${formatBytes(result.disk.freeBytes)} frei)\nAPI 5xx (24 h): ${result.metrics.serverErrorCount || 0} von ${result.metrics.requestCount || 0}\nGeprüft: ${formatGermanDateTime(result.checkedAt)}`;
  await transport.sendMail({
    from: smtp.fromAddress,
    to: ALERT_EMAIL,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a"><h2>${subject}</h2><p>${issueText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')}</p><hr><p>Healthcheck: <strong>${result.health.ok ? 'OK' : 'FEHLER'}</strong><br>Speicher: <strong>${result.disk.usedPercent} %</strong> belegt (${formatBytes(result.disk.freeBytes)} frei)<br>API 5xx (24 h): <strong>${result.metrics.serverErrorCount || 0}</strong> von ${result.metrics.requestCount || 0}<br>Geprüft: ${formatGermanDateTime(result.checkedAt)}</p></div>`,
  });
}

export async function runMaintenance() {
  if (!fs.existsSync(DB_PATH)) throw new Error(`Datenbank nicht gefunden: ${DB_PATH}`);
  const checkedAt = new Date().toISOString();
  const db = openDb();
  try {
    await dbRun(db, 'PRAGMA foreign_keys = ON');
    await dbRun(db, `CREATE TABLE IF NOT EXISTS monitor_state (id INTEGER PRIMARY KEY CHECK (id = 1), lastRunAt TEXT, lastAlertAt TEXT, activeIssuesJson TEXT, lastResultJson TEXT)`);
    const health = await checkHealth();
    const disk = checkDisk();
    const metrics = await dbGet(db, 'SELECT COALESCE(SUM(requestCount), 0) AS requestCount, COALESCE(SUM(serverErrorCount), 0) AS serverErrorCount FROM runtime_metrics WHERE bucket >= ?', [cutoffIso(1)]);
    const digest = await dbGet(db, 'SELECT startedAt, success, error FROM digest_runs ORDER BY id DESC LIMIT 1');
    const calendarCountRow = await dbGet(db, 'SELECT COUNT(*) AS count, MIN(createdAt) AS oldestAt FROM calendars');
    const oldestAt = calendarCountRow?.oldestAt ? new Date(calendarCountRow.oldestAt).getTime() : Date.now();
    const installationAgeDays = Math.max(0, (Date.now() - oldestAt) / 86_400_000);
    const cleanup = await cleanupOperationalData(db);
    const result = { checkedAt, health, disk, metrics, digest, cleanup };
    const issues = buildIssues({ health, disk, metrics, digest, calendarCount: Number(calendarCountRow?.count || 0), installationAgeDays });
    const state = await dbGet(db, 'SELECT * FROM monitor_state WHERE id = 1');
    const previousIssues = parseJson(state?.activeIssuesJson, []);
    const previousKeys = previousIssues.map((issue) => issue.key).sort().join(',');
    const currentKeys = issues.map((issue) => issue.key).sort().join(',');
    let lastAlertAt = state?.lastAlertAt || null;

    if (currentKeys && currentKeys !== previousKeys) {
      await sendStatusEmail(db, { recovered: false, issues, result });
      lastAlertAt = checkedAt;
    } else if (!currentKeys && previousKeys) {
      await sendStatusEmail(db, { recovered: true, issues: previousIssues, result });
      lastAlertAt = checkedAt;
    }

    await dbRun(
      db,
      `INSERT INTO monitor_state (id, lastRunAt, lastAlertAt, activeIssuesJson, lastResultJson)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET lastRunAt = excluded.lastRunAt, lastAlertAt = excluded.lastAlertAt,
         activeIssuesJson = excluded.activeIssuesJson, lastResultJson = excluded.lastResultJson`,
      [checkedAt, lastAlertAt, JSON.stringify(issues), JSON.stringify(result)]
    );
    await dbRun(db, 'INSERT INTO admin_logs (ts, event, detail, metaJson) VALUES (?, ?, ?, ?)', [checkedAt, issues.length ? 'monitor.warning' : 'monitor.ok', issues.length ? `${issues.length} Betriebswarnung(en)` : 'Betriebscheck erfolgreich', JSON.stringify({ issues, cleanup })]);
    process.stdout.write(`${JSON.stringify({ ok: issues.length === 0, issues, cleanup })}\n`);
    return { issues, cleanup };
  } finally {
    await closeDb(db);
  }
}

if (path.resolve(process.argv[1] || '') === __filename) {
  runMaintenance().catch((error) => {
    process.stderr.write(`[ferienplaner-monitor] ${error?.stack || error}\n`);
    process.exitCode = 1;
  });
}
