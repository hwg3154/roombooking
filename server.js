import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 1234;

const dbPromise = open({
  filename: join(__dirname, "bookings.db"),
  driver: sqlite3.Database,
});

async function initDb() {
  const db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      Booker TEXT NOT NULL,
      "Date" TEXT NOT NULL,
      StartTime TEXT NOT NULL,
      EndTime TEXT NOT NULL,
      Notes TEXT DEFAULT '',
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      CancelledAt TEXT DEFAULT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_date ON reservations("Date");
  `);

  // Soft-migrate existing rows
  try {
    await db.exec("ALTER TABLE reservations ADD COLUMN CancelledAt TEXT DEFAULT NULL");
  } catch { /* column already exists */ }

  return db;
}

const dbReady = initDb();

// ── API ────────────────────────────────────────────

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

app.get("/api/reservations", async (req, res) => {
  const db = await dbReady;
  const { date } = req.query;
  if (date) {
    const rows = await db.all("SELECT * FROM reservations WHERE Date = ? ORDER BY StartTime", date);
    return res.json(rows);
  }
  const rows = await db.all(`
    SELECT * FROM reservations ORDER BY
      COALESCE(CancelledAt, CreatedAt) DESC,
      Date DESC, StartTime DESC
    LIMIT 200
  `);
  res.json(rows);
});

app.get("/api/reservations/:id", async (req, res) => {
  const db = await dbReady;
  const row = await db.get("SELECT * FROM reservations WHERE id = ?", req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.post("/api/reservations", async (req, res) => {
  const db = await dbReady;
  const { booker, date, startTime, endTime, notes } = req.body;
  if (!booker || !date || !startTime || !endTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const conflict = await db.get(`
    SELECT * FROM reservations
    WHERE Date = ?
      AND CancelledAt IS NULL
      AND StartTime < ?
      AND EndTime > ?
  `, date, endTime, startTime);

  if (conflict) {
    return res.status(409).json({
      error: "Time slot conflicts with an existing booking",
      conflict,
    });
  }

  const id = randomUUID();
  await db.run(`
    INSERT INTO reservations (id, Booker, Date, StartTime, EndTime, Notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `, id, booker, date, startTime, endTime, notes ?? "");

  res.status(201).json({ id, booker, date, startTime, endTime, notes });
});

// Soft-cancel — keeps the record, sets CancelledAt
app.post("/api/reservations/:id/cancel", async (req, res) => {
  const db = await dbReady;
  const result = await db.run("UPDATE reservations SET CancelledAt = datetime('now') WHERE id = ? AND CancelledAt IS NULL", req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found or already cancelled" });
  res.json({ ok: true });
});

app.delete("/api/reservations/:id", async (req, res) => {
  // alias for cancel for backward compat
  const db = await dbReady;
  const result = await db.run("UPDATE reservations SET CancelledAt = datetime('now') WHERE id = ? AND CancelledAt IS NULL", req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found or already cancelled" });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Room booking running on http://localhost:${PORT}`);
});
