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
