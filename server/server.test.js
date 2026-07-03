import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sqlite3 from 'sqlite3';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ferienplaner-test-'));
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(tempDir, 'database.sqlite');

const { startServer } = await import('./server.js');
const server = await new Promise((resolve) => {
  const instance = startServer(0);
  instance.on('listening', () => resolve(instance));
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, data };
};

const withDb = async (callback) => {
  const db = new sqlite3.Database(process.env.DB_PATH);
  try {
    return await callback({
      run(sql, params = []) {
        return new Promise((resolve, reject) => {
          db.run(sql, params, function onRun(error) {
            if (error) reject(error);
            else resolve(this);
          });
        });
      },
      get(sql, params = []) {
        return new Promise((resolve, reject) => {
          db.get(sql, params, (error, row) => {
            if (error) reject(error);
            else resolve(row);
          });
        });
      },
      all(sql, params = []) {
        return new Promise((resolve, reject) => {
          db.all(sql, params, (error, rows) => {
            if (error) reject(error);
            else resolve(rows);
          });
        });
      },
    });
  } finally {
    await new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
  }
};

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('auth bootstrap creates first admin and protects API', async () => {
  const unauthorized = await request('/api/vacations');
  assert.equal(unauthorized.response.status, 401);
  assert.equal(unauthorized.data.setupRequired, true);
  assert.equal(unauthorized.response.headers.get('x-frame-options'), 'DENY');

  const bootstrap = await request('/api/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'secret12345' }),
  });

  assert.equal(bootstrap.response.status, 200);
  assert.equal(bootstrap.data.user.username, 'admin');
  assert.equal(bootstrap.data.user.isAdmin, true);
  assert.ok(bootstrap.data.token);
});

test('each user sees only their own default calendar data', async () => {
  const loginAdmin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'secret12345' }),
  });
  const adminToken = loginAdmin.data.token;
  assert.ok(adminToken);

  const createUser = await request('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ username: 'user2', password: 'secret45678', isAdmin: false }),
  });
  assert.equal(createUser.response.status, 200);

  const adminCreateVacation = await request('/api/vacations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ date: '2026-08-03', userId: 'p1' }),
  });
  assert.equal(adminCreateVacation.response.status, 200);

  const loginUser2 = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user2', password: 'secret45678' }),
  });
  const user2Token = loginUser2.data.token;
  assert.ok(user2Token);

  const user2Vacations = await request('/api/vacations', {
    headers: { Authorization: `Bearer ${user2Token}` },
  });
  assert.equal(user2Vacations.response.status, 200);
  assert.deepEqual(user2Vacations.data, []);

  const adminVacations = await request('/api/vacations', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminVacations.response.status, 200);
  assert.deepEqual(adminVacations.data, [{ date: '2026-08-03', userId: 'p1' }]);
});

test('rate limiting blocks repeated failed logins', async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const failed = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ghost-user', password: 'wrong-password-1' }),
    });
    assert.equal(failed.response.status, 401);
  }

  const limited = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ghost-user', password: 'wrong-password-1' }),
  });

  assert.equal(limited.response.status, 429);
  assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
});

test('password change invalidates other sessions of the same user', async () => {
  const firstLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'secret12345' }),
  });
  const secondLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'secret12345' }),
  });

  const firstToken = firstLogin.data.token;
  const secondToken = secondLogin.data.token;
  assert.ok(firstToken);
  assert.ok(secondToken);

  const changed = await request('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${firstToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'secret12345',
      newPassword: 'updated12345',
    }),
  });
  assert.equal(changed.response.status, 200);

  const staleSession = await request('/api/vacations', {
    headers: { Authorization: `Bearer ${secondToken}` },
  });
  assert.equal(staleSession.response.status, 401);

  const currentSession = await request('/api/vacations', {
    headers: { Authorization: `Bearer ${firstToken}` },
  });
  assert.equal(currentSession.response.status, 200);
});

test('auth status accepts token and calendar slug from cookies', async () => {
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'updated12345' }),
  });

  const token = login.data.token;
  assert.ok(token);

  const saveSlug = await request('/api/calendar/slug', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ slug: 'schellenberger' }),
  });
  assert.equal(saveSlug.response.status, 200);

  const response = await request('/api/auth/status', {
    headers: {
      Cookie: `ferienplanerAuthToken=${encodeURIComponent(token)}; ferienplanerTargetSlug=schellenberger`,
    },
  });

  assert.equal(response.response.status, 200);
  assert.equal(response.data.authenticated, true);
  assert.equal(response.data.calendar?.slug, 'schellenberger');
});

test('login sets httpOnly auth cookie and readable calendar slug cookie', async () => {
  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'updated12345' }),
  });

  assert.equal(login.response.status, 200);
  const setCookieHeader = login.response.headers.get('set-cookie') || '';
  assert.match(setCookieHeader, /ferienplanerAuthToken=/);
  assert.match(setCookieHeader, /HttpOnly/i);
  assert.match(setCookieHeader, /ferienplanerTargetSlug=/);
});

test('admin can enable new calendar email notifications and calendar creation logs the trigger', async () => {
  const loginAdmin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'updated12345' }),
  });
  const adminToken = loginAdmin.data.token;
  assert.ok(adminToken);

  const saveSettings = await request('/api/admin/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ newCalendarAdminEmailsEnabled: true }),
  });

  assert.equal(saveSettings.response.status, 200);
  assert.equal(saveSettings.data.settings.newCalendarAdminEmailsEnabled, true);

  const createUser = await request('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ username: 'notify-user', password: 'notify12345', isAdmin: false }),
  });
  assert.equal(createUser.response.status, 200);

  const logsResponse = await request('/api/admin/logs?limit=50', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(logsResponse.response.status, 200);
  const events = (logsResponse.data.entries || []).map((entry) => entry.event);
  assert.ok(events.includes('admin.settings_update'));
  assert.ok(events.includes('admin.create_user'));
});

test('invitation list includes recipient email for emailed invites', async () => {
  await withDb(async (db) => {
    await db.run('UPDATE users SET email = ? WHERE username = ?', ['admin@example.com', 'admin']);
  });

  const loginAdmin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'updated12345' }),
  });
  const adminToken = loginAdmin.data.token;
  assert.ok(adminToken);

  const sendInvite = await request('/api/invitations/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ email: 'elternteil@example.com', role: 'editor', expiresMode: 'days', expiresInDays: 5 }),
  });

  assert.equal(sendInvite.response.status, 200);
  assert.equal(sendInvite.data.success, true);

  const invitations = await request('/api/invitations', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(invitations.response.status, 200);
  assert.ok(Array.isArray(invitations.data.invitations));
  assert.equal(invitations.data.invitations[0]?.recipientEmail, 'elternteil@example.com');

  const logsResponse = await request('/api/admin/logs?limit=20', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.equal(logsResponse.response.status, 200);
  const inviteLog = (logsResponse.data.entries || []).find((entry) => entry.event === 'calendar.invite_email_sent');
  assert.ok(inviteLog);
  assert.equal(inviteLog.meta?.to, 'elternteil@example.com');
  assert.equal(inviteLog.meta?.cc, 'admin@example.com');
});

test('re-registering an unverified account refreshes the verification flow and password', async () => {
  const firstAttempt = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pending-user', email: 'pending@example.com', password: 'secret12345' }),
  });
  assert.equal(firstAttempt.response.status, 200);
  assert.equal(firstAttempt.data.verificationResent, false);

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  await withDb(async (db) => {
    await db.run('UPDATE users SET createdAt = ?, updatedAt = ? WHERE username = ?', [threeDaysAgo, threeDaysAgo, 'pending-user']);
  });

  const secondAttempt = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pending-user', email: 'pending@example.com', password: 'updated12345' }),
  });
  assert.equal(secondAttempt.response.status, 200);
  assert.equal(secondAttempt.data.verificationResent, true);

  await withDb(async (db) => {
    await db.run('UPDATE users SET emailVerified = 1 WHERE username = ?', ['pending-user']);
  });

  const oldPasswordLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pending-user', password: 'secret12345' }),
  });
  assert.equal(oldPasswordLogin.response.status, 401);

  const newPasswordLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pending-user', password: 'updated12345' }),
  });
  assert.equal(newPasswordLogin.response.status, 200);
});

test('stale unverified accounts older than seven days are replaced cleanly on re-registration', async () => {
  const firstAttempt = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'stale-user', email: 'stale@example.com', password: 'secret12345' }),
  });
  assert.equal(firstAttempt.response.status, 200);

  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  await withDb(async (db) => {
    await db.run('UPDATE users SET createdAt = ?, updatedAt = ? WHERE username = ?', [eightDaysAgo, eightDaysAgo, 'stale-user']);
    await db.run('UPDATE email_verifications SET createdAt = ?, expiresAt = ? WHERE userId = (SELECT id FROM users WHERE username = ?)', [
      eightDaysAgo,
      eightDaysAgo,
      'stale-user',
    ]);
  });

  const secondAttempt = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'stale-user', email: 'stale@example.com', password: 'fresh12345' }),
  });
  assert.equal(secondAttempt.response.status, 200);
  assert.equal(secondAttempt.data.verificationResent, false);

  await withDb(async (db) => {
    const userCount = await db.get('SELECT COUNT(*) AS count FROM users WHERE username = ? OR lower(email) = lower(?)', ['stale-user', 'stale@example.com']);
    const verificationCount = await db.get(
      `SELECT COUNT(*) AS count
       FROM email_verifications
       WHERE userId IN (SELECT id FROM users WHERE username = ? OR lower(email) = lower(?))`,
      ['stale-user', 'stale@example.com']
    );
    assert.equal(Number(userCount?.count || 0), 1);
    assert.equal(Number(verificationCount?.count || 0), 1);
  });
});

test('verification link works directly via GET endpoint and redirects with success status', async () => {
  const now = new Date().toISOString();
  const token = 'direct-link-token-123';
  const tokenHash = (await import('node:crypto')).createHash('sha256').update(token).digest('hex');

  await withDb(async (db) => {
    const passwordHash = 'hash-placeholder';
    const passwordSalt = 'salt-placeholder';
    const insertUser = await db.run(
      `INSERT INTO users (username, email, emailVerified, passwordHash, passwordSalt, isAdmin, createdAt, updatedAt)
       VALUES (?, ?, 0, ?, ?, 0, ?, ?)`,
      ['direct-verify-user', 'direct@example.com', passwordHash, passwordSalt, now, now]
    );

    await db.run(
      `INSERT INTO email_verifications (tokenHash, userId, type, newEmail, createdAt, expiresAt)
       VALUES (?, ?, 'register', NULL, ?, ?)`,
      [tokenHash, insertUser.lastID, now, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()]
    );
  });

  const response = await fetch(`${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
    redirect: 'manual',
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/email-verified?status=success');

  await withDb(async (db) => {
    const user = await db.get('SELECT emailVerified FROM users WHERE username = ?', ['direct-verify-user']);
    const verifications = await db.get('SELECT COUNT(*) AS count FROM email_verifications WHERE userId = (SELECT id FROM users WHERE username = ?)', ['direct-verify-user']);
    assert.equal(Number(user?.emailVerified || 0), 1);
    assert.equal(Number(verifications?.count || 0), 0);
  });
});

test('anonymous feedback endpoint responds gracefully when SMTP is not configured', async () => {
  const response = await request('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'feedback',
      contact: 'michael@example.com',
      message: 'Das ist ein kurzer Test für den Feedback-Dialog.',
      pageUrl: 'http://localhost:3000/app',
      userAgent: 'TestAgent/1.0',
      website: '',
    }),
  });

  assert.equal(response.response.status, 503);
  assert.equal(response.data.error, 'Feedback ist aktuell nicht verfügbar.');
});
