// CALENDAR AND DATE SELECTION LOGIC
// Dependencies: state.js, render.js

let lastCalendarRenderKey = '';

function buildCalendarCellKey(year, monthIndex, dayNumber) {
  const month = String(monthIndex + 1).padStart(2, '0');
  const day = String(dayNumber).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getActiveCalendarRows() {
  return typeof isRecordSoftDeleted === 'function'
    ? records.filter(r => !isRecordSoftDeleted(r))
    : records.slice();
}

function getEventDatesFromRecords(rows) {
  const eventDates = new Set();
  rows.forEach((record) => {
    const from = normalizeDate(record.from);
    if (!from) return;

    // ✅ FIXED: Only mark start date with green dot
    eventDates.add(from);
  });
  return eventDates;
}

function isRecordActiveOnDate(record, dateStr) {
  if (!record || !dateStr) return false;
  const from = normalizeDate(record.from);
  if (!from) return false;
  // ✅ FIX: Filter by start date (from) only — not the date range between from and to
  return from === dateStr;
}

function isAdvanceBooking(record) {
  const from = normalizeDate(record.from);
  if (!from) return false;
  return from > getTodayInternal();
}

// ✅ Render calendar widget (only full-rebuilds when month or data changes)
function renderCalendarWidget(force) {
  const monthEl = document.getElementById('calendarMonth');
  const daysEl = document.getElementById('calendarDays');
  if (!monthEl || !daysEl) return;

  const renderKey = `${calendarDate.getFullYear()}-${calendarDate.getMonth()}-${records.length}-${selectedDate}`;
  if (!force && renderKey === lastCalendarRenderKey) {
    updateCalendarSelection();
    return;
  }
  lastCalendarRenderKey = renderKey;

  const monthLabel = calendarDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  monthEl.textContent = monthLabel;

  const year = calendarDate.getFullYear();
  const monthIndex = calendarDate.getMonth();
  const start = new Date(year, monthIndex, 1);
  const weekdayOffset = start.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((weekdayOffset + daysInMonth) / 7) * 7;
  const todayStr = getTodayInternal();
  const eventDates = getEventDatesFromRecords(getActiveCalendarRows());

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - weekdayOffset + 1;
    const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const cellKey = isCurrentMonth ? buildCalendarCellKey(year, monthIndex, dayNumber) : '';
    const classes = ['cw-day'];

    if (!isCurrentMonth) {
      classes.push('other-month');
    }
    if (cellKey === todayStr && isCurrentMonth) {
      classes.push('today');
    }
    if (isCurrentMonth && eventDates.has(cellKey)) {
      classes.push('event');
    }
    if (isCurrentMonth && selectedDate === cellKey) {
      classes.push('selected');
    }

    cells.push(`<div class="${classes.join(' ')}" ${isCurrentMonth ? `data-date="${cellKey}"` : ''}>${isCurrentMonth ? dayNumber : ''}</div>`);
  }

  daysEl.innerHTML = cells.join('');
}

function updateCalendarSelection() {
  const daysEl = document.getElementById('calendarDays');
  if (!daysEl) return;
  daysEl.querySelectorAll('.cw-day').forEach((dayEl) => {
    const date = dayEl.dataset.date;
    dayEl.classList.toggle('selected', !!date && date === selectedDate);
  });
}

// ✅ Navigate to previous/next month
function changeCalendarMonth(offset) {
  calendarDate.setMonth(calendarDate.getMonth() + offset);
  lastCalendarRenderKey = '';
  renderCalendarWidget(true);
}

// ✅ Select a specific date and refresh records list
function selectCalendarDate(dateStr) {
  selectedDate = dateStr;
  const parts = dateStr.split('-');
  calendarDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

  const searchInput = document.getElementById('srchQ');
  if (searchInput) searchInput.value = '';

  curFilter = FILTER.DATE;
  document.querySelectorAll('.fchip').forEach(x => x.classList.remove('on'));

  lastCalendarRenderKey = '';
  renderCalendarWidget(true);
  renderHome();
}
