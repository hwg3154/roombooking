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
