// MODAL AND DIALOG HANDLING
// Dependencies: config.js, state.js, utils.js, api.js, render.js, photos.js, forms.js

// ✅ Generic modal close handler
function closeM(id){
  document.getElementById(id).classList.remove('open');
}

// ✅ Return confirmation modal
function openRet(id, n){
  pendRet = id;
  const record = records.find(r => String(r.id) === String(id));
  let msg = n;
  if (record) {
    const toDateStr = normalizeDate(record.to);
    const todayStr = getTodayInternal();
    if (toDateStr && todayStr) {
      const [toYear, toMonth, toDay] = toDateStr.split('-').map(Number);
      const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
      
      const toDate = new Date(toYear, toMonth - 1, toDay);
      const todayDate = new Date(todayYear, todayMonth - 1, todayDay);
      
      const diffTime = todayDate - toDate;
      const diffDays = Math.round(diffTime / 86400000);
      
      if (diffDays > 0) {
        msg += `\n\n⚠️ Overdue by ${diffDays} extra day${diffDays === 1 ? '' : 's'}!`;
      } else {
        msg += `\n\n(On time — 0 extra days)`;
      }
    } else {
      msg += `\n\n(Return date not specified)`;
    }
  }
  
  const msgEl = document.getElementById('mRetMsg');
  if (msgEl) {
    msgEl.innerText = msg;
  }
  document.getElementById('mReturn').classList.add('open');
}

// ✅ DELETE BUTTON: New redesigned logic (clean from scratch)
function openDel(recordId) {
  // Validate record exists
  const record = records.find(r => String(r.id) === String(recordId));
  if (!record) {
    toast('❌ Record not found');
    return;
  }
  
  // Store pending delete record info
  pendDel = recordId;
  pendDelRecord = record; // Store full record for display
  
  // Show confirmation modal with record name
  const nameText = document.getElementById('mDelName');
  if (nameText) {
    nameText.textContent = `"${record.name}" - Receipt #${record.receiptNo || 'N/A'}`;
  }
  
  document.getElementById('mDelete').classList.add('open');
}

// ✅ DELETE: Execute delete with new consistent state machine
async function doDelete() {
  // ============ STATE MACHINE: 5 CLEAR STEPS ============
  
  // STEP 1: VALIDATE
  if (!pendDel || !pendDelRecord) {
    toast('❌ No record selected');
    return;
  }
  const normalizedDeleteId = typeof normalizeRecordId === 'function'
    ? normalizeRecordId(pendDel)
    : String(pendDel).trim();
  if (!normalizedDeleteId) {
    toast('❌ Invalid record ID');
    closeM('mDelete');
    pendDel = null;
    pendDelRecord = null;
    return;
  }

  const recordIndex = records.findIndex(r => {
    const recordId = typeof normalizeRecordId === 'function'
      ? normalizeRecordId(r && r.id)
      : String((r && r.id) || '').trim();
    return recordId === normalizedDeleteId;
  });
  if (recordIndex === -1) {
    toast('❌ Record not found');
    closeM('mDelete');
    pendDel = null;
    pendDelRecord = null;
    return;
  }

  // STEP 2: PREPARE DELETED RECORD
  const record = records[recordIndex];
  const deletedRecord = {
    ...record,
    id: normalizedDeleteId,
    deletedAt: new Date().toISOString(),
    _syncing: true,
    _pendingAction: 'delete',
    _deleteInitiator: 'user'
  };

  // STEP 3: LOCAL OPTIMISTIC UPDATE (instant UI feedback)
  try {
    // 3a: Move to recycle bin (deduplicated by normalized ID)
    recycleBinRecords = [
      deletedRecord,
      ...recycleBinRecords.filter(item => {
        const itemId = typeof normalizeRecordId === 'function'
          ? normalizeRecordId(item && item.id)
          : String((item && item.id) || '').trim();
        return itemId !== normalizedDeleteId;
      })
    ].slice(0, 100);
    saveRecycleBinCache();

    // 3b: Remove from main records
    records.splice(recordIndex, 1);
    updateCache();

    // 3c: Close modal & update UI immediately
    closeM('mDelete');
    renderHome();
    updateCounts();
    toast('🗑️ Moved to recycle bin');
  } catch (syncError) {
    console.error('Delete local error:', syncError);
    toast('❌ Failed to delete locally');
    pendDel = null;
    pendDelRecord = null;
    return;
  }

  // STEP 4: BACKEND SYNC (async, non-blocking)
  const deletedId = normalizedDeleteId; // capture before cleanup in STEP 5
  try {
    const syncRes = await apiGet('delete', { id: deletedId });

    // ✅ Check if a restore already happened while we were waiting —
    //    if the record is back in main records[], the delete/restore cancelled out.
    //    Don't touch the recycle bin or show errors in that case.
    const alreadyRestored = records.some(r => {
      const recordId = typeof normalizeRecordId === 'function'
        ? normalizeRecordId(r && r.id)
        : String((r && r.id) || '').trim();
      return recordId === deletedId;
    });
    if (alreadyRestored) {
      // Both ops cancel each other — nothing more to do
      pendDel = null;
      pendDelRecord = null;
      return;
    }

    if (syncRes.ok) {
      const binIndex = recycleBinRecords.findIndex(r => {
        const recordId = typeof normalizeRecordId === 'function'
          ? normalizeRecordId(r && r.id)
          : String((r && r.id) || '').trim();
        return recordId === deletedId;
      });
      if (binIndex !== -1) {
        delete recycleBinRecords[binIndex]._syncing;
        delete recycleBinRecords[binIndex]._syncError;
        delete recycleBinRecords[binIndex]._pendingAction;
      }
      saveRecycleBinCache();
    } else {
      const binIndex = recycleBinRecords.findIndex(r => {
        const recordId = typeof normalizeRecordId === 'function'
          ? normalizeRecordId(r && r.id)
          : String((r && r.id) || '').trim();
        return recordId === deletedId;
      });
      if (binIndex !== -1) {
        recycleBinRecords[binIndex]._syncing = false;
        recycleBinRecords[binIndex]._syncError = syncRes.error || 'Backend sync failed';
      }
      saveRecycleBinCache();
      console.warn('Delete sync failed:', syncRes.error);
    }
  } catch (networkError) {
    const binIndex = recycleBinRecords.findIndex(r => {
      const recordId = typeof normalizeRecordId === 'function'
        ? normalizeRecordId(r && r.id)
        : String((r && r.id) || '').trim();
      return recordId === deletedId;
    });
    if (binIndex !== -1) {
      recycleBinRecords[binIndex]._syncing = false;
      recycleBinRecords[binIndex]._syncError = networkError.message || 'Network error';
    }
    saveRecycleBinCache();
    console.error('Delete network error:', networkError);
  }

  // STEP 5: CLEANUP STATE
  renderRecycleBinModal();
  pendDel = null;
  pendDelRecord = null;
}

// ✅ RETURN: Mark rental as returned
async function doReturn() {
  if (!pendRet) {
    toast('❌ No record selected');
    return;
  }

  const recordIndex = records.findIndex(r => String(r.id) === String(pendRet));
  if (recordIndex === -1) {
    toast('❌ Record not found');
    closeM('mReturn');
    return;
  }

  const record = records[recordIndex];
  const today = getTodayInternal();

  // ✅ Step 1: Mark as returned locally (optimistic UI)
  records[recordIndex].status = 'returned';
  records[recordIndex].retDate = today; // Set return date locally
  records[recordIndex]._syncing = true;
  records[recordIndex]._pendingAction = 'return';
  updateCache();

  // ✅ Step 2: Update UI immediately
  closeM('mReturn');
  renderHome();
  updateCounts();
  toast('✅ Marked as returned');

  try {
    // ✅ Step 3: Sync with backend (forward the actual return date)
    const res = await apiGet('return', { id: pendRet, retDate: today });
    
    if (res.ok) {
      const returnedIndex = records.findIndex(r => String(r.id) === String(pendRet));
      if (returnedIndex !== -1) {
        delete records[returnedIndex]._syncing;
        delete records[returnedIndex]._pendingAction;
      }
      updateCache();
      renderHome();
      updateCounts();
      toast('✅ Return synced');
    } else {
      // Sync failed but record is updated locally (optimistic)
      const returnedIndex = records.findIndex(r => String(r.id) === String(pendRet));
      if (returnedIndex !== -1) {
        returnedIndex._pendingError = res.error || 'Return sync failed';
      }
      updateCache();
      toast('⚠️ Updated locally, backend sync pending');
    }
  } catch (e) {
    console.error('Return error:', e);
    const returnedIndex = records.findIndex(r => String(r.id) === String(pendRet));
    if (returnedIndex !== -1) {
      records[returnedIndex]._pendingError = e.message || 'Return sync failed';
    }
    updateCache();
    toast('⚠️ Updated locally, backend sync pending');
  } finally {
    pendRet = null;
  }
}

// ✅ Detail record viewer modal
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
    👤 User: ${r.user || '-'}
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
    📅 Pickup Date: ${formatDateDisplay(r.from) || '-'}<br>
    🔄 Return Date: ${formatDateDisplay(r.to) || '-'}<br>
    ${r.retDate ? `✅ Returned Date: <b>${formatDateDisplay(r.retDate)}</b>` : ''}
  </div>

  <hr style="border:0; border-top:1px solid #E8D8A0; margin:10px 0;"/>

  <div style="margin-top:10px;">
    📸 Photos:
    <div style="position:relative;">
      <div class="img-slider" style="margin-top:6px;" onscroll="updateSliderDots(this)">
        ${photos.map((p, idx) => `<img src="${p}" style="width:100%; height:200px; object-fit:cover; border-radius:8px; scroll-snap-align:center;" loading="lazy" data-action="view-full-photo" data-url="${p.replace(/"/g, '&quot;')}" data-index="${idx}" data-photos='${JSON.stringify(photos).replace(/'/g, "&#39;")}'>`).join('')}
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

// ✅ Close detail modal
function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
  document.body.classList.remove('modal-open');
}

// ✅ Update slider dots when detail modal horizontal photo slider is scrolled
function updateSliderDots(el) {
  const index = Math.round(el.scrollLeft / el.offsetWidth);
  const dots = el.parentElement.querySelectorAll('.s-dot');
  if (dots.length > 0) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }
}

// ✅ PERFORMANCE: Recycle bin pagination state
let recycleBinPage = 0;
const RECYCLE_BIN_PAGE_SIZE = 10;

function openRecycleBin() {
  recycleBinPage = 0; // Reset to first page
  
  // ✅ INSTANT LOAD: Render cached data immediately
  renderRecycleBinModal();
  
  const modal = document.getElementById('recycleBinModal');
  if (modal) {
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }
  
  // ✅ BACKGROUND REFRESH: Load from backend without blocking UI
  loadDeletedRecords().then(() => {
    renderRecycleBinModal(); // Re-render with fresh data
  }).catch(err => {
    console.error('Failed to load deleted records:', err);
  });
}

function closeRecycleBin() {
  const modal = document.getElementById('recycleBinModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
  recycleBinPage = 0; // Reset pagination on close
}

function renderRecycleBinModal() {
  const list = document.getElementById('recycleBinList');
  if (!list) return;

  // ✅ PERFORMANCE: Filter deleted records efficiently
  const binList = typeof isRecordSoftDeleted === 'function'
    ? recycleBinRecords.filter(isRecordSoftDeleted)
    : recycleBinRecords.slice();

  // ✅ UPDATE: Show/hide Delete All button based on content
  const deleteAllBtn = document.getElementById('recycleBinDeleteAllBtn');
  if (deleteAllBtn) {
    deleteAllBtn.style.display = binList.length > 0 ? 'inline-block' : 'none';
  }

  if (!binList.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:28px 16px;color:#7A5C2E;">
        <h3 style="margin-bottom:8px;color:#7A0000;">Recycle bin is empty</h3>
        <p>No deleted records are waiting for restore.</p>
      </div>
    `;
    return;
  }

  // ✅ PERFORMANCE: Apply search filter if available
  const searchInput = document.getElementById('recycleBinSearch');
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
  
  let filtered = binList;
  if (searchQuery) {
    filtered = binList.filter(record => {
      const searchText = `${record.name || ''} ${record.receiptNo || ''} ${record.from || ''}`.toLowerCase();
      return searchText.includes(searchQuery);
    });
  }

  // ✅ PERFORMANCE: Pagination - only render current page
  const start = recycleBinPage * RECYCLE_BIN_PAGE_SIZE;
  const end = start + RECYCLE_BIN_PAGE_SIZE;
  const pageItems = filtered.slice(start, end);
  const totalPages = Math.ceil(filtered.length / RECYCLE_BIN_PAGE_SIZE);

  let html = `
    <div class="recycle-list">
      ${pageItems.map(record => {
        // Get photos for this deleted record
        const photos = getPhotosFromRecord(record);
        const photoPreview = photos.length > 0 
          ? `<div class="recycle-photo-preview">
              <img src="${photos[0]}" alt="Photo" loading="lazy" onerror="this.style.display='none'">
              ${photos.length > 1 ? `<span class="photo-count-badge">+${photos.length - 1}</span>` : ''}
             </div>`
          : '<div class="recycle-photo-placeholder">📷</div>';
        
        return `
          <div class="recycle-item">
            ${photoPreview}
            <div class="recycle-item-content">
              <div class="recycle-item-title">${record.name || 'Unnamed Record'}</div>
              <div class="recycle-item-meta">
                🧾 ${record.receiptNo || 'No receipt'}<br>
                💍 ${record.jewel || 'Item'}<br>
                📅 ${formatDateDisplay(record.from) || '-'}<br>
                🕒 Deleted ${new Date(record.deletedAt || Date.now()).toLocaleString('en-IN')}
              </div>
              <div class="recycle-item-actions">
                ${record._syncing
                  ? '<span style="color:#666;font-size:12px;font-weight:600;">⌛ Processing...</span>'
                  : `
                    <button class="recycle-restore-btn" data-action="restore-recycled-record" data-id="${record.id}">Restore</button>
                    <button class="recycle-delete-btn" data-action="purge-recycled-record" data-id="${record.id}">Delete Forever</button>
                  `}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // ✅ PERFORMANCE: Add pagination controls if more than one page
  if (totalPages > 1) {
    html += `
      <div style="display:flex;justify-content:center;gap:8px;padding:16px;border-top:1px solid #ddd;">
        <button class="pagination-btn" onclick="recycleBinPrevPage()" ${recycleBinPage === 0 ? 'disabled' : ''} style="padding:6px 12px;border:1px solid #7A5C2E;background:#f5f5f5;cursor:pointer;border-radius:4px;">← Prev</button>
        <span style="padding:6px 12px;color:#7A5C2E;font-weight:bold;">Page ${recycleBinPage + 1} of ${totalPages} (${filtered.length} deleted)</span>
        <button class="pagination-btn" onclick="recycleBinNextPage(${totalPages})" ${recycleBinPage === totalPages - 1 ? 'disabled' : ''} style="padding:6px 12px;border:1px solid #7A5C2E;background:#f5f5f5;cursor:pointer;border-radius:4px;">Next →</button>
      </div>
    `;
  } else if (filtered.length > 0) {
    html += `<div style="text-align:center;padding:8px;color:#999;font-size:12px;">${filtered.length} deleted record${filtered.length !== 1 ? 's' : ''}</div>`;
  }

  list.innerHTML = html;
}

function recycleBinPrevPage() {
  if (recycleBinPage > 0) {
    recycleBinPage--;
    renderRecycleBinModal();
  }
}

function recycleBinNextPage(totalPages) {
  if (recycleBinPage < totalPages - 1) {
    recycleBinPage++;
    renderRecycleBinModal();
  }
}

async function restoreDeletedRecord(recordId) {
  const normalizedRecordId = typeof normalizeRecordId === 'function'
    ? normalizeRecordId(recordId)
    : String(recordId || '').trim();
  if (!normalizedRecordId) {
    toast('⚠️ Invalid record ID');
    return;
  }

  const record = recycleBinRecords.find(item => {
    const itemId = typeof normalizeRecordId === 'function'
      ? normalizeRecordId(item && item.id)
      : String((item && item.id) || '').trim();
    return itemId === normalizedRecordId;
  });
  if (!record) {
    const alreadyActive = records.some(item => {
      const itemId = typeof normalizeRecordId === 'function'
        ? normalizeRecordId(item && item.id)
        : String((item && item.id) || '').trim();
      return itemId === normalizedRecordId;
    });
    if (alreadyActive) {
      removeRecordFromRecycleBin(normalizedRecordId);
      renderRecycleBinModal();
      return;
    }
    toast('⚠️ Record not found in recycle bin');
    return;
  }

  // ✅ RACE CONDITION FIX:
  // If the delete backend call is still in-flight (pendingAction = 'delete'),
  // the record hasn't been archived yet on the server.
  // Restoring now = the two calls cancel each other out.
  // Just put the record back locally and fire NO backend calls at all.
  const deleteIsPending = record._pendingAction === 'delete';

  // ✅ INSTANT: Restore locally right away
  const restoredRecord = { ...record };
  restoredRecord.id = normalizedRecordId;
  delete restoredRecord.deletedAt;
  delete restoredRecord._syncing;
  delete restoredRecord._pendingAction;
  delete restoredRecord._pendingError;
  const existingActiveIndex = records.findIndex(item => {
    const itemId = typeof normalizeRecordId === 'function'
      ? normalizeRecordId(item && item.id)
      : String((item && item.id) || '').trim();
    return itemId === normalizedRecordId;
  });
  if (existingActiveIndex === -1) {
    records.unshift(restoredRecord);
  } else {
    records[existingActiveIndex] = {
      ...records[existingActiveIndex],
      ...restoredRecord,
      id: normalizedRecordId
    };
  }

  removeRecordFromRecycleBin(normalizedRecordId);
  updateCache();
  renderHome();
  updateCounts();
  renderRecycleBinModal();
  toast('✅ Record restored');

  // If delete was still pending, both operations cancel — nothing to do on backend
  if (deleteIsPending) return;

  // ✅ BACKGROUND: Sync to backend silently — UI is already updated
  apiGet('restore', { id: normalizedRecordId }).then(res => {
    if (!res.ok) {
      const idx = records.findIndex(item => {
        const itemId = typeof normalizeRecordId === 'function'
          ? normalizeRecordId(item && item.id)
          : String((item && item.id) || '').trim();
        return itemId === normalizedRecordId;
      });
      if (idx !== -1) {
        records[idx]._pendingAction = 'restore';
        records[idx]._pendingError = res.error || 'Restore sync failed';
        updateCache();
      }
    }
  }).catch(() => {
    const idx = records.findIndex(item => {
      const itemId = typeof normalizeRecordId === 'function'
        ? normalizeRecordId(item && item.id)
        : String((item && item.id) || '').trim();
      return itemId === normalizedRecordId;
    });
    if (idx !== -1) {
      records[idx]._pendingAction = 'restore';
      updateCache();
    }
  });
}

async function permanentlyDeleteFromRecycleBin(recordId) {
  const normalizedRecordId = typeof normalizeRecordId === 'function'
    ? normalizeRecordId(recordId)
    : String(recordId || '').trim();
  if (!normalizedRecordId) {
    toast('⚠️ Invalid record ID');
    return;
  }

  const binIndex = recycleBinRecords.findIndex(item => {
    const itemId = typeof normalizeRecordId === 'function'
      ? normalizeRecordId(item && item.id)
      : String((item && item.id) || '').trim();
    return itemId === normalizedRecordId;
  });
  const activeIndex = records.findIndex(item => {
    const itemId = typeof normalizeRecordId === 'function'
      ? normalizeRecordId(item && item.id)
      : String((item && item.id) || '').trim();
    return itemId === normalizedRecordId;
  });

  if (binIndex === -1 && activeIndex === -1) {
    renderRecycleBinModal();
    return;
  }
  if (!confirm('Delete this record forever? This cannot be undone.')) return;

  // ✅ INSTANT: Remove from UI immediately — no waiting for backend
  removeRecordFromRecycleBin(normalizedRecordId);
  records = records.filter(item => {
    const itemId = typeof normalizeRecordId === 'function'
      ? normalizeRecordId(item && item.id)
      : String((item && item.id) || '').trim();
    return itemId !== normalizedRecordId;
  });
  updateCache();
  renderHome();
  updateCounts();
  renderRecycleBinModal();
  toast('🗑️ Deleted forever');

  // ✅ BACKGROUND: Sync to backend silently
  apiGet('permanentlyDelete', { id: normalizedRecordId }).catch(() => {
    // Silent fail — record is gone locally, backend will be consistent on next full sync
  });
}

// ✅ DELETE ALL: Permanently delete all records from recycle bin
async function deleteAllFromRecycleBin() {
  // ✅ STEP 1: Validate recycle bin has records
  const binList = typeof isRecordSoftDeleted === 'function'
    ? recycleBinRecords.filter(isRecordSoftDeleted)
    : recycleBinRecords.slice();

  if (!binList.length) {
    toast('ℹ️ Recycle bin is already empty');
    return;
  }

  // ✅ STEP 2: Confirmation with count
  const confirmMsg = `⚠️ WARNING: This will permanently delete ALL ${binList.length} record${binList.length !== 1 ? 's' : ''} from the recycle bin.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`;
  
  if (!confirm(confirmMsg)) {
    return;
  }

  // ✅ STEP 3: Double confirmation for safety
  if (!confirm('🚨 FINAL CONFIRMATION: Delete all records forever?')) {
    return;
  }

  // ✅ STEP 4: Show loading state
  const spinner = document.getElementById('ovSpin');
  if (spinner) spinner.classList.add('show');
  
  const deleteAllBtn = document.getElementById('recycleBinDeleteAllBtn');
  if (deleteAllBtn) {
    deleteAllBtn.disabled = true;
    deleteAllBtn.textContent = '🗑️ Deleting...';
  }
  
  toast('🗑️ Deleting all records...');

  // ✅ STEP 5: Store IDs for backend deletion
  const idsToDelete = binList.map(r => r.id);
  console.log('🗑️ Deleting IDs from Archive sheet:', idsToDelete);

  // ✅ STEP 6: Mark all for deletion locally (optimistic UI)
  const previousBinRecords = [...recycleBinRecords];
  recycleBinRecords = recycleBinRecords.map(r => ({ ...r, _syncing: true, _pendingAction: 'permanentlyDelete' }));
  renderRecycleBinModal();

  // ✅ STEP 7: Permanently delete all archived rows from backend using a single batch action
  if (navigator.onLine) {
    console.log('🌐 Requesting backend to clear entire archive...');
    try {
      const res = await apiGet('clearArchive', {});
      if (res.ok) {
        console.log('✅ Backend archive cleared successfully');
        recycleBinRecords = []; // Success: clear local bin
        saveRecycleBinCache();
        toast(`✅ Successfully deleted all ${binList.length} records permanently`);
      } else {
        console.warn('⚠️ Backend archive clear failed:', res.error);
        recycleBinRecords = previousBinRecords; // Rollback
        saveRecycleBinCache();
        toast('❌ Backend failed to clear');
      }
    } catch (e) {
      console.warn('⚠️ Backend archive clear error:', e);
      recycleBinRecords = previousBinRecords; // Rollback
      saveRecycleBinCache();
      toast('⚠️ Connection error. Please try again later.');
    }
  } else {
    console.log('📡 Offline - cannot clear archive');
    recycleBinRecords = previousBinRecords; // Rollback
    saveRecycleBinCache();
    toast('⚠️ Cannot delete all records while offline');
  }

  // ✅ STEP 8: Hide loading
  if (spinner) spinner.classList.remove('show');
  
  if (deleteAllBtn) {
    deleteAllBtn.disabled = false;
    deleteAllBtn.textContent = '🗑️ Delete All Forever';
  }
  
  // ✅ STEP 9: Update UI
  renderRecycleBinModal();
}

// ✅ Delete photo from record
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
