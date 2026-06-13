// ============================================================================
// ⚙️ CONSTANTS MODULE: Centralized reusable values
// ============================================================================

// ============================================================================
// 📊 RECORD STATUS VALUES
// ============================================================================

const STATUS = {
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue'
};

// ============================================================================
// 🔍 FILTER VALUES
// ============================================================================

const FILTER = {
  ALL: 'all',
  DATE: 'date',
  TODAY: 'today',
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
  ADVANCE: 'advance'
};

// ============================================================================
// 🎯 UI LIMITS & CONSTRAINTS
// ============================================================================

const LIMITS = {
  MAX_PHOTOS: 3,
  MAX_PHOTO_SIZE: 5242880, // 5MB in bytes
  MAX_COMPRESSED_SIZE: 512000, // 500KB target
  MAX_UPLOAD_RETRIES: 3
};

// ============================================================================
// ⏱️ TIMING & ANIMATION DURATIONS (milliseconds)
// ============================================================================

const TIMING = {
  TOAST_DURATION: 3000,
  SEARCH_DEBOUNCE: 300,
  SYNC_ANIMATION: '0.8s',
  ANIMATION_FRAME_RESET: 10,
  WHATSAPP_DELAY: 100
};

// ============================================================================
// 🏷️ BADGE & STATUS DISPLAY LABELS
// ============================================================================

const BADGES = {
  [STATUS.RETURNED]: {
    text: 'Returned वापस',
    class: 'badge-ret',
    icon: '📦'
  },
  [STATUS.OVERDUE]: {
    text: 'Overdue देरी',
    class: 'badge-ov',
    icon: '⚠️'
  },
  [STATUS.ACTIVE]: {
    text: 'Active चालू',
    class: 'badge-active',
    icon: '💍'
  }
};

// ============================================================================
// 📱 UI MESSAGES & TOASTS
// ============================================================================

const MESSAGES = {
  // Photos
  NO_PHOTOS_SELECTED: '❌ No photos selected',
  PHOTO_LIMIT_REACHED: `⚠️ Maximum ${LIMITS.MAX_PHOTOS} photos allowed. Remove some first.`,
  PHOTO_PROCESSING: '⏳ Processing photo(s)...',
  PHOTO_UPLOADED: '✅ Photo uploaded',
  PHOTO_UPLOAD_FAILED: '❌ Photo upload failed',
  PHOTOS_ADDED: (count) => `📸 ${count} photo(s) ready`,
  NO_PHOTOS: 'No photos',
  PHOTOS_REMAINING: (count) => `📸 ${count} photo(s) remaining`,
  
  // Form
  NAME_REQUIRED: '⚠️ Enter Name!',
  RECORD_SAVED: '✅ Record saved!',
  RECORD_DELETED: '🗑️ Deleted',
  RECORD_RETURNED: '✅ Returned',
  MARKING_RETURNED: 'Marking as returned...',
  DELETE_FAILED: '❌ Delete failed: ',
  RETURN_FAILED: '❌ Return failed: ',
  
  // Sync
  DATA_SYNCED: '✅ Data synced!',
  SYNC_FAILED: '❌ Sync failed!',
  SYNCING: '⟳ Syncing...',
  SYNC_BUTTON: '⟳ Sync (सिंक)',
  
  // Network
  ONLINE: '✅ Back online',
  OFFLINE: '⚠️ No internet connection',
  
  // Search
  SEARCH_PLACEHOLDER: 'Search name, phone...',
  
  // Empty States
  NO_RECORDS_FOUND: 'No records found.',
  TRY_CHANGING_FILTER: 'Try changing the filter or search.',
  NO_RENTALS_TODAY: (date) => `📅 No Active Rentals on ${date}`,
  SELECT_OTHER_DATE: 'Select another date or add a new rental.',
  NO_OVERDUE: '✅ Everything is On Time',
  NO_OVERDUE_SUB: 'Good job! No overdue records found.',
  NO_ACTIVE: '💍 No Active Rentals',
  NO_ACTIVE_SUB: 'Records will appear once you add them.',
  NO_RETURNED: '📦 No Returned Items',
  NO_RETURNED_SUB: 'Returned items history is empty.',
  
  // Errors
  FAILED_TO_LOAD: '⚠️ Failed to load data: ',
  ERROR_LOADING: '❌ Error loading data',
  FAILED_INITIAL_LOAD: '⚠️ Failed to load initial data',
  UNHANDLED_ERROR: 'Unhandled Promise Error: '
};

// ============================================================================
// 📅 DATE & TIME FORMATS
// ============================================================================

const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',  // Internal storage format
  DISPLAY: 'dd-MMM-yyyy',  // User display format
  LOCALE_OPTIONS: { day: '2-digit', month: 'short', year: 'numeric' },
  MONTH_OPTIONS: { month: 'long', year: 'numeric' }
};

// ============================================================================
// 🎨 CSS CLASSES (commonly used)
// ============================================================================

const CLASSES = {
  ACTIVE: 'active',
  SHOW: 'show',
  OPEN: 'open',
  ON: 'on',
  HIDDEN: 'hidden',
  DISABLED: 'disabled',
  MODAL_OPEN: 'modal-open',
  
  // Screen/navigation
  SCREEN: 'screen',
  NAV_BTN: 'nav-btn',
  
  // Modal states
  IMAGE_SLIDER: 'img-slider',
  IMAGE_SLIDER_CONTAINER: 'image-slider-container',
  MODAL_BG: 'modal-bg',
  DETAIL_MODAL: 'detail-modal',
  PRINT_MODAL: 'print-modal-overlay',
  
  // Status indicators
  RETURNED_ICON: 'ret-i',
  OVERDUE_ICON: 'ov-i',
  ACTIVE_ICON: 'active-i',
  
  // Calendar
  CALENDAR_DAY: 'cw-day',
  CALENDAR_TODAY: 'today',
  CALENDAR_SELECTED: 'selected',
  CALENDAR_EVENT: 'event',
  CALENDAR_OTHER_MONTH: 'other-month',
  
  // Filter chips
  FILTER_CHIP: 'fchip'
};

// ============================================================================
// 🔗 URL & PROTOCOL PATTERNS
// ============================================================================

const PATTERNS = {
  BLOB_URL: 'blob:',
  HTTP_URL: 'http://',
  HTTPS_URL: 'https://',
  PENDING_MARKER: 'PENDING',
  UNDEFINED_STR: 'undefined',
  NULL_STR: 'null',
  PHONE_PREFIX: 'tel:'
};

// ============================================================================
// 💾 STORAGE & CACHE
// ============================================================================

const STORAGE = {
  CACHE_KEY: 'mahalakshmiRentalsCache',
  LAST_SYNC_KEY: 'lastSyncTime',
  USER_KEY: 'mlRentals_currentUser'
};

// ============================================================================
// 🎭 ANIMATION & VISUAL FEEDBACK
// ============================================================================

const ANIMATIONS = {
  SPIN: 'spin',
  SPIN_DURATION: '0.8s',
  SPIN_LINEAR: 'linear'
};

// ============================================================================
// ⚙️ FEATURE FLAGS & DEFAULTS
// ============================================================================

const DEBUG = false; // ✅ Set to false for final release

const DEFAULTS = {
  USER_NAME: 'User',
  CURRENCY: '₹',
  CURRENCY_SYMBOL: 'Rs.',
  PHONE_COUNTRY_CODE: '+91',
  IMAGE_QUALITY: 0.8,
  IMAGE_FORMAT: 'image/jpeg'
};

// ============================================================================
// 🌐 COLOR INDICATORS (used in setUpMsg)
// ============================================================================

const COLORS = {
  GREEN: 'green',
  RED: 'red',
  ORANGE: 'orange',
  GRAY: 'gray'
};
