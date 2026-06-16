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
