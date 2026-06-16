// ── Toast ───────────────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = isError ? "error show" : "show";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = ""; }, 2800);
}

// ── Data ────────────────────────────────────────────────
async function fetchAll() {
  const r = await fetch("/api/reservations");
  reservations = await r.json();
}

function indexWeekReservations() {
  weekReservations = {};
  const dates = weekDates();
  for (const rv of reservations) {
    if (dates.has(rv.Date)) {
      weekReservations[rv.Date] ??= [];
      weekReservations[rv.Date].push(rv);
    }
  }
}

function weekDates() {
  const set = new Set();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    set.add(fmtDate(d));
  }
  return set;
}

// Check if a minute-of-day slot falls inside any active reservation for a date
function slotBooked(dateStr, minute) {
  const t = slotToTime(minute);
  const tEnd = slotToTime(minute + SLOT_MINUTES);
  const rvs = weekReservations[dateStr] || [];
  for (const rv of rvs) {
    if (rv.CancelledAt) continue;
    if (rv.StartTime < tEnd && rv.EndTime > t) return rv;
  }
  return null;
}
