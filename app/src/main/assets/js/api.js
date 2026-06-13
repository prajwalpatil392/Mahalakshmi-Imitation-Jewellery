// API and network functions for Mahalakshmi Jewellery Rental App

function saveRecycleBinCache() {
  try {
    localStorage.setItem('recycleBinRecords', JSON.stringify(recycleBinRecords));
  } catch (e) {
    console.warn('Failed to save recycle bin:', e);
  }
}

function loadRecycleBinCache() {
  try {
    const cached = localStorage.getItem('recycleBinRecords');
    recycleBinRecords = cached ? JSON.parse(cached) : [];
    // ✅ FIXED: Ensure all items have deletedAt timestamp
    // Normalize on load to handle any legacy data without deletedAt
    recycleBinRecords = recycleBinRecords.map(item => {
      if (!item.deletedAt) {
        return { ...item, deletedAt: new Date().toISOString() };
      }
      return item;
    });
  } catch (e) {
    recycleBinRecords = [];
    console.warn('Failed to load recycle bin:', e);
  }
}

async function loadDeletedRecords() {
  try {
    log('🗑️ Loading deleted records from backend...');
    
    // Fetch deleted/archived records from the backend
    const res = await apiGet('getDeleted');
    if (res.ok && Array.isArray(res.data)) {
      // Merge remote archived rows with local cache (deduplicated by ID)
      const byId = new Map(recycleBinRecords.map(item => [String(item.id), item]));
      
      res.data.forEach(row => {
        const id = String(row.id);
        const prev = byId.get(id);
        byId.set(id, {
          ...(prev || {}),
          ...row,
          deletedAt: row.deletedAt || prev?.deletedAt || new Date().toISOString()
        });
      });
      
      recycleBinRecords = Array.from(byId.values()).slice(0, 100);
      saveRecycleBinCache();
      log(`✅ Recycle bin loaded from backend: ${recycleBinRecords.length} records`);
      return true;
    } else {
      logError('❌ Failed to fetch deleted records from backend:', res.error);
      return false;
    }
  } catch (e) {
    logError('❌ Error loading deleted records:', e);
    return false;
  }
}

function getRecycleBinIdSet() {
  return new Set(recycleBinRecords.map(item => String(item.id)));
}

function filterRecordsHiddenByRecycleBin(sourceRecords) {
  const recycledIds = getRecycleBinIdSet();
  return (sourceRecords || []).filter(record => !recycledIds.has(String(record.id)));
}

function updateRecycleBinRecord(recordId, updates) {
  recycleBinRecords = recycleBinRecords.map(item => {
    if (String(item.id) !== String(recordId)) return item;
    return { ...item, ...updates };
  });
  saveRecycleBinCache();
}

function isPendingLocalRecord(record) {
  return !!record && !!record._pendingAction;
}

function cleanRecordForBackend(record) {
  const cleanRecord = { ...record };
  delete cleanRecord._syncing;
  delete cleanRecord._pendingAction;
  delete cleanRecord._pendingError;
  delete cleanRecord._syncingRetry;
  delete cleanRecord._hasPendingPhotos;
  delete cleanRecord._search;
  // ✅ FIXED: Keep deletedAt for soft-deleted records, don't delete it
  // ✅ REMOVED: _pendingDelete, _deleteSynced, _deleteError (no longer used)
  delete cleanRecord.deleted; // Remove old 'deleted' boolean flag
  return cleanRecord;
}

function isRecordSoftDeleted(record) {
  // ✅ FIXED: Single source of truth = deletedAt timestamp
  // If deletedAt exists, record is soft-deleted (in recycle bin)
  // No more multiple overlapping state flags
  if (!record) return false;
  return !!record.deletedAt;
}

// REMOVED: buildSoftDeleteBackendPayload - No longer needed
// Use deletedAt timestamp directly instead of multiple state flags


function mergeServerDeletedIntoRecycleBin(allRows) {
  const deletedRows = (allRows || []).filter(isRecordSoftDeleted);
  if (!deletedRows.length) return;

  // ✅ FIXED: Proper deduplication - merge by ID without duplicates
  const byId = new Map(recycleBinRecords.map(item => [String(item.id), { ...item }]));
  deletedRows.forEach(row => {
    const id = String(row.id);
    const prev = byId.get(id);
    // Merge server data with local, but keep server's deletedAt
    byId.set(id, {
      ...(prev || {}),
      ...row,
      deletedAt: row.deletedAt || prev?.deletedAt || new Date().toISOString()
      // ✅ REMOVED: _pendingDelete, _deleteSynced, _deleteError
      // Single source of truth is deletedAt
    });
  });
  recycleBinRecords = Array.from(byId.values()).slice(0, 100);
  saveRecycleBinCache();
  if (typeof renderRecycleBinModal === 'function') {
    renderRecycleBinModal();
  }
}

function mergePendingLocalRecords(freshRecords, pendingRecords) {
  const merged = [...freshRecords];

  pendingRecords.forEach(pendingRecord => {
    const index = merged.findIndex(record => String(record.id) === String(pendingRecord.id));

    if (index === -1) {
      merged.unshift(pendingRecord);
      return;
    }

    if (pendingRecord._pendingAction === 'edit') {
      merged[index] = pendingRecord;
      return;
    }

    merged[index] = { ...merged[index] };
    delete merged[index]._syncing;
    delete merged[index]._pendingAction;
    delete merged[index]._pendingError;
  });

   return merged;
}

function moveRecordToRecycleBin(record) {
  if (!record) return;

  // ✅ FIXED: Only add/update with deletedAt timestamp
  // Remove all internal sync state flags
  const recycleRecord = {
    ...record,
    deletedAt: record.deletedAt || new Date().toISOString()
    // ✅ REMOVED: deleted, _pendingDelete, _deleteSynced
    // deletedAt is the single source of truth
  };

  // ✅ FIXED: Deduplicate - if record already exists, update it
  recycleBinRecords = [
    recycleRecord,
    ...recycleBinRecords.filter(item => String(item.id) !== String(record.id))
  ].slice(0, 100);

  saveRecycleBinCache();
}

function removeRecordFromRecycleBin(recordId) {
  recycleBinRecords = recycleBinRecords.filter(item => item.id !== recordId);
  saveRecycleBinCache();
}

async function syncPendingRecords() {
  const pendingRecords = records.filter(record => isPendingLocalRecord(record) && record._pendingError && !record._syncingRetry);
  if (!pendingRecords.length || !navigator.onLine) return;

  for (const pendingRecord of pendingRecords) {
    const index = records.findIndex(record => String(record.id) === String(pendingRecord.id));
    if (index === -1) continue;

    records[index]._syncing = true;
    records[index]._syncingRetry = true;

    try {
      const res = await apiGet(records[index]._pendingAction, cleanRecordForBackend(records[index]));
      if (res.ok) {
        const savedRecordId = res.id || (res.data && res.data.id) || records[index].id;
        records[index].id = savedRecordId;
        delete records[index]._syncing;
        delete records[index]._pendingAction;
        delete records[index]._pendingError;
        delete records[index]._syncingRetry;
        toast('Pending record synced');
      } else {
        records[index]._pendingError = res.error || 'Sync failed';
        delete records[index]._syncingRetry;
      }
    } catch (e) {
      records[index]._pendingError = e.message || 'Sync failed';
      delete records[index]._syncingRetry;
    }
  }

  updateCache();
  renderHome();
  updateCounts();
}

async function syncPendingRecycleBinDeletes() {
  // ✅ REMOVED: No longer needed
  // Soft-deletes sync immediately via apiCall('delete')
  // Single source of truth: deletedAt timestamp, not _pendingDelete flag
  // Recycle bin records are fetched fresh from backend on each load
  return; // No-op for backward compatibility
}

function syncPendingLocalChanges() {
  syncPendingRecords();
  syncPendingRecycleBinDeletes();
}

function showNetworkWarning() {
  let warning = document.getElementById('networkWarning');
  if (!warning) {
    warning = document.createElement('div');
    warning.id = 'networkWarning';
    warning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff9800;
      color: white;
      padding: 8px;
      text-align: center;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    warning.innerHTML = '⚠️ No Internet Connection - Working Offline';
    document.body.appendChild(warning);
  }
  warning.style.display = 'block';
}

function hideNetworkWarning() {
  const warning = document.getElementById('networkWarning');
  if (warning) {
    warning.style.display = 'none';
  }
}

function saveConfig() {
  const url = document.getElementById('configScriptUrl').value.trim();
  const sheetId = document.getElementById('configSheetId').value.trim();

  if (url) {
    localStorage.setItem('customScriptUrl', url);
    activeScriptUrl = url;
  }

  localStorage.setItem('customSheetId', sheetId);
  activeSheetId = sheetId;

  toast('✅ Config saved! Reloading...');
  setTimeout(() => location.reload(), 1000);
}

function resetConfig() {
  if (!confirm('Reset to default backend?')) return;
  localStorage.removeItem('customScriptUrl');
  localStorage.removeItem('customSheetId');
  toast('Reset complete. Reloading...');
  setTimeout(() => location.reload(), 1000);
}

async function apiGet(action, payload) {
  const url = activeScriptUrl;

  // Check network before API call
  if (!navigator.onLine) {
    return {ok: false, error: "No internet connection"};
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const body = new URLSearchParams();
    body.append('key', SECRET_KEY);
    body.append('action', action);

    // ✅ DYNAMIC SHEET: Pass the sheet ID/Link if configured
    if (activeSheetId) {
      body.append('sheetId', activeSheetId);
    }

    if (payload) {
      // ✅ FIXED: For 'delete', 'return', and 'permanentlyDelete' actions, extract ID as separate parameter
      if ((action === 'delete' || action === 'return' || action === 'permanentlyDelete') && typeof payload === 'object' && payload.id) {
        body.append('id', payload.id);
        if (action === 'return' && payload.retDate) {
          body.append('retDate', payload.retDate);
        }
      } else {
        body.append('data', JSON.stringify(payload));
      }
    }
    body.append('_ts', String(Date.now()));

    const options = {
      method: 'POST',
      body: body,
      signal: controller.signal
    };

    const r = await fetch(url, options);
    clearTimeout(timeout);

    if (!r.ok) {
      throw new Error(`Server error (${r.status})`);
    }

    return await r.json();
  }
  catch(e) {
    if (e.name === 'AbortError') {
      return {ok:false, error:"Request timeout - Check internet"};
    }
    return {ok:false, error: e.message || "Network error"};
  }
}

async function loadData(skipCache = false) {
  try {
    log('loadData: Starting...');

    if (!skipCache) {
      // ✅ FAST LOAD: Load and render from v1 cache IMMEDIATELY
      const cacheLoaded = loadRecordsCache();
      loadRecycleBinCache();

      if (cacheLoaded) {
        log('🚀 Instant startup: v1 Cache restored');
        // ✅ INSTANT UI: Render cached records and update stats boxes immediately
        renderHome();
        updateCounts();
        if (typeof renderCalendarWidget === 'function') renderCalendarWidget(true);
      }
    }

    // ✅ Show loading state only if no cached data
    if (records.length === 0) {
      const homeList = document.getElementById('homeList');
      if (homeList) {
        homeList.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">⏳ Loading records...</div>';
      }
    }

    // ✅ BACKGROUND SYNC: Fetch fresh data silently (don't block UI)
    log('🔄 Starting background sync...');
    const res = await apiGet('get');
    log('loadData: Background sync response received:', res);

    if (res.ok) {
      log('loadData: Fresh data received, records count:', res.data ? res.data.length : 0);

      const pendingRecords = records.filter(isPendingLocalRecord);

      // ✅ PERFORMANCE: Pre-compute search text for each record
      // ✅ FIX: Recompute overdue status client-side so active/overdue filters
      //    are always accurate regardless of when the backend was last synced.
      const todayForStatus = getTodayInternal();
      const mappedRows = res.data.map(r => {
        const row = { ...r };
        normalizePhotoUrlsField(row);
        // Recompute overdue: if to-date has passed and not returned, mark overdue
        if (row.status !== 'returned') {
          const toNorm = normalizeDate(row.to);
          if (toNorm && toNorm < todayForStatus) {
            row.status = 'overdue';
          } else if (toNorm && toNorm >= todayForStatus && row.status === 'overdue') {
            // to-date is still in the future but was previously marked overdue — reset to active
            row.status = 'active';
          }
        }
        row._search = (
          (row.name || '') +
          (row.phone || '') +
          (row.address || '') +
          (row.receiptNo || '')
        ).toLowerCase();
        return row;
      });
      mergeServerDeletedIntoRecycleBin(mappedRows);
      const freshRecords = filterRecordsHiddenByRecycleBin(
        mappedRows.filter(r => !isRecordSoftDeleted(r))
      );
      const recordsToRender = mergePendingLocalRecords(freshRecords, pendingRecords);

      // ✅ SMART UPDATE: Only update if data actually changed
      const oldDataString = JSON.stringify(records);
      const newDataString = JSON.stringify(recordsToRender);
      const dataChanged = oldDataString !== newDataString;

      if (dataChanged) {
        log('🔄 Data changed - updating UI');

        // Check if new records were added
        if (records.length > 0 && recordsToRender.length > records.length) {
          const newCount = recordsToRender.length - records.length;
          toast(`📢 ${newCount} new record(s) synced!`);
        }

        records = recordsToRender;
        lastRecordCount = records.length;

        // ✅ FIX: Strip any stale _syncing flags from freshly synced records
        // (e.g. records added directly to the sheet won't have these, but
        //  cached pending records merged in might — clear them all on a fresh sync)
        records = records.map(r => {
          if (r._syncing && !r._pendingAction) {
            // _syncing without _pendingAction means it was never saved — strip it
            const clean = { ...r };
            delete clean._syncing;
            return clean;
          }
          return r;
        });

        // ✅ FIXED: Ensure selectedDate is set before rendering
        selectedDate = selectedDate || getTodayInternal();

        // Update UI with fresh data
        renderHome();
        updateCounts();
        if (typeof lastCalendarRenderKey !== 'undefined') lastCalendarRenderKey = '';
        if (typeof renderCalendarWidget === 'function') renderCalendarWidget(true);
      } else {
        log('✅ Cache was fresh - no UI update needed');
        // Silently update lastRecordCount without toast
        lastRecordCount = recordsToRender.length;
      }

      lastSyncTime = Date.now();

      // ✅ FIX: Invalidate home snapshot so stale syncing badges don't reappear on restart
      try {
        localStorage.removeItem(CACHE_SNAPSHOT_KEY);
      } catch (_) {}

      // ✅ OPTIMIZATION: Save fresh data to v1 cache for next startup
      try {
        saveRecordsCache();
        log('✅ v1 Cache updated with', records.length, 'records');
      } catch (cacheErr) {
        console.warn('Cache save failed:', cacheErr);
      }

      syncPendingLocalChanges();
      log(`✅ Background sync complete - ${records.length} records`);
    } else {
      log('⚠️ Background sync failed:', res.error);

      // Only show error toast if:
      // 1. User manually triggered sync (not background)
      // 2. AND we don't have cached data
      if (!skipCache && records.length === 0) {
        toast("⚠️ " + res.error);
      }
      
      // Always render existing data even if sync fails
      if (records.length > 0) {
        renderHome();
        updateCounts();
      }
    }
  } catch (e) {
    log('⚠️ loadData exception:', e.message);
    
    // Only show error for manual sync attempts
    if (!skipCache && records.length === 0) {
      toast("⚠️ Connection error");
    }

    // Only show error if we don't have any data
    if (records.length === 0) {
      toast("❌ Error loading data");
      // Still try to render existing data
      renderHome();
      updateCounts();
    } else {
      log('⚠️ Sync error but cache is available');
    }
  }
}
