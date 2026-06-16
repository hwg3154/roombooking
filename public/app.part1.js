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
