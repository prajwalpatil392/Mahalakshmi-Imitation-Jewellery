// Application initialization
// This file MUST load LAST after all dependencies

// ============================================================================
// 👤 USER SESSION HELPERS
// ============================================================================

let currentUser = null;

function loadUserSession() {
  const stored = localStorage.getItem(STORAGE.USER_KEY);
  if (stored) {
    currentUser = stored;
  }
}

function saveUserSession(userName) {
  currentUser = userName;
  localStorage.setItem(STORAGE.USER_KEY, userName);
}

// ============================================================================
// 🚀 APP INITIALIZATION
// ============================================================================

function initializeApp() {
  log('🚀 Initializing Mahalakshmi Jewellery App');

  // 1. Critical Session Data
  loadUserSession();
  const savedUser = localStorage.getItem(STORAGE.USER_KEY);
  const userField = document.getElementById('fUser');
  if (savedUser && userField) userField.value = savedUser;

  // 2. Immediate UI shell & Routing
  const header = document.getElementById('mainHeader');
  const nav = document.getElementById('mainNav');
  if (savedUser) {
    if (header) header.style.display = '';
    if (nav) nav.style.display = '';
    go('home', false);
  } else {
    if (header) header.style.display = 'none';
    if (nav) nav.style.display = 'none';
    go('login', false);
  }

  // 3. Defer Heavy Work to prevent main thread blocking
  setTimeout(() => {
    // Initialize subscription
    if (typeof initSubscription === 'function') initSubscription();

    // Load data (this triggers first render)
    loadData();

    // Update labels
    updateHeaderDate();
  }, 50);

  // 4. Defer even more
  setTimeout(() => {
    renderCalendarWidget();
  }, 500);

  // 5. Cleanup Splash
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    const mainApp = document.getElementById('mainApp');
    if (splash) {
      splash.style.opacity = '0';
      if (mainApp) {
        mainApp.style.opacity = '1';
        mainApp.style.visibility = 'visible';
      }
      setTimeout(() => { splash.style.display = 'none'; }, 300);
    }
  }, 1000);
}

function loginUser(username) {
  saveUserSession(username);
  
  // Update form user field
  const userField = document.getElementById('fUser');
  if (userField) userField.value = username;
  
  // Show header and nav
  const header = document.getElementById('mainHeader');
  const nav = document.getElementById('mainNav');
  if (header) header.style.display = '';
  if (nav) nav.style.display = '';
  
  toast(`Welcome, ${username}!`);
  go('home');
}

function logoutUser() {
  localStorage.removeItem(STORAGE.USER_KEY);
  currentUser = null;
  
  // Clear username input and form field
  const usernameInput = document.getElementById('loginUsernameInput');
  if (usernameInput) usernameInput.value = '';
  const userField = document.getElementById('fUser');
  if (userField) userField.value = '';
  
  // Hide header and nav
  const header = document.getElementById('mainHeader');
  const nav = document.getElementById('mainNav');
  if (header) header.style.display = 'none';
  if (nav) nav.style.display = 'none';
  
  toast('Logged out successfully');
  go('login');
}

function updateHeaderDate() {
  const headerDateText = document.getElementById('headerDateText');
  if (!headerDateText) return;

  const todayStr = typeof getTodayInternal === 'function' ? getTodayInternal() : '';
  const dateText = todayStr && typeof formatDateDisplay === 'function'
    ? formatDateDisplay(todayStr)
    : new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  headerDateText.textContent = dateText;
}

// ============================================================================
// 🌐 APP LIFECYCLE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  log('📄 DOM Content Loaded');

  // Initialize app
  initializeApp();

  // Periodic sync every 1 minute when online to catch Google Sheets changes automatically
  setInterval(() => {
    if (navigator.onLine) {
      log('⏰ Auto-sync: Checking for Google Sheets updates...');
      syncData();
    }
  }, 1 * 60 * 1000);
});

window.addEventListener('online', () => {
  log('🌐 Back online');
  isOnline = true;
  hideNetworkWarning();
  toast('✅ Back online');
  if (typeof syncPendingLocalChanges === 'function') syncPendingLocalChanges();
  syncData();
});

window.addEventListener('offline', () => {
  log('📡 Went offline');
  isOnline = false;
  showNetworkWarning();
  toast('⚠️ No internet connection');
});

log('📦 app.js loaded');
