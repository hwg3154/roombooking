# Room Booking App

A simple web application for managing room reservations on a weekly calendar grid.

## Features

- **Weekly calendar view** — 15-minute time slots from 10 AM to 8 PM, Monday–Sunday
- **Drag-to-select** — Click and drag to select multiple time slots
- **Conflict detection** — Prevents overlapping bookings
- **Soft cancellations** — Cancelled bookings are preserved in the history log
- **Activity log** — Sidebar shows all booking and cancellation events

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:1234 in your browser.

## Tech Stack

- **Frontend**: Vanilla JavaScript, CSS (no build step)
- **Backend**: Node.js + Express
- **Database**: SQLite (via `sqlite3` + `sqlite` packages)

## API Endpoints

| Method | Endpoint                           | Description                     |
|--------|------------------------------------|---------------------------------|
| GET    | `/api/reservations`                | List all reservations           |
| GET    | `/api/reservations?date=YYYY-MM-DD`| List reservations for a date    |
| POST   | `/api/reservations`                | Create a new booking            |
| POST   | `/api/reservations/:id/cancel`     | Cancel a booking                |
| DELETE | `/api/reservations/:id`            | Alias for cancel                |

### Create Booking (POST /api/reservations)

```json
{
  "booker": "Jane Doe",
  "date": "2026-06-19",
  "startTime": "10:00",
  "endTime": "11:30",
  "notes": "Team standup"
}
```

## Project Structure

```
.
├── server.js          # Express server + SQLite
├── package.json
├── bookings.db        # SQLite database (not in git)
└── public/
    ├── index.html     # Single-page app
    ├── app.js         # Frontend logic
    └── style.css      # Styles
```

## Environment Variables

| Variable | Default | Description       |
|----------|---------|-------------------|
| PORT     | 1234    | Server port       |