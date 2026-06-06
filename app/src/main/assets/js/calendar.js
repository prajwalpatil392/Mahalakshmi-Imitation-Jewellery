// CALENDAR AND DATE SELECTION LOGIC
// Dependencies: state.js, render.js

// ✅ Navigate to previous/next month
function changeCalendarMonth(offset) {
  calendarDate.setMonth(calendarDate.getMonth() + offset);
  renderCalendarWidget();
}

// ✅ Select a specific date and refresh records list
function selectCalendarDate(dateStr) {
  selectedDate = dateStr; // Set the selected date (Daybook style)
  document.getElementById('srchQ').value = ''; // Clear search
  curFilter = FILTER.DATE; // Calendar uses a dedicated date filter mode
  document.querySelectorAll('.fchip').forEach(x => x.classList.remove('on'));
  renderHome(); // Re-render with new date filter
}
