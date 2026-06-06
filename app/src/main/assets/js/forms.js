// FORM HANDLING AND RECORD MANAGEMENT
// Dependencies: config.js, state.js, utils.js, api.js, render.js, photos.js

// ✅ Flag to track if we're in the middle of saving (to avoid unwanted confirmation)
let isSaving = false;

async function saveEntry(skipPhotos = false) {
  // ✅ STEP 1: Validate form
  const name = document.getElementById('fName').value.trim();
  const user = document.getElementById('fUser').value.trim() || 'Worker';
  if (!name) return toast("⚠️ Enter Name!");

  // ✅ STEP 2: Validate Receipt ID uniqueness (no duplicates allowed)
  const receiptNo = document.getElementById('fReceipt').value.trim();
  if (receiptNo) {
    // Check if receipt ID already exists in other records
    const duplicateReceipt = records.find(r => {
      // Skip the current record being edited
      if (currentEditId && r.id === currentEditId) return false;
      // Check if this record has the same receipt ID
      return String(r.receiptNo || '').trim().toLowerCase() === receiptNo.toLowerCase();
    });
    
    if (duplicateReceipt) {
      toast(`❌ Receipt #${receiptNo} already exists!`);
      console.warn(`Duplicate receipt detected: ${receiptNo} (used by record: ${duplicateReceipt.name})`);
      return;
    }
  }

  // ✅ Set flag to prevent unwanted confirmation dialog during save
  isSaving = true;

  const existingRecord = currentEditId ? records.find(x => x.id === currentEditId) : null;
  const clientRecordId = currentEditId || "R-" + Date.now();
  const hasQueuedPhotos = queuedPhotos.length > 0;
  const persistedExistingPhotoUrls = currentEditId ? editingExistingPhotos.join('|') : '';
  const originalExistingPhotoUrls = existingRecord
    ? getPhotosFromRecord(existingRecord)
        .filter(url => url.startsWith('http://') || url.startsWith('https://'))
        .join('|')
    : '';
  const existingPhotosChanged = !!existingRecord && originalExistingPhotoUrls !== persistedExistingPhotoUrls;
  const action = existingRecord ? 'edit' : 'add';

  // ✅ OPTIMISTIC UI: Create temporary record data
  const now = new Date();
  const createdAt = existingRecord ? (existingRecord.createdAt || now.toISOString()) : now.toISOString();
  const createdTime = existingRecord ? (existingRecord.createdTime || now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  })) : now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // ✅ INSTANT PHOTO PREVIEW: Create blob URLs for immediate display
  let tempPhotoUrls = persistedExistingPhotoUrls;
  if (hasQueuedPhotos) {
    // Add blob URLs for instant preview while Cloudinary uploads
    const blobUrls = queuedPhotos.map(p => p.previewUrl).filter(Boolean);
    if (blobUrls.length > 0) {
      tempPhotoUrls = tempPhotoUrls ? `${tempPhotoUrls}|${blobUrls.join('|')}` : blobUrls.join('|');
      log('📸 Added blob preview URLs for instant display:', blobUrls.length);
    }
  }

  const tempData = {
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
    createdAt,
    createdTime,
    photoUrls: tempPhotoUrls, // ✅ Include existing + blob preview URLs for instant preview
    status: existingRecord ? existingRecord.status : 'active',
    _syncing: true, // ✅ Mark as syncing for UI badge
    _pendingAction: action,
    _search: (
      name +
      document.getElementById('fPhone').value +
      document.getElementById('fAddress').value +
      document.getElementById('fReceipt').value
    ).toLowerCase()
  };

  // ✅ INSTANT FEEDBACK: Add temporary record to UI immediately
  let tempRecordIndex = -1;
  if (!existingRecord) {
    records.unshift(tempData);
    tempRecordIndex = 0;
    log('✨ OPTIMISTIC: Added temporary record to UI');
  } else {
    // ✅ FIX: For edits, update the existing record fields immediately in-place
    Object.assign(existingRecord, tempData);
    tempRecordIndex = records.findIndex(x => x.id === clientRecordId);
    log('✨ OPTIMISTIC: Updated existing record fields in UI');
  }

  // ✅ SAVE PHOTOS BEFORE CLEARING: Store photos to upload
  const photosToUpload = [...queuedPhotos]; // Copy array before resetForm clears it
  const hasPhotosToUpload = photosToUpload.length > 0 && !skipPhotos;

  // ✅ CRITICAL: Mark queuedPhotos as "handed off" so clearPhoto() won't revoke their blob URLs
  // The blob URLs are now owned by tempData.photoUrls and must stay alive until Cloudinary upload
  queuedPhotos.forEach(p => { p._handedOff = true; });

  // ✅ INSTANT UI UPDATE: Show the record immediately
  renderHome();
  updateCounts();
  updateCache(); // Save to cache immediately

  // ✅ CRITICAL FIX: Capture form values BEFORE resetForm clears them
  const savedPhone = document.getElementById('fPhone').value;
  const savedAddress = document.getElementById('fAddress').value;
  const savedReceipt = document.getElementById('fReceipt').value;
  const savedJewel = document.getElementById('fJewel').value;
  const savedTotal = document.getElementById('fTotal').value;
  const savedAdvance = document.getElementById('fAdvance').value;
  const savedBalance = document.getElementById('fBalance').value;
  const savedDeposit = document.getElementById('fDeposit').value;
  const savedFrom = document.getElementById('fFrom').value;
  const savedTo = document.getElementById('fTo').value;

  // ✅ CRITICAL FIX: Switch to the date of the record so it's visible immediately
  if (savedFrom) {
    selectedDate = savedFrom;
  }

  resetForm(); // This clears queuedPhotos, but we saved a copy + marked them _handedOff
  go('home');
  renderHome(); // Re-render after selectedDate update so new record is visible

  // ✅ INSTANT SUCCESS: Show success immediately (don't wait for backend)
  toast("✅ Record saved!");
  isSaving = false;

  // ✅ INSTANT WHATSAPP: Send WhatsApp immediately (don't wait for backend)
  if (!existingRecord) {
    setTimeout(() => shareWhatsApp(tempData), 100);
  }

  // ✅ BACKGROUND: Save to backend (don't wait, don't block)
  const recordData = {
    id: clientRecordId,
    name,
    user,
    phone: savedPhone,
    address: savedAddress,
    receiptNo: savedReceipt,
    jewel: savedJewel,
    total: savedTotal,
    advance: savedAdvance,
    balance: savedBalance,
    deposit: savedDeposit,
    from: savedFrom,
    to: savedTo,
    createdAt,
    createdTime,
    photoUrls: persistedExistingPhotoUrls,
    status: existingRecord ? existingRecord.status : 'active',
    _search: (name + savedPhone + savedAddress + savedReceipt).toLowerCase()
  };

  log('💾 Saving to backend in background (user already sees record)');

  // ✅ BACKGROUND SAVE: Don't await, let it run in background
  apiGet(action, recordData).then(res => {
    if (res.ok) {
      log('✅ Backend save successful (background)');

      // Update ID if backend returned a new one
      const savedRecordId = res.id || (res.data && res.data.id) || recordData.id;
      if (savedRecordId !== recordData.id) {
        log('🔁 Backend returned new ID:', savedRecordId);
        recordData.id = savedRecordId;

        // Update the record in the array
        if (tempRecordIndex >= 0) {
          records[tempRecordIndex].id = savedRecordId;
        } else if (existingRecord) {
          existingRecord.id = savedRecordId;
        }
        updateCache();
      }

      if (existingPhotosChanged) {
        apiGet('updatePhoto', { id: savedRecordId, url: persistedExistingPhotoUrls }).then(photoRes => {
          if (!photoRes.ok) {
            console.warn('Failed to sync edited photo list:', photoRes.error);
          }
        }).catch(err => {
          console.warn('Photo list sync error:', err);
        });
      }

      const syncedIndex = records.findIndex(r => String(r.id) === String(savedRecordId));
      if (syncedIndex !== -1) {
        delete records[syncedIndex]._syncing;
        delete records[syncedIndex]._pendingAction;
        delete records[syncedIndex]._pendingError;
        updateCache();
        renderHome();
      }

      // Upload photos in background if any
      if (hasPhotosToUpload) {
        console.log('📤 Starting background photo upload');
        uploadPhotosInBackground(savedRecordId, photosToUpload, false).then(() => {
          console.log('✅ Photos uploaded in background');
          // Don't reload all data - photos are already updated in uploadPhotosInBackground
          // Just update the cache
          updateCache();
        }).catch(err => {
          console.error('❌ Background photo upload failed:', err);
        });
      }
    } else {
      log('⚠️ Backend save failed (background):', res.error);
      const pendingIndex = records.findIndex(r => String(r.id) === String(clientRecordId));
      if (pendingIndex !== -1) {
        records[pendingIndex]._syncing = true;
        records[pendingIndex]._pendingAction = action;
        records[pendingIndex]._pendingError = res.error || 'Sync failed';
        updateCache();
        renderHome();
      }
      toast('Saved locally. Sync pending.');
      console.warn('Backend save failed but record is in cache:', res.error);
    }
  }).catch(err => {
    log('⚠️ Backend save error (background):', err);
    const pendingIndex = records.findIndex(r => String(r.id) === String(clientRecordId));
    if (pendingIndex !== -1) {
      records[pendingIndex]._syncing = true;
      records[pendingIndex]._pendingAction = action;
      records[pendingIndex]._pendingError = err.message || 'Sync failed';
      updateCache();
      renderHome();
    }
    toast('Saved locally. Sync pending.');
    console.warn('Backend save error but record is in cache:', err);
  });

  // ✅ Function returns immediately - user doesn't wait!
}

function resetForm(){
  // ✅ Reset saving flag
  isSaving = false;

  ['fName','fPhone','fAddress','fReceipt','fTotal','fAdvance','fBalance','fDeposit','fUser','fJewel'].forEach(id=>{
    const e=document.getElementById(id);
    if(e && id !== 'fJewel') e.value='';
  });
  document.getElementById('fJewel').value = 'Necklace';
  document.querySelectorAll('.jo').forEach(x=>x.classList.remove('sel'));
  document.querySelector('.jo[data-v="Necklace"]').classList.add('sel');

  // ✅ FIX: Clear edit mode - remove existing photos section
  const existingSection = document.getElementById('existingPhotosSection');
  if (existingSection) {
    existingSection.remove();
  }

  clearPhoto();
  uploadedPhotos = [];
  currentEditId = null;
  editingExistingPhotos = [];
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.textContent = '✦ Save Record (सुरक्षित करें) ✦';
}

// ✅ NEW: Render existing photos in edit mode (read-only preview above the add photo section)
function prepAdd() {
  resetForm();
  document.getElementById('fReceipt').value = "";
  go('add');
}

function calcBal(){
  const t=document.getElementById('fTotal').value||0, a=document.getElementById('fAdvance').value||0;
  document.getElementById('fBalance').value=t-a;
}

function openEdit(id) {
  const record = records.find(x => x.id === id);
  if (!record) return;
  curDetailRecord = record;
  populateFormForEdit(record);
  closeDetail();
  go('add');
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

  // ✅ FIX: Clear queued photos but preserve existing photos for display
  clearPhoto();
  queuedPhotos = [];
  editingExistingPhotos = getPhotosFromRecord(record).filter(url => url.startsWith('http://') || url.startsWith('https://'));

  // ✅ FIX: Show existing photos in the form (read-only preview)
  if (editingExistingPhotos.length > 0) {
    renderExistingPhotosInForm(editingExistingPhotos);
    setUpMsg(`📷 ${editingExistingPhotos.length} existing photo(s) - Add, remove, or keep as needed`, "blue");
  }

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.textContent = '✦ Update Record (अपडेट करें) ✦';
}

function pickJ(el){
  document.querySelectorAll('.jo').forEach(x=>x.classList.remove('sel'));
  el.classList.add('sel');
  const input = document.getElementById('fJewel');
  input.value=el.dataset.v;
  input.blur(); // Remove cursor focus
}
