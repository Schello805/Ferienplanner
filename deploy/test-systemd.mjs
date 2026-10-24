import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('/opt/ferienplaner/server/package.json');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/var/lib/ferienplaner/database.sqlite');
const query = (sql) => new Promise((resolve, reject) => db.all(sql, (error, rows) => error ? reject(error) : resolve(rows)));
const origin = 'http://127.0.0.1:3000';
const tokenFile = '/root/ferienplaner-ci-session.json';
const mode = process.argv[2];
const api = async (path, { token, ...options } = {}) => {
  const response = await fetch(`${origin}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  assert.equal(response.status, 200, `${path}: ${await response.clone().text()}`);
  return response.json();
};

try {
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /object-src 'none'/);
  const html = await page.text();
  const stylesheet = html.match(/href="([^\"]+\.css)"/)[1];
  const css = await fetch(new URL(stylesheet, origin));
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);

  if (mode === 'initial') {
    const credentials = { username: 'ci-admin', password: 'ci-test-password-123' };
    await api('/api/auth/bootstrap', { method: 'POST', body: JSON.stringify(credentials) });
    const login = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    const token = login.token;
    assert.ok(token);
    await api('/api/vacations', { token, method: 'POST', body: JSON.stringify({ date: '2027-01-04', userId: 'p1' }) });
    writeFileSync(tokenFile, JSON.stringify({ token }), { mode: 0o600 });
    const sessions = await query('SELECT token FROM sessions');
    assert.ok(sessions.length > 0);
    assert.ok(sessions.every((row) => row.token.startsWith('sha256:') && row.token !== token));
  } else {
    const { token } = JSON.parse(readFileSync(tokenFile, 'utf8'));
    const status = await api('/api/auth/status', { token });
    assert.equal(status.authenticated, true);
    const vacations = await api('/api/vacations', { token });
    assert.ok(vacations.some((entry) => entry.date === '2027-01-04' && entry.userId === 'p1'));
    if (mode === 'maintenance') {
      const runs = await query('SELECT success FROM digest_runs ORDER BY id DESC LIMIT 1');
      assert.equal(runs[0].success, 1);
      const monitor = await query('SELECT lastRunAt FROM monitor_state WHERE id = 1');
      assert.ok(monitor[0].lastRunAt);
    }
  }
} finally {
  await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}
