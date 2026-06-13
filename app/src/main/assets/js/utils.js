// Utility functions for Mahalakshmi Jewellery Rental App

// ✅ DATE FORMAT HELPERS: Convert between YYYY-MM-DD (internal) and dd-MMM-yyyy (display)
function formatDateDisplay(dateStr) {
  // Convert YYYY-MM-DD to dd-MMM-yyyy (e.g., "2026-01-08" → "08-Jan-2026")
  if (!dateStr || dateStr === 'undefined' || dateStr === 'null') return '—';
  try {
    // ✅ FIX: Normalize first so any backend format (serial, ISO, legacy display) is handled
    const normalized = normalizeDate(dateStr);
    if (!normalized || normalized === 'undefined' || normalized === 'null') return '—';

    const [year, month, day] = normalized.split('-');
    if (!year || !month || !day) return '—';
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month) - 1;
    
    // Validate month index
    if (monthIndex < 0 || monthIndex > 11) return '—';
    
    const paddedDay = String(day).padStart(2, '0');
    return `${paddedDay}-${monthNames[monthIndex]}-${year}`;
  } catch (e) {
    console.error('Date format error:', e, dateStr);
    return '—';
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

    // ✅ FIX: Google Sheets date serial number (e.g., 44927 = days since 30-Dec-1899)
    if (/^\d{4,6}$/.test(raw)) {
      const serial = parseInt(raw, 10);
      // Serials in plausible date range (40000–55000 covers ~2009–2050)
      if (serial >= 40000 && serial <= 55000) {
        // Google Sheets epoch: December 30, 1899
        const msPerDay = 86400000;
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const dateObj = new Date(epoch.getTime() + serial * msPerDay);
        const year = dateObj.getUTCFullYear();
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

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

// Toast notification system
let _toastTimer = null;

function toast(msg, duration = 3000) {
  const toastEl = document.getElementById('toastEl');
  if (!toastEl) return;

  // Clear any pending hide so a rapid second call restarts the timer cleanly
  if (_toastTimer) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }

  toastEl.textContent = msg;
  toastEl.classList.add('show');

  _toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    _toastTimer = null;
  }, duration);
}

// Show/hide loading spinner
function showSpin(show) {
  const spinner = document.getElementById('ovSpin');
  if (!spinner) return;
  
  if (show) {
    spinner.classList.add('show');
  } else {
    spinner.classList.remove('show');
  }
}

// Get local date string in YYYY-MM-DD format
function getLocalDateString(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


// Update cache helper (saves records to localStorage)
function updateCache() {
  saveRecordsCache();
}

// Screen navigation with smooth transitions
function go(screenId, shouldRender = true) {
  const targetScreen = document.getElementById('s-' + screenId);
  
  if (!targetScreen) return;
  
  // Remove any existing animation classes
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('screen-fade-in');
  });

  // Standard transition
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.visibility = 'hidden';
    s.style.opacity = '0';
  });
  
  targetScreen.classList.add('active', 'screen-fade-in');
  targetScreen.style.visibility = 'visible';
  targetScreen.style.opacity = '1';
  
  if (screenId === 'home' && shouldRender) {
    renderHome();
    updateCounts();
  }
  
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('on'));
  const navBtn = document.getElementById('n-' + screenId);
  if (navBtn) {
    navBtn.classList.add('on');
  }
}

// Sync data (background sync after changes)
function syncData() {
  if (!navigator.onLine) {
    log('syncData: Offline, skipping');
    return;
  }
  
  log('syncData: Starting background sync');
  loadData(true); // skipCache = true for fresh data
}

// Home snapshot for instant startup (cache rendered HTML)
const CACHE_SNAPSHOT_KEY = "cachedHomeHTML_v1";

function saveHomeSnapshot() {
  try {
    const homeList = document.getElementById('homeList');
    if (homeList && homeList.innerHTML) {
      localStorage.setItem(CACHE_SNAPSHOT_KEY, homeList.innerHTML);
      log('📸 Home snapshot saved');
    }
  } catch (e) {
    logError('Failed to save home snapshot:', e);
  }
}

function restoreHomeSnapshot() {
  try {
    const cached = localStorage.getItem(CACHE_SNAPSHOT_KEY);
    const homeList = document.getElementById('homeList');
    if (cached && homeList) {
      homeList.innerHTML = cached;
      log('⚡ Home snapshot restored');
      return true;
    }
    return false;
  } catch (e) {
    logError('Failed to restore home snapshot:', e);
    return false;
  }
}


// Search debouncing function
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderHome();
  }, 300); // 300ms debounce
}

// Filter button handler
function setF(el, f) {
  const searchInput = document.getElementById('srchQ');
  if (searchInput) searchInput.value = '';

  if (f === 'today') {
    selectedDate = getTodayInternal();
    const parts = selectedDate.split('-');
    calendarDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else if (f === 'all') {
    selectedDate = getTodayInternal();
  }

  curFilter = f;
  document.querySelectorAll('.fchip').forEach(x => x.classList.remove('on'));
  if (el) el.classList.add('on');
  renderHome();
  if (typeof updateCalendarSelection === 'function') updateCalendarSelection();
  const panel = document.getElementById('filterMenuPanel');
  if (panel) panel.classList.remove('open');
}

// ✅ Image error handler - triggers sync if multiple images fail
let imageErrorCount = 0;
let imageErrorTimeout = null;
let imageErrorNotified = false; // Prevent multiple sync notifications

function handleImageError(img, recordId) {
  // Set fallback placeholder
  img.onerror = null;
  img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22160%22%3E%3Crect fill=%22%23f5f5f5%22 width=%22200%22 height=%22160%22/%3E%3Ctext x=%2250%25%22 y=%2245%25%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23999%22%3E📷 Image Not Found%3C/text%3E%3Ctext x=%2250%25%22 y=%2260%25%22 text-anchor=%22middle%22 font-size=%2211%22 fill=%22%23aaa%22%3ETap sync to reload%3C/text%3E%3C/svg%3E';
  
  // Only count errors for actual URLs (not blob or data URLs)
  const isBlobUrl = img.src && img.src.startsWith('blob:');
  const isDataUrl = img.src && img.src.startsWith('data:');
  
  if (isBlobUrl || isDataUrl) {
    // Don't count blob/data URL errors
    return;
  }
  
  // Track errors and trigger sync only once if threshold exceeded
  imageErrorCount++;
  
  clearTimeout(imageErrorTimeout);
  imageErrorTimeout = setTimeout(() => {
    if (imageErrorCount >= 5 && !imageErrorNotified) {
      console.warn(`${imageErrorCount} image errors detected - user can manually sync`);
      imageErrorNotified = true;
      // Don't auto-sync, just notify user once
      // Reset after 30 seconds
      setTimeout(() => {
        imageErrorNotified = false;
      }, 30000);
    }
    imageErrorCount = 0;
  }, 3000);
}
