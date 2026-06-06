// Rendering and UI generation functions for Mahalakshmi Jewellery Rental App

function updateCounts() {
  const homeRows = typeof isRecordSoftDeleted === 'function'
    ? records.filter(r => !isRecordSoftDeleted(r))
    : records.slice();
  const activeCount = homeRows.filter(r => r.status === STATUS.ACTIVE).length;
  const ovCount = homeRows.filter(r => r.status === STATUS.OVERDUE).length;
  const todayStr = getTodayInternal();
  const todayCount = homeRows.filter(r => isRecordOnStartDate(r, todayStr)).length;

  document.getElementById('cntActive').textContent = activeCount;
  document.getElementById('cntOv').textContent = ovCount;
  document.getElementById('cntToday').textContent = todayCount;

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
    const headerEl = document.getElementById('headerDate');
    if (headerEl) {
      const todayStr = getTodayInternal();
      headerEl.textContent = formatDateDisplay(todayStr); // Always show today
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
  if (curFilter === FILTER.ACTIVE || curFilter === FILTER.OVERDUE || curFilter === FILTER.RETURNED) {
    filtered = filtered.filter(r => r.status === curFilter);
  }

  // ✅ DATE FILTERING: Show only records where START date (from) matches selected date
  // This ensures no records from end date ranges are shown
  let activeDate = null;
  if (curFilter === FILTER.TODAY) {
    activeDate = getTodayInternal();
  } else if (curFilter === FILTER.DATE) {
    activeDate = selectedDate;
  }

  if (activeDate) {
    // Only match records where the "from" date equals the active date (exact match)
    filtered = filtered.filter(r => isRecordOnStartDate(r, activeDate));
  }

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
    } else if (curFilter === FILTER.DATE && activeDate) {
      msg = `📅 No Rentals Starting on ${formatDateDisplay(activeDate)}`;
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
    // ✅ OPTIMIZATION: Compare with current innerHTML instead of storing in dataset
    // This avoids memory waste from storing large HTML strings
    if (homeList.innerHTML !== html) {
      homeList.innerHTML = html;
    }
    renderCalendarWidget();
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
        <img src="${photos[0]}" alt="Photo" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage%20error%3C/text%3E%3C/svg%3E'">
      </div>`;
    } else {
      // Multiple photos: show slider with navigation
      const photosJson = JSON.stringify(photos).replace(/'/g, "&#39;");
      const sliderPhotos = photos.map((photo, idx) => 
        `<div class="card-slide" data-idx="${idx}"><img src="${photo}" alt="Photo ${idx + 1}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3C/svg%3E'"></div>`
      ).join('');
      
      const sliderDots = photos.map((_, idx) => 
        `<div class="card-dot${idx === 0 ? ' active' : ''}" data-idx="${idx}"></div>`
      ).join('');
      
      photoHTML = `<div class="card-slider-container" data-id="${r.id}">
        <div class="card-slider-track" data-photos='${photosJson}'>
          ${sliderPhotos}
        </div>
        <div class="card-slider-dots">
          ${sliderDots}
        </div>
        <div class="card-slider-counter">${photos.length > 1 ? `1/${photos.length}` : ''}</div>
        ${photos.length > 1 ? `<div class="card-slider-nav prev" data-id="${r.id}" data-action="prev-photo">‹</div>` : ''}
        ${photos.length > 1 ? `<div class="card-slider-nav next" data-id="${r.id}" data-action="next-photo">›</div>` : ''}
        ${hasBlobPhotos ? `<div class="photo-upload-badge">📤 Uploading...</div>` : ''}
      </div>`;
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
    <div class="rcard-time">🕒 ${r.createdTime || ''}</div>
    <div class="rcard-user">User: ${r.user}</div>
    ${photoHTML}
    <div class="rcard-actions">
      ${st!==STATUS.RETURNED && !r._syncing ? `<button class="ract ret" data-id="${r.id}">Return</button>` : ''}
      ${!r._syncing ? `<button class="ract edit" data-id="${r.id}">Edit</button>` : ''}
      ${!r._syncing ? `<button class="ract del" data-id="${r.id}">Delete</button>` : ''}
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
  if (!dateStr) return true;

  const from = normalizeDate(record.from);

  // Keep legacy records visible if their dates are malformed instead of dropping them silently.
  if (!from) {
    return true;
  }

  return from === dateStr;
}

function renderCalendarWidget() {
  const monthLabel = calendarDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('calendarMonth').textContent = monthLabel;

  const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const weekdayOffset = start.getDay();
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((weekdayOffset + daysInMonth) / 7) * 7;
  const todayStr = getTodayInternal();
  const calRows = typeof isRecordSoftDeleted === 'function'
    ? records.filter(r => !isRecordSoftDeleted(r))
    : records.slice();
  const eventDates = new Set(
    calRows.map(r => normalizeDate(r.from)).filter(Boolean)
  );

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - weekdayOffset + 1;

    // ✅ FIX: Create timezone-safe date string (YYYY-MM-DD format)
    // Avoid using new Date().toISOString() which converts to UTC and can shift dates
    const year = calendarDate.getFullYear();
    const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayNumber).padStart(2, '0');
    const cellKey = `${year}-${month}-${day}`;

    const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const classes = ['cw-day'];

    if (!isCurrentMonth) {
      classes.push('other-month');
    }
    if (cellKey === todayStr && isCurrentMonth) {
      classes.push('today');
    }
    if (isCurrentMonth && eventDates.has(cellKey)) {
      classes.push('event');
    }
    if (isCurrentMonth && selectedDate === cellKey) {
      classes.push('selected');
    }

    cells.push(`<div class="${classes.join(' ')}" ${isCurrentMonth ? `data-date="${cellKey}"` : ''}>${isCurrentMonth ? dayNumber : ''}</div>`);
  }

  document.getElementById('calendarDays').innerHTML = cells.join('');
}
