// Application state variables for Mahalakshmi Jewellery Rental App

let records = [];
let curFilter = 'all';
let calendarDate = new Date();
let selectedDate = ''; // Set on init via getTodayInternal() — avoids UTC midnight shift
let isUploading = false;
let uploadedUrl = '';
let uploadedPhotos = [];  // Legacy placeholder
let pendRet = null, pendDel = null;
let pendDelRecord = null; // Full record for delete confirmation
let curDetailRecord = null;  // Store current detail record for WhatsApp
let currentEditId = null; // Track edit mode record id
let searchTimeout = null;  // For search debouncing
let queuedPhotos = []; // Pending compressed photos to upload after save
let editingExistingPhotos = []; // Existing photos while editing a record
let recycleBinRecords = []; // Soft-deleted records stored locally for restore
let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;

// Configuration (Dynamic Sheet Link)
let activeScriptUrl = SCRIPT_URL;
let activeSheetId = localStorage.getItem('customSheetId') || '';

// Load saved config
const savedScriptUrl = localStorage.getItem('customScriptUrl');
if (savedScriptUrl) activeScriptUrl = savedScriptUrl;

// Network status
let isOnline = navigator.onLine;

// Sync tracking
let lastRecordCount = 0;
let lastSyncTime = 0;
let isSyncing = false;

// Cache management functions
const RECORDS_CACHE_KEY = "cachedRecords_v1";

function saveRecordsCache() {
  try {
    const cacheableRecords = records.map(record => {
      const clean = { ...record };
      delete clean._search;
      normalizePhotoUrlsField(clean);
      clean.photoUrls = String(clean.photoUrls || '')
        .split('|')
        .map(url => url.trim())
        .filter(url => url.startsWith('http://') || url.startsWith('https://'))
        .join('|');
      return clean;
    });
    localStorage.setItem(RECORDS_CACHE_KEY, JSON.stringify(cacheableRecords));
    log('💾 Cache saved:', records.length, 'records');
  } catch (e) {
    logError('Failed to save cache:', e);
  }
}

function loadRecordsCache() {
  try {
    const cached = localStorage.getItem(RECORDS_CACHE_KEY);
    if (cached) {
      records = JSON.parse(cached);
      // ✅ FIX: Strip any stale _syncing / _pendingAction flags from cached records.
      // Records saved to cache while in a "syncing" state will show the ⏳ badge
      // indefinitely if the app restarts before the backend confirms. Clean them here.
      records = records.map(r => {
        const clean = { ...r };
        normalizePhotoUrlsField(clean);
        clean._search = (
          (clean.name || '') +
          (clean.phone || '') +
          (clean.address || '') +
          (clean.receiptNo || '')
        ).toLowerCase();

        if (clean._syncing) {
          delete clean._syncing;
        }
        if (clean._syncingRetry) {
          delete clean._syncingRetry;
        }
        return clean;
      });
      log('📦 Cache loaded:', records.length, 'records');
      return true;
    }
    return false;
  } catch (e) {
    logError('Failed to load cache:', e);
    records = [];
    return false;
  }
}
