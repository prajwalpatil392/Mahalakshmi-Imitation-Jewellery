
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxoPMkE5B_0QgwElsTwD2Y2tvaahoFUPk80S-m-WEGP8-l4fCHzlPg6poskCvOZIEs9wg/exec";
const SECRET_KEY = "ML_RENTALS_2024";
const CLOUD_NAME = "dcgfc7bse";
const CLOUD_PRESET = "mahalakshmi_jewellery";
const MAIN_SHEET_ID = "1H728QUmyN87qv7C6T5dQtOPrCO77ZXCFcLzXaPrinx8";

// ✅ NEW: User authentication system
let currentUser = null;
let users = {}; // { name: password_hash }
const USERS_KEY = "mlRentals_users";
const CURRENT_USER_KEY = "mlRentals_currentUser";

// ✅ Simple password validation (not cryptographic, for demo)
function hashPassword(pwd) {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    hash = ((hash << 5) - hash) + pwd.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

// ✅ Load users from localStorage
function loadUsers() {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    users = stored ? JSON.parse(stored) : {};
  } catch (e) {
    users = {};
  }
}

// ✅ Save users to localStorage
function saveUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ✅ Load current user session
function loadUserSession() {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (stored) {
    currentUser = stored;
  }
}

// ✅ Save user session
function saveUserSession(userName) {
  currentUser = userName;
  localStorage.setItem(CURRENT_USER_KEY, userName);
}

// ✅ Logout user
function logoutUser() {
  currentUser = null;
  localStorage.removeItem(CURRENT_USER_KEY);
  go('auth');
  setTimeout(() => location.reload(), 300);
}

// ✅ Register new user
function registerUser(name, password) {
  if (!name || !password) {
    toast('❌ Name and password required');
    return false;
  }
  if (name.length < 2) {
    toast('❌ Name must be at least 2 characters');
    return false;
  }
  if (password.length < 4) {
    toast('❌ Password must be at least 4 characters');
    return false;
  }
  if (users[name]) {
    toast('❌ User already exists');
    return false;
  }
  users[name] = hashPassword(password);
  saveUsers();
  toast('✅ Registration successful! Please login.');
  return true;
}

// ✅ Login user
function loginUser(name, password) {
  if (!name || !password) {
    toast('❌ Name and password required');
    return false;
  }
  const storedHash = users[name];
  if (!storedHash) {
    toast('❌ User not found');
    return false;
  }
  if (storedHash !== hashPassword(password)) {
    toast('❌ Wrong password');
    return false;
  }
  saveUserSession(name);
  toast('✅ Login successful!');
  return true;
}

let records = [];
let curFilter = 'all';
let calendarDate = new Date();
// ✅ FIXED: Use local date string instead of UTC ISO string
let selectedDate = getLocalDateString(new Date());
let isUploading = false;
let uploadedUrl = '';
let uploadedPhotos = [];  // Legacy placeholder
let pendRet = null, pendDel = null;
let curDetailRecord = null;  // Store current detail record for WhatsApp
let currentEditId = null; // Track edit mode record id
let searchTimeout = null;  // For search debouncing
let queuedPhotos = []; // Pending compressed photos to upload after save
const MAX_CAMERA_PHOTOS = 3;
const AUTO_CAMERA_BURST_COUNT = 3;
let recycleBinRecords = [];
let pendDelRecord = null; // Store full record for delete confirmation display
const FILTER_STATUS_SET = new Set(['active', 'overdue', 'returned']);
const RECORDS_CACHE_KEY = "cachedRecords_v1";
const CACHE_SNAPSHOT_KEY = "cachedHomeHTML_v1";
let editingExistingPhotos = [];
let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;

// ===== DATE FORMATTING UTILITY (dd-mmm-yyyy format) =====
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
}

// ===== GLOBAL VARIABLES =====

// DEBUG FLAG
const DEBUG = true;

// INIT
// ✅ FIXED: Use local date string instead of UTC ISO string
const today = getLocalDateString(new Date());
document.getElementById('fFrom').value = today;
// ✅ FIXED: Ensure selectedDate is initialized before any render
selectedDate = today;
// Show selected date in header (Daybook style)
document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'});

let lastRecordCount = 0;
let lastSyncTime = 0;

// Initial load with feedback
console.log('App starting... Loading data from backend');

// ✅ PERFORMANCE: Load cache first, render immediately, then sync with backend
async function initializeApp() {
  try {
    // ✅ NEW: Check if user is logged in
    loadUsers();
    loadUserSession();
    
    if (!currentUser) {
      // Show auth screen
      document.getElementById('s-auth').classList.add('active');
      document.getElementById('s-home').classList.remove('active');
      setupAuthHandlers();
      return;
    }
    
    // User is logged in, proceed with app
    document.getElementById('s-auth').classList.remove('active');
    document.getElementById('s-home').classList.add('active');
    
    // 1) INSTANT: Load and render from cache (within 50ms)
    loadRecordsCache();
    restoreHomeSnapshot();
    loadRecycleBinCache();  // ✅ PRELOAD RECYCLE BIN FROM CACHE
    
    // Set default filter and render
    curFilter = 'today';
    const todayChip = document.querySelector('.fchip[data-f="today"]');
    if (todayChip) {
      document.querySelectorAll('.fchip').forEach(x => x.classList.remove('on'));
      todayChip.classList.add('on');
    }
    
    // Show cached records immediately (user sees data right away)
    renderHome();
    console.log('✅ Cached data rendered immediately');
    
    // 2) ASYNC: Wait for BOTH backend sync and recycle bin to complete
    const [dataResult, recycleBinResult] = await Promise.allSettled([
      loadData(),
      refreshRecycleBinFromSheet()
    ]);
    
    // Handle data sync result
    if (dataResult.status === 'fulfilled') {
      console.log('✅ Backend data synced');
      renderHome();
      updateCounts();
    } else {
      console.warn('⚠️ Backend sync failed:', dataResult.reason);
      toast('⚠️ Using offline data');
    }
    
    // Handle recycle bin result
    if (recycleBinResult.status === 'fulfilled') {
      console.log('✅ Recycle bin preloaded');
    } else {
      console.warn('⚠️ Recycle bin preload failed:', recycleBinResult.reason);
    }
    
    // 3) HIDE SPLASH SCREEN ONLY AFTER ALL DATA IS READY
    setTimeout(() => {
      const splash = document.getElementById('splashScreen');
      if (splash) {
        splash.classList.add('hide');
        console.log('✅ Splash screen hidden - App ready!');
      }
    }, 300); // Small delay for visual polish
    
  } catch (error) {
    console.error('Init error:', error);
    toast('❌ Failed to initialize app');
    // Hide splash even on error
    const splash = document.getElementById('splashScreen');
    if (splash) splash.classList.add('hide');
  }
}

// ✅ NEW: Setup auth handlers
function setupAuthHandlers() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const toggleRegisterBtn = document.getElementById('toggleRegisterBtn');
  const toggleLoginBtn = document.getElementById('toggleLoginBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (toggleRegisterBtn) {
    toggleRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });
  }
  
  if (toggleLoginBtn) {
    toggleLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    });
  }
  
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const name = document.getElementById('loginName').value.trim();
      const pass = document.getElementById('loginPass').value;
      if (loginUser(name, pass)) {
        setTimeout(() => location.reload(), 500);
      }
    });
  }
  
  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      const name = document.getElementById('regName').value.trim();
      const pass = document.getElementById('regPass').value;
      const pass2 = document.getElementById('regPass2').value;
      if (pass !== pass2) {
        toast('❌ Passwords do not match');
        return;
      }
      if (registerUser(name, pass)) {
        setTimeout(() => {
          registerForm.style.display = 'none';
          loginForm.style.display = 'block';
          document.getElementById('loginName').value = name;
          document.getElementById('loginPass').value = '';
        }, 300);
      }
    });
  }
}

initializeApp();

let isSyncing = false;

// ✅ PERFORMANCE: Removed auto-sync loop (was causing lag)
// Sync happens on: app load, manual sync button, after save/delete

async function apiGet(action, payload, sheetId = MAIN_SHEET_ID) {
  const url = SCRIPT_URL;
  try { 
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let options = {
      signal: controller.signal,
      cache: 'no-store'
    };

    if (payload) {
      const body = new URLSearchParams();
      body.append('key', SECRET_KEY);
      body.append('action', action);
      body.append('data', JSON.stringify(payload));
      if (sheetId) body.append('sheetId', sheetId);
      body.append('_ts', String(Date.now()));
      options.method = 'POST';
      options.body = body;
    } else {
      options.method = 'GET';
      options.headers = { 'Cache-Control': 'no-cache' };
    }

    const requestUrl = payload
      ? url
      : `${SCRIPT_URL}?key=${SECRET_KEY}&action=${encodeURIComponent(action)}${sheetId ? `&sheetId=${encodeURIComponent(sheetId)}` : ''}&_ts=${Date.now()}`;

    const r = await fetch(requestUrl, options); 
    clearTimeout(timeout);
    
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    
    return await r.json(); 
  }
  catch(e) { 
    if (e.name === 'AbortError') {
      return {ok:false, error:"Request Timeout - Check internet"}; 
    }
    return {ok:false, error: e.message || "Network Error"}; 
  }
}

async function loadData() {
  try {
    // 1) Instant render from cache
    loadRecordsCache();
    restoreHomeSnapshot();

    console.log('loadData: Starting fetch from:', SCRIPT_URL);
    const res = await apiGet('get');
    console.log('loadData: Response received:', res);
    
    if (res.ok) {
      console.log('loadData: Data is OK, records count:', res.data ? res.data.length : 0);
      
      // Check if new records were added
      if (records.length > 0 && res.data.length > lastRecordCount) {
        toast("📢 New record added!");
      }
      lastRecordCount = res.data.length;
      
      // ✅ PERFORMANCE: Pre-compute search text for each record + DEDUPLICATE by ID
      const seenIds = new Set();
      records = res.data.filter(r => {
        const id = String(r.id || '').trim();
        if (seenIds.has(id)) {
          console.warn('⚠️ Duplicate record filtered out: ID=' + id + ', Name=' + r.name);
          return false; // Skip duplicate
        }
        seenIds.add(id);
        return true;
      }).map(r => {
        // Ensure the record consistently uses only photoUrls (pipe-separated string)
        normalizePhotoUrlsField(r);

        r._search = (
          (r.name || '') + 
          (r.phone || '') + 
          (r.address || '') + 
          (r.receiptNo || '')
        ).toLowerCase();
        return r;
      });
      saveRecordsCache();
      
      lastSyncTime = Date.now();
      
      // ✅ FIXED: Ensure selectedDate is set before rendering
      // ✅ FIXED: Use local date string instead of UTC ISO string
      selectedDate = selectedDate || getLocalDateString(new Date());
      
      console.log('loadData: About to render. Records array:', records);
      renderHome(); 
      updateCounts();
      saveHomeSnapshot();
      console.log(`✅ Loaded ${records.length} records successfully`);
    } else {
      console.error('loadData: Failed with error:', res.error);
      toast("⚠️ Failed to load data: " + res.error);
      // Still try to render existing data
      renderHome(); updateCounts();
    }
  } catch (e) {
    console.error('loadData: Exception caught:', e);
    toast("❌ Error loading data");
    // Still try to render existing data
    renderHome(); updateCounts();
  }
}

function updateCounts() {
  const activeCount = records.filter(r => r.status === 'active').length;
  const ovCount = records.filter(r => r.status === 'overdue').length;
  // ✅ FIXED: Use local date string instead of UTC ISO string
  const todayStr = getLocalDateString(new Date());
  const todayCount = records.filter(r => r.from === todayStr).length;
  // ✅ NEW: Calculate total bookings count
  const totalCount = records.length;

  document.getElementById('cntActive').textContent = activeCount;
  document.getElementById('cntOv').textContent = ovCount;
  document.getElementById('cntToday').textContent = todayCount;
  document.getElementById('cntTotal').textContent = totalCount;
}

// ✅ FIXED: Date normalization function to handle various date formats
function normalizeDate(d) {
  if (!d) return '';
  return String(d).slice(0, 10);
}

// ✅ NEW: Convert local Date object to local YYYY-MM-DD string (no UTC conversion)
function getLocalDateString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderHome() {
  console.log('renderHome: Called with', records.length, 'records');
  
  // ✅ FIXED: Ensure selectedDate is always set
  if (!selectedDate) {
    // ✅ FIXED: Use local date string instead of UTC ISO string
    selectedDate = getLocalDateString(new Date());
    console.warn('selectedDate was undefined, reset to today:', selectedDate);
  }
  
  // ✅ DEBUG: Log current state
  console.log('Selected Date:', selectedDate);
  if (records.length > 0) {
    console.log('Sample Record:', records[0]);
  }
  
  // ✅ FIXED: Header always shows TODAY's date (never changes) in dd-mmm-yyyy format
  // ✅ FIXED: Use local date string instead of UTC ISO string
  const todayForDisplay = getLocalDateString(new Date());
  document.getElementById('headerDate').textContent = formatDateDisplay(todayForDisplay);
  
  // Apply search and filter
  const srch = document.getElementById('srchQ');
  const q = srch ? srch.value.toLowerCase() : '';
  let filtered = records;
  
  // ✅ FIXED: Use local date string instead of UTC ISO string
  const todayStr = getLocalDateString(new Date());
  if (FILTER_STATUS_SET.has(curFilter)) {
    filtered = filtered.filter(r => r.status === curFilter);
  } else if (curFilter === 'today') {
    filtered = filtered.filter(r => normalizeDate(r.from) === todayStr);
  } else if (curFilter === 'advance') {
    filtered = filtered.filter(r => {
      const from = normalizeDate(r.from);
      return from && from > todayStr;
    });
  } else if (curFilter === 'date') {
    // ✅ FIXED: Filter by START DATE ONLY (not date range)
    filtered = filtered.filter(r => {
      if (!r || !r.from) return false;
      const from = normalizeDate(r.from);
      return from === selectedDate;
    });
  }

  // DEBUG
  console.log('Filtered Records:', filtered);
  
  // ✅ PERFORMANCE: Use pre-computed search text
  if (q) {
    filtered = filtered.filter(r => r._search && r._search.includes(q));
  }
  
  // ✅ FIXED: FAILSAFE - If filter returns nothing but we have records, show all
  if (filtered.length === 0 && records.length > 0 && !q && curFilter === 'all') {
    console.warn('⚠️ Daybook filter returned 0 records, but we have', records.length, 'records. Showing all as failsafe.');
    filtered = records;
  }
  
  let html = filtered.map(r => cardHTML(r)).join('');

  if (!html || html.trim() === "") {
    let msg = "No records found.";
    let sub = "Try changing the filter or search.";

    if (selectedDate !== getLocalDateString(new Date())) {
      msg = `📅 No Active Rentals on ${selectedDate}`;
      sub = "Select another date or add a new rental.";
    } else if (curFilter === 'overdue') {
      msg = "✅ Everything is On Time";
      sub = "Good job! No overdue records found.";
    } else if (curFilter === 'active') {
      msg = "💍 No Active Rentals";
      sub = "Records will appear once you add them.";
    } else if (curFilter === 'returned') {
      msg = "📦 No Returned Items";
      sub = "Returned items history is empty.";
    }

    html = `<div style="text-align:center; padding:40px; color:#777;">
      <h3>${msg}</h3>
      <p style="margin-top:8px; font-size:14px;">${sub}</p>
      <button class="add-big" onclick="go('add')" style="margin-top:20px; padding:12px; font-size:12px; width:auto; display:inline-flex;">✦ Add New Record ✦</button>
    </div>`;
  }

  const homeList = document.getElementById('homeList');
  
  if (homeList) {
    // ✅ PERFORMANCE: Only update DOM if content changed
    if (homeList.dataset.lastHtml !== html) {
      homeList.innerHTML = html;
      homeList.dataset.lastHtml = html;
    }
    renderCalendarWidget();
    saveHomeSnapshot();
    console.log('renderHome: Showing', filtered.length, 'records for date:', selectedDate);
  } else {
    console.error('renderHome: homeList element not found!');
  }
}

function saveRecordsCache() {
  try {
    const cacheable = records.map(r => {
      const row = { ...r };
      delete row._search;
      // blob urls are temporary; avoid stale cache issues
      if (row.photoUrls) {
        row.photoUrls = String(row.photoUrls)
          .split("|")
          .map(x => x.trim())
          .filter(x => x.startsWith("http://") || x.startsWith("https://"))
          .join("|");
      }
      return row;
    });
    localStorage.setItem(RECORDS_CACHE_KEY, JSON.stringify(cacheable));
  } catch (e) {
    console.warn("saveRecordsCache failed:", e);
  }
}

function loadRecordsCache() {
  try {
    const raw = localStorage.getItem(RECORDS_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return false;

    records = parsed.map(r => {
      const row = { ...r };
      normalizePhotoUrlsField(row);
      row._search = (
        (row.name || "") +
        (row.phone || "") +
        (row.address || "") +
        (row.receiptNo || "")
      ).toLowerCase();
      return row;
    });

    renderHome();
    updateCounts();
    return true;
  } catch (e) {
    console.warn("loadRecordsCache failed:", e);
    return false;
  }
}

function saveHomeSnapshot() {
  try {
    const homeList = document.getElementById("homeList");
    if (!homeList) return;
    localStorage.setItem(CACHE_SNAPSHOT_KEY, homeList.innerHTML || "");
  } catch (e) {
    console.warn("saveHomeSnapshot failed:", e);
  }
}

function restoreHomeSnapshot() {
  try {
    const html = localStorage.getItem(CACHE_SNAPSHOT_KEY);
    const homeList = document.getElementById("homeList");
    if (!homeList || !html) return false;
    if (!homeList.innerHTML || homeList.innerHTML.trim() === "") {
      homeList.innerHTML = html;
    }
    return true;
  } catch (e) {
    console.warn("restoreHomeSnapshot failed:", e);
    return false;
  }
}

function cardHTML(r) {
  const st = r.status;
  const cls = st === 'returned' ? 'returned' : (st === 'overdue' ? 'overdue' : '');
  const badge = st === 'returned' ? '<span class="rcard-badge badge-ret">Returned वापस</span>' : (st === 'overdue' ? '<span class="rcard-badge badge-ov">Overdue देरी</span>' : '<span class="rcard-badge badge-active">Active चालू</span>');
  
  const photos = getPhotosFromRecord(r);
  const hasPhotos = photos.length > 0;
  
  // ✅ PERFORMANCE: Show only first photo on home screen (no slider)
  let photoHTML = '';
  if (hasPhotos) {
    const firstPhoto = photos[0];
    photoHTML = `<div class="rcard-photo-single" onclick="event.stopPropagation(); openImageGallery(0, ${JSON.stringify(photos).replace(/"/g, '&quot;')})">
      <img src="${firstPhoto}" alt="Photo" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage%20error%3C/text%3E%3C/svg%3E'">
      ${photos.length > 1 ? `<div class="photo-count-badge">${photos.length} photos</div>` : ''}
    </div>`;
  }

  const safeId = String(r.id).replace(/"/g, '&quot;');
  const safeName = String(r.name || '').replace(/"/g, '&quot;');
  return `<div class="rcard ${cls}" data-action="open-detail" data-id="${safeId}">
    <div class="rcard-top">
      <div class="rcard-icon ${st==='returned'?'ret-i':(st==='overdue'?'ov-i':'active-i')}">💍</div>
      <div class="rcard-info">
        <div class="rcard-name-row"><div class="rcard-name">${r.name}</div>${r.phone?`<a href="tel:${r.phone}" class="call-btn" onclick="event.stopPropagation()">📞</a>`:''}</div>
        <div class="rcard-jewel">Rcpt #${r.receiptNo||'—'} · ${r.jewel}</div>
      </div>
      ${badge}
    </div>
    <div class="rcard-address">${r.address || 'No Address'}</div>
    <div class="rcard-details">
      <div class="rcd"><div class="rv">₹${r.total}</div><div class="rl">Total</div></div>
      <div class="rcd"><div class="rv">₹${r.advance}</div><div class="rl">Advance</div></div>
      <div class="rcd"><div class="rv">₹${r.balance}</div><div class="rl">Balance</div></div>
    </div>
    <div class="rcard-meta">📅 ${formatDateDisplay(r.from)} to ${formatDateDisplay(r.to)}</div>
    <div class="rcard-user">User: ${r.user}</div>
    ${photoHTML}
    <div class="rcard-actions">
      ${st!=='returned' ? `<button class="ract ret" data-action="return-record" data-id="${safeId}" data-name="${safeName}">Return</button>` : ''}
      <button class="ract edit" data-action="edit-record" data-id="${safeId}">Edit</button>
      <button class="ract del" data-action="delete-record" data-id="${safeId}">Delete</button>
    </div>
  </div>`;
}

async function saveEntry(skipPhotos = false) {
  const name = document.getElementById('fName').value.trim();
  const user = document.getElementById('fUser').value.trim() || 'Worker';
  if (!name) return toast("⚠️ Enter Name!");

  const existingRecord = currentEditId ? records.find(x => String(x.id) === String(currentEditId)) : null;
  const clientRecordId = currentEditId || ("R-" + Date.now());
  const hasQueuedPhotos = queuedPhotos.length > 0 && !skipPhotos;
  const action = existingRecord ? 'edit' : 'add';

  const existingPhotoUrls = existingRecord ? [...editingExistingPhotos] : [];
  const persistedExistingPhotoUrls = existingPhotoUrls.filter(url => url.startsWith('http://') || url.startsWith('https://'));
  const newPreviewUrls = hasQueuedPhotos ? queuedPhotos.map(p => p.previewUrl).filter(Boolean) : [];
  const instantPhotoUrls = [...persistedExistingPhotoUrls, ...newPreviewUrls].join('|');

  const data = {
    id: clientRecordId,
    name,
    user,
    phone: document.getElementById('fPhone').value,
    address: document.getElementById('fAddress').value,
    receiptNo: document.getElementById('fReceipt').value,
    jewel: document.getElementById('fJewel').value,
    total: document.getElementById('fTotal').value,
    advance: document.getElementById('fAdvance').value,
    balance: document.getElementById('fBalance').value,
    deposit: document.getElementById('fDeposit').value,
    from: document.getElementById('fFrom').value,
    to: document.getElementById('fTo').value,
    photoUrls: instantPhotoUrls,
    status: existingRecord ? existingRecord.status : 'active'
  };

  normalizePhotoUrlsField(data);

  const photosToUpload = hasQueuedPhotos ? [...queuedPhotos] : [];
  queuedPhotos.forEach(photo => { photo._handedOff = true; });

  // Instant UI update (no waiting for backend/upload)
  if (existingRecord) {
    Object.assign(existingRecord, data);
  } else {
    records.unshift(data);
  }
  renderHome();
  updateCounts();
  saveRecordsCache();
  go('home');
  resetForm();
  toast(`✅ ${existingRecord ? 'Updated' : 'Saved'} locally`);

  if (!existingRecord) {
    setTimeout(() => shareWhatsApp(data), 120);
  }

  const backendData = { ...data, photoUrls: persistedExistingPhotoUrls.join('|') };

  // Background main-sheet save
  apiGet(action, backendData, MAIN_SHEET_ID).then(res => {
    if (!res.ok) {
      toast(`⚠️ ${existingRecord ? 'Update' : 'Save'} synced failed: ${res.error}`);
      return;
    }

    const savedRecordId = res.id || (res.data && res.data.id) || backendData.id;
    const localIndex = records.findIndex(r => String(r.id) === String(clientRecordId));
    if (localIndex !== -1) {
      records[localIndex].id = savedRecordId;
    }

    if (photosToUpload.length) {
      uploadPhotosInBackground(savedRecordId, photosToUpload, false).catch(err => {
        console.error('Background photo upload failed:', err);
      });
    }
  }).catch(err => {
    console.error('Background save failed:', err);
    toast('⚠️ Saved locally. Backend sync pending.');
  });
}

async function compressImage(file) {
  console.log('compressImage started for:', file.name, 'Size:', file.size);
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        resolve(file); // Return original file on error
      };
      reader.onload = (e) => {
        console.log('FileReader loaded, creating image...');
        const img = new Image();
        img.src = e.target.result;
        img.onerror = (error) => {
          console.error('Image load error:', error);
          resolve(file); // Return original file on error
        };
        img.onload = () => {
          console.log('Image loaded. Original size:', img.width, 'x', img.height);
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          
          // Higher quality compression - max 1200px
          const max = 1200;
          if (w > h && w > max) { 
            h = Math.round(h * (max / w)); 
            w = max; 
          } else if (h > max) { 
            w = Math.round(w * (max / h)); 
            h = max; 
          }
          
          console.log('Resizing to:', w, 'x', h);
          canvas.width = w; 
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          
          // Enable high quality smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          
          // Higher quality: 0.85
          canvas.toBlob((blob) => {
            if (!blob || blob.size === 0) {
              console.warn('Compression failed, returning original file');
              resolve(file);
              return;
            }
            console.log('Compression complete. Final size:', blob.size);
            resolve(blob);
          }, 'image/jpeg', 0.85);
        };
      };
    } catch (error) {
      console.error('compressImage exception:', error);
      resolve(file); // Return original file on exception
    }
  });
}

// Open camera directly - no file picker
function openCamera() {
  if (queuedPhotos.length >= MAX_CAMERA_PHOTOS) {
    toast(`⚠️ Maximum ${MAX_CAMERA_PHOTOS} photos reached`);
    return;
  }

  if (window.AndroidCamera && typeof window.AndroidCamera.launchCameraBurst === 'function') {
    const remaining = MAX_CAMERA_PHOTOS - queuedPhotos.length;
    const burstCount = Math.min(AUTO_CAMERA_BURST_COUNT, remaining);
    window.AndroidCamera.launchCameraBurst(burstCount);
    setUpMsg(`📸 Capture ${burstCount} photo(s). Camera reopens automatically.`, 'orange');
    return;
  }

  const cameraInput = document.getElementById('cameraInput');

  if (!cameraInput) {
    console.error('cameraInput not found');
    return;
  }

  // Ensure correct attributes
  cameraInput.setAttribute('accept', 'image/*');
  cameraInput.setAttribute('capture', 'environment');
  cameraInput.removeAttribute('multiple');

  // IMPORTANT:
  // Do NOT clear value before click
  // Some Android WebViews block chooser if value changes before click

  try {
    cameraInput.click();
    console.log('📸 Camera input clicked');
  } catch (e) {
    console.error('Camera open failed:', e);
  }
}

window.handleCameraResult = function(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    toast('❌ Camera capture failed');
    return;
  }
  if (queuedPhotos.length >= MAX_CAMERA_PHOTOS) {
    toast(`⚠️ Maximum ${MAX_CAMERA_PHOTOS} photos reached`);
    return;
  }
  try {
    const blob = dataURLToBlob(dataUrl);
    const previewUrl = URL.createObjectURL(blob);
    queuedPhotos.push({
      name: `photo_${Date.now()}.jpg`,
      blob,
      previewUrl
    });
    renderQueuedPhotos();
    const remaining = Math.max(0, MAX_CAMERA_PHOTOS - queuedPhotos.length);
    setUpMsg(`✅ ${queuedPhotos.length}/${MAX_CAMERA_PHOTOS} photo(s) ready`, "green");
    toast(remaining === 0 ? `✅ ${MAX_CAMERA_PHOTOS} photos captured` : `✅ Photo ${queuedPhotos.length} captured`);
  } catch (e) {
    console.error('handleCameraResult failed', e);
    toast('❌ Failed to process camera photo');
  }
};

function dataURLToBlob(dataURL) {
  const arr = dataURL.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || arr.length < 2) {
    throw new Error('Invalid data URL');
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Trigger gallery for multiple selection
function triggerGallery() {
  document.getElementById('galleryInput').click();
}

// Handle single camera photo - optimized for quick successive captures
async function handleCameraPhoto(input) {
  console.log('handleCameraPhoto called');

  // Clone the files list immediately to avoid it being cleared by successive captures
  const files = input.files ? Array.from(input.files) : [];
  console.log('Files received:', files.length);

  // Reset input IMMEDIATELY so the NEXT capture can start while we process this one
  input.value = '';

  if (files.length === 0) {
    console.error('No files received from camera input');
    return;
  }
  
  // Camera-only flow limit: 3 photos total
  if (queuedPhotos.length >= MAX_CAMERA_PHOTOS) {
    toast(`⚠️ Maximum ${MAX_CAMERA_PHOTOS} photos reached`);
    return;
  }
  
  // Quick processing - show immediate feedback
  const file = files[0];
  console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
  toast("📸 Processing...");
  
  try {
    const compressedBlob = await compressImage(file);
    console.log('Compressed blob size:', compressedBlob.size);
    
    const previewUrl = URL.createObjectURL(compressedBlob);

    queuedPhotos.push({
      name: file.name || `photo_${Date.now()}.jpg`,
      blob: compressedBlob,
      previewUrl: previewUrl
    });
    
    console.log('Photo added to queue. Total photos:', queuedPhotos.length);
    renderQueuedPhotos();
    const remaining = Math.max(0, MAX_CAMERA_PHOTOS - queuedPhotos.length);
    setUpMsg(`✅ ${queuedPhotos.length}/${MAX_CAMERA_PHOTOS} photo(s) ready`, "green");
    if (remaining > 0) {
      toast(`✅ Photo ${queuedPhotos.length} added! Tap Camera again (${remaining} left)`);
    } else {
      toast(`✅ ${MAX_CAMERA_PHOTOS} photos added`);
    }
  } catch (e) {
    console.error("Photo processing failed", e);
    toast("❌ Failed to process photo");
  }
}

// Handle multiple gallery photos
async function handleGalleryPhotos(input) {
  console.log('handleGalleryPhotos called');
  console.log('Files received:', input.files ? input.files.length : 0);
  await queueSelectedPhotos(input.files);
  input.value = '';
}

async function queueSelectedPhotos(fileList) {
  const files = Array.from(fileList || []);
  console.log('queueSelectedPhotos - files to process:', files.length);
  
  if (!files.length) {
    console.error('No files to process');
    toast("❌ No photos selected");
    return;
  }

  // Limit to 10 photos max (increased from 5)
  const maxPhotos = 10;
  if (queuedPhotos.length + files.length > maxPhotos) {
    const remaining = maxPhotos - queuedPhotos.length;
    if (remaining <= 0) {
      toast(`⚠️ Maximum ${maxPhotos} photos allowed. Remove some first.`);
      return;
    }
    toast(`⚠️ Adding ${remaining} photos (max ${maxPhotos} total)`);
    files.splice(remaining);
  }

  setUpMsg(`⏳ Processing ${files.length} photo(s)...`, "orange");
  
  let processed = 0;
  for (const file of files) {
    try {
      console.log('Processing file:', file.name, 'Size:', file.size);
      const compressedBlob = await compressImage(file);
      console.log('Compressed to:', compressedBlob.size);
      
      queuedPhotos.push({
        name: file.name || `photo_${Date.now()}.jpg`,
        blob: compressedBlob,
        previewUrl: URL.createObjectURL(compressedBlob)
      });
      processed++;
      setUpMsg(`⏳ Processed ${processed}/${files.length}...`, "orange");
    } catch (e) {
      console.error("Compression failed for", file.name, e);
      toast(`⚠️ Failed to process ${file.name}`);
    }
  }
  
  console.log('All files processed. Total in queue:', queuedPhotos.length);
  renderQueuedPhotos();
  setUpMsg(`✅ ${queuedPhotos.length} photo(s) ready`, "green");
  toast(`✅ ${processed} photo(s) added! Total: ${queuedPhotos.length}`);
}

async function uploadPhotosInBackground(recordId, photos, triggerWhatsApp = true) {
  if (!photos || photos.length === 0) {
    console.log('uploadPhotosInBackground: No photos to upload');
    return;
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 CLOUDINARY UPLOAD STARTED');
  console.log(`   Record ID: ${recordId}`);
  console.log(`   Photos to upload: ${photos.length}`);
  console.log(`   Trigger WhatsApp: ${triggerWhatsApp}`);
  console.log('═══════════════════════════════════════════════');
  
  toast(`📤 Uploading ${photos.length} photo(s) to Cloudinary...`);

  try {
    const urls = await uploadPhotosWithConcurrency(photos, 2);

    console.log('───────────────────────────────────────────────');
    console.log(`📊 Upload Results: ${urls.length}/${photos.length} successful`);
    console.log('───────────────────────────────────────────────');

    if (urls.length > 0) {
      // Merge existing persisted URLs with newly uploaded ones
      const recordIndex = records.findIndex(r => String(r.id) === String(recordId));
      const existing = recordIndex !== -1 ? normalizePhotoUrlsValue(records[recordIndex].photoUrls) : '';
      const existingPersisted = existing
        .split('|')
        .map(x => x.trim())
        .filter(x => x.startsWith('http://') || x.startsWith('https://'));
      const mergedList = [...new Set([...existingPersisted, ...urls])];
      const mergedString = mergedList.join('|');

      console.log('💾 Saving merged Cloudinary URLs to backend...');
      console.log('   URLs:', mergedString);

      const updateRes = await apiGet('updatePhoto', { id: recordId, url: mergedString });

      if (updateRes.ok) {
        console.log('✅ Photos saved to backend successfully!');
        toast(`✅ ${urls.length} photo(s) uploaded!`);

        // ✅ PERFORMANCE: Clean up blob URLs to free memory
        photos.forEach(photo => {
          if (photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photo.previewUrl);
          }
        });

        if (recordIndex !== -1) {
          records[recordIndex].photoUrls = mergedString;
          normalizePhotoUrlsField(records[recordIndex]);
          console.log('✅ Record updated with merged photoUrls');
          saveRecordsCache();
          renderHome();

          // Only trigger if requested (prevents double-sending if already sent at start)
          if (triggerWhatsApp) {
            console.log('📱 Opening WhatsApp...');
            setTimeout(() => shareWhatsApp(records[recordIndex]), 300);
          }
        } else {
          console.warn('Record not found in local array while uploading photos; UI merge skipped');
        }
      } else {
        console.error('❌ Failed to save photo URLs to backend:', updateRes.error);
        toast(`❌ Failed to save photos: ${updateRes.error}`);
      }
    } else {
      console.error('❌ ALL PHOTO UPLOADS FAILED - NO URLS RETURNED');
      console.error('   This means Cloudinary rejected all uploads');
      console.error('   Check the detailed error logs above');
      toast('❌ All uploads failed. Check console for details.');
    }
  } catch (e) {
    console.error('❌ BACKGROUND UPLOAD EXCEPTION:', e);
    toast(`❌ Upload error: ${e.message}`);
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('🏁 UPLOAD PROCESS COMPLETE');
  console.log('═══════════════════════════════════════════════');
}

async function uploadPhotosWithConcurrency(photos, limit) {
  console.log(`uploadPhotosWithConcurrency: Starting upload of ${photos.length} photos with concurrency ${limit}`);
  const uploaded = [];
  let index = 0;

  async function worker() {
    while (index < photos.length) {
      const currentIndex = index++;
      const photo = photos[currentIndex];
      console.log(`Worker uploading photo ${currentIndex + 1}:`, photo.name);
      // ✅ Use retry logic instead of direct upload
      const url = await uploadWithRetry(photo);
      if (url) {
        uploaded.push(url);
        console.log(`✅ Photo ${uploaded.length}/${photos.length} uploaded: ${url}`);
      } else {
        console.error(`❌ Photo ${currentIndex + 1} upload failed after all retries`);
      }
    }
  }

  const workers = [];
  const workerCount = Math.min(limit, photos.length);
  console.log(`Starting ${workerCount} workers`);
  for (let i = 0; i < workerCount; i++) workers.push(worker());
  await Promise.all(workers);
  
  console.log(`Upload complete. ${uploaded.length}/${photos.length} photos uploaded successfully`);
  return uploaded;
}

async function uploadSinglePhoto(photo) {
  console.log(`📤 uploadSinglePhoto: Starting upload for ${photo.name}, size: ${photo.blob?.size} bytes`);
  
  // ✅ Check internet connection first
  if (!navigator.onLine) {
    console.error('❌ No internet connection');
    toast('❌ No internet connection');
    return '';
  }
  
  if (!photo.blob) {
    console.error('❌ No blob found in photo object:', photo);
    toast('❌ Photo blob missing');
    return '';
  }
  
  const fd = new FormData();
  fd.append("file", photo.blob, photo.name);
  fd.append("upload_preset", CLOUD_PRESET);
  
  console.log(`🌐 Uploading to Cloudinary...`);
  console.log(`   Cloud Name: ${CLOUD_NAME}`);
  console.log(`   Preset: ${CLOUD_PRESET}`);
  console.log(`   File Size: ${photo.blob.size} bytes`);

  const controller = new AbortController();
  // ✅ Increased timeout to 60 seconds for slow connections
  const timeout = setTimeout(() => {
    console.error('⏱️ Upload timeout after 60 seconds');
    controller.abort();
  }, 60000);
  
  try {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    console.log(`🔗 Upload URL: ${uploadUrl}`);
    
    const r = await fetch(uploadUrl, {
      method: "POST",
      body: fd,
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    console.log(`📡 Response Status: ${r.status} ${r.statusText}`);
    
    // ✅ Log raw response for debugging
    const responseText = await r.text();
    console.log('📄 Raw response:', responseText);
    
    if (!r.ok) {
      console.error('❌ CLOUDINARY UPLOAD FAILED!');
      console.error('   Status:', r.status);
      console.error('   Status Text:', r.statusText);
      console.error('   Response Body:', responseText);
      
      // Parse error if JSON
      try {
        const errorJson = JSON.parse(responseText);
        console.error('   Error Details:', errorJson);
        if (errorJson.error && errorJson.error.message) {
          toast(`❌ Cloudinary: ${errorJson.error.message}`);
        } else {
          toast(`❌ Cloudinary error: ${r.status}`);
        }
      } catch (e) {
        toast(`❌ Cloudinary error: ${r.status} - ${responseText.substring(0, 50)}`);
      }
      
      return '';
    }
    
    const d = JSON.parse(responseText);
    console.log('✅ Upload response received:', d);
    
    if (d.secure_url) {
      console.log(`✅ SUCCESS! Cloudinary URL: ${d.secure_url}`);
      return d.secure_url;
    } else {
      console.error('❌ No secure_url in response:', d);
      toast('❌ No URL in Cloudinary response');
      return '';
    }
  } catch (e) {
    clearTimeout(timeout);
    console.error('❌ UPLOAD EXCEPTION!');
    console.error('   Error Name:', e.name);
    console.error('   Error Message:', e.message);
    console.error('   Full Error:', e);
    
    if (e.name === 'AbortError') {
      console.error('⏱️ Upload was aborted (timeout)');
      toast('❌ Upload timeout - Check internet');
    } else if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      console.error('🌐 Network error - No internet connection');
      toast('❌ No internet connection');
    } else {
      toast(`❌ Upload failed: ${e.message}`);
    }
    return '';
  }
}

// ✅ NEW: Retry logic for failed uploads
async function uploadWithRetry(photo, retries = 2) {
  // SAFE PHOTO VALIDATION
  if (!photo || !photo.blob || photo.blob.size === 0) {
    console.error("Invalid photo:", photo);
    return '';
  }

  for (let i = 0; i <= retries; i++) {
    console.log(`🔁 Upload attempt ${i + 1}/${retries + 1} for ${photo.name}`);
    const url = await uploadSinglePhoto(photo);
    if (url) {
      console.log(`✅ Upload succeeded on attempt ${i + 1}`);
      return url;
    }
    if (i < retries) {
      console.log(`⏳ Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.error(`❌ All ${retries + 1} upload attempts failed for ${photo.name}`);
  toast(`❌ Upload failed after ${retries + 1} attempts - check console`);
  return '';
}

function renderQueuedPhotos() {
  console.log('renderQueuedPhotos called. Photos in queue:', queuedPhotos.length);
  const gallery = document.getElementById('addedPhotos');
  
  if (!gallery) {
    console.error('Gallery element not found!');
    return;
  }

  // Preserve existing photo preview section in edit mode
  const existingWrap = document.getElementById('existingEditPhotosWrap');
  const children = Array.from(gallery.children);
  children.forEach(child => {
    if (!existingWrap || child.id !== 'existingEditPhotosWrap') {
      gallery.removeChild(child);
    }
  });
  
  // Show all queued photos
  queuedPhotos.forEach((photo, index) => {
    console.log(`Rendering photo ${index + 1}:`, photo.name, 'URL:', photo.previewUrl);
    const thumb = document.createElement('div');
    thumb.style.cssText = 'position:relative;border:2px solid var(--gold-border);border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1';
    thumb.innerHTML = `
      <img src="${photo.previewUrl}" style="width:100%;height:100%;object-fit:cover" onclick="viewPhotoPreview(${index})" onerror="console.error('Failed to load preview image:', this.src)">
      <button class="prm" style="position:absolute;top:5px;right:5px;width:28px;height:28px;font-size:1rem;background:rgba(122,0,0,0.9);color:white;border:none;border-radius:50%;cursor:pointer;font-weight:bold" onclick="removePhoto(${index})">✕</button>
      <div style="position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem">${index + 1}</div>
    `;
    gallery.appendChild(thumb);
  });

  console.log('Gallery rendered with', queuedPhotos.length, 'photos');

  // Show/hide skip photos button
  const skipBtn = document.getElementById('skipPhotosBtn');
  if (skipBtn) {
    if (queuedPhotos.length > 0) {
      skipBtn.style.display = 'block';
    } else {
      skipBtn.style.display = 'none';
    }
  }
}

function removePhoto(index) {
  const removed = queuedPhotos.splice(index, 1)[0];
  // ✅ PERFORMANCE: Clean up blob URL to free memory
  if (removed && removed.previewUrl && removed.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(removed.previewUrl);
  }
  renderQueuedPhotos();
  const msg = queuedPhotos.length ? `${queuedPhotos.length} photo(s) ready` : 'No photos';
  setUpMsg(msg, queuedPhotos.length ? "green" : 'gray');
  toast(`📸 ${queuedPhotos.length} photo(s) remaining`);
}


function prepAdd() {
  resetForm();
  document.getElementById('fReceipt').value = "";
  go('add');
}

// 🔧 DIAGNOSTIC: Test Cloudinary upload directly
window.testCloudinaryUpload = async function() {
  console.log('═══════════════════════════════════════════════');
  console.log('🧪 CLOUDINARY DIAGNOSTIC TEST');
  console.log('═══════════════════════════════════════════════');
  console.log('Configuration:');
  console.log('   CLOUD_NAME:', CLOUD_NAME);
  console.log('   CLOUD_PRESET:', CLOUD_PRESET);
  console.log('   Upload URL:', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
  console.log('───────────────────────────────────────────────');
  
  // Create a tiny test image (1x1 red pixel)
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 1, 1);
  
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      console.log('✅ Test image created (1x1 pixel, size:', blob.size, 'bytes)');
      
      const fd = new FormData();
      fd.append("file", blob, "test.jpg");
      fd.append("upload_preset", CLOUD_PRESET);
      
      console.log('📤 Sending test upload...');
      
      try {
        const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: fd
        });
        
        console.log('📡 Response Status:', r.status, r.statusText);
        
        const responseText = await r.text();
        console.log('📄 Response Body:', responseText);
        
        if (r.ok) {
          const data = JSON.parse(responseText);
          console.log('✅ SUCCESS! Upload worked!');
          console.log('   Cloudinary URL:', data.secure_url);
          console.log('───────────────────────────────────────────────');
          console.log('✅ CLOUDINARY IS CONFIGURED CORRECTLY');
          console.log('═══════════════════════════════════════════════');
          toast('✅ Cloudinary test passed!');
          resolve(true);
        } else {
          console.error('❌ UPLOAD FAILED');
          try {
            const errorData = JSON.parse(responseText);
            console.error('   Error:', errorData);
            if (errorData.error && errorData.error.message) {
              console.error('   Message:', errorData.error.message);
              toast(`❌ Test failed: ${errorData.error.message}`);
            }
          } catch (e) {
            console.error('   Raw error:', responseText);
          }
          console.log('───────────────────────────────────────────────');
          console.log('❌ CLOUDINARY CONFIGURATION ISSUE');
          console.log('   Check preset name and settings');
          console.log('═══════════════════════════════════════════════');
          resolve(false);
        }
      } catch (e) {
        console.error('❌ NETWORK ERROR:', e);
        console.log('───────────────────────────────────────────────');
        console.log('❌ CANNOT REACH CLOUDINARY');
        console.log('   Check internet connection');
        console.log('═══════════════════════════════════════════════');
        toast('❌ Network error: ' + e.message);
        resolve(false);
      }
    }, 'image/jpeg', 0.8);
  });
};

// Test Cloudinary upload directly
// UTILS
function go(s){
  document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
  document.getElementById('s-'+s).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('on'));
  document.getElementById('n-'+s).classList.add('on');
}

function calcBal(){
  const t=document.getElementById('fTotal').value||0, a=document.getElementById('fAdvance').value||0;
  document.getElementById('fBalance').value=t-a;
}

function filterRecords(f) {
  selectedDate = getLocalDateString(new Date()); // Reset to today
  curFilter = f;
  renderHome();
}

function setF(el,f){
  if (f === 'today') {
    // ✅ FIXED: Use local date string instead of UTC ISO string
    selectedDate = getLocalDateString(new Date());
    document.getElementById('srchQ').value = '';
  }
  curFilter=f;
  document.querySelectorAll('.fchip').forEach(x=>x.classList.remove('on'));
  el.classList.add('on'); renderHome();
  const panel = document.getElementById('filterMenuPanel');
  if (panel) panel.classList.remove('open');
}

function renderCalendarWidget() {
  const monthLabel = calendarDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('calendarMonth').textContent = monthLabel;

  const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const weekdayOffset = start.getDay();
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((weekdayOffset + daysInMonth) / 7) * 7;
  // ✅ FIXED: Use local date string instead of UTC ISO string
  const todayStr = getLocalDateString(new Date());
  // ✅ FIXED: Show ONLY start date (from) - when rental was ordered, not end date
  const eventDates = new Set(records.map(r => r.from).filter(Boolean));

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - weekdayOffset + 1;
    const cellDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayNumber);
    // ✅ FIXED: Use local date string instead of UTC ISO string
    const cellKey = getLocalDateString(cellDate);
    const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
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

  document.getElementById('calendarDays').innerHTML = cells.join('');
}

function changeCalendarMonth(offset) {
  calendarDate.setMonth(calendarDate.getMonth() + offset);
  renderCalendarWidget();
}

function selectCalendarDate(dateStr) {
  selectedDate = dateStr; // Set the selected date (Daybook style)
  document.getElementById('srchQ').value = ''; // Clear search
  curFilter = 'date';
  renderHome(); // Re-render with new date filter
}

function updateSliderDots(el) {
  const index = Math.round(el.scrollLeft / el.offsetWidth);
  const dots = el.parentElement.querySelectorAll('.s-dot');
  if (dots.length > 0) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }
}

function toast(m){
  const t=document.getElementById('toastEl');
  t.textContent=m; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

function showSpin(b){ document.getElementById('ovSpin').classList.toggle('show',b); }

function showBgSync(show) {
  let el = document.getElementById('bgSync');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bgSync';
    el.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 9999;
      display: none;
    `;
    el.innerText = "⏳ Syncing...";
    document.body.appendChild(el);
  }
  el.style.display = show ? 'block' : 'none';
}

function setUpMsg(m, color){
  const e=document.getElementById('upMsg');
  e.textContent=m;
  e.style.color=color;
}

function clearPhoto(){
  // ✅ PERFORMANCE: Clean up all blob URLs to free memory
  queuedPhotos.forEach(photo => {
    if (photo && photo._handedOff) return;
    if (photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl);
    }
  });
  queuedPhotos=[];
  document.getElementById('addedPhotos').innerHTML = '';
  document.getElementById('upMsg').textContent = '';
}

function saveRecycleBinCache() {
  try {
    localStorage.setItem('recycleBinRecords', JSON.stringify(recycleBinRecords));
  } catch (e) {
    console.warn('Failed to save recycle bin cache', e);
  }
}

function loadRecycleBinCache() {
  try {
    const cached = localStorage.getItem('recycleBinRecords');
    recycleBinRecords = cached ? JSON.parse(cached) : [];
  } catch (e) {
    recycleBinRecords = [];
    console.warn('Failed to load recycle bin cache', e);
  }
}

async function refreshRecycleBinFromSheet() {
  // ✅ Fetch from backend Archive sheet (source of truth)
  try {
    console.log('🗂️ Fetching recycle bin from backend...');
    // Use apiGet (GET) for getDeleted which doesn't need an ID
    const res = await apiGet('getDeleted');
    console.log('📡 getDeleted response:', res);
    console.log('📡 Response type:', typeof res);
    console.log('📡 Response.ok:', res?.ok);
    console.log('📡 Response.data type:', typeof res?.data);
    console.log('📡 Response.data isArray:', Array.isArray(res?.data));
    
    // More forgiving error checking
    if (!res) {
      console.error('❌ No response received');
      toast('⚠️ No response from server');
      return;
    }
    
    if (res.error) {
      console.error('❌ Backend error:', res.error);
      toast('⚠️ Server error: ' + res.error);
      return;
    }

    // If no data, default to empty array
    const data = Array.isArray(res.data) ? res.data : [];
    console.log('✅ Using data array with', data.length, 'records');

    // ✅ DEDUPLICATE recycle bin records by ID
    const seenDeletedIds = new Set();
    const deduplicatedData = data.filter(item => {
      const id = String(item.id || '').trim();
      if (seenDeletedIds.has(id)) {
        console.warn('⚠️ Duplicate in recycle bin filtered out: ID=' + id + ', Name=' + item.name);
        return false; // Skip duplicate
      }
      seenDeletedIds.add(id);
      return true;
    });

    // ✅ Update local cache from backend (backend is source of truth)
    recycleBinRecords = deduplicatedData.map(item => ({
      ...item,
      deletedAt: item.deletedAt || new Date().toISOString()
    }));
    
    console.log('✅ Recycle bin updated with', recycleBinRecords.length, 'unique records');
    
    // ✅ Save to localStorage for app restart
    saveRecycleBinCache();
    
    if (recycleBinRecords.length === 0) {
      console.log('ℹ️ Recycle bin is empty');
    }
  } catch (e) {
    console.error('❌ Exception in refreshRecycleBinFromSheet:', e);
    console.error('Exception message:', e.message);
    console.error('Exception stack:', e.stack);
    toast('⚠️ Failed to refresh recycle bin: ' + e.message);
  }
}

function removeRecordFromRecycleBin(recordId) {
  recycleBinRecords = recycleBinRecords.filter(item => String(item.id) !== String(recordId));
  saveRecycleBinCache();
}

function renderExistingEditPhotos() {
  const gallery = document.getElementById("addedPhotos");
  if (!gallery) return;
  const oldWrap = document.getElementById("existingEditPhotosWrap");
  if (oldWrap) oldWrap.remove();
  if (!editingExistingPhotos.length) return;

  const wrap = document.createElement("div");
  wrap.id = "existingEditPhotosWrap";
  wrap.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;margin-bottom:10px;padding:8px;border:1px dashed #d4a520;border-radius:8px;background:#fff8ec";
  wrap.innerHTML = editingExistingPhotos.map((url, index) => `
    <div style="position:relative;aspect-ratio:1;border:1px solid #d9c17a;border-radius:8px;overflow:hidden;">
      <img src="${url}" style="width:100%;height:100%;object-fit:cover" onclick="openImageViewer('${url.replace(/'/g, "\\'")}', ['${url.replace(/'/g, "\\'")}'])">
      <button type="button" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border:none;border-radius:50%;background:#7a0000;color:#fff;cursor:pointer;" onclick="removeExistingPhotoInEdit(${index})">✕</button>
    </div>
  `).join("");
  gallery.insertBefore(wrap, gallery.firstChild);
}

function removeExistingPhotoInEdit(index) {
  if (index < 0 || index >= editingExistingPhotos.length) return;
  editingExistingPhotos.splice(index, 1);
  renderExistingEditPhotos();
  toast("✅ Existing photo removed");
}

function openRet(id,n){
  pendRet=id;
  document.getElementById('mRetMsg').textContent=n;
  document.getElementById('mReturn').classList.add('open');
}

function openDel(id){ pendDel=id; document.getElementById('mDelete').classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }

async function apiCall(action, id, sheetId = MAIN_SHEET_ID) {
  let url = SCRIPT_URL + '?key=' + SECRET_KEY + '&action=' + action + '&id=' + encodeURIComponent(id) + (sheetId ? '&sheetId=' + encodeURIComponent(sheetId) : '') + '&_ts=' + Date.now();
  try { 
    const r = await fetch(url, { cache: 'no-store' }); 
    return await r.json(); 
  } catch(e) { 
    return {ok:false, error:"Network Error"}; 
  }
}

async function doReturn(){ 
  closeM('mReturn'); 
  
  // Optimistic UI: Update status immediately
  const returnedId = pendRet;
  const returnedIndex = records.findIndex(r => String(r.id) === String(returnedId));
  let originalRecord = null;
  
  if (returnedIndex !== -1) {
    originalRecord = {...records[returnedIndex]}; // Backup
    records[returnedIndex].status = 'returned'; // Update status
    renderHome();
    updateCounts();
    toast("Marking as returned...");
  }
  
  // Backend update
  const res = await apiCall('return', returnedId); 
  
  if (res.ok) {
    toast("✅ Returned");
    loadData(); // Sync with backend
  } else {
    // Rollback on failure
    if (originalRecord && returnedIndex !== -1) {
      records[returnedIndex] = originalRecord;
      renderHome();
      updateCounts();
    }
    toast("❌ Return failed: " + res.error);
  }
}
async function doDelete(){
  closeM('mDelete');

  const deletedId = pendDel;
  console.log('🗑️ DELETE ACTION: Starting delete for ID:', deletedId);

  // ✅ STEP 1: Optimistic UI - Remove from home immediately
  const index = records.findIndex(r => String(r.id) === String(deletedId));
  let backup = null;

  if (index !== -1) {
    // Back up for potential rollback
    backup = { ...records[index] };
    console.log('📋 Backing up record:', backup.name);
    
    // Remove from home view
    records.splice(index, 1);
    renderHome();
    updateCounts();
    saveRecordsCache();
    console.log('✅ UI Updated - Record removed from home');
  } else {
    console.warn('⚠️ Record not found in local array for ID:', deletedId);
  }

  toast("🗑️ Deleting...");

  // ✅ STEP 2: Sync to backend (backend is source of truth)
  console.log('📡 Calling backend delete action...');
  const res = await apiCall('delete', deletedId, MAIN_SHEET_ID);
  console.log('📡 Backend response:', res);
  
  if (!res.ok) {
    console.error('❌ DELETE FAILED:', res.error);
    // Rollback: restore record to home view
    if (backup) {
      console.log('🔄 Rolling back - restoring record:', backup.name);
      records.unshift(backup);
      renderHome();
      updateCounts();
      saveRecordsCache();
    }
    toast("❌ Delete failed: " + res.error);
    return;
  }

  console.log('✅ Backend delete successful');
  
  // ✅ STEP 3: Update recycle bin cache (non-blocking background refresh)
  // Only refresh if recycle bin modal is open
  const modal = document.getElementById('recycleBinModal');
  if (modal && modal.classList.contains('open')) {
    console.log('🔄 Recycle bin is open - refreshing...');
    refreshRecycleBinFromSheet().catch(e => console.warn('Background refresh error:', e));
  } else {
    console.log('ℹ️ Recycle bin not open - skipping refresh for now');
  }
  
  toast("✅ Record deleted");
}

function resetForm(){
  ['fName','fPhone','fAddress','fReceipt','fTotal','fAdvance','fBalance','fDeposit','fUser','fJewel'].forEach(id=>{
    const e=document.getElementById(id);
    if(e && id !== 'fJewel' && id !== 'fUser') e.value='';
  });
  // ✅ Set user to current logged-in user (read-only)
  const fUser = document.getElementById('fUser');
  if (fUser) {
    fUser.value = currentUser || 'Worker';
    fUser.readOnly = true; // User cannot change their name
  }
  document.getElementById('fJewel').value = 'Necklace';
  document.querySelectorAll('.jo').forEach(x=>x.classList.remove('sel'));
  document.querySelector('.jo[data-v="Necklace"]').classList.add('sel');
  clearPhoto();
  uploadedPhotos = [];
  currentEditId = null;
  editingExistingPhotos = [];
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.textContent = '✦ Save Record (सुरक्षित करें) ✦';
}

// Detail Modal Functions
function openDetail(id) {
  const r = records.find(x => String(x.id) === String(id));
  if (!r) return;
  
  curDetailRecord = r;  // Store for WhatsApp sharing

  const photos = getPhotosFromRecord(r);
  const infoGrid = document.getElementById('detailInfo');

  // Structure the details exactly as requested
  infoGrid.className = ""; // Remove grid class to allow custom structured layout
  infoGrid.innerHTML = `
<div style="padding:16px; font-size:14px; color: #1E0A00;">
  <h3 style="margin-bottom:10px; color: #7A0000; font-family: 'Cinzel', serif;">💍 ${r.jewel || 'Item'}</h3>

  <div style="margin-bottom:8px;">
    👤 <b>${r.name || '-'}</b><br>
    📞 ${r.phone || '-'}<br>
    📍 ${r.address || '-'}
  </div>

  <hr style="border:0; border-top:1px solid #E8D8A0; margin:10px 0;"/>

  <div style="margin:8px 0;">
    🧾 Receipt: <b>${r.receiptNo || '-'}</b><br>
    👨‍💼 Handled By: ${r.user || '-'}
  </div>

  <hr style="border:0; border-top:1px solid #E8D8A0; margin:10px 0;"/>

  <div style="margin:8px 0;">
    💰 Total: ₹${r.total || 0}<br>
    💵 Advance: ₹${r.advance || 0}<br>
    🧮 Balance: ₹${r.balance || 0}<br>
    🔒 Deposit: ₹${r.deposit || 0}
  </div>

  <hr style="border:0; border-top:1px solid #E8D8A0; margin:10px 0;"/>

  <div style="margin:8px 0;">
    📅 Pickup: ${formatDateDisplay(r.from)}<br>
    🔄 Return: ${formatDateDisplay(r.to) || 'Not returned'}
  </div>

  <hr style="border:0; border-top:1px solid #E8D8A0; margin:10px 0;"/>

  <div style="margin-top:10px;">
    📸 Photos:
    <div style="position:relative;">
      <div class="img-slider" style="margin-top:6px;" onscroll="updateSliderDots(this)">
        ${photos.map(p => `<img src="${p}" style="width:100%; height:200px; object-fit:cover; border-radius:8px; scroll-snap-align:center;" onclick="viewFullPhoto('${p.replace(/'/g, "\\'")}')">`).join('')}
      </div>
      ${photos.length > 1 ? `<div class="slider-dots">${photos.map((_, i) => `<div class="s-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}</div>` : ''}
    </div>
  </div>
</div>
`;
  
  // Hide original photo section to use the new embedded one
  const oldPhotoGallery = document.querySelector('.photo-gallery');
  if (oldPhotoGallery) oldPhotoGallery.style.display = 'none';
  
  document.getElementById('detailModal').classList.add('open');
  document.body.classList.add('modal-open');
}

function openEdit(id) {
  const record = records.find(x => String(x.id) === String(id));
  if (!record) return;
  curDetailRecord = record;
  populateFormForEdit(record);
  closeDetail();
  go('add');
}

async function openRecycleBin() {
  // ✅ CACHE-FIRST: Load from cache immediately for instant display
  loadRecycleBinCache();
  renderRecycleBinModal();

  // ✅ Refresh modal to show "Loading" state
  const modal = document.getElementById('recycleBinModal');
  if (modal) {
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }

  // ✅ Fetch fresh recycle bin data from backend in background
  // This ensures UI is never blocked waiting for API
  try {
    await refreshRecycleBinFromSheet();
    // ✅ Re-render with updated data
    renderRecycleBinModal();
  } catch (e) {
    console.error('Background recycle bin refresh error:', e);
    // Don't show error - cache was already displayed
  }
}

function closeRecycleBin() {
  const modal = document.getElementById('recycleBinModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
}

function renderRecycleBinModal(filteredRecords = null) {
  const list = document.getElementById('recycleBinList');
  if (!list) return;

  const recordsToDisplay = filteredRecords || recycleBinRecords;
  
  if (!recordsToDisplay.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:#7A5C2E;">' + 
      (filteredRecords ? '🔍 No records match your search' : '🗑 Recycle bin is empty') + 
      '</div>';
    return;
  }

  // ✅ NEW: Add "Empty Recycle Bin" button at the top if not filtered
  let emptyBtnHTML = '';
  if (!filteredRecords && recycleBinRecords.length > 0) {
    emptyBtnHTML = '<div style="padding:12px;border-bottom:1px solid #E8D8A0;text-align:center;">' +
      '<button onclick="emptyRecycleBin()" class="mb ok-del" style="width:100%;background-color:#7A0000;color:white;">🗑 Empty All Recycle Bin</button>' +
      '</div>';
  }

  const itemsHTML = recordsToDisplay.map(record => `
    <div class="recycle-item" style="border:1px solid #E8D8A0;border-radius:10px;padding:12px;margin-bottom:10px;">
      <div style="font-weight:700;color:#7A0000;">${record.name || 'Unnamed Record'}</div>
      <div style="font-size:12px;color:#6d4f28;margin:6px 0;">
        🧾 ${record.receiptNo || 'No receipt'}<br>
        🕒 Deleted ${formatDateDisplay(new Date(record.deletedAt || Date.now()).toISOString().slice(0, 10))}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="mb ok-ret" onclick="restoreDeletedRecord('${record.id}')">Restore</button>
        <button class="mb ok-del" onclick="permanentlyDeleteFromRecycleBin('${record.id}')">Delete Permanently</button>
      </div>
    </div>
  `).join('');
  
  list.innerHTML = emptyBtnHTML + itemsHTML;
}

// ✅ NEW: Filter recycle bin records by search query
function filterRecycleBinRecords(query) {
  if (!query || query.trim() === '') {
    renderRecycleBinModal();
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  const filtered = recycleBinRecords.filter(record => {
    const searchText = (
      (record.name || '') + ' ' +
      (record.phone || '') + ' ' +
      (record.receiptNo || '') + ' ' +
      (record.address || '')
    ).toLowerCase();
    return searchText.includes(lowerQuery);
  });
  
  renderRecycleBinModal(filtered);
}

async function restoreDeletedRecord(recordId) {
  // ✅ Find record in local cache
  const record = recycleBinRecords.find(item => String(item.id) === String(recordId));
  if (!record) {
    toast('⚠️ Record not found in recycle bin');
    return;
  }

  // ✅ DEDUPLICATE: Remove any existing records with same ID first
  records = records.filter(r => String(r.id) !== String(recordId));

  // ✅ STEP 1: Optimistic UI - add to home immediately
  records.unshift({
    ...record,
    status: 'active'
  });
  removeRecordFromRecycleBin(recordId);
  renderHome();
  updateCounts();
  saveRecordsCache();
  renderRecycleBinModal();
  toast('♻️ Restoring record...');

  // ✅ STEP 2: Sync to backend
  // Backend will:
  // 1. Remove from Archive sheet
  // 2. Add back to Main sheet
  try {
    // ✅ Call restore action (backend handles moving from Archive to Main)
    const res = await apiGet('restore', { id: recordId }, MAIN_SHEET_ID);
    if (!res.ok) {
      toast('❌ Restore sync failed: ' + res.error);
      // Refresh both sheets to sync state
      await loadData(true);
      renderHome();
      renderRecycleBinModal();
      return;
    }

    // ✅ Refresh backend state - this will deduplicate
    await refreshRecycleBinFromSheet();

    saveRecordsCache();
    renderHome();
    renderRecycleBinModal();
    updateCounts();
    toast('✅ Record restored');
  } catch (e) {
    console.error('Restore record error:', e);
    toast('❌ Restore sync failed');
    // Refresh to sync state
    await loadData(true);
    renderHome();
    renderRecycleBinModal();
  }
}

async function permanentlyDeleteFromRecycleBin(recordId) {
  if (!recordId) {
    toast('❌ Invalid record ID');
    return;
  }
  
  if (!confirm('Delete this record forever from recycle bin? This cannot be undone!')) return;

  console.log('🗑️ Permanently deleting record ID:', recordId);
  
  // ✅ OPTIMISTIC UI: Remove from display immediately
  removeRecordFromRecycleBin(recordId);
  renderRecycleBinModal();
  toast('🗑️ Deleting...');
  
  // ✅ BACKGROUND: Send delete to backend (no need to wait)
  apiGet('permanentlyDelete', { id: recordId }, MAIN_SHEET_ID)
    .then(res => {
      if (!res.ok) {
        console.error('❌ Backend delete failed:', res.error);
        toast('❌ Sync failed - record removed from cache');
      } else {
        console.log('✅ Backend permanent delete successful');
        toast('🗑️ Deleted permanently');
      }
      // Refresh to stay in sync
      refreshRecycleBinFromSheet().catch(err => console.warn('Recycle bin refresh failed:', err));
    })
    .catch(err => {
      console.error('❌ Delete error:', err);
      toast('❌ Delete error - trying again');
    });
}

// ✅ NEW: Empty entire recycle bin
async function emptyRecycleBin() {
  if (recycleBinRecords.length === 0) {
    toast('🗑️ Recycle bin is already empty');
    return;
  }
  
  if (!confirm('Delete ALL records in recycle bin? This cannot be undone!')) return;
  
  console.log('🗑️ Emptying recycle bin with', recycleBinRecords.length, 'records');
  toast('🗑️ Emptying recycle bin...');
  
  // ✅ Get all IDs before clearing
  const recordsToDelete = [...recycleBinRecords];
  
  // ✅ OPTIMISTIC UI: Clear recycle bin immediately
  recycleBinRecords = [];
  saveRecycleBinCache();
  renderRecycleBinModal();
  
  // ✅ BACKGROUND: Delete all records from backend in parallel
  const deletePromises = recordsToDelete.map(record =>
    apiGet('permanentlyDelete', { id: record.id }, MAIN_SHEET_ID)
      .then(res => {
        if (!res.ok) {
          console.warn('⚠️ Failed to delete ID:', record.id, res.error);
        } else {
          console.log('✅ Deleted ID:', record.id);
        }
        return res;
      })
      .catch(err => {
        console.warn('⚠️ Delete error for ID:', record.id, err);
      })
  );
  
  // Wait for all deletes to complete
  await Promise.all(deletePromises);
  toast('✅ Recycle bin emptied');
  closeRecycleBin();
}

function populateFormForEdit(record) {
  currentEditId = record.id;
  document.getElementById('fName').value = record.name || '';
  document.getElementById('fUser').value = record.user || 'Worker';
  document.getElementById('fPhone').value = record.phone || '';
  document.getElementById('fAddress').value = record.address || '';
  document.getElementById('fReceipt').value = record.receiptNo || '';
  document.getElementById('fJewel').value = record.jewel || 'Necklace';
  document.querySelectorAll('.jo').forEach(x => x.classList.remove('sel'));
  const jewelMatch = document.querySelector(`.jo[data-v="${record.jewel}"]`);
  if (jewelMatch) {
    jewelMatch.classList.add('sel');
  } else {
    document.querySelector('.jo[data-v="Necklace"]').classList.add('sel');
  }
  document.getElementById('fTotal').value = record.total || '';
  document.getElementById('fAdvance').value = record.advance || '';
  document.getElementById('fBalance').value = record.balance || '';
  document.getElementById('fDeposit').value = record.deposit || '';
  document.getElementById('fFrom').value = record.from || '';
  document.getElementById('fTo').value = record.to || '';
  clearPhoto();
  queuedPhotos = [];
  editingExistingPhotos = getPhotosFromRecord(record).filter(url => url.startsWith("http://") || url.startsWith("https://"));
  renderExistingEditPhotos();
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.textContent = '✦ Update Record (अपडेट करें) ✦';
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
  document.body.classList.remove('modal-open');
}

async function deletePhotoFromRecord(recordId, urlToDelete) {
  if (!confirm('Delete this photo? This cannot be undone.')) return;
  
  const record = records.find(r => r.id === recordId);
  if (!record) {
    toast('❌ Record not found');
    return;
  }
  
  showSpin(true);
  
  try {
    // Get all photos from the record
    const allPhotos = getPhotosFromRecord(record);
    
    // Remove the specific photo URL
    const updatedPhotos = allPhotos.filter(url => url !== urlToDelete);
    
    // Update the record with new photo URLs (persisted-only; never sync blob URLs)
    const newPhotoString = updatedPhotos
      .filter(url => url.startsWith('http://') || url.startsWith('https://'))
      .join('|');
    const updateRes = await apiGet('updatePhoto', { id: recordId, url: newPhotoString });
    
    if (updateRes.ok) {
      toast('✅ Photo deleted!');
      
      // Force reload from backend to ensure sync
      await loadData();
      
      // Close and reopen the detail modal with fresh data
      closeDetail();
      setTimeout(() => {
        openDetail(recordId);
      }, 400);
    } else {
      toast('❌ Failed to delete photo: ' + updateRes.error);
    }
  } catch (error) {
    console.error('Delete photo error:', error);
    toast('❌ Error deleting photo');
  } finally {
    showSpin(false);
  }
}

function getPhotosFromRecord(r) {
  if (!r) return [];

  normalizePhotoUrlsField(r);

  const raw = normalizePhotoUrlsValue(r.photoUrls);
  const photos = raw
    .split('|')
    .map(x => x.trim())
    .filter(Boolean);

  // Debug: Log what URLs we found
  if (photos.length > 0) {
    console.log('getPhotosFromRecord - Found URLs:', photos);
  }

  // Remove duplicates and filter for valid links (http/https/blob)
  return [...new Set(photos)].filter(isValidPhotoUrl);
}

function isValidPhotoUrl(url) {
  if (!url) return false;
  const s = String(url).trim();

  // Allow blob URLs for instant photo preview right after save
  // (these are later replaced by Cloudinary URLs after background upload)
  if (s.startsWith('blob:')) {
    return true;
  }

  // Filter out placeholder markers
  if (s.toUpperCase() === 'PENDING' || s === 'undefined' || s === 'null') return false;

  // Must be a real URL (http/https)
  return (s.startsWith('http://') || s.startsWith('https://')) && !s.includes(' ');
}

function normalizePhotoUrlsValue(value) {
  if (Array.isArray(value)) {
    return value.map(x => String(x || '').trim()).filter(Boolean).join('|');
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizePhotoUrlsField(record) {
  if (!record || typeof record !== 'object') return record;

  // Normalize to pipe-separated string
  const raw = normalizePhotoUrlsValue(record.photoUrls);
  const parts = raw
    .split('|')
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => x.toUpperCase() !== 'PENDING' && x !== 'undefined' && x !== 'null');

  // Keep only valid URLs (http/https/blob)
  const deduped = [];
  const seen = new Set();
  for (const p of parts) {
    if (!isValidPhotoUrl(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    deduped.push(p);
  }

  record.photoUrls = deduped.join('|');
  return record;
}

function getPrimaryPhoto(r) {
  const photos = getPhotosFromRecord(r);
  return photos.length ? photos[0] : '';
}

function openImageGallery(startIndex, photosArray) {
  const photos = Array.isArray(photosArray) ? photosArray : [photosArray];
  openImageViewer(photos[startIndex] || photos[0], photos);
}

function viewFullPhoto(url) {
  openImageViewer(url, [url]);
}

function viewPhotoPreview(index) {
  if (queuedPhotos[index]) {
    const allUrls = queuedPhotos.map(p => p.previewUrl);
    openImageViewer(queuedPhotos[index].previewUrl, allUrls);
  }
}

let currentImageGallery = [];
let currentImageIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

function openImageViewer(url, allPhotos = [url]) {
  currentImageGallery = allPhotos;
  currentImageIndex = allPhotos.indexOf(url);
  if (currentImageIndex === -1) currentImageIndex = 0;
  
  renderImageSlider();
  document.getElementById('imageViewerModal').classList.add('open');
  document.body.classList.add('modal-open');
  
  // Add touch event listeners
  const container = document.getElementById('imageSliderContainer');
  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
}

function renderImageSlider() {
  const slider = document.getElementById('imageSlider');
  const counter = document.getElementById('imageCounter');
  const dots = document.getElementById('imageDots');
  
  // Render slides
  slider.innerHTML = currentImageGallery.map(url => 
    `<div class="image-slide"><img src="${url}" alt="Photo"></div>`
  ).join('');
  
  // Update counter
  counter.textContent = `${currentImageIndex + 1} / ${currentImageGallery.length}`;
  
  // Render dots
  if (currentImageGallery.length > 1) {
    dots.innerHTML = currentImageGallery.map((_, i) => 
      `<div class="image-dot ${i === currentImageIndex ? 'active' : ''}"></div>`
    ).join('');
    dots.style.display = 'flex';
  } else {
    dots.style.display = 'none';
  }
  
  // Set slider position - faster transition
  slider.style.transform = `translateX(-${currentImageIndex * 100}%)`;
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0 && currentImageIndex < currentImageGallery.length - 1) {
      // Swipe left - next image
      currentImageIndex++;
      renderImageSlider();
    } else if (diff < 0 && currentImageIndex > 0) {
      // Swipe right - previous image
      currentImageIndex--;
      renderImageSlider();
    }
  }
}

function closeImageViewer() {
  const container = document.getElementById('imageSliderContainer');
  container.removeEventListener('touchstart', handleTouchStart);
  container.removeEventListener('touchend', handleTouchEnd);
  
  document.getElementById('imageViewerModal').classList.remove('open');
  document.body.classList.remove('modal-open');
  
  setTimeout(() => {
    document.getElementById('imageSlider').innerHTML = '';
    currentImageGallery = [];
    currentImageIndex = 0;
  }, 300);
}

function ensurePrintContainer() {
  let container = document.getElementById("printRecordContainer");
  if (container) return container;

  container = document.createElement("div");
  container.id = "printRecordContainer";
  container.style.cssText = "display:none;position:fixed;inset:0;background:white;z-index:99999;overflow:auto;padding:18px;";
  document.body.appendChild(container);
  return container;
}

function buildPrintRecordHtml(record) {
  const photos = getPhotosFromRecord(record);
  const photoHtml = photos.length
    ? `<div style="margin-top:10px;">
         <div style="font-weight:700;margin-bottom:6px;">Photos</div>
         <div style="display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:8px;">
           ${photos.map(url => `<img src="${url}" style="width:100%;height:120px;object-fit:cover;border:1px solid #ccc;border-radius:6px;">`).join("")}
         </div>
       </div>`
    : "";

  return `
    <div style="max-width:700px;margin:0 auto;color:#111;font-family:Arial,sans-serif;line-height:1.35;border:1px solid #ccc;padding:14px;border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h2 style="margin-bottom:2px;">Mahalakshmi Rentals</h2>
          <div style="font-size:12px;color:#555;">Customer Rental Record</div>
        </div>
        <div style="font-size:12px;color:#555;text-align:right;">
          <div><b>Receipt:</b> ${record.receiptNo || "-"}</div>
          <div><b>Status:</b> ${record.status || "-"}</div>
        </div>
      </div>
      <hr style="margin:10px 0;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;width:180px;"><b>Name</b></td><td>${record.name || "-"}</td></tr>
        <tr><td style="padding:6px 0;"><b>Phone</b></td><td>${record.phone || "-"}</td></tr>
        <tr><td style="padding:6px 0;"><b>Address</b></td><td>${record.address || "-"}</td></tr>
        <tr><td style="padding:6px 0;"><b>Item</b></td><td>${record.jewel || "-"}</td></tr>
        <tr><td style="padding:6px 0;"><b>Total</b></td><td>Rs. ${record.total || 0}</td></tr>
        <tr><td style="padding:6px 0;"><b>Advance</b></td><td>Rs. ${record.advance || 0}</td></tr>
        <tr><td style="padding:6px 0;"><b>Balance</b></td><td>Rs. ${record.balance || 0}</td></tr>
        <tr><td style="padding:6px 0;"><b>Deposit</b></td><td>Rs. ${record.deposit || 0}</td></tr>
        <tr><td style="padding:6px 0;"><b>From</b></td><td>${record.from || "-"}</td></tr>
        <tr><td style="padding:6px 0;"><b>To</b></td><td>${record.to || "-"}</td></tr>
        <tr><td style="padding:6px 0;"><b>User</b></td><td>${record.user || "-"}</td></tr>
      </table>
      ${photoHtml}
      <div style="margin-top:12px;font-size:12px;color:#444;">Signature: ____________________</div>
      <hr style="margin:10px 0;">
      <div style="text-align:center;font-size:10px;color:#666;margin-top:10px;">
        🔧 Developed by <strong>Prajwal Patil</strong> | <a href="tel:9113581092" style="color:#666;text-decoration:none;font-weight:bold;">9113581092</a>
      </div>
    </div>
  `;
}

function printRecord(record = curDetailRecord) {
  if (!record) {
    toast("⚠️ Select a record to print");
    return;
  }

  const printContainer = ensurePrintContainer();
  printContainer.innerHTML = buildPrintRecordHtml(record);
  printContainer.style.display = "block";
  document.body.classList.add("print-record-only");

  const cleanup = () => {
    document.body.classList.remove("print-record-only");
    printContainer.style.display = "none";
  };

  window.onafterprint = cleanup;

  if (window.AndroidCamera && typeof window.AndroidCamera.printPage === "function") {
    try {
      window.AndroidCamera.printPage();
      setTimeout(cleanup, 1200);
      return;
    } catch (e) {
      console.warn("Native print failed, fallback to window.print()", e);
    }
  }
  window.print();
}
function formatWhatsAppPhone(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return '';
  if (cleanPhone.length === 10) return '91' + cleanPhone;
  if (cleanPhone.startsWith('91') && cleanPhone.length >= 12) return cleanPhone;
  return cleanPhone;
}

function buildWhatsAppMessage(record) {
  const photos = getPhotosFromRecord(record).filter(url => url && url !== 'PENDING');
  const lines = [
    '*Mahalakshmi Rentals*',
    '',
    'Rental Details',
    '',
    `Customer: ${record.name || '-'}` ,
    `Phone: ${record.phone || '-'}` ,
    `Address: ${record.address || '-'}` ,
    `Receipt No: ${record.receiptNo || '-'}` ,
    `Item: ${record.jewel || '-'}` ,
    `Total: Rs. ${record.total || 0}` ,
    `Advance: Rs. ${record.advance || 0}` ,
    `Balance: Rs. ${record.balance || 0}` ,
    `Deposit: Rs. ${record.deposit || 0}` ,
    `Pickup: ${record.from || '-'}` ,
    `Return: ${record.to || '-'}` ,
    `Handled By: ${record.user || 'Worker'}`
  ];

  if (photos.length) {
    lines.push('', '*Photos:*');
    photos.forEach((url, i) => {
      lines.push(`${i + 1}. ${url}`);
    });
  }

  lines.push('', 'Thank you for choosing Mahalakshmi Rentals.', '', '🔧 Developed by Prajwal Patil | 9113581092');
  return lines.join('\n');
}

function shareWhatsApp(record) {
  if (!record) return;

  const msg = buildWhatsAppMessage(record);
  const phone = formatWhatsAppPhone(record.phone);

  // Prefer native Android bridge when available
  if (window.AndroidCamera && typeof window.AndroidCamera.shareWhatsApp === 'function') {
    try {
      window.AndroidCamera.shareWhatsApp(msg, phone || '');
      return;
    } catch (e) {
      console.warn('Native WhatsApp share failed, fallback to wa.me', e);
    }
  }

  const encodedMsg = encodeURIComponent(msg);
  const url = phone
    ? `https://wa.me/${phone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;
  window.location.href = url;
}


function pickJ(el){
  document.querySelectorAll('.jo').forEach(x=>x.classList.remove('sel'));
  el.classList.add('sel');
  const input = document.getElementById('fJewel');
  input.value=el.dataset.v;
  input.blur(); // Remove cursor focus
}

function debounceSearch(){
  const q = document.getElementById('srchQ').value.trim();
  if (q.length) selectedDate = getLocalDateString(new Date()); // Reset to today when searching
  clearTimeout(searchTimeout);
  // ✅ PERFORMANCE: Debounce render to avoid lag during typing
  searchTimeout = setTimeout(renderHome, 300);
}

function syncData(){ 
  const btn = document.querySelector('.hd-sync');
  
  // Prevent rapid clicking (debounce)
  if (btn.disabled) return;
  
  btn.style.animation = 'spin 0.8s linear';
  btn.disabled = true;
  btn.textContent = '⟳ Syncing...';
  
  loadData().then(()=>{
    btn.style.animation = 'none';
    btn.disabled = false;
    btn.textContent = '⟳ Sync (सिंक)';
    setTimeout(() => { btn.style.animation = ''; }, 10);
    toast("✅ Data synced!"); 
  }).catch((err) => {
    btn.disabled = false;
    btn.textContent = '⟳ Sync (सिंक)';
    toast("❌ Sync failed!");
  });
}

// Card photo slider functions
// Handle Android back button
window.handleBackButton = function() {
  // Check if image viewer is open
  if (document.getElementById('imageViewerModal').classList.contains('open')) {
    closeImageViewer();
    return true;
  }
  
  // Check if detail modal is open
  if (document.getElementById('detailModal').classList.contains('open')) {
    closeDetail();
    return true;
  }

  if (document.getElementById('recycleBinModal').classList.contains('open')) {
    closeRecycleBin();
    return true;
  }
  
  // Check if any other modal is open
  if (document.getElementById('mReturn').classList.contains('open')) {
    closeM('mReturn');
    return true;
  }
  
  if (document.getElementById('mDelete').classList.contains('open')) {
    closeM('mDelete');
    return true;
  }
  
  // Check if on add screen, go back to home
  if (document.getElementById('s-add').classList.contains('active')) {
    go('home');
    return true;
  }
  
  // Let Android handle it (exit app)
  return false;
};

// Photo Slider Functions

function initApp() {
  // ✅ VERSION 1.0: Premium 3D splash screen animation
  const splashScreen = document.getElementById('splashScreen');
  if (splashScreen) {
    setTimeout(() => {
      splashScreen.classList.add('hide');
      setTimeout(() => {
        splashScreen.style.display = 'none';
      }, 600);
    }, 2000);
  }

  loadRecycleBinCache();
  refreshRecycleBinFromSheet();

  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) syncBtn.addEventListener('click', syncData);

  const homeBtn = document.getElementById('n-home');
  if (homeBtn) homeBtn.addEventListener('click', () => go('home'));

  const addBtn = document.getElementById('n-add');
  if (addBtn) addBtn.addEventListener('click', prepAdd);

  // ✅ NEW: Add logout button handler
  const logoutBtn = document.getElementById('n-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

  const addBigBtn = document.getElementById('addBigBtn');
  if (addBigBtn) addBigBtn.addEventListener('click', prepAdd);

  const searchInput = document.getElementById('srchQ');
  if (searchInput) searchInput.addEventListener('input', debounceSearch);
  const recycleBinBtn = document.getElementById('recycleBinBtn');
  if (recycleBinBtn) recycleBinBtn.addEventListener('click', openRecycleBin);
  
  // ✅ NEW: Add search functionality for recycle bin
  const recycleBinSearch = document.getElementById('recycleBinSearch');
  if (recycleBinSearch) {
    recycleBinSearch.addEventListener('input', (e) => {
      filterRecycleBinRecords(e.target.value);
    });
  }

  renderCalendarWidget();

  const filterWrapper = document.querySelector('.filter-menu-panel');
  if (filterWrapper) {
    filterWrapper.addEventListener('click', (e) => {
      const chip = e.target.closest('.fchip');
      if (!chip) return;
      setF(chip, chip.dataset.f);
    });
  }

  const filterMenuBtn = document.getElementById('filterMenuBtn');
  const filterMenuPanel = document.getElementById('filterMenuPanel');
  if (filterMenuBtn && filterMenuPanel) {
    filterMenuBtn.addEventListener('click', () => {
      filterMenuPanel.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-menu-wrap')) {
        filterMenuPanel.classList.remove('open');
      }
    });
  }

  const prevMonthBtn = document.getElementById('prevMonth');
  if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeCalendarMonth(-1));

  const nextMonthBtn = document.getElementById('nextMonth');
  if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeCalendarMonth(1));

  const calendarDays = document.getElementById('calendarDays');
  if (calendarDays) {
    calendarDays.addEventListener('click', (e) => {
      const dayEl = e.target.closest('.cw-day');
      if (!dayEl || !dayEl.dataset.date) return;
      selectCalendarDate(dayEl.dataset.date);
    });
  }

  const totalInput = document.getElementById('fTotal');
  const advanceInput = document.getElementById('fAdvance');
  [totalInput, advanceInput].forEach((el) => {
    if (el) el.addEventListener('input', calcBal);
  });

  const jewelGrid = document.getElementById('jewPick');
  if (jewelGrid) {
    jewelGrid.addEventListener('click', (e) => {
      const tile = e.target.closest('.jo');
      if (!tile) return;
      pickJ(tile);
    });
  }

  const cameraBtn = document.getElementById('cameraBtn');
  if (cameraBtn) cameraBtn.addEventListener('click', openCamera);

  const galleryBtn = document.getElementById('galleryBtn');
  if (galleryBtn) galleryBtn.addEventListener('click', triggerGallery);

  const cameraInput = document.getElementById('cameraInput');
  if (cameraInput) cameraInput.addEventListener('change', function() { handleCameraPhoto(this); });

  const galleryInput = document.getElementById('galleryInput');
  if (galleryInput) galleryInput.addEventListener('change', function() { handleGalleryPhotos(this); });

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.addEventListener('click', () => saveEntry());

  const skipPhotosBtn = document.getElementById('skipPhotosBtn');
  if (skipPhotosBtn) skipPhotosBtn.addEventListener('click', () => saveEntry(true));

  const mReturnCancel = document.getElementById('mReturnCancel');
  if (mReturnCancel) mReturnCancel.addEventListener('click', () => closeM('mReturn'));

  const mReturnOk = document.getElementById('mReturnOk');
  if (mReturnOk) mReturnOk.addEventListener('click', doReturn);

  const mDeleteCancel = document.getElementById('mDeleteCancel');
  if (mDeleteCancel) mDeleteCancel.addEventListener('click', () => closeM('mDelete'));

  const mDeleteOk = document.getElementById('mDeleteOk');
  if (mDeleteOk) mDeleteOk.addEventListener('click', doDelete);

  const imageViewerClose = document.getElementById('imageViewerClose');
  if (imageViewerClose) imageViewerClose.addEventListener('click', closeImageViewer);
  const recycleBinCloseBtn = document.getElementById('recycleBinCloseBtn');
  if (recycleBinCloseBtn) recycleBinCloseBtn.addEventListener('click', closeRecycleBin);

  const detailCloseBtn = document.getElementById('detailCloseBtn');
  if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetail);

  const detailCloseActionBtn = document.getElementById('detailCloseActionBtn');
  if (detailCloseActionBtn) detailCloseActionBtn.addEventListener('click', closeDetail);

  const detailWhatsAppBtn = document.getElementById('detailWhatsAppBtn');
  if (detailWhatsAppBtn) detailWhatsAppBtn.addEventListener('click', () => shareWhatsApp(curDetailRecord));

  const detailEditBtn = document.getElementById('detailEditBtn');
  if (detailEditBtn) detailEditBtn.addEventListener('click', () => {
    if (curDetailRecord) openEdit(curDetailRecord.id);
  });

  const detailPrintBtn = document.getElementById('detailPrintBtn');
  if (detailPrintBtn) detailPrintBtn.addEventListener('click', printRecord);

  const homeList = document.getElementById('homeList');
  if (homeList) {
    homeList.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;

      const action = actionBtn.dataset.action;
      const id = actionBtn.dataset.id;
      if (action === 'edit-record') {
        e.stopPropagation();
        openEdit(id);
        return;
      }
      if (action === 'delete-record') {
        e.stopPropagation();
        openDel(id);
        return;
      }
      if (action === 'return-record') {
        e.stopPropagation();
        openRet(id, actionBtn.dataset.name || '');
        return;
      }
      if (action === 'open-detail') {
        openDetail(id);
        return;
      }
      if (action === 'remove-existing-photo') {
        e.stopPropagation();
        const idx = parseInt(actionBtn.dataset.index || "-1", 10);
        if (idx >= 0 && idx < editingExistingPhotos.length) {
          editingExistingPhotos.splice(idx, 1);
          renderExistingEditPhotos();
          toast("✅ Existing photo removed");
        }
        return;
      }
      if (action === 'open-image-viewer') {
        const url = actionBtn.dataset.url || "";
        if (url) openImageViewer(url, [url]);
      }
    });
  }
}

// Add touch support and swipe navigation
document.addEventListener('DOMContentLoaded', function() {
  initApp();

  // Smooth left/right swipe navigation between Home and New
  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.img-slider, .image-slider-container, input, textarea, .filter-menu-panel, .detail-modal')) return;
    swipeStartX = e.changedTouches[0].screenX;
    swipeStartY = e.changedTouches[0].screenY;
    swipeStartTime = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].screenX;
    const endY = e.changedTouches[0].screenY;
    const dx = endX - swipeStartX;
    const dy = Math.abs(endY - swipeStartY);
    const dt = Date.now() - swipeStartTime;
    const isHorizontalSwipe = Math.abs(dx) > 80 && dy < 60 && dt < 500;
    if (!isHorizontalSwipe) return;
    if (dx < 0) go('add');
    else go('home');
  }, { passive: true });
});
