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


// ============================================================================
// 📱 ANDROID BACK BUTTON HANDLER
// ============================================================================

window.handleBackButton = function() {
  // Check if coming soon overlay is open
  const comingSoonOverlay = document.getElementById('comingSoonOverlay');
  if (comingSoonOverlay && comingSoonOverlay.classList.contains('open')) {
    comingSoonOverlay.classList.remove('open');
    return true;
  }

  // ✅ Subscription modal can only be closed by its own Close button — not back button
  const subModal = document.getElementById('subscriptionDetailModal');
  if (subModal) {
    return true; // swallow back press, do nothing
  }

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

  // Check if backup modal is open
  const backupModal = document.getElementById('backupModal');
  if (backupModal && backupModal.classList.contains(CLASSES.OPEN)) {
    if (typeof closeBackupModal === 'function') {
      closeBackupModal();
    }
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

  // Check if on login screen, swallow back action
  const loginScreen = document.getElementById('s-login');
  if (loginScreen && loginScreen.classList.contains(CLASSES.ACTIVE)) {
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
  if (DOM.syncBtn) {
    DOM.syncBtn.addEventListener('click', function() {
      // Add rotation class
      this.classList.add('rotating');
      
      // Remove class after animation completes
      setTimeout(() => {
        this.classList.remove('rotating');
      }, 600);
      
      syncData();
    });
  }

  // ✅ UPDATE BUTTON
  if (DOM.updateCheckBtn) {
    DOM.updateCheckBtn.addEventListener('click', function() {
      if (typeof checkUpdatesManual === 'function') {
        checkUpdatesManual();
      } else {
        toast('⚠️ Update module not loaded yet.');
      }
    });
  }

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

  // ✅ LOGIN & LOGOUT LISTENERS
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', () => {
      const usernameInput = document.getElementById('loginUsernameInput');
      const username = usernameInput ? usernameInput.value.trim() : '';
      if (!username) {
        toast('⚠️ Please enter your name');
        return;
      }
      if (typeof loginUser === 'function') loginUser(username);
    });
  }

  const loginUsernameInput = document.getElementById('loginUsernameInput');
  if (loginUsernameInput) {
    loginUsernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const username = loginUsernameInput.value.trim();
        if (!username) {
          toast('⚠️ Please enter your name');
          return;
        }
        if (typeof loginUser === 'function') loginUser(username);
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Close settings modal
      const settingsModal = document.getElementById('settingsModal');
      if (settingsModal) {
        settingsModal.classList.remove('open');
        document.body.classList.remove('modal-open');
      }
      if (typeof logoutUser === 'function') logoutUser();
    });
  }

  // ✅ NAVIGATION: Home & Add buttons
  if (DOM.homeBtn) DOM.homeBtn.addEventListener('click', () => go('home'));
  if (DOM.addBtn) DOM.addBtn.addEventListener('click', prepAdd);

  // ✅ NAVIGATION: Backup button - show coming soon
  const backupBtn = document.getElementById('n-backup');
  if (backupBtn) {
    backupBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // ✅ FIX: Prevent click bubbling to body handler that would immediately close the overlay
      const overlay = document.getElementById('comingSoonOverlay');
      if (overlay) overlay.classList.add('open');
    });
  }

  // ✅ COMING SOON: Close button
  const comingSoonCloseBtn = document.getElementById('comingSoonCloseBtn');
  if (comingSoonCloseBtn) {
    comingSoonCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const overlay = document.getElementById('comingSoonOverlay');
      if (overlay) overlay.classList.remove('open');
    });
  }

  const addBigBtn = document.getElementById('addBigBtn');
  if (addBigBtn) addBigBtn.addEventListener('click', prepAdd);

  // ✅ SEARCH INPUT
  if (DOM.searchInput) DOM.searchInput.addEventListener('input', debounceSearch);
  if (DOM.recycleBinBtn) {
    DOM.recycleBinBtn.addEventListener('click', () => {
      if (typeof openRecycleBin === 'function') {
        openRecycleBin();
      }
    });
  }

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

  // ✅ FILTER CHIPS inside filter menu panel
  if (DOM.filterMenuPanel) {
    DOM.filterMenuPanel.addEventListener('click', (e) => {
      const chip = e.target.closest('.fchip');
      if (!chip) return;
      e.stopPropagation();
      setF(chip, chip.dataset.f);
    });
  }

  // ✅ CALENDAR NAVIGATION (Both buttons AND finger swipe)
  if (DOM.prevMonthBtn) DOM.prevMonthBtn.addEventListener('click', () => changeCalendarMonth(-1));
  if (DOM.nextMonthBtn) DOM.nextMonthBtn.addEventListener('click', () => changeCalendarMonth(1));
  
  // ✅ CALENDAR SWIPE: Finger swipe support in addition to buttons
  const calendarWidget = document.querySelector('.home-calendar-widget');
  if (calendarWidget) {
    let calendarSwipeStartX = 0;
    let calendarSwipeStartY = 0;
    
    calendarWidget.addEventListener('touchstart', (e) => {
      // Only handle swipes on the calendar body, not on date cells or buttons
      if (e.target.closest('.cw-day') || e.target.closest('.cw-nav')) return;
      calendarSwipeStartX = e.touches[0].clientX;
      calendarSwipeStartY = e.touches[0].clientY;
    }, { passive: true });
    
    calendarWidget.addEventListener('touchend', (e) => {
      if (e.target.closest('.cw-day') || e.target.closest('.cw-nav')) return;
      const dx = e.changedTouches[0].clientX - calendarSwipeStartX;
      const dy = e.changedTouches[0].clientY - calendarSwipeStartY;
      
      // Ensure horizontal swipe is dominant and threshold is met
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          changeCalendarMonth(-1); // Swipe right = previous month
        } else {
          changeCalendarMonth(1);  // Swipe left = next month
        }
      }
    }, { passive: true });
  }

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

  // ✅ DELETE ALL: Recycle bin delete all button
  const recycleBinDeleteAllBtn = document.getElementById('recycleBinDeleteAllBtn');
  if (recycleBinDeleteAllBtn) {
    recycleBinDeleteAllBtn.addEventListener('click', deleteAllFromRecycleBin);
  }

  // ✅ BACKUP: Setup backup and restore event listeners
  if (typeof setupBackupEventListeners === 'function') {
    setupBackupEventListeners();
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
        try {
          const photos = JSON.parse(photoGallery.dataset.photos.replace(/&#39;/g, "'"));
          openImageGallery(index, photos);
        } catch (err) {
          console.warn('Could not parse photo data:', err);
          toast('⚠️ Photo data unavailable. Try syncing.');
        }
        return;
      }

      // Call button click
      const callBtn = e.target.closest('[data-action="call"]');
      if (callBtn) {
        e.stopPropagation();
        // Let the tel: link handle it naturally
        return;
      }

      const cardDot = e.target.closest('.card-dot');
      if (cardDot) {
        e.stopPropagation();
        handleCardDotClick(e);
        return;
      }

      // Card slider: tap photo to open fullscreen gallery
      const sliderImg = e.target.closest('.card-slide img');
      if (sliderImg) {
        e.stopPropagation();
        const sliderContainer = sliderImg.closest('.card-slider-container');
        const track = sliderContainer?.querySelector('.card-slider-track');
        if (track && track.dataset.photos) {
          try {
            const photos = JSON.parse(track.dataset.photos.replace(/&#39;/g, "'"));
            const idx = parseInt(sliderContainer.dataset.currentSlide || '0', 10);
            openImageGallery(idx, photos);
          } catch (err) {
            console.warn('Could not parse slider photo data:', err);
            toast('⚠️ Photo data unavailable. Try syncing.');
          }
        }
        return;
      }

      // Card click - open detail (ignore slider area)
      const card = e.target.closest('.rcard');
      if (card && !e.target.closest('.ract') && !e.target.closest('.card-slider-container')) {
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

    });

    // ✅ CARD PHOTO SLIDER: Improved touch handling for better scroll vs swipe detection
    let sliderTouchStartX = 0;
    let sliderTouchStartY = 0;
    let sliderTouchMoved = false;
    let isVerticalScroll = false;
    
    DOM.homeList.addEventListener('touchstart', (e) => {
      const container = e.target.closest('.card-slider-container');
      if (!container) return;
      sliderTouchStartX = e.touches[0].clientX;
      sliderTouchStartY = e.touches[0].clientY;
      sliderTouchMoved = false;
      isVerticalScroll = false;
    }, { passive: true });
    
    DOM.homeList.addEventListener('touchmove', (e) => {
      const container = e.target.closest('.card-slider-container');
      if (!container) return;
      
      if (!sliderTouchMoved) {
        // First move - determine if it's vertical or horizontal
        const dx = e.touches[0].clientX - sliderTouchStartX;
        const dy = e.touches[0].clientY - sliderTouchStartY;
        
        // If vertical movement is dominant, it's a scroll
        if (Math.abs(dy) > Math.abs(dx)) {
          isVerticalScroll = true;
        }
      }
      
      sliderTouchMoved = true;
    }, { passive: true });

    DOM.homeList.addEventListener('touchend', (e) => {
      const container = e.target.closest('.card-slider-container');
      if (!container || !sliderTouchMoved) return;
      
      // Don't trigger slider if user was scrolling vertically
      if (isVerticalScroll) return;
      
      const dx = e.changedTouches[0].clientX - sliderTouchStartX;
      const dy = e.changedTouches[0].clientY - sliderTouchStartY;
      
      // Only trigger slider navigation if horizontal swipe is dominant
      // and threshold is met (60px minimum for better distinction)
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
        const recordId = container.dataset.id;
        navigateCardSlider(recordId, dx < 0 ? 'next' : 'prev');
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
      const index = parseInt(e.target.dataset.index) || 0;
      try {
        const photos = JSON.parse(e.target.dataset.photos.replace(/&#39;/g, "'"));
        openImageGallery(index, photos);
      } catch (err) {
        viewFullPhoto(url);
      }
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

  // ✅ TAP OUTSIDE TO CLOSE: All modals close when tapping the backdrop
  document.body.addEventListener('click', (e) => {
    // detail-modal (record detail, recycle bin, settings) — tap the dark backdrop
    // The backdrop IS the .detail-modal element; inner content is .detail-box
    if (e.target.classList.contains('detail-modal') && e.target.classList.contains('open')) {
      const id = e.target.id;
      if (id === 'detailModal')    { closeDetail();      return; }
      if (id === 'recycleBinModal'){ closeRecycleBin();  return; }
      if (id === 'settingsModal')  {
        e.target.classList.remove('open');
        document.body.classList.remove('modal-open');
        return;
      }
    }

    // modal-bg (return / delete confirmations) — tap the dark backdrop
    if (e.target.classList.contains('modal-bg') && e.target.classList.contains('open')) {
      // ✅ EXCEPTION: Do not auto-close subscription modal via backdrop click
      if (e.target.id === 'subscriptionDetailModal') return;

      e.target.classList.remove('open');
      return;
    }

    // image viewer — tap anywhere outside the slider container
    const imageViewer = document.getElementById('imageViewerModal');
    if (imageViewer && imageViewer.classList.contains('open')) {
      if (!e.target.closest('#imageSliderContainer') &&
          !e.target.closest('#imageViewerClose') &&
          !e.target.closest('#imageCounter') &&
          !e.target.closest('#imageDots')) {
        closeImageViewer();
        return;
      }
    }

    // coming soon overlay — tap outside the content box
    const comingSoon = document.getElementById('comingSoonOverlay');
    if (comingSoon && comingSoon.classList.contains('open')) {
      if (!e.target.closest('.coming-soon-content')) {
        comingSoon.classList.remove('open');
        e.stopPropagation(); // ✅ FIX: Prevent click passing through to app underneath
        return;
      }
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

  console.log('App starting...');

  // ✅ WIRING: Setup all event listeners
  setupEventListeners();

  // ✅ WIRING: Navigation via buttons (swipe disabled)
});
