import express from "express";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 1234;

const db = new Database(join(__dirname, "bookings.db"));
db.pragma("journal_mode = WAL");

db.exec(`
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
  db.exec("ALTER TABLE reservations ADD COLUMN CancelledAt TEXT DEFAULT NULL");
} catch { /* column already exists */ }

const insert = db.prepare(`
  INSERT INTO reservations (id, Booker, Date, StartTime, EndTime, Notes)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getById = db.prepare("SELECT * FROM reservations WHERE id = ?");
const cancelById = db.prepare("UPDATE reservations SET CancelledAt = datetime('now') WHERE id = ? AND CancelledAt IS NULL");
const getByDate = db.prepare(`
  SELECT * FROM reservations WHERE Date = ? ORDER BY StartTime
`);
const getLog = db.prepare(`
  SELECT * FROM reservations ORDER BY
    COALESCE(CancelledAt, CreatedAt) DESC,
    Date DESC, StartTime DESC
  LIMIT 200
`);

// Conflict: any active (non-cancelled) reservation that overlaps
const getConflict = db.prepare(`
  SELECT * FROM reservations
  WHERE Date = ?
    AND CancelledAt IS NULL
    AND StartTime < ?
    AND EndTime > ?
`);

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// ── API ────────────────────────────────────────────

app.get("/api/reservations", (req, res) => {
  const { date } = req.query;
  if (date) {
    return res.json(getByDate.all(date));
  }
  res.json(getLog.all());
});

app.get("/api/reservations/:id", (req, res) => {
  const row = getById.get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

app.post("/api/reservations", (req, res) => {
  const { booker, date, startTime, endTime, notes } = req.body;
  if (!booker || !date || !startTime || !endTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const conflict = getConflict.get(date, endTime, startTime);
  if (conflict) {
    return res.status(409).json({
      error: "Time slot conflicts with an existing booking",
      conflict,
    });
  }

  const id = randomUUID();
  insert.run(id, booker, date, startTime, endTime, notes ?? "");
  res.status(201).json({ id, booker, date, startTime, endTime, notes });
});

// Soft-cancel — keeps the record, sets CancelledAt
app.post("/api/reservations/:id/cancel", (req, res) => {
  const result = cancelById.run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found or already cancelled" });
  res.json({ ok: true });
});

app.delete("/api/reservations/:id", (req, res) => {
  // alias for cancel for backward compat
  const result = cancelById.run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found or already cancelled" });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Room booking running on http://localhost:${PORT}`);
});
