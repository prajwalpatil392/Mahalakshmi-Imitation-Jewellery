// MODAL AND DIALOG HANDLING
// Dependencies: config.js, state.js, utils.js, api.js, render.js, photos.js, forms.js

// ✅ Generic modal close handler
function closeM(id){
  document.getElementById(id).classList.remove('open');
}

// ✅ Return confirmation modal
function openRet(id, n){
  pendRet = id;
  document.getElementById('mRetMsg').textContent = n;
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

  const recordIndex = records.findIndex(r => String(r.id) === String(pendDel));
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
    deletedAt: new Date().toISOString(),
    _syncing: true,
    _deleteInitiator: 'user'
  };

  // STEP 3: LOCAL OPTIMISTIC UPDATE (instant UI feedback)
  try {
    // 3a: Move to recycle bin
    recycleBinRecords.unshift(deletedRecord);
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
  try {
    const syncRes = await apiGet('delete', { id: pendDel });
    
    if (syncRes.ok) {
      // Sync success: cleanup syncing flag
      const binIndex = recycleBinRecords.findIndex(r => String(r.id) === String(pendDel));
      if (binIndex !== -1) {
        delete recycleBinRecords[binIndex]._syncing;
        delete recycleBinRecords[binIndex]._syncError;
      }
      saveRecycleBinCache();
    } else {
      // Sync failed: mark with error flag (record stays in bin)
      const binIndex = recycleBinRecords.findIndex(r => String(r.id) === String(pendDel));
      if (binIndex !== -1) {
        recycleBinRecords[binIndex]._syncing = false;
        recycleBinRecords[binIndex]._syncError = syncRes.error || 'Backend sync failed';
      }
      saveRecycleBinCache();
      console.warn('Delete sync failed:', syncRes.error);
    }
  } catch (networkError) {
    // Network error: mark for retry
    const binIndex = recycleBinRecords.findIndex(r => String(r.id) === String(pendDel));
    if (binIndex !== -1) {
      recycleBinRecords[binIndex]._syncing = false;
      recycleBinRecords[binIndex]._syncError = networkError.message || 'Network error';
    }
    saveRecycleBinCache();
    console.error('Delete network error:', networkError);
  }

  // STEP 5: CLEANUP STATE
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

  // ✅ Step 1: Mark as returned locally (optimistic UI)
  records[recordIndex].status = 'returned';
  records[recordIndex]._syncing = true;
  records[recordIndex]._pendingAction = 'return';
  updateCache();

  // ✅ Step 2: Update UI immediately
  closeM('mReturn');
  renderHome();
  updateCounts();
  toast('✅ Marked as returned');

  try {
    // ✅ Step 3: Sync with backend
    const res = await apiGet('return', { id: pendRet });
    
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
  const r = records.find(x => x.id === id);
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
    📅 Pickup: ${formatDateDisplay(r.from) || '-'}<br>
    🔄 Return: ${formatDateDisplay(r.to) || 'Not returned'}
  </div>

  <hr style="border:0; border-top:1px solid #E8D8A0; margin:10px 0;"/>

  <div style="margin-top:10px;">
    📸 Photos:
    <div style="position:relative;">
      <div class="img-slider" style="margin-top:6px;" onscroll="updateSliderDots(this)">
        ${photos.map(p => `<img src="${p}" style="width:100%; height:200px; object-fit:cover; border-radius:8px; scroll-snap-align:center;" loading="lazy" data-action="view-full-photo" data-url="${p.replace(/"/g, '&quot;')}">`).join('')}
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

// ✅ PERFORMANCE: Recycle bin pagination state
let recycleBinPage = 0;
const RECYCLE_BIN_PAGE_SIZE = 10;

function openRecycleBin() {
  recycleBinPage = 0; // Reset to first page
  renderRecycleBinModal();
  const modal = document.getElementById('recycleBinModal');
  if (modal) {
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }
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
      ${pageItems.map(record => `
        <div class="recycle-item">
          <div class="recycle-item-title">${record.name || 'Unnamed Record'}</div>
          <div class="recycle-item-meta">
            🧾 ${record.receiptNo || 'No receipt'}<br>
            📅 ${formatDateDisplay(record.from) || '-'}<br>
            🕒 Deleted ${new Date(record.deletedAt || Date.now()).toLocaleString('en-IN')}
          </div>
          <div class="recycle-item-actions">
            <button class="recycle-restore-btn" data-action="restore-recycled-record" data-id="${record.id}">Restore</button>
            <button class="recycle-delete-btn" data-action="purge-recycled-record" data-id="${record.id}">Delete Forever</button>
          </div>
        </div>
      `).join('')}
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
  const record = recycleBinRecords.find(item => String(item.id) === String(recordId));
  if (!record) {
    toast('⚠️ Record not found in recycle bin');
    return;
  }

  // ✅ FIXED: Simplified restore logic
  // Single source of truth: deletedAt timestamp
  // If a record is in recycle bin, it was previously synced to backend
  const restoredRecord = { ...record };
  delete restoredRecord.deletedAt;  // Remove soft-delete marker
  delete restoredRecord.deleted;    // Remove old deleted flag
  
  // Set pending action for backend sync
  restoredRecord._syncing = true;
  restoredRecord._pendingAction = 'edit';  // Always use edit since it was synced before
  restoredRecord._pendingError = '';

  // Optimistic UI: Add to home immediately
  records.unshift(restoredRecord);
  removeRecordFromRecycleBin(recordId);
  updateCache();
  renderHome();
  updateCounts();
  renderRecycleBinModal();
  toast('♻️ Restoring record...');

  try {
    // Send to backend to remove soft-delete marker
    const basePayload = cleanRecordForBackend(restoredRecord);
    const res = await apiGet('edit', basePayload);
    
    if (res.ok) {
      // Success - update the local record ID if backend provided one
      const savedRecordId = res.id || (res.data && res.data.id) || restoredRecord.id;
      const restoredIndex = records.findIndex(item => String(item.id) === String(restoredRecord.id));
      if (restoredIndex !== -1) {
        records[restoredIndex].id = savedRecordId;
        delete records[restoredIndex]._syncing;
        delete records[restoredIndex]._pendingAction;
        delete records[restoredIndex]._pendingError;
      }
      updateCache();
      renderHome();
      updateCounts();
      toast('✅ Record restored');
    } else {
      // Sync failed but record is in home (optimistic)
      const restoredIndex = records.findIndex(item => String(item.id) === String(restoredRecord.id));
      if (restoredIndex !== -1) {
        records[restoredIndex]._pendingError = res.error || 'Restore sync failed';
      }
      updateCache();
      toast('⚠️ Restored locally, backend sync pending');
    }
  } catch (e) {
    console.error('Restore record error:', e);
    const restoredIndex = records.findIndex(item => String(item.id) === String(restoredRecord.id));
    if (restoredIndex !== -1) {
      records[restoredIndex]._pendingError = e.message || 'Restore sync failed';
    }
    updateCache();
    toast('⚠️ Restored locally, backend sync pending');
  }
}

async function permanentlyDeleteFromRecycleBin(recordId) {
  if (!confirm('Delete this record forever from recycle bin?')) return;
  const record = recycleBinRecords.find(item => String(item.id) === String(recordId));
  if (record && typeof apiCall === 'function') {
    const res = await apiCall('delete', recordId, RECYCLE_SHEET_ID);
    if (!res.ok) {
      toast('Delete sync failed. Try again online.');
      // ✅ FIXED: No need to update _pending* fields, just rely on fresh load
      return;
    }
  }
  removeRecordFromRecycleBin(recordId);
  renderRecycleBinModal();
  toast('🗑️ Permanently deleted');
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
