// ── Nav ─────────────────────────────────────────────────
document.getElementById("prevWeek").addEventListener("click", async () => {
  weekStart.setDate(weekStart.getDate() - 7);
  selectedSlots = [];
  bannerEl.classList.remove("visible");
  await refresh();
});

document.getElementById("nextWeek").addEventListener("click", async () => {
  weekStart.setDate(weekStart.getDate() + 7);
  selectedSlots = [];
  bannerEl.classList.remove("visible");
  await refresh();
});

document.getElementById("todayBtn").addEventListener("click", async () => {
  weekStart = getMonday(new Date());
  selectedSlots = [];
  bannerEl.classList.remove("visible");
  await refresh();
});

document.getElementById("refreshLog").addEventListener("click", refresh);

// ── Keyboard ────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (delOverlay.classList.contains("active")) closeDelete();
    else if (overlay.classList.contains("active")) closeModal();
    else if (selectedSlots.length > 0) {
      selectedSlots = [];
      dragDate = null;
      renderGridOnly();
      bannerEl.classList.remove("visible");
    }
  }
  if (e.key === "Enter" && overlay.classList.contains("active")) {
    form.requestSubmit();
  }
});

// ── Refresh ─────────────────────────────────────────────
async function refresh() {
  await fetchAll();
  indexWeekReservations();
  buildGrid();
  buildLog();
}

// ── Init ────────────────────────────────────────────────
refresh();
// ── Config ──────────────────────────────────────────────
const HOURS = { start: 10, end: 20 };
const SLOT_MINUTES = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── State ───────────────────────────────────────────────
let weekStart = getMonday(new Date());
let reservations = [];
let weekReservations = {};
let dragging = false;
let dragDate = null;
let dragStartSlot = null;
let dragEndSlot = null;
let selectedSlots = [];
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
// ── Build Grid ──────────────────────────────────────────
function buildGrid() {
  const header = document.getElementById("calendarHeader");
  const grid = document.getElementById("calendarGrid");
  header.innerHTML = "";
  grid.innerHTML = "";

  const today = todayStr();
  const dates = [];

  header.insertAdjacentHTML("beforeend", `<div class="corner"></div>`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dates.push(d);
    const ds = fmtDate(d);
    const isTodayCol = ds === today;
    header.insertAdjacentHTML("beforeend",
      `<div class="day-label${isTodayCol ? " today" : ""}">${DAYS[i]} ${d.getDate()}</div>`
    );
  }

  const startMinute = HOURS.start * 60;
  const endMinute = HOURS.end * 60;

  for (let min = startMinute; min < endMinute; min += SLOT_MINUTES) {
    const h = Math.floor(min / 60);
    const m = min % 60;

    // Time label — only on hour marks
    if (m === 0) {
      grid.insertAdjacentHTML("beforeend",
        `<div class="time-label hour-mark">${fmtHour(h)}</div>`
      );
    } else {
      grid.insertAdjacentHTML("beforeend",
        `<div class="time-label">${String(m).padStart(2, "0")}</div>`
      );
    }

    for (let i = 0; i < 7; i++) {
      const ds = fmtDate(dates[i]);
      const isTodayCol = ds === today;

      const cell = document.createElement("div");
      cell.className = `day-cell${isTodayCol ? " today-col" : ""}`;

      const bookedRv = slotBooked(ds, min);

      if (bookedRv) {
        const isTop = bookedRv.StartTime === slotToTime(min);
        const isCancelTop = bookedRv.CancelledAt && isTop;
        cell.innerHTML = `<div class="slot booked${isCancelTop ? " cancelled" : ""}" data-id="${bookedRv.id}" title="${escapeHtml(bookedRv.Booker)} — ${escapeHtml(bookedRv.Notes || "")}">
          ${isTop ? `<strong>${escapeHtml(bookedRv.Booker)}</strong>` : ""}
        </div>`;
        if (isCancelTop) {
          cell.querySelector(".slot").classList.add("cancelled");
        }
      } else {
        const isSelected = selectedSlots.some(s => s.date === ds && s.minute === min);
        cell.innerHTML = `<div class="slot free${isSelected ? " selected" : ""}" data-date="${ds}" data-minute="${min}"></div>`;
      }

      grid.appendChild(cell);
    }
  }

  // Week label
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  document.getElementById("weekLabel").textContent =
    `${weekStart.toLocaleDateString("en", opts)} – ${endDate.toLocaleDateString("en", opts)}, ${endDate.getFullYear()}`;
}
// ── Build Log (event-based) ────────────────────────────
function buildLog() {
  const list = document.getElementById("logList");

  // Turn each reservation into one or two events
  const events = [];
  for (const rv of reservations) {
    events.push({
      type: "booked",
      time: rv.CreatedAt,
      date: rv.Date,
      startTime: rv.StartTime,
      endTime: rv.EndTime,
      booker: rv.Booker,
      notes: rv.Notes,
      id: rv.id,
    });
    if (rv.CancelledAt) {
      events.push({
        type: "cancelled",
        time: rv.CancelledAt,
        date: rv.Date,
        startTime: rv.StartTime,
        endTime: rv.EndTime,
        booker: rv.Booker,
        id: rv.id,
      });
    }
  }

  // Sort newest-first by event time
  events.sort((a, b) => b.time.localeCompare(a.time));

  if (events.length === 0) {
    list.innerHTML = `<p class="log-empty">No bookings yet</p>`;
    return;
  }

  list.innerHTML = "";
  for (const ev of events) {
    const entry = document.createElement("div");
    entry.className = `log-entry log-${ev.type}`;
    // CreatedAt/CancelledAt are "YYYY-MM-DD HH:MM:SS" in UTC — append Z so the browser converts
    const eventDate = new Date(ev.time.replace(" ", "T") + "Z");
    const whenLabel = ev.type === "booked" ? "Booked" : "Cancelled";
    const timeLabel = eventDate.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
    const dateLabel = eventDate.toLocaleDateString("en", { month: "short", day: "numeric" });

    const bookingDate = new Date(ev.date + "T00:00:00").toLocaleDateString("en", {
      weekday: "short", month: "short", day: "numeric"
    });
    const sh = parseInt(ev.startTime.split(":")[0]);
    const sm = parseInt(ev.startTime.split(":")[1] || "0");
    const eh = parseInt(ev.endTime.split(":")[0]);
    const em = parseInt(ev.endTime.split(":")[1] || "0");
    const timeStr = `${fmtHourShort(sh, sm)}–${fmtHourShort(eh, em)}`;

    const noteHtml = ev.notes && ev.type === "booked" ? `<div class="log-notes">${escapeHtml(ev.notes)}</div>` : "";

    // Only show delete button on booked events that aren't cancelled
    const hasDelete = ev.type === "booked";

    entry.innerHTML = `
      <div class="log-top">
        <span class="log-booker"><span class="log-event-label">${whenLabel}</span> ${escapeHtml(ev.booker)}</span>
        <span>
          <span class="log-time">${timeLabel} · ${dateLabel}</span>
          ${hasDelete ? `<button class="log-delete" data-id="${ev.id}" title="Cancel booking">✕</button>` : ""}
        </span>
      </div>
      <div class="log-detail">${bookingDate} ${timeStr}</div>
      ${noteHtml}
    `;
    list.appendChild(entry);
  }
}
// ── Delete Modal ────────────────────────────────────────
const delOverlay = document.getElementById("deleteOverlay");
let pendingDeleteId = null;

function openDelete(id) {
  const rv = reservations.find((r) => r.id === id);
  if (!rv) return;
  if (rv.CancelledAt) { toast("Already cancelled", true); return; }
  pendingDeleteId = id;
  const dateFmt = new Date(rv.Date + "T00:00:00").toLocaleDateString("en", {
    weekday: "short", month: "short", day: "numeric"
  });
  const sh = parseInt(rv.StartTime.split(":")[0]);
  const sm = parseInt(rv.StartTime.split(":")[1] || "0");
  const eh = parseInt(rv.EndTime.split(":")[0]);
  const em = parseInt(rv.EndTime.split(":")[1] || "0");
  document.getElementById("deleteInfo").textContent =
    `${rv.Booker} — ${dateFmt} ${fmtHourShort(sh, sm)}–${fmtHourShort(eh, em)}`;
  delOverlay.classList.add("active");
}

function closeDelete() {
  delOverlay.classList.remove("active");
  pendingDeleteId = null;
}

delOverlay.addEventListener("click", (e) => { if (e.target === delOverlay) closeDelete(); });
document.getElementById("cancelDeleteBtn").addEventListener("click", closeDelete);

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  try {
    await fetch(`/api/reservations/${pendingDeleteId}`, { method: "DELETE" });
    closeDelete();
    await refresh();
    toast("Booking cancelled");
  } catch {
    toast("Delete failed", true);
  }
});
// ── Drag-to-Select ──────────────────────────────────────
const gridEl = document.getElementById("calendarGrid");
const bannerEl = document.getElementById("selectionBanner");

function getFreeSlot(e) {
  return e.target.closest(".slot.free:not(.selected)") ||
         e.target.closest(".slot.free.selected");
}

function beginDrag(slot) {
  dragging = true;
  dragDate = slot.dataset.date;
  dragStartSlot = parseInt(slot.dataset.minute);
  dragEndSlot = dragStartSlot;
  updateSelection();
}

function moveDrag(slot) {
  if (!dragging || slot.dataset.date !== dragDate) return;
  dragEndSlot = parseInt(slot.dataset.minute);
  updateSelection();
}

function endDrag() {
  if (!dragging) return;
  dragging = false;
  updateSelection();
}

function updateSelection() {
  const min = Math.min(dragStartSlot, dragEndSlot);
  const max = Math.max(dragStartSlot, dragEndSlot);
  selectedSlots = [];
  for (let m = min; m <= max; m += SLOT_MINUTES) {
    if (!slotBooked(dragDate, m)) {
      selectedSlots.push({ date: dragDate, minute: m });
    }
  }
  renderGridOnly();
  showBanner();
}

function renderGridOnly() {
  document.querySelectorAll(".slot.free").forEach(slot => {
    const isSel = selectedSlots.some(
      s => s.date === slot.dataset.date && s.minute === parseInt(slot.dataset.minute)
    );
    slot.classList.toggle("selected", isSel);
  });
}

function showBanner() {
  if (selectedSlots.length === 0) {
    bannerEl.classList.remove("visible");
    return;
  }
  const first = selectedSlots[0];
  const last = selectedSlots[selectedSlots.length - 1];
  document.getElementById("selectionText").textContent =
    `${fmtHourShort(Math.floor(first.minute / 60), first.minute % 60)} – ${fmtHourShort(Math.floor(last.minute / 60), last.minute % 60)} (${selectedSlots.length} x ${SLOT_MINUTES}min)`;
  bannerEl.classList.add("visible");
}

gridEl.addEventListener("mousedown", (e) => {
  const slot = getFreeSlot(e);
  if (slot) { e.preventDefault(); beginDrag(slot); }
});

gridEl.addEventListener("mouseover", (e) => {
  const slot = getFreeSlot(e);
  if (slot) moveDrag(slot);
});

document.addEventListener("mouseup", endDrag);

document.getElementById("clearSelection").addEventListener("click", () => {
  selectedSlots = [];
  dragDate = null;
  renderGridOnly();
  bannerEl.classList.remove("visible");
});
// ── Booking Modal ───────────────────────────────────────
const overlay = document.getElementById("modalOverlay");
const form = document.getElementById("bookingForm");

function openModal(date, startMinute, endMinute) {
  const startTime = slotToStartH(startMinute);
  const endTime = slotToEndH(endMinute);
  document.getElementById("modalDate").value = date;
  document.getElementById("modalStart").value = startTime;
  document.getElementById("modalEnd").value = endTime;
  document.getElementById("booker").value = "";
  document.getElementById("notes").value = "";
  const sh = Math.floor(startMinute / 60);
  const sm = startMinute % 60;
  const eh = Math.floor(endMinute / 60);
  const em = endMinute % 60;
  document.getElementById("modalTitle").textContent =
    `Book ${fmtHourShort(sh, sm)} - ${fmtHourShort(eh, em)}`;
  overlay.classList.add("active");
  setTimeout(() => document.getElementById("booker").focus(), 100);
}

function closeModal() {
  overlay.classList.remove("active");
}

overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
document.getElementById("cancelBtn").addEventListener("click", closeModal);

document.getElementById("bookSelection").addEventListener("click", () => {
  if (selectedSlots.length === 0) return;
  const first = selectedSlots[0];
  const last = selectedSlots[selectedSlots.length - 1];
  const endMinute = last.minute + SLOT_MINUTES;
  openModal(first.date, first.minute, endMinute);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    booker: document.getElementById("booker").value.trim(),
    notes: document.getElementById("notes").value.trim(),
    date: document.getElementById("modalDate").value,
    startTime: document.getElementById("modalStart").value,
    endTime: document.getElementById("modalEnd").value,
  };
  try {
    const r = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const j = await r.json();
      toast(j.error || "Booking failed", true);
      return;
    }
    closeModal();
    selectedSlots = [];
    bannerEl.classList.remove("visible");
    await refresh();
    toast("Room booked");
  } catch (err) {
    toast("Network error", true);
  }
});
// ── Grid Click (single free slot) ───────────────────────
gridEl.addEventListener("click", (e) => {
  if (dragging) return;
  const freeSlot = e.target.closest(".slot.free");
  if (freeSlot && selectedSlots.length === 0) {
    const date = freeSlot.dataset.date;
    const minute = parseInt(freeSlot.dataset.minute);
    openModal(date, minute, minute + SLOT_MINUTES);
    return;
  }
  const bookedSlot = e.target.closest(".slot.booked");
  if (bookedSlot) {
    openDelete(bookedSlot.dataset.id);
    return;
  }
});

// ── Log Click Delegation ────────────────────────────────
document.getElementById("logList").addEventListener("click", (e) => {
  const btn = e.target.closest(".log-delete");
  if (btn) openDelete(btn.dataset.id);
});
