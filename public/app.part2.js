// ── Helpers ─────────────────────────────────────────────
function getMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHour(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function fmtHourShort(h, m) {
  const meridiem = h < 12 ? "a" : "p";
  const hour12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
  if (m === 0) return `${hour12}${meridiem}`;
  return `${hour12}:${String(m).padStart(2, "0")}${meridiem}`;
}

function slotToTime(minuteOfDay) {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotToStartH(startMinute) {
  return slotToTime(startMinute);
}

function slotToEndH(endMinute) {
  return slotToTime(endMinute);
}

function isToday(d) {
  const t = new Date();
  return d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear();
}

function todayStr() { return fmtDate(new Date()); }

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
