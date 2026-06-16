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
