// FORM HANDLING AND RECORD MANAGEMENT
// Dependencies: config.js, state.js, utils.js, api.js, render.js, photos.js

// ✅ Flag to track if we're in the middle of saving (to avoid unwanted confirmation)
let isSaving = false;

function formValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setFormValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

async function saveEntry(skipPhotos = false) {
  // ✅ STEP 1: Full form validation — highlight ALL empty required fields at once

  // Clear previous error states
  document.querySelectorAll('.fi.field-error').forEach(el => el.classList.remove('field-error'));

  const name     = formValue('fName').trim();
  const user     = formValue('fUser').trim();
  const phone    = formValue('fPhone').trim();
  const address  = formValue('fAddress').trim();
  const receiptNo = formValue('fReceipt').trim();
  const jewel    = formValue('fJewel').trim();
  const totalVal = formValue('fTotal').trim();
  const advanceVal = formValue('fAdvance').trim();
  const fromVal  = formValue('fFrom').trim();
  const toVal    = formValue('fTo').trim();

  // Collect all validation errors
  const errors = [];

  function markError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.classList.add('field-error');
    errors.push({ id, msg });
  }

  // Basic required fields
  if (!name)     markError('fName',    '⚠️ Customer Name is required');
  if (!receiptNo) markError('fReceipt','⚠️ Receipt No is required');
  if (!user)     markError('fUser',    '⚠️ User Name is required');
  if (!jewel)    markError('fJewel',   '⚠️ Jewellery type is required');
  if (!fromVal)  markError('fFrom',    '⚠️ Pickup Date is required');
  if (!toVal)    markError('fTo',      '⚠️ Return Date is required');

  // Optional field logic checks (only if fields have values)
  if (fromVal && toVal && toVal < fromVal) {
    markError('fTo', '⚠️ Return Date cannot be before Pickup Date');
  }
  if (totalVal !== '' && (isNaN(Number(totalVal)) || Number(totalVal) < 0)) {
    markError('fTotal', '⚠️ Total must be a valid positive number');
  }
  if (totalVal !== '' && advanceVal !== '' && Number(advanceVal) > Number(totalVal)) {
    markError('fAdvance', '⚠️ Advance cannot exceed Total');
  }

  if (errors.length > 0) {
    // Show the first error message as a toast
    toast(errors[0].msg);
    // Scroll to and focus the first invalid field
    const firstEl = document.getElementById(errors[0].id);
    if (firstEl) {
      firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => firstEl.focus(), 300);
    }
    return;
  }

  // Clear error on input — auto-remove red border when user starts typing
  ['fName','fPhone','fReceipt','fAddress','fUser','fJewel','fTotal','fAdvance','fFrom','fTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => el.classList.remove('field-error'), { once: true });
  });

  // ✅ STEP 2: Validate Receipt ID uniqueness (no duplicates allowed)
  const receiptNoVal = formValue('fReceipt').trim();
  if (receiptNoVal) {
    // Check if receipt ID already exists in other records
    const duplicateReceipt = records.find(r => {
      // Skip the current record being edited
      if (currentEditId && String(r.id) === String(currentEditId)) return false;
      // Check if this record has the same receipt ID
      return String(r.receiptNo || '').trim().toLowerCase() === receiptNoVal.toLowerCase();
    });
    
    if (duplicateReceipt) {
      toast(`❌ Receipt #${receiptNoVal} already exists! (${duplicateReceipt.name})`);
      const el = document.getElementById('fReceipt');
      if (el) { el.classList.add('field-error'); el.focus(); }
      return;
    }
  }

  // ✅ Set flag to prevent unwanted confirmation dialog during save
  isSaving = true;

  const existingRecord = currentEditId ? records.find(x => String(x.id) === String(currentEditId)) : null;
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
    phone: formValue('fPhone'),
    address: formValue('fAddress'),
    receiptNo: formValue('fReceipt'),
    jewel: formValue('fJewel'),
    total: formValue('fTotal'),
    advance: formValue('fAdvance'),
    balance: formValue('fBalance'),
    deposit: formValue('fDeposit'),
    from: formValue('fFrom'),
    to: formValue('fTo'),
    createdAt,
    createdTime,
    photoUrls: tempPhotoUrls, // ✅ Include existing + blob preview URLs for instant preview
    status: existingRecord ? existingRecord.status : 'active',
    _syncing: true, // ✅ Mark as syncing for UI badge
    _pendingAction: action,
    _search: (
      name +
      formValue('fPhone') +
      formValue('fAddress') +
      formValue('fReceipt')
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
    tempRecordIndex = records.findIndex(x => String(x.id) === String(clientRecordId));
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
  const savedPhone = formValue('fPhone');
  const savedAddress = formValue('fAddress');
  const savedReceipt = formValue('fReceipt');
  const savedJewel = formValue('fJewel');
  const savedTotal = formValue('fTotal');
  const savedAdvance = formValue('fAdvance');
  const savedBalance = formValue('fBalance');
  const savedDeposit = formValue('fDeposit');
  const savedFrom = formValue('fFrom');
  const savedTo = formValue('fTo');

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
      
      // Safely locate the record in the current array using the client ID
      const index = records.findIndex(r => String(r.id) === String(clientRecordId));
      if (index !== -1) {
        if (savedRecordId !== clientRecordId) {
          log('🔁 Backend returned new ID:', savedRecordId);
          records[index].id = savedRecordId;
        }
        delete records[index]._syncing;
        delete records[index]._pendingAction;
        delete records[index]._pendingError;
        updateCache();
        renderHome();
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

  // Clear all field values
  ['fName','fPhone','fAddress','fReceipt','fTotal','fAdvance','fBalance','fDeposit','fUser'].forEach(id=>{
    const e=document.getElementById(id);
    if(e) e.value='';
  });

  // ✅ REPOPULATE USER: Use saved name from startup prompt
  const savedUser = localStorage.getItem(STORAGE.USER_KEY) || '';
  const userField = document.getElementById('fUser');
  if (userField) userField.value = savedUser;

  setFormValue('fJewel', '');
  document.querySelectorAll('.jo').forEach(x=>x.classList.remove('sel'));
  // No item selected by default

  // Clear all error states
  document.querySelectorAll('.fi.field-error').forEach(el => el.classList.remove('field-error'));

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
  setFormValue('fReceipt', "");
  setFormValue('fFrom', getTodayInternal());
  setFormValue('fTo', "");
  go('add');
}

function calcBal(){
  const t=formValue('fTotal')||0, a=formValue('fAdvance')||0;
  setFormValue('fBalance', t-a);
}

function openEdit(id) {
  const record = records.find(x => String(x.id) === String(id));
  if (!record) {
    console.warn('openEdit: Record not found for ID', id);
    return;
  }
  curDetailRecord = record;
  populateFormForEdit(record);
  closeDetail();
  go('add');
}

function populateFormForEdit(record) {
  currentEditId = String(record.id); // Ensure it's a string
  setFormValue('fName', record.name);

  // ✅ USER PRESERVATION: Use record's user or fallback to current saved identity
  const savedUser = localStorage.getItem(STORAGE.USER_KEY) || '';
  setFormValue('fUser', record.user || savedUser);

  setFormValue('fPhone', record.phone);
  setFormValue('fAddress', record.address);
  setFormValue('fReceipt', record.receiptNo);
  setFormValue('fJewel', record.jewel || 'Necklace');
  // ✅ SAFE JEWELRY MATCHING: Avoid selector syntax errors with special characters
  const jewelItems = document.querySelectorAll('.jo');
  jewelItems.forEach(el => el.classList.remove('sel'));
  let matched = false;
  jewelItems.forEach(el => {
    if (el.dataset.v === record.jewel) {
      el.classList.add('sel');
      matched = true;
    }
  });
  if (!matched) {
    const necklace = document.querySelector('.jo[data-v="Necklace"]');
    if (necklace) necklace.classList.add('sel');
  }
  setFormValue('fTotal', record.total);
  setFormValue('fAdvance', record.advance);
  setFormValue('fBalance', record.balance);
  setFormValue('fDeposit', record.deposit);
  setFormValue('fFrom', normalizeDate(record.from));
  setFormValue('fTo', normalizeDate(record.to));

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
