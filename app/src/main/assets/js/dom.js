// ============================================================================
// 🎯 DOM MODULE: Lightweight DOM access helpers
// ============================================================================
// Responsibility: Provide cached selectors for static elements
// Does NOT cache: Dynamic cards, modal content, gallery slides
// Keeps code DRY without over-engineering

console.log('✅ dom.js loaded');

// ============================================================================
// 📱 STATIC ELEMENT SELECTORS (cached once)
// ============================================================================

const DOM = {
  // Screens
  get addScreen() { return document.getElementById('s-add'); },
  get homeScreen() { return document.getElementById('s-home'); },
  
  // Navigation
  get homeBtn() { return document.getElementById('n-home'); },
  get addBtn() { return document.getElementById('n-add'); },
  get syncBtn() { return document.getElementById('syncBtn'); },
  get updateCheckBtn() { return document.getElementById('updateCheckBtn'); },
  
  // Home screen
  get homeList() { return document.getElementById('homeList'); },
  get searchInput() { return document.getElementById('srchQ'); },
  get headerDate() { return document.getElementById('headerDate'); },
  get recycleBinBtn() { return document.getElementById('recycleBinBtn'); },
  
  // Filter menu (chips live inside #filterMenuPanel)
  get filterMenuPanel() { return document.getElementById('filterMenuPanel'); },
  
  // Calendar
  get calendarDays() { return document.getElementById('calendarDays'); },
  get prevMonthBtn() { return document.getElementById('prevMonth'); },
  get nextMonthBtn() { return document.getElementById('nextMonth'); },
  get calendarMonthYear() { return document.getElementById('calendarMonth'); },
  
  // Form inputs
  get nameInput() { return document.getElementById('fName'); },
  get phoneInput() { return document.getElementById('fPhone'); },
  get addressInput() { return document.getElementById('fAddress'); },
  get receiptInput() { return document.getElementById('fReceipt'); },
  get jewelInput() { return document.getElementById('fJewel'); },
  get totalInput() { return document.getElementById('fTotal'); },
  get advanceInput() { return document.getElementById('fAdvance'); },
  get balanceInput() { return document.getElementById('fBalance'); },
  get depositInput() { return document.getElementById('fDeposit'); },
  get fromInput() { return document.getElementById('fFrom'); },
  get toInput() { return document.getElementById('fTo'); },
  get userInput() { return document.getElementById('fUser'); },
  
  // Photo elements
  get addedPhotos() { return document.getElementById('addedPhotos'); },
  get upMsg() { return document.getElementById('upMsg'); },
  
  // Form buttons
  get saveBtn() { return document.getElementById('saveBtn'); },
  get skipPhotosBtn() { return document.getElementById('skipPhotosBtn'); },
  
  // Photo controls
  get cameraBtn() { return document.getElementById('cameraBtn'); },
  get galleryBtn() { return document.getElementById('galleryBtn'); },
  get cameraInput() { return document.getElementById('cameraInput'); },
  get galleryInput() { return document.getElementById('galleryInput'); },
  get photoGallery() { return document.getElementById('addedPhotos'); },
  
  // Jewelry picker
  get jewelGrid() { return document.getElementById('jewPick'); },
  
  // Modals (static containers)
  get returnModal() { return document.getElementById('mReturn'); },
  get deleteModal() { return document.getElementById('mDelete'); },
  get detailModal() { return document.getElementById('detailModal'); },
  get imageViewerModal() { return document.getElementById('imageViewerModal'); },
  get recycleBinModal() { return document.getElementById('recycleBinModal'); },
  
  // Modal buttons
  get returnCancelBtn() { return document.getElementById('mReturnCancel'); },
  get returnOkBtn() { return document.getElementById('mReturnOk'); },
  get deleteCancelBtn() { return document.getElementById('mDeleteCancel'); },
  get deleteOkBtn() { return document.getElementById('mDeleteOk'); },
  get imageViewerClose() { return document.getElementById('imageViewerClose'); },
  get recycleBinCloseBtn() { return document.getElementById('recycleBinCloseBtn'); },
  
  // Detail modal buttons
  get detailCloseBtn() { return document.getElementById('detailCloseBtn'); },
  get detailCloseActionBtn() { return document.getElementById('detailCloseActionBtn'); },
  get detailWhatsAppBtn() { return document.getElementById('detailWhatsAppBtn'); },
  get detailEditBtn() { return document.getElementById('detailEditBtn'); },
  get detailPrintBtn() { return document.getElementById('detailPrintBtn'); },
  
  // Count badges
  get activeCountBadge() { return document.getElementById('cntActive'); },
  get overdueCountBadge() { return document.getElementById('cntOv'); },
  get todayCountBadge() { return document.getElementById('cntToday'); }
};

// ============================================================================
// 🛠️ LIGHTWEIGHT DOM HELPERS
// ============================================================================

// Show/hide element
function toggleElement(element, show) {
  if (!element) return;
  element.style.display = show ? 'block' : 'none';
}

// Add/remove class
function toggleClass(element, className, add) {
  if (!element) return;
  if (add) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
}

// Set text content safely
function setText(element, text) {
  if (!element) return;
  element.textContent = text;
}

// Set HTML safely
function setHTML(element, html) {
  if (!element) return;
  element.innerHTML = html;
}

// Get value from input
function getValue(element) {
  return element ? element.value : '';
}

// Set value to input
function setValue(element, value) {
  if (!element) return;
  element.value = value;
}

// Clear all screens
function clearActiveScreens() {
  document.querySelectorAll('.screen').forEach(x => x.classList.remove(CLASSES.ACTIVE));
}

// Clear all nav buttons
function clearActiveNavButtons() {
  document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove(CLASSES.ON));
}
