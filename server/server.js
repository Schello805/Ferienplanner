import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import Holidays from 'date-holidays';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Holidays for Bavaria, Germany
const hd = new Holidays('DE', 'BY');

function openDb() {
  return new sqlite3.Database(DB_PATH);
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
    if (err) return;
    const existing = new Set(rows.map(r => r.name));
    if (!existing.has('createdAt')) {
      dbInit.run(`ALTER TABLE vacations ADD COLUMN createdAt TEXT`);
    }
    if (!existing.has('updatedAt')) {
      dbInit.run(`ALTER TABLE vacations ADD COLUMN updatedAt TEXT`);
    }
  });
});
dbInit.close();

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

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
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
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
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
};

// GET /api/holidays (Dynamic with Fallback)
app.get('/api/holidays', async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    
    // 1. Public Holidays (Calculated dynamically via date-holidays)
    // Note: hd.getHolidays returns date objects/strings. We ensure YYYY-MM-DD.
    const publicHolidaysRaw = hd.getHolidays(year);
    const publicHolidays = publicHolidaysRaw.map(h => ({
        date: new Date(h.date).toISOString().split('T')[0],
        name: h.name
    }));

    // 2. School Holidays (Fetched via API with fallback)
    let schoolHolidays = [];
    
    try {
        // Fetch from ferien-api.de (Bavaria)
        const response = await axios.get(`https://ferien-api.de/api/v1/holidays/DE-BY/${year}`, { timeout: 3000 });
        schoolHolidays = response.data.map(h => ({
            start: new Date(h.start).toISOString().split('T')[0],
            end: new Date(h.end).toISOString().split('T')[0],
            name: h.name
        }));
    } catch (error) {
        console.warn(`API fetch failed for ${year}, using fallback if available. Error: ${error.message}`);
        if (STATIC_HOLIDAYS[year]) {
            schoolHolidays = STATIC_HOLIDAYS[year].school;
        } else {
            schoolHolidays = [];
        }
    }

    res.json({
        public: publicHolidays,
        school: schoolHolidays
    });
});

app.listen(PORT, () => {
  // Intentionally no console.log comments added
  process.stdout.write(`Backend listening on http://localhost:${PORT}\n`);
  process.stdout.write(`SQLite DB: ${DB_PATH}\n`);
});
