# Room Booking App — Report

This is a complete summary of the Room Booking web application, covering its architecture, features, how it works, and the changes made during the session to get it running.

---

## Part 1 — What This Program Does

### Overview

The Room Booking App is a single-page, full-stack web application for managing room reservations on a weekly calendar grid. Users can book time slots, see existing bookings, and cancel them. It uses a clean, modern UI with drag-to-select functionality and a sidebar activity log.

### Architecture

```
┌─────────────────────────────────────────┐
│            Browser (Frontend)            │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ index.html  │  │    app.js        │  │
│  │ (markup)    │  │  (week grid,     │  │
│  │ style.css   │  │   drag-select,   │  │
│  │ (styling)   │  │   modals, API)   │  │
│  └─────────────┘  └──────────────────┘  │
│              ↑↓ HTTP (fetch)              │
│         ┌─────────────┐                  │
│         │  Express.js │                  │
│         │  (server.js)│                  │
│         └──────┬──────┘                  │
│         ┌─────────────┐                  │
│         │   SQLite3   │                  │
│         │ (bookings.db)│                 │
│         └─────────────┘                  │
└─────────────────────────────────────────┘
```

**Frontend**
- `index.html` — Single-page layout with a weekly calendar grid, booking modal, cancel confirmation modal, and a sidebar log panel.
- `style.css` — Clean, modern CSS with CSS variables, responsive layout, and smooth animations.
- `app.js` — All client-side logic: calendar rendering, drag-to-select, API calls, modals, and the activity log.

**Backend**
- `server.js` — Express.js REST API handling CRUD operations for reservations.
- `bookings.db` — SQLite database for persistent storage.

---

### Data Model

**Table: `reservations`**
| Column       | Type | Description                              |
|--------------|------|------------------------------------------|
| `id`         | TEXT | UUID primary key                         |
| `Booker`     | TEXT | Name of the person booking the room      |
| `Date`       | TEXT | Date of the reservation (YYYY-MM-DD)      |
| `StartTime`  | TEXT | Start time (HH:MM)                        |
| `EndTime`    | TEXT | End time (HH:MM)                          |
| `Notes`      | TEXT | Optional notes about the booking          |
| `CreatedAt`  | TEXT | Timestamp when the booking was created    |
| `CancelledAt`| TEXT | Timestamp if cancelled (NULL = active)    |

---

### API Endpoints

| Method | Endpoint                          | Description                                    |
|--------|-----------------------------------|------------------------------------------------|
| GET    | `/api/reservations`               | List all reservations (log, newest first)       |
| GET    | `/api/reservations?date=YYYY-MM-DD` | List active reservations for a specific date |
| GET    | `/api/reservations/:id`           | Get a single reservation by ID                  |
| POST   | `/api/reservations`               | Create a new reservation (conflict check)     |
| POST   | `/api/reservations/:id/cancel`    | Soft-cancel a reservation                      |
| DELETE | `/api/reservations/:id`           | Alias for cancel (backward compatibility)      |

---

### Frontend Features

**Weekly Calendar Grid**
- Displays 7 days (Mon–Sun) with 15-minute time slots from 10:00 AM to 8:00 PM
- Color-coded slots: **green** (free), **yellow** (booked), **blue** (selected)
- Today's column is highlighted with a blue border

**Drag-to-Select**
- Click and drag across free slots to select a time range
- Selection banner appears showing start/end time and slot count
- Keyboard: `Esc` clears selection

**Booking Flow**
1. Click a single free slot OR drag to select multiple slots
2. Click **Confirm Selection** (or single click opens modal directly)
3. Enter name (required) and optional notes
4. Submit → conflict check → booking created

**Cancellation Flow**
1. Click any booked slot (yellow)
2. Confirm in the cancel modal
3. Booking is soft-cancelled (record kept, `CancelledAt` set)

**Activity Log (Sidebar)**
- Shows all booking and cancellation events
- Sorted newest-first
- "Booked" and "Cancelled" events are visually distinct
- Each entry has a delete button to cancel active bookings

**Week Navigation**
- Previous / Next week buttons
- "Today" button jumps to current week
- Keyboard: `Esc` closes modals, `Enter` submits forms

---

### Backend Logic

**Conflict Detection**
When creating a reservation, the server checks for any overlapping active (non-cancelled) reservation on the same date. An overlap is defined as:
```sql
WHERE Date = ?
  AND CancelledAt IS NULL
  AND StartTime < ?
  AND EndTime > ?
```

**Soft Deletes**
- Reservations are never hard-deleted
- `CancelledAt` is set to the current timestamp
- Cancelled reservations are excluded from active queries
- The full history is preserved in the log

---

## Part 2 — Changes Made In This Session

### Problem Statement

The app would not start. Running `node server.js` failed with:
```
Error: Cannot find package 'better-sqlite3'
```

**Root Cause**: The `better-sqlite3` native addon build artifacts were missing (likely from the deleted files in the working tree), and there are no prebuilt binaries for Node.js v26 on Apple Silicon. The machine also lacked Xcode Command Line Tools, preventing compilation from source.

### Changes Made

**1. Replaced `better-sqlite3` with `sqlite3` + `sqlite`**

| Action | Detail |
|--------|--------|
| Removed | `better-sqlite3` (native C++ addon, synchronous API) |
| Installed | `sqlite3` + `sqlite` (pure JS wrapper, async API) |
| Reason | `sqlite3`/`sqlite` is fully JavaScript (via npm packages) and doesn't require native compilation, so it works on any Node.js version without build tools |

**2. Rewrote `server.js` for async `sqlite` API**

The `sqlite` package is promise-based, whereas `better-sqlite3` is synchronous. Every database call had to be converted from sync to `async/await`.

**Key code changes in `server.js`:**

- Changed import:
  ```js
  // Before:
  import Database from "better-sqlite3";

  // After:
  import sqlite3 from "sqlite3";
  import { open } from "sqlite";
  ```

- Changed database initialization from sync to async:
  ```js
  // Before (sync):
  const db = new Database(join(__dirname, "bookings.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`CREATE TABLE...`);

  // After (async):
  const db = await open({
    filename: join(__dirname, "bookings.db"),
    driver: sqlite3.Database,
  });
  await db.exec(`CREATE TABLE...`);
  ```

- Converted `db.prepare()` statements to inline `await db.all()`, `await db.get()`, and `await db.run()` calls
- Wrapped all API route handlers in `async` functions and added `await` before each database call

**3. Fixed a typo**

During editing, a stray Chinese characters (`会显得`) were accidentally inserted into the route handler definition. This was immediately corrected.

**Diff summary of `server.js`:**
- Removed `better-sqlite3` synchronous API usage
- Added `sqlite3` + `sqlite` async API usage
- Converted top-level DB init to `async initDb()` + `dbPromise`
- Wrapped all route handlers in `async`/`await`
- Replaced prepared statements with inline parameterized queries

**4. Verified the app is running**

After the changes:
```bash
$ node server.js
# → Room booking running on http://localhost:1234
```

The API responded correctly with existing reservation data from the database.

---

### Files Modified

| File           | Change |
|----------------|--------|
| `package.json` | Removed `better-sqlite3`, added `sqlite` and `sqlite3` dependencies |
| `server.js`    | Completely rewritten to use async `sqlite` API instead of sync `better-sqlite3` |

### No Changes Were Made To

| File        | Reason |
|-------------|--------|
| `index.html`| Frontend markup was fine |
| `public/style.css` | Styles were fine |
| `public/app.js` | Client-side logic was fine |
| `bookings.db` | Existing data was preserved |

---

### Accessing the App

The server is running at: **http://localhost:1234**

API smoke test example:
```bash
# List all reservations
curl http://localhost:1234/api/reservations

# List reservations for a specific date
curl "http://localhost:1234/api/reservations?date=2026-06-19"
```