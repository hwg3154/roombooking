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
