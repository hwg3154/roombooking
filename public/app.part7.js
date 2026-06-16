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
