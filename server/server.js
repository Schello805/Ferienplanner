import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import Holidays from 'date-holidays';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');

try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (e) {
  process.stderr.write(`Failed to ensure DB directory exists: ${e?.message || e}\n`);
  process.stderr.write(`DB_PATH=${DB_PATH}\n`);
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
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


// Initialize DB
const dbInit = openDb();
dbInit.serialize(() => {
  dbInit.run(`
    CREATE TABLE IF NOT EXISTS vacations (
      date TEXT PRIMARY KEY,
      userId TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  dbInit.all(`PRAGMA table_info(vacations)`, [], (err, rows) => {
    if (err) {
      dbInit.close();
      return;
    }

    const existing = new Set(rows.map(r => r.name));
    const migrations = [];
    if (!existing.has('createdAt')) {
      migrations.push(`ALTER TABLE vacations ADD COLUMN createdAt TEXT`);
    }
    if (!existing.has('updatedAt')) {
      migrations.push(`ALTER TABLE vacations ADD COLUMN updatedAt TEXT`);
    }

    if (migrations.length === 0) {
      dbInit.close();
      return;
    }

    let remaining = migrations.length;
    migrations.forEach((sql) => {
      dbInit.run(sql, (migrationErr) => {
        if (migrationErr) {
          process.stderr.write(`SQLite migration failed: ${migrationErr?.message || migrationErr}\n`);
        }
        remaining -= 1;
        if (remaining === 0) {
          dbInit.close();
        }
      });
    });
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// GET /api/vacations
app.get('/api/vacations', (req, res) => {
  const db = openDb();
  db.all('SELECT date, userId FROM vacations', [], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/vacations (Single day toggle/set)
app.post('/api/vacations', (req, res) => {
  const { date, userId } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required' });

  const db = openDb();
  const now = new Date().toISOString();

  if (userId === null) {
    // Delete
    db.run('DELETE FROM vacations WHERE date = ?', [date], (err) => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  } else {
    // Upsert
    db.run(
      `INSERT INTO vacations (date, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET userId = excluded.userId, updatedAt = excluded.updatedAt`,
      [date, userId, now, now],
      (err) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  }
});

// POST /api/vacations/range (Range set)
app.post('/api/vacations/range', (req, res) => {
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
      INSERT INTO vacations (date, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET userId = excluded.userId, updatedAt = excluded.updatedAt
    `);

    // Loop from start to end
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateStr = normalizeDateOnly(d);
        stmt.run(dateStr, userId, now, now);
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

if (fs.existsSync(CLIENT_DIST)) {
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  // Intentionally no console.log comments added
  process.stdout.write(`Backend listening on http://localhost:${PORT}\n`);
  process.stdout.write(`SQLite DB: ${DB_PATH}\n`);
});
