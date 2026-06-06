// Utility functions for Mahalakshmi Jewellery Rental App

// ✅ DATE FORMAT HELPERS: Convert between YYYY-MM-DD (internal) and dd-MMM-yyyy (display)
function formatDateDisplay(dateStr) {
  // Convert YYYY-MM-DD to dd-MMM-yyyy (e.g., "2026-01-08" → "08-Jan-2026")
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${monthNames[date.getMonth()]}-${year}`;
  } catch (e) {
    return dateStr;
  }
}

function parseDateInput(displayStr) {
  // Convert dd-MMM-yyyy to YYYY-MM-DD (e.g., "08-Jan-2026" → "2026-01-08")
  if (!displayStr) return '';
  try {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = displayStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthIndex = monthNames.indexOf(parts[1]);
      const month = String(monthIndex + 1).padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return displayStr;
  } catch (e) {
    return displayStr;
  }
}

function getTodayInternal() {
  // Get today's local date in YYYY-MM-DD format (internal storage).
  // toISOString() uses UTC and can shift the date around midnight in India.
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ✅ FIXED: Date normalization function to handle various date formats - CRASH-PROOF
function normalizeDate(d) {
  if (!d) return '';
  try {
    if (d instanceof Date) {
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const raw = String(d).trim();
    if (!raw) return '';

    // Already normalized
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    // ISO datetime strings
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      return raw.slice(0, 10);
    }

    // Legacy display format like 08-Jan-2026
    if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(raw)) {
      return parseDateInput(raw);
    }

    const dateObj = new Date(raw);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date detected:', d);
      return '';
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.warn('Date normalization error for:', d, e);
    return '';
  }
}

// Debug logging wrapper
function log(...args) {
  if (DEBUG) console.log(...args);
}

function logError(...args) {
  console.error(...args); // Always log errors
}
