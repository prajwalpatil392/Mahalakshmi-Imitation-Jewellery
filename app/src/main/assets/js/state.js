// Application state variables for Mahalakshmi Jewellery Rental App

console.log('✅ state.js loaded');

let records = [];
let curFilter = 'all';
let calendarDate = new Date();
let selectedDate = new Date().toISOString().slice(0, 10); // Initialize with today's date in YYYY-MM-DD format
let isUploading = false;
let uploadedUrl = '';
let uploadedPhotos = [];  // Legacy placeholder
let pendRet = null, pendDel = null;
let curDetailRecord = null;  // Store current detail record for WhatsApp
let currentEditId = null; // Track edit mode record id
let searchTimeout = null;  // For search debouncing
let queuedPhotos = []; // Pending compressed photos to upload after save
let editingExistingPhotos = []; // Existing photos while editing a record
let recycleBinRecords = []; // Soft-deleted records stored locally for restore

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
