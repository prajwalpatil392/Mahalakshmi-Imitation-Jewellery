// Rendering and UI generation functions for Mahalakshmi Jewellery Rental App

function updateCounts() {
  const homeRows = typeof isRecordSoftDeleted === 'function'
    ? records.filter(r => !isRecordSoftDeleted(r))
    : records.slice();
  const activeCount = homeRows.filter(r => r.status === STATUS.ACTIVE).length;
  const ovCount = homeRows.filter(r => r.status === STATUS.OVERDUE).length;
  const todayStr = getTodayInternal();
  const todayCount = homeRows.filter(r => isRecordOnStartDate(r, todayStr)).length;

  const totalEl = document.getElementById('cntTotal');
  const activeEl = document.getElementById('cntActive');
  const ovEl = document.getElementById('cntOv');
  const todayEl = document.getElementById('cntToday');

  if (totalEl) totalEl.textContent = homeRows.length;
  if (activeEl) activeEl.textContent = activeCount;
  if (ovEl) ovEl.textContent = ovCount;
  if (todayEl) todayEl.textContent = todayCount;

  if (typeof saveHomeSnapshot === 'function') {
    saveHomeSnapshot();
  }
}

function renderHome() {
  log('renderHome: Called with', records.length, 'records');

  // ✅ FIXED: Ensure selectedDate is always set
  if (!selectedDate) {
    selectedDate = getTodayInternal();
    console.warn('selectedDate was undefined, reset to today:', selectedDate);
  }

  // ✅ DEBUG: Log current state
  log('Selected Date:', selectedDate);
  if (records.length > 0) {
    log('Sample Record:', records[0]);
  }

  // ✅ CRITICAL FIX: Header ALWAYS shows TODAY's date (never changes)
  // Selected date is shown in filter area only
  try {
    const headerDateText = document.getElementById('headerDateText');
    if (headerDateText) {
      const todayStr = getTodayInternal();
      headerDateText.textContent = formatDateDisplay(todayStr);
    }
  } catch (e) {
    console.warn('Failed to update header date:', e);
  }

  // ✅ CONSISTENCY FIX: Update selected date display in filter area
  try {
    const selectedDateEl = document.getElementById('selectedDateDisplay');
    if (selectedDateEl && curFilter === FILTER.DATE) {
      selectedDateEl.textContent = `Selected: ${formatDateDisplay(selectedDate)}`;
      selectedDateEl.style.display = 'block';
    } else if (selectedDateEl) {
      selectedDateEl.style.display = 'none';
    }
  } catch (e) {
    console.warn('Failed to update selected date display:', e);
  }

  // Apply search and filter
  const srch = document.getElementById('srchQ');
  const q = srch ? srch.value.toLowerCase() : '';
  let filtered = typeof isRecordSoftDeleted === 'function'
    ? records.filter(r => !isRecordSoftDeleted(r))
    : records.slice();

  // Status chip filters work globally across all dates.
  if (curFilter === FILTER.ACTIVE) {
    // Active means anything that has NOT been returned yet
    filtered = filtered.filter(r => r.status === STATUS.ACTIVE || r.status === STATUS.OVERDUE);
  } else if (curFilter === FILTER.OVERDUE || curFilter === FILTER.RETURNED) {
    filtered = filtered.filter(r => r.status === curFilter);
  }

  if (curFilter === FILTER.ADVANCE) {
    filtered = filtered.filter(r => typeof isAdvanceBooking === 'function' && isAdvanceBooking(r));
  }

  // Date filters
  let activeDate = null;
  if (curFilter === FILTER.TODAY) {
    activeDate = getTodayInternal();
    filtered = filtered.filter(r => isRecordOnStartDate(r, activeDate));
  } else if (curFilter === FILTER.DATE) {
    activeDate = selectedDate;
    filtered = filtered.filter(r => typeof isRecordActiveOnDate === 'function' && isRecordActiveOnDate(r, activeDate));
  }

  // ✅ SORT: Display records by receipt number descending (highest/latest first)
  // Natural sort handles both numeric ("100" > "9") and alphanumeric ("RCP-100" > "RCP-9")
  filtered.sort((a, b) => {
    const ra = String(a.receiptNo || '');
    const rb = String(b.receiptNo || '');
    return rb.localeCompare(ra, undefined, { numeric: true, sensitivity: 'base' });
  });

  // DEBUG
  log('Filtered Records:', filtered);

  // ✅ PERFORMANCE: Use pre-computed search text
  if (q) {
    filtered = filtered.filter(r => r._search && r._search.includes(q));
  }

  let html = filtered.map(r => cardHTML(r)).join('');

  if (!html || html.trim() === "") {
    let msg = MESSAGES.NO_RECORDS_FOUND;
    let sub = MESSAGES.TRY_CHANGING_FILTER;

    if (curFilter === FILTER.TODAY) {
      msg = `📅 No Rentals Today`;
      sub = 'No records found for today. Try "All" to see all records.';
    } else if (curFilter === STATUS.OVERDUE) {
      msg = MESSAGES.NO_OVERDUE;
      sub = MESSAGES.NO_OVERDUE_SUB;
    } else if (curFilter === STATUS.ACTIVE) {
      msg = MESSAGES.NO_ACTIVE;
      sub = MESSAGES.NO_ACTIVE_SUB;
    } else if (curFilter === STATUS.RETURNED) {
      msg = MESSAGES.NO_RETURNED;
      sub = MESSAGES.NO_RETURNED_SUB;
    } else if (curFilter === FILTER.ADVANCE) {
      msg = '🗓 No Advance Bookings';
      sub = 'No upcoming rentals found. Try "All" to see every record.';
    } else if (curFilter === FILTER.DATE && activeDate) {
      msg = `📅 No Rentals on ${formatDateDisplay(activeDate)}`;
      sub = 'Select another date or click "All" to see all records.';
    }

    html = `<div style="text-align:center; padding:40px; color:#777;">
      <h3>${msg}</h3>
      <p style="margin-top:8px; font-size:14px;">${sub}</p>
      <button class="add-big" data-action="go-add" style="margin-top:20px; padding:12px; font-size:12px; width:auto; display:inline-flex;">✦ Add New Record ✦</button>
    </div>`;
  }

  const homeList = document.getElementById('homeList');

  if (homeList) {
    // ✅ FILTER RESULT COUNT: Show how many records match the current filter
    const totalVisible = records.filter(r => !isRecordSoftDeleted(r)).length;
    const isFiltered = curFilter !== FILTER.ALL || q;
    let countBar = '';
    if (isFiltered) {
      const filterLabel =
        curFilter === FILTER.TODAY    ? '📅 Today' :
        curFilter === FILTER.ACTIVE   ? '💍 Active' :
        curFilter === FILTER.OVERDUE  ? '⚠️ Overdue' :
        curFilter === FILTER.RETURNED ? '✅ Returned' :
        curFilter === FILTER.ADVANCE  ? '🗓 Advance' :
        curFilter === FILTER.DATE     ? `📅 ${formatDateDisplay(selectedDate)}` :
        q ? `🔍 "${q}"` : '';
      countBar = `<div style="padding:6px 14px 2px;font-size:12px;color:#7A5C2E;font-weight:600;">
        ${filterLabel} — <span style="color:#6A0000;">${filtered.length}</span> record${filtered.length !== 1 ? 's' : ''} found
        <span style="color:#aaa;font-weight:400;">&nbsp;/&nbsp;${totalVisible} total</span>
      </div>`;
    }

    const newHTML = countBar + html;
    // ✅ OPTIMIZATION: Compare with current innerHTML instead of storing in dataset
    if (homeList.innerHTML !== newHTML) {
      homeList.innerHTML = newHTML;
    }
    if (typeof updateCalendarSelection === 'function') updateCalendarSelection();
    log('renderHome: Showing', filtered.length, 'records for date:', selectedDate);

    if (typeof saveHomeSnapshot === 'function') {
      saveHomeSnapshot();
    }
  } else {
    logError('renderHome: homeList element not found!');
  }
}

function cardHTML(r) {
  const st = r.status;
  const cls = st === STATUS.RETURNED ? STATUS.RETURNED : (st === STATUS.OVERDUE ? STATUS.OVERDUE : '');

  // ✅ OPTIMISTIC UI: Show syncing badge for temporary records
  let badge;
  if (r._syncing) {
    badge = '<span class="rcard-badge badge-syncing">⏳ Syncing...</span>';
  } else if (st === STATUS.RETURNED) {
    badge = `<span class="rcard-badge ${BADGES[STATUS.RETURNED].class}">${BADGES[STATUS.RETURNED].text}</span>`;
  } else if (st === STATUS.OVERDUE) {
    badge = `<span class="rcard-badge ${BADGES[STATUS.OVERDUE].class}">${BADGES[STATUS.OVERDUE].text}</span>`;
  } else {
    badge = `<span class="rcard-badge ${BADGES[STATUS.ACTIVE].class}">${BADGES[STATUS.ACTIVE].text}</span>`;
  }

  const photos = getPhotosFromRecord(r);
  const hasPhotos = photos.length > 0;
  const hasBlobPhotos = r.photoUrls && r.photoUrls.includes('blob:');
  const phoneHref = String(r.phone || '').trim().replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  const callButton = phoneHref ? `<a href="tel:${phoneHref}" class="call-btn" data-action="call">📞</a>` : '';

  // ✅ VERSION 1.0: Image slider for each card (swipe through photos)
  let photoHTML = '';
  if (hasPhotos) {
    if (photos.length === 1) {
      // Single photo: just show it
      photoHTML = `<div class="rcard-photo-single" data-action="open-gallery" data-index="0" data-photos='${JSON.stringify(photos).replace(/'/g, "&#39;")}'>
        <img src="${photos[0]}" alt="Photo" loading="lazy" onerror="handleImageError(this, '${r.id}')">
      </div>`;
    } else {
      // Multiple photos: show slider with navigation
      const photosJson = JSON.stringify(photos).replace(/'/g, "&#39;");
      const sliderPhotos = photos.map((photo, idx) => 
        `<div class="card-slide" data-idx="${idx}"><img src="${photo}" alt="Photo ${idx + 1}" loading="lazy" onerror="handleImageError(this, '${r.id}')"></div>`
      ).join('');
      
      const sliderDots = photos.map((_, idx) => 
        `<div class="card-dot${idx === 0 ? ' active' : ''}" data-idx="${idx}"></div>`
      ).join('');
      
      photoHTML = `<div class="rcard-photo-slider"><div class="card-slider-container" data-id="${r.id}">
        <div class="card-slider-track" data-photos='${photosJson}'>
          ${sliderPhotos}
        </div>
        <div class="card-slider-dots">
          ${sliderDots}
        </div>
        <div class="card-slider-counter">${photos.length > 1 ? `1/${photos.length}` : ''}</div>
        ${hasBlobPhotos ? `<div class="photo-upload-badge">📤 Uploading...</div>` : ''}
      </div></div>`;
    }
  } else {
    // No photos available - show default placeholder
    photoHTML = `<div class="rcard-photo-placeholder">
      <div class="placeholder-icon">📷</div>
      <div class="placeholder-text">No Images Uploaded</div>
      <div class="placeholder-subtext">Add photos to see them here</div>
    </div>`;
  }

  // Due days calculation
  let dueLine = '';
  if (st === STATUS.RETURNED) {
    const toNorm = normalizeDate(r.to);
    const retNorm = normalizeDate(r.retDate);
    
    if (toNorm && retNorm) {
      const [toYear, toMonth, toDay] = toNorm.split('-').map(Number);
      const [retYear, retMonth, retDay] = retNorm.split('-').map(Number);
      
      const toDate = new Date(toYear, toMonth - 1, toDay);
      const retDate = new Date(retYear, retMonth - 1, retDay);
      
      const diffDays = Math.round((retDate - toDate) / 86400000);
      if (diffDays > 0) {
        dueLine = `<div class="rcard-due due-overdue">🔴 Returned Late by ${diffDays} day${diffDays !== 1 ? 's' : ''}</div>`;
      } else {
        dueLine = `<div class="rcard-due due-returned">✅ Returned on time</div>`;
      }
    } else {
      dueLine = `<div class="rcard-due due-returned">✅ Returned</div>`;
    }
  } else {
    const toNorm = normalizeDate(r.to);
    const fromNorm = normalizeDate(r.from);
    const today = getTodayInternal();
    
    if (fromNorm && fromNorm > today) {
      // Advance Booking
      const [fromYear, fromMonth, fromDay] = fromNorm.split('-').map(Number);
      const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
      
      const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
      const todayDate = new Date(todayYear, todayMonth - 1, todayDay);
      
      const diffDays = Math.round((fromDate - todayDate) / 86400000);
      dueLine = `<div class="rcard-due due-ok">🗓️ Starts in ${diffDays} day${diffDays !== 1 ? 's' : ''}</div>`;
    } else if (toNorm) {
      const [toYear, toMonth, toDay] = toNorm.split('-').map(Number);
      const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
      
      const toDate = new Date(toYear, toMonth - 1, toDay);
      const todayDate = new Date(todayYear, todayMonth - 1, todayDay);
      
      const diffDays = Math.round((toDate - todayDate) / 86400000);
      if (diffDays > 0) {
        dueLine = `<div class="rcard-due due-ok">⏳ ${diffDays} day${diffDays !== 1 ? 's' : ''} left</div>`;
      } else if (diffDays === 0) {
        dueLine = `<div class="rcard-due due-today">🔔 Due Today!</div>`;
      } else {
        dueLine = `<div class="rcard-due due-overdue">🔴 ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue</div>`;
      }
    }
  }

  return `<div class="rcard ${cls} ${r._syncing ? 'syncing' : ''}" data-id="${r.id}">
    <div class="rcard-top">
      <div class="rcard-icon ${st===STATUS.RETURNED?'ret-i':(st===STATUS.OVERDUE?'ov-i':'active-i')}">💍</div>
      <div class="rcard-info">
        <div class="rcard-name-row"><div class="rcard-name">${r.name}</div>${callButton}</div>
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
    ${dueLine}
    <div class="rcard-time">🕒 ${r.createdTime || ''}</div>
    <div class="rcard-user">User: ${r.user}</div>
    ${photoHTML}
    <div class="rcard-actions">
      ${st!==STATUS.RETURNED && !r._syncing ? `<button class="ract ret" data-id="${r.id}">Return</button>` : ''}
      ${!r._syncing ? `<button class="ract edit" data-id="${r.id}">Edit</button>` : ''}
      <button class="ract del" data-id="${r.id}">Delete</button>
    </div>
  </div>`;
}

function getPhotosFromRecord(r) {
  if (!r) return [];

  normalizePhotoUrlsField(r);

  const photos = normalizePhotoUrlsValue(r.photoUrls)
    .split('|')
    .map(x => x.trim())
    .filter(Boolean);

  // Only photoUrls participates in record image rendering.
  if (r.photoUrls) {
    const urls = photos;

    // ✅ DEBUG: Log photo extraction
    if (DEBUG && urls.length > 0) {
      log(`📷 Extracted ${urls.length} photo(s) from record ${r.id}:`, urls);
    }
  }

  // Remove duplicates and filter for valid URLs
  const validPhotos = [...new Set(photos)].filter(isValidPhotoUrl);

  if (DEBUG && validPhotos.length !== photos.length) {
    log(`⚠️ Filtered out ${photos.length - validPhotos.length} invalid photo URL(s)`);
  }

  // ✅ OPTIMIZATION: Apply Cloudinary transformations to all URLs
  return validPhotos.map(optimizeCloudinaryUrl);
}

function isValidPhotoUrl(url) {
  if (!url) return false;
  const s = String(url).trim();

  // Filter out placeholder markers
  if (s.toUpperCase() === PATTERNS.PENDING_MARKER || s === PATTERNS.UNDEFINED_STR || s === PATTERNS.NULL_STR) return false;

  // Must be a real URL (http/https) or blob URL for instant preview
  return (s.startsWith(PATTERNS.HTTP_URL) || s.startsWith(PATTERNS.HTTPS_URL) || s.startsWith(PATTERNS.BLOB_URL)) && !s.includes(' ');
}

// ✅ OPTIMIZATION: Add Cloudinary transformations for faster loading
function normalizePhotoUrlsValue(value) {
  if (Array.isArray(value)) {
    return value.map(x => String(x || '').trim()).filter(Boolean).join('|');
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizePhotoUrlsField(record) {
  if (!record || typeof record !== 'object') return record;

  const parts = normalizePhotoUrlsValue(record.photoUrls)
    .split('|')
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => x.toUpperCase() !== PATTERNS.PENDING_MARKER && x !== PATTERNS.UNDEFINED_STR && x !== PATTERNS.NULL_STR);

  const deduped = [];
  const seen = new Set();
  for (const part of parts) {
    if (!isValidPhotoUrl(part)) continue;
    if (seen.has(part)) continue;
    seen.add(part);
    deduped.push(part);
  }

  record.photoUrls = deduped.join('|');
  return record;
}

function optimizeCloudinaryUrl(url) {
  // Skip optimization for blob URLs (instant preview)
  if (!url || url.startsWith(PATTERNS.BLOB_URL)) return url;

  if (!url.includes('cloudinary.com')) return url;

  // Add transformations: auto-quality, auto-format, max width 600px
  // This reduces image size by 60-80% with no visible quality loss for cards/previews
  const transformations = 'q_auto,f_auto,w_600';

  // Insert transformations after /upload/
  return url.replace('/upload/', `/upload/${transformations}/`);
}

function isRecordOnStartDate(record, dateStr) {
  if (!record) return false;
  if (!dateStr) return false;

  const from = normalizeDate(record.from);

  // ✅ FIX: Records with missing/invalid dates should NOT appear under Today filter.
  // Returning true here caused malformed records to always show in Today view.
  if (!from) return false;

  return from === dateStr;
}

