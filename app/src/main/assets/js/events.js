// ============================================================================
// 📡 EVENTS MODULE: Event listener setup and application wiring layer
// ============================================================================
// Responsibility: Register ALL DOM event listeners, window events, and app lifecycle
// Does NOT contain: Business logic, rendering, API calls, form handling
// Dependencies: All other modules (calls their functions)

console.log('✅ events.js loaded');

// ============================================================================
// 🌐 GLOBAL ERROR & NETWORK LISTENERS
// ============================================================================

window.addEventListener('unhandledrejection', function(e) {
  logError('Unhandled Promise Error:', e.reason || e);
});

window.addEventListener('online', () => {
  isOnline = true;
  hideNetworkWarning();
  toast('✅ Back online');
  log('Network: Online');
  syncPendingLocalChanges();
});

window.addEventListener('offline', () => {
  isOnline = false;
  showNetworkWarning();
  toast('⚠️ No internet connection');
  log('Network: Offline');
});

// ============================================================================
// 📱 ANDROID BACK BUTTON HANDLER
// ============================================================================

window.handleBackButton = function() {
  // Check if image viewer is open
  if (DOM.imageViewerModal && DOM.imageViewerModal.classList.contains(CLASSES.OPEN)) {
    closeImageViewer();
    return true;
  }
  
  // Check if detail modal is open
  if (DOM.detailModal && DOM.detailModal.classList.contains(CLASSES.OPEN)) {
    closeDetail();
    return true;
  }

  // Check if settings modal is open
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal && settingsModal.classList.contains(CLASSES.OPEN)) {
    settingsModal.classList.remove('open');
    document.body.classList.remove('modal-open');
    return true;
  }

  if (DOM.recycleBinModal && DOM.recycleBinModal.classList.contains(CLASSES.OPEN)) {
    closeRecycleBin();
    return true;
  }
  
  // Check if any other modal is open
  if (DOM.returnModal && DOM.returnModal.classList.contains(CLASSES.OPEN)) {
    closeM('mReturn');
    return true;
  }
  
  if (DOM.deleteModal && DOM.deleteModal.classList.contains(CLASSES.OPEN)) {
    closeM('mDelete');
    return true;
  }
  
  // Check if on add screen, go back to home
  if (DOM.addScreen && DOM.addScreen.classList.contains(CLASSES.ACTIVE)) {
    go('home');
    return true;
  }
  
  // Let Android handle it (exit app)
  return false;
};

// ============================================================================
// 🎛️ SETUP ALL EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  console.log('🎯 setupEventListeners() called');
  
  // ✅ SYNC BUTTON
  if (DOM.syncBtn) DOM.syncBtn.addEventListener('click', syncData);

  // ✅ SHARE APP BUTTON
  const shareAppBtn = document.getElementById('shareAppBtn');
  if (shareAppBtn) shareAppBtn.addEventListener('click', shareApp);

  // ✅ CONFIG BUTTON
  const configBtn = document.getElementById('configBtn');
  if (configBtn) {
    configBtn.addEventListener('click', () => {
      document.getElementById('configScriptUrl').value = activeScriptUrl;
      document.getElementById('configSheetId').value = activeSheetId;
      document.getElementById('settingsModal').classList.add('open');
      document.body.classList.add('modal-open');
    });
  }

  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', () => {
      document.getElementById('settingsModal').classList.remove('open');
      document.body.classList.remove('modal-open');
    });
  }

  const saveConfigBtn = document.getElementById('saveConfigBtn');
  if (saveConfigBtn) saveConfigBtn.addEventListener('click', saveConfig);

  const resetConfigBtn = document.getElementById('resetConfigBtn');
  if (resetConfigBtn) resetConfigBtn.addEventListener('click', resetConfig);

  // ✅ NAVIGATION: Home & Add buttons
  if (DOM.homeBtn) DOM.homeBtn.addEventListener('click', () => go('home'));
  if (DOM.addBtn) DOM.addBtn.addEventListener('click', prepAdd);

  const addBigBtn = document.getElementById('addBigBtn');
  if (addBigBtn) addBigBtn.addEventListener('click', prepAdd);

  // ✅ SEARCH INPUT
  if (DOM.searchInput) DOM.searchInput.addEventListener('input', debounceSearch);
  if (DOM.recycleBinBtn) DOM.recycleBinBtn.addEventListener('click', openRecycleBin);

  // ✅ INITIAL CALENDAR RENDER
  renderCalendarWidget();

  // ✅ FILTER MENU TOGGLE
  const filterMenuBtn = document.getElementById('filterMenuBtn');
  const filterMenuPanel = document.getElementById('filterMenuPanel');
  if (filterMenuBtn && filterMenuPanel) {
    filterMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterMenuPanel.classList.toggle('open');
    });
    // Close filter menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-menu-wrap')) {
        filterMenuPanel.classList.remove('open');
      }
    });
  }

  // ✅ FILTER CHIPS (Today, All, Active, Returned)
  if (DOM.filterWrapper) {
    DOM.filterWrapper.addEventListener('click', (e) => {
      const chip = e.target.closest('.fchip');
      if (!chip) return;
      setF(chip, chip.dataset.f);
    });
  }

  // ✅ CALENDAR NAVIGATION (Previous/Next month)
  if (DOM.prevMonthBtn) DOM.prevMonthBtn.addEventListener('click', () => changeCalendarMonth(-1));
  if (DOM.nextMonthBtn) DOM.nextMonthBtn.addEventListener('click', () => changeCalendarMonth(1));

  // ✅ CALENDAR DAY SELECTION
  if (DOM.calendarDays) {
    DOM.calendarDays.addEventListener('click', (e) => {
      const dayEl = e.target.closest('.cw-day');
      if (!dayEl || !dayEl.dataset.date) return;
      selectCalendarDate(dayEl.dataset.date);
    });
  }

  // ✅ FORM: Total & Advance inputs (auto-calculate balance)
  [DOM.totalInput, DOM.advanceInput].forEach((el) => {
    if (el) el.addEventListener('input', calcBal);
  });

  // ✅ JEWELRY GRID (picker)
  if (DOM.jewelGrid) {
    DOM.jewelGrid.addEventListener('click', (e) => {
      const tile = e.target.closest('.jo');
      if (!tile) return;
      pickJ(tile);
    });
  }

  // ✅ CAMERA BUTTON (with preventDefault for Android)
  if (DOM.cameraBtn) {
    DOM.cameraBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCamera();
    });
  }

  // ✅ GALLERY BUTTON (with preventDefault for Android)
  if (DOM.galleryBtn) {
    DOM.galleryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerGallery();
    });
  }

  // ✅ HIDDEN CAMERA INPUT (file picker result)
  if (DOM.cameraInput) {
    DOM.cameraInput.addEventListener('change', function() {
      handleCameraPhoto(this);
    });
  }

  // ✅ HIDDEN GALLERY INPUT (file picker result)
  if (DOM.galleryInput) {
    DOM.galleryInput.addEventListener('change', function() {
      handleGalleryPhotos(this);
    });
  }

  // ✅ FORM: Save button
  if (DOM.saveBtn) DOM.saveBtn.addEventListener('click', () => saveEntry());

  // ✅ FORM: Skip Photos button
  if (DOM.skipPhotosBtn) DOM.skipPhotosBtn.addEventListener('click', () => saveEntry(true));

  // ✅ MODAL: Return confirmation buttons
  if (DOM.returnCancelBtn) DOM.returnCancelBtn.addEventListener('click', () => closeM('mReturn'));
  if (DOM.returnOkBtn) DOM.returnOkBtn.addEventListener('click', doReturn);

  // ✅ MODAL: Delete confirmation buttons
  if (DOM.deleteCancelBtn) DOM.deleteCancelBtn.addEventListener('click', () => closeM('mDelete'));
  if (DOM.deleteOkBtn) DOM.deleteOkBtn.addEventListener('click', doDelete);

  // ✅ MODAL: Image viewer close
  if (DOM.imageViewerClose) DOM.imageViewerClose.addEventListener('click', closeImageViewer);
  if (DOM.recycleBinCloseBtn) DOM.recycleBinCloseBtn.addEventListener('click', closeRecycleBin);

  // ✅ PERFORMANCE: Recycle bin search - re-render on input
  const recycleBinSearch = document.getElementById('recycleBinSearch');
  if (recycleBinSearch) {
    recycleBinSearch.addEventListener('input', () => {
      recycleBinPage = 0; // Reset to first page on search
      renderRecycleBinModal();
    });
  }

  // ✅ MODAL: Detail modal close buttons
  if (DOM.detailCloseBtn) DOM.detailCloseBtn.addEventListener('click', closeDetail);
  if (DOM.detailCloseActionBtn) DOM.detailCloseActionBtn.addEventListener('click', closeDetail);

  // ✅ MODAL: Detail WhatsApp button
  if (DOM.detailWhatsAppBtn) DOM.detailWhatsAppBtn.addEventListener('click', () => shareWhatsApp(curDetailRecord));

  // ✅ MODAL: Detail Edit button
  if (DOM.detailEditBtn) {
    DOM.detailEditBtn.addEventListener('click', () => {
      if (curDetailRecord) openEdit(curDetailRecord.id);
    });
  }

  // ✅ MODAL: Detail Print button
  if (DOM.detailPrintBtn) {
    console.log('✅ Print button found, attaching event listener');
    DOM.detailPrintBtn.addEventListener('click', function() {
      console.log('🖨️ Print button clicked!');
      printRecord();
    });
  } else {
    console.error('❌ Print button not found in DOM');
  }

  // ✅ CARD BUTTONS: Event delegation for edit, delete, return, card click
  if (DOM.homeList) {
    DOM.homeList.addEventListener('click', (e) => {
      // Photo gallery click
      const photoGallery = e.target.closest('[data-action="open-gallery"]');
      if (photoGallery) {
        e.stopPropagation();
        const index = parseInt(photoGallery.dataset.index);
        const photos = JSON.parse(photoGallery.dataset.photos.replace(/&#39;/g, "'"));
        openImageGallery(index, photos);
        return;
      }

      // Call button click
      const callBtn = e.target.closest('[data-action="call"]');
      if (callBtn) {
        e.stopPropagation();
        // Let the tel: link handle it naturally
        return;
      }

      // Card click - open detail
      const card = e.target.closest('.rcard');
      if (card && !e.target.closest('.ract')) {
        const id = card.dataset.id;
        if (id) openDetail(id);
        return;
      }

      // Edit button
      const editBtn = e.target.closest('.ract.edit');
      if (editBtn) {
        e.stopPropagation();
        const id = editBtn.dataset.id;
        if (id) openEdit(id);
        return;
      }

      // Delete button
      const delBtn = e.target.closest('.ract.del');
      if (delBtn) {
        e.stopPropagation();
        const id = delBtn.dataset.id;
        if (id) openDel(id);
        return;
      }

      // Return button
      const retBtn = e.target.closest('.ract.ret');
      if (retBtn) {
        e.stopPropagation();
        const id = retBtn.dataset.id;
        const name = e.target.closest('.rcard')?.querySelector('.rcard-name')?.textContent || '';
        if (id) openRet(id, name);
        return;
      }

      // ✅ CARD PHOTO SLIDER: Navigation arrows (prev/next photo)
      const sliderNav = e.target.closest('[data-action="prev-photo"], [data-action="next-photo"]');
      if (sliderNav) {
        e.stopPropagation();
        const recordId = sliderNav.dataset.id;
        const direction = sliderNav.dataset.action === 'prev-photo' ? 'prev' : 'next';
        navigateCardSlider(recordId, direction);
        return;
      }

      // ✅ CARD PHOTO SLIDER: Dot clicks
      const cardDot = e.target.closest('.card-dot');
      if (cardDot) {
        e.stopPropagation();
        handleCardDotClick(e);
        return;
      }
    });
  }

  // ✅ PHOTO ACTIONS: Event delegation for photo preview, remove, and viewer
  document.body.addEventListener('click', (e) => {
    // View photo preview (queued photos)
    if (e.target.dataset.action === 'view-preview') {
      const index = parseInt(e.target.dataset.index);
      viewPhotoPreview(index);
      return;
    }

    // Remove photo button
    if (e.target.dataset.action === 'remove-photo') {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);
      removePhoto(index);
      return;
    }

    if (e.target.dataset.action === 'remove-existing-photo') {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);
      removeExistingPhotoInEdit(index);
      return;
    }

    // Open image viewer (existing photos)
    if (e.target.dataset.action === 'open-image-viewer') {
      const url = e.target.dataset.url;
      openImageViewer(url);
      return;
    }

    // View full photo in detail modal
    if (e.target.dataset.action === 'view-full-photo') {
      const url = e.target.dataset.url;
      viewFullPhoto(url);
      return;
    }

    // "Add New Record" button in empty state
    if (e.target.dataset.action === 'go-add') {
      go('add');
      return;
    }

    if (e.target.dataset.action === 'restore-recycled-record') {
      restoreDeletedRecord(e.target.dataset.id);
      return;
    }

    if (e.target.dataset.action === 'purge-recycled-record') {
      permanentlyDeleteFromRecycleBin(e.target.dataset.id);
      return;
    }

    // Print modal: Print button
    if (e.target.dataset.action === 'print') {
      window.print();
      return;
    }

    // Print modal: Close button
    if (e.target.dataset.action === 'close-print') {
      closePrintModal();
      return;
    }
  });

  // ✅ PRINT MODAL: Close on overlay click
  document.body.addEventListener('click', (e) => {
    if (e.target.id === 'printModalOverlay') {
      closePrintModal();
    }
  });
}

// ============================================================================
// 👆 TOUCH & NAVIGATION
// ============================================================================
// Navigation via buttons only - swipe disabled for better UX

// ============================================================================
// 🚀 APP INITIALIZATION (triggered by DOMContentLoaded)
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOMContentLoaded fired');
  
  // ✅ STARTUP SAFETY: Wrap all initialization inside DOMContentLoaded
  const today = getTodayInternal();

  if (DOM.fromInput) DOM.fromInput.value = today;

  // ✅ FIXED: Ensure selectedDate is initialized before any render
  selectedDate = today;

  if (DOM.headerDate) {
    DOM.headerDate.textContent = formatDateDisplay(today);
  }

  loadRecycleBinCache();
  restoreHomeSnapshot();

  console.log('App starting... Loading data from backend');

  // ✅ WIRING: Setup all event listeners
  setupEventListeners();

  // ✅ WIRING: Navigation via buttons (swipe disabled)

  // ✅ WIRING: Load initial data from backend
  loadData().then(() => {
    console.log('Initial load complete');
    curFilter = 'all';
    // ✅ OPTIMIZATION: No renderHome() here - loadData() already calls it at line 183
  }).catch((err) => {
    console.error('Initial load failed:', err);
    toast('⚠️ Failed to load initial data');
  });
});
