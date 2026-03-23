import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
