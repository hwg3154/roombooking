// ── Build Log ───────────────────────────────────────────
function buildLog() {
  const list = document.getElementById("logList");
  const sorted = [...reservations].sort((a, b) => {
    if (a.Date !== b.Date) return b.Date.localeCompare(a.Date);
    return b.StartTime.localeCompare(a.StartTime);
  });

  if (sorted.length === 0) {
    list.innerHTML = `<p class="log-empty">No bookings yet</p>`;
    return;
  }

  list.innerHTML = "";
  for (const rv of sorted) {
    const entry = document.createElement("div");
    entry.className = `log-entry${rv.CancelledAt ? " log-cancelled" : ""}`;
    const dateFmt = new Date(rv.Date + "T00:00:00").toLocaleDateString("en", {
      weekday: "short", month: "short", day: "numeric"
    });
    const sh = parseInt(rv.StartTime.split(":")[0]);
    const sm = parseInt(rv.StartTime.split(":")[1] || "0");
    const eh = parseInt(rv.EndTime.split(":")[0]);
    const em = parseInt(rv.EndTime.split(":")[1] || "0");
    const timeStr = `${fmtHourShort(sh, sm)}–${fmtHourShort(eh, em)}`;

    let statusBadge = "";
    if (rv.CancelledAt) {
      const cancelWhen = new Date(rv.CancelledAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
      const cancelDate = new Date(rv.CancelledAt).toLocaleDateString("en", { month: "short", day: "numeric" });
      statusBadge = `<span class="log-cancel-badge" title="Cancelled ${cancelDate} at ${cancelWhen}">CANCELLED</span>`;
    }

    const noteHtml = rv.Notes ? `<div class="log-notes">${escapeHtml(rv.Notes)}</div>` : "";
    entry.innerHTML = `
      <div class="log-top">
        <span class="log-booker">${escapeHtml(rv.Booker)} ${statusBadge}</span>
        <span>
          <span class="log-time">${dateFmt} ${timeStr}</span>
          <button class="log-delete" data-id="${rv.id}" title="Cancel booking">✕</button>
        </span>
      </div>
      ${noteHtml}
    `;
    list.appendChild(entry);
  }
}
