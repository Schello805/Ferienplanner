import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ferienplaner-e2e-'));
process.env.DB_PATH = path.join(tempDir, 'database.sqlite');
process.env.APP_SECRET_KEY_PATH = path.join(tempDir, 'app-secret.key');
process.env.PORT = process.env.PORT || '3100';

const { startServer } = await import('../../server/server.js');
startServer(Number(process.env.PORT), '127.0.0.1');
