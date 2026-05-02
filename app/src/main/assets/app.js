
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzWpt6cde0bTdIttlBhITtWDFVioh3q6sh6ADLNKHo0IVo4EK_j4hUyx9qPoFZLs91Q2Q/exec";
const SECRET_KEY = "ML_RENTALS_2024";
const CLOUD_NAME = "dcgfc7bse";
const CLOUD_PRESET = "mahalakshmi_jewellery";

let records = [];
let curFilter = 'all';
let calendarDate = new Date();
let selectedDate = new Date().toISOString().slice(0, 10); // ✅ FIXED: Initialize with today's date
let isUploading = false;
let uploadedUrl = '';
let uploadedPhotos = [];  // Legacy placeholder
let pendRet = null, pendDel = null;
let curDetailRecord = null;  // Store current detail record for WhatsApp
let currentEditId = null; // Track edit mode record id
let searchTimeout = null;  // For search debouncing
let queuedPhotos = []; // Pending compressed photos to upload after save

// INIT
const today = new Date().toISOString().split('T')[0];
document.getElementById('fFrom').value = today;
// ✅ FIXED: Ensure selectedDate is initialized before any render
selectedDate = today;
// Show selected date in header (Daybook style)
document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'});

let lastRecordCount = 0;
let lastSyncTime = 0;

// Initial load with feedback
console.log('App starting... Loading data from backend');
loadData().then(() => {
  console.log('Initial load complete');
  // ✅ FIXED: Set filter to 'all' and render (no double filtering)
  curFilter = 'all';
  renderHome();
}).catch((err) => {
  console.error('Initial load failed:', err);
  toast('⚠️ Failed to load initial data');
});

let isSyncing = false;

// ✅ PERFORMANCE: Removed auto-sync loop (was causing lag)
// Sync happens on: app load, manual sync button, after save/delete

async function apiGet(action, payload) {
  const url = SCRIPT_URL;
  try { 
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let options = {
      signal: controller.signal,
      cache: 'no-store'
    };

    if (payload) {
      const body = new URLSearchParams();
      body.append('key', SECRET_KEY);
      body.append('action', action);
      body.append('data', JSON.stringify(payload));
      body.append('_ts', String(Date.now()));
      options.method = 'POST';
      options.body = body;
    } else {
      options.method = 'GET';
      options.headers = { 'Cache-Control': 'no-cache' };
    }

    const requestUrl = payload
      ? url
      : `${SCRIPT_URL}?key=${SECRET_KEY}&action=${action}&_ts=${Date.now()}`;

    const r = await fetch(requestUrl, options); 
    clearTimeout(timeout);
    
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    
    return await r.json(); 
  }
  catch(e) { 
    if (e.name === 'AbortError') {
      return {ok:false, error:"Request Timeout - Check internet"}; 
    }
    return {ok:false, error: e.message || "Network Error"}; 
  }
}

async function loadData() {
  try {
    console.log('loadData: Starting fetch from:', SCRIPT_URL);
    const res = await apiGet('get');
    console.log('loadData: Response received:', res);
    
    if (res.ok) {
      console.log('loadData: Data is OK, records count:', res.data ? res.data.length : 0);
      
      // Check if new records were added
      if (records.length > 0 && res.data.length > lastRecordCount) {
        toast("📢 New record added!");
      }
      lastRecordCount = res.data.length;
      
      // ✅ PERFORMANCE: Pre-compute search text for each record
      records = res.data.map(r => {
        r._search = (
          (r.name || '') + 
          (r.phone || '') + 
          (r.address || '') + 
          (r.receiptNo || '')
        ).toLowerCase();
        return r;
      });
      
      lastSyncTime = Date.now();
      
      // ✅ FIXED: Ensure selectedDate is set before rendering
      selectedDate = selectedDate || new Date().toISOString().slice(0, 10);
      
      console.log('loadData: About to render. Records array:', records);
      renderHome(); 
      updateCounts();
      console.log(`✅ Loaded ${records.length} records successfully`);
    } else {
      console.error('loadData: Failed with error:', res.error);
      toast("⚠️ Failed to load data: " + res.error);
      // Still try to render existing data
      renderHome(); updateCounts();
    }
  } catch (e) {
    console.error('loadData: Exception caught:', e);
    toast("❌ Error loading data");
    // Still try to render existing data
    renderHome(); updateCounts();
  }
}

function updateCounts() {
  const activeCount = records.filter(r => r.status === 'active').length;
  const ovCount = records.filter(r => r.status === 'overdue').length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = records.filter(r => r.from === todayStr).length;

  document.getElementById('cntActive').textContent = activeCount;
  document.getElementById('cntOv').textContent = ovCount;
  document.getElementById('cntToday').textContent = todayCount;
}

// ✅ FIXED: Date normalization function to handle various date formats
function normalizeDate(d) {
  if (!d) return '';
  try {
    // Handle both YYYY-MM-DD and other formats
    const normalized = new Date(d + 'T00:00:00').toISOString().slice(0, 10);
    return normalized;
  } catch (e) {
    console.error('Date normalization error for:', d, e);
    return '';
  }
}

function renderHome() {
  console.log('renderHome: Called with', records.length, 'records');
  
  // ✅ FIXED: Ensure selectedDate is always set
  if (!selectedDate) {
    selectedDate = new Date().toISOString().slice(0, 10);
    console.warn('selectedDate was undefined, reset to today:', selectedDate);
  }
  
  // ✅ DEBUG: Log current state
  console.log('Selected Date:', selectedDate);
  if (records.length > 0) {
    console.log('Sample Record:', records[0]);
  }
  
  // Update header with selected date (Daybook style)
  const dateObj = new Date(selectedDate + 'T00:00:00');
  document.getElementById('headerDate').textContent = dateObj.toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'});
  
  // Apply search and filter
  const q = document.getElementById('srchQ').value.toLowerCase();
  let filtered = records;
  
  // ✅ FIXED: Only filter by status (removed 'today' filter to avoid conflict with Daybook)
  if (curFilter !== 'all') {
    filtered = filtered.filter(r => r.status === curFilter);
  }

  // ✅ FIXED: DAYBOOK FILTER with safe date handling
  filtered = filtered.filter(r => {
    if (!r.from) {
      console.warn('Record missing from date:', r);
      return false;
    }
    
    const from = normalizeDate(r.from);
    const to = r.to ? normalizeDate(r.to) : selectedDate;
    
    if (!from) {
      console.warn('Could not normalize from date:', r.from);
      return false;
    }
    
    const isActive = from <= selectedDate && to >= selectedDate;
    return isActive;
  });
  
  // ✅ PERFORMANCE: Use pre-computed search text
  if (q) {
    filtered = filtered.filter(r => r._search && r._search.includes(q));
  }
  
  // ✅ FIXED: FAILSAFE - If filter returns nothing but we have records, show all
  if (filtered.length === 0 && records.length > 0 && !q && curFilter === 'all') {
    console.warn('⚠️ Daybook filter returned 0 records, but we have', records.length, 'records. Showing all as failsafe.');
    filtered = records;
  }
  
  let html = filtered.map(r => cardHTML(r)).join('');

  if (!html || html.trim() === "") {
    let msg = "No records found.";
    let sub = "Try changing the filter or search.";

    if (selectedDate !== new Date().toISOString().slice(0, 10)) {
      msg = `📅 No Active Rentals on ${selectedDate}`;
      sub = "Select another date or add a new rental.";
    } else if (curFilter === 'overdue') {
      msg = "✅ Everything is On Time";
      sub = "Good job! No overdue records found.";
    } else if (curFilter === 'active') {
      msg = "💍 No Active Rentals";
      sub = "Records will appear once you add them.";
    } else if (curFilter === 'returned') {
      msg = "📦 No Returned Items";
      sub = "Returned items history is empty.";
    }

    html = `<div style="text-align:center; padding:40px; color:#777;">
      <h3>${msg}</h3>
      <p style="margin-top:8px; font-size:14px;">${sub}</p>
      <button class="add-big" onclick="go('add')" style="margin-top:20px; padding:12px; font-size:12px; width:auto; display:inline-flex;">✦ Add New Record ✦</button>
    </div>`;
  }

  const homeList = document.getElementById('homeList');
  
  if (homeList) {
    // ✅ PERFORMANCE: Only update DOM if content changed
    if (homeList.dataset.lastHtml !== html) {
      homeList.innerHTML = html;
      homeList.dataset.lastHtml = html;
    }
    renderCalendarWidget();
    console.log('renderHome: Showing', filtered.length, 'records for date:', selectedDate);
  } else {
    console.error('renderHome: homeList element not found!');
  }
}

function cardHTML(r) {
  const st = r.status;
  const cls = st === 'returned' ? 'returned' : (st === 'overdue' ? 'overdue' : '');
  const badge = st === 'returned' ? '<span class="rcard-badge badge-ret">Returned वापस</span>' : (st === 'overdue' ? '<span class="rcard-badge badge-ov">Overdue देरी</span>' : '<span class="rcard-badge badge-active">Active चालू</span>');
  
  const photos = getPhotosFromRecord(r);
  const hasPhotos = photos.length > 0;
  
  // ✅ PERFORMANCE: Show only first photo on home screen (no slider)
  let photoHTML = '';
  if (hasPhotos) {
    const firstPhoto = photos[0];
    photoHTML = `<div class="rcard-photo-single" onclick="event.stopPropagation(); openImageGallery(0, ${JSON.stringify(photos).replace(/"/g, '&quot;')})">
      <img src="${firstPhoto}" alt="Photo" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage%20error%3C/text%3E%3C/svg%3E'">
      ${photos.length > 1 ? `<div class="photo-count-badge">${photos.length} photos</div>` : ''}
    </div>`;
  }

  return `<div class="rcard ${cls}" onclick="openDetail('${r.id}')">
    <div class="rcard-top">
      <div class="rcard-icon ${st==='returned'?'ret-i':(st==='overdue'?'ov-i':'active-i')}">💍</div>
      <div class="rcard-info">
        <div class="rcard-name-row"><div class="rcard-name">${r.name}</div>${r.phone?`<a href="tel:${r.phone}" class="call-btn" onclick="event.stopPropagation()">📞</a>`:''}</div>
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
    <div class="rcard-meta">📅 ${r.from} to ${r.to}</div>
    <div class="rcard-user">User: ${r.user}</div>
    ${photoHTML}
    <div class="rcard-actions" onclick="event.stopPropagation()">
      ${st!=='returned' ? `<button class="ract ret" onclick="openRet('${r.id}','${r.name}')">Return</button>` : ''}
      <button class="ract edit" onclick="openEdit('${r.id}')">Edit</button>
      <button class="ract del" onclick="openDel('${r.id}')">Delete</button>
    </div>
  </div>`;
}

async function saveEntry(skipPhotos = false) {
  const name = document.getElementById('fName').value.trim();
  const user = document.getElementById('fUser').value.trim() || 'Worker';
  if (!name) return toast("⚠️ Enter Name!");
  
  const existingRecord = currentEditId ? records.find(x => x.id === currentEditId) : null;
  const clientRecordId = currentEditId || "R-" + Date.now();
  const hasQueuedPhotos = queuedPhotos.length > 0;

  const existingPreviewUrls = existingRecord ? (existingRecord.photoPreviewUrls || '') : '';
  const newPhotoLinks = hasQueuedPhotos && !skipPhotos ? queuedPhotos.map(p => p.previewUrl).join('|') : '';
  const combinedPreviewUrls = [...new Set((existingPreviewUrls + '|' + newPhotoLinks).split('|').map(x => x.trim()).filter(Boolean))].join('|');

  // ✅ CRITICAL FIX: Filter out blob URLs before saving to backend
  const cleanPreviewUrls = combinedPreviewUrls
    .split('|')
    .filter(url => {
      const isBlob = url.startsWith('blob:');
      if (isBlob) {
        console.warn('⚠️ Blob URL detected - NOT saving to backend:', url);
      }
      return !isBlob;
    })
    .join('|');

  // ✅ Safety check
  if (combinedPreviewUrls.includes('blob:')) {
    console.warn('🚫 Blob URLs detected in preview URLs - they will NOT be saved to backend');
    console.warn('   Blob URLs are temporary and only valid during this session');
    console.warn('   Photos will be uploaded to Cloudinary in background');
  }

  const data = {
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
    photoPreviewUrls: cleanPreviewUrls,  // ✅ FIXED: Only save non-blob URLs
    photoUrl: existingRecord ? existingRecord.photoUrl || '' : '',
    photoUrls: existingRecord ? existingRecord.photoUrls || '' : '',
    status: existingRecord ? existingRecord.status : 'active'
  };

  console.log('💾 saveEntry: Data to save:', {
    id: data.id,
    hasQueuedPhotos,
    queuedPhotosCount: queuedPhotos.length,
    photoPreviewUrls: data.photoPreviewUrls,
    photoUrl: data.photoUrl,
    photoUrls: data.photoUrls
  });

  const action = existingRecord ? 'edit' : 'add';
  const photosToUpload = (hasQueuedPhotos && !skipPhotos) ? [...queuedPhotos] : [];

  if (existingRecord) {
    Object.assign(existingRecord, data);
    renderHome();
    updateCounts();
    go('home');
    resetForm();
    toast("✅ Record updated");
  } else {
    records.unshift(data);
    renderHome();
    updateCounts();
    go('home');
    if (!hasQueuedPhotos || skipPhotos) {
      shareWhatsApp(data);
    } else {
      toast("✅ Saving and uploading photos before WhatsApp...");
    }
    resetForm();
  }

  console.log('📸 saveEntry: Photo upload check:');
  console.log('   hasQueuedPhotos:', hasQueuedPhotos);
  console.log('   skipPhotos:', skipPhotos);
  console.log('   queuedPhotos.length:', queuedPhotos.length);
  console.log('   photosToUpload.length:', photosToUpload.length);
  console.log('   photosToUpload:', photosToUpload);

  (async () => {
    try {
      showBgSync(true);
      const res = await apiGet(action, data);
      showBgSync(false);
      
      console.log('💾 saveEntry: Backend save result:', res);
      
      if (photosToUpload.length > 0) {
        console.log('Photos ready for upload:', photosToUpload.length);
        console.log('🚀 Forcing photo upload (independent of backend)');
        uploadPhotosInBackground(data.id, photosToUpload, true);
      } else {
        console.log('⚠️ saveEntry: No queued photos to upload');
      }
      if (res.ok && (!photosToUpload.length || skipPhotos) && existingRecord) {
        // no extra action needed for edit without new photos
      }
      if (!res.ok) {
        toast(`❌ ${existingRecord ? 'Update' : 'Save'} failed: ${res.error}`);
      }
    } catch (err) {
      showBgSync(false);
      console.error("Background sync error:", err);
    }
  })();
}

async function compressImage(file) {
  console.log('compressImage started for:', file.name, 'Size:', file.size);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
    reader.onload = (e) => {
      console.log('FileReader loaded, creating image...');
      const img = new Image();
      img.src = e.target.result;
      img.onerror = (error) => {
        console.error('Image load error:', error);
        reject(error);
      };
      img.onload = () => {
        console.log('Image loaded. Original size:', img.width, 'x', img.height);
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        
        // Ultra-fast compression - max 600px for speed
        const max = 600;
        if (w > h && w > max) { 
          h = Math.round(h * (max / w)); 
          w = max; 
        } else if (h > max) { 
          w = Math.round(w * (max / h)); 
          h = max; 
        }
        
        console.log('Resizing to:', w, 'x', h);
        canvas.width = w; 
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        
        // Fastest rendering
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);
        
        // Low quality for maximum speed - 0.5
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('Compression complete. Final size:', blob.size);
            resolve(blob);
          } else {
            console.error('Failed to create blob');
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.5);
      };
    };
  });
}

// Open camera directly - no file picker
function openCamera() {
  const input = document.getElementById('cameraInput');
  if (!input) {
    console.error('openCamera: camera input element not found');
    return;
  }

  input.value = '';
  input.setAttribute('capture', 'environment');
  input.setAttribute('accept', 'image/*');

  console.log('openCamera: launching camera input');
  input.click();
}

// Trigger gallery for multiple selection
function triggerGallery() {
  const input = document.getElementById('galleryInput');
  if (!input) {
    console.error('triggerGallery: gallery input element not found');
    return;
  }

  input.value = '';
  console.log('triggerGallery: launching gallery picker');
  input.click();
}

// Handle single camera photo - optimized for quick successive captures
async function handleCameraPhoto(input) {
  console.log('handleCameraPhoto called');

  // Clone the files list immediately to avoid it being cleared by successive captures
  const files = input.files ? Array.from(input.files) : [];
  console.log('Files received:', files.length);

  // Reset input IMMEDIATELY so the NEXT capture can start while we process this one
  input.value = '';

  if (files.length === 0) {
    console.error('No files received from camera input');
    return;
  }
  
  // Check limit
  if (queuedPhotos.length >= 10) {
    toast("⚠️ Maximum 10 photos reached");
    return;
  }
  
  // Quick processing - show immediate feedback
  const file = files[0];
  console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
  toast("📸 Processing...");
  
  try {
    const compressedBlob = await compressImage(file);
    console.log('Compressed blob size:', compressedBlob.size);
    
    const previewUrl = URL.createObjectURL(compressedBlob);

    queuedPhotos.push({
      name: file.name || `photo_${Date.now()}.jpg`,
      blob: compressedBlob,
      previewUrl: previewUrl
    });
    
    console.log('Photo added to queue. Total photos:', queuedPhotos.length);
    renderQueuedPhotos();
    setUpMsg(`✅ ${queuedPhotos.length} photo(s) ready`, "green");
    toast(`✅ Photo ${queuedPhotos.length} added!`);
  } catch (e) {
    console.error("Photo processing failed", e);
    toast("❌ Failed to process photo");
  }
}

// Handle multiple gallery photos
async function handleGalleryPhotos(input) {
  console.log('handleGalleryPhotos called');
  console.log('Files received:', input.files ? input.files.length : 0);
  await queueSelectedPhotos(input.files);
  input.value = '';
}

async function queueSelectedPhotos(fileList) {
  const files = Array.from(fileList || []);
  console.log('queueSelectedPhotos - files to process:', files.length);
  
  if (!files.length) {
    console.error('No files to process');
    toast("❌ No photos selected");
    return;
  }

  // Limit to 10 photos max (increased from 5)
  const maxPhotos = 10;
  if (queuedPhotos.length + files.length > maxPhotos) {
    const remaining = maxPhotos - queuedPhotos.length;
    if (remaining <= 0) {
      toast(`⚠️ Maximum ${maxPhotos} photos allowed. Remove some first.`);
      return;
    }
    toast(`⚠️ Adding ${remaining} photos (max ${maxPhotos} total)`);
    files.splice(remaining);
  }

  setUpMsg(`⏳ Processing ${files.length} photo(s)...`, "orange");
  
  let processed = 0;
  for (const file of files) {
    try {
      console.log('Processing file:', file.name, 'Size:', file.size);
      const compressedBlob = await compressImage(file);
      console.log('Compressed to:', compressedBlob.size);
      
      queuedPhotos.push({
        name: file.name || `photo_${Date.now()}.jpg`,
        blob: compressedBlob,
        previewUrl: URL.createObjectURL(compressedBlob)
      });
      processed++;
      setUpMsg(`⏳ Processed ${processed}/${files.length}...`, "orange");
    } catch (e) {
      console.error("Compression failed for", file.name, e);
      toast(`⚠️ Failed to process ${file.name}`);
    }
  }
  
  console.log('All files processed. Total in queue:', queuedPhotos.length);
  renderQueuedPhotos();
  setUpMsg(`✅ ${queuedPhotos.length} photo(s) ready`, "green");
  toast(`✅ ${processed} photo(s) added! Total: ${queuedPhotos.length}`);
}

async function uploadPhotosInBackground(recordId, photos, triggerWhatsApp = true) {
  if (!photos || photos.length === 0) {
    console.warn('No photos to upload');
    return;
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 CLOUDINARY UPLOAD STARTED');
  console.log(`   Record ID: ${recordId}`);
  console.log(`   Photos to upload: ${photos.length}`);
  console.log(`   Trigger WhatsApp: ${triggerWhatsApp}`);
  console.log('═══════════════════════════════════════════════');
  
  toast(`📤 Uploading ${photos.length} photo(s) to Cloudinary...`);

  try {
    const urls = await uploadPhotosWithConcurrency(photos, 2);

    console.log('───────────────────────────────────────────────');
    console.log(`📊 Upload Results: ${urls.length}/${photos.length} successful`);
    console.log('───────────────────────────────────────────────');

    if (urls.length > 0) {
      const urlString = urls.join('|');
      console.log('💾 Saving Cloudinary URLs to backend...');
      console.log('   URLs:', urlString);
      
      const updateRes = await apiGet('updatePhoto', { id: recordId, url: urlString });

      if (updateRes.ok) {
        console.log('✅ Photos saved to backend successfully!');
        toast(`✅ ${urls.length} photo(s) uploaded!`);
        
        // ✅ PERFORMANCE: Clean up blob URLs to free memory
        photos.forEach(photo => {
          if (photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photo.previewUrl);
          }
        });
        
        const recordIndex = records.findIndex(r => r.id === recordId);
        if (recordIndex !== -1) {
          records[recordIndex].photoUrl = urlString;
          records[recordIndex].photoUrls = urlString;
          records[recordIndex].photoPreviewUrls = '';
          console.log('✅ Record updated with Cloudinary URLs');
          renderHome();

          // Only trigger if requested (prevents double-sending if already sent at start)
          if (triggerWhatsApp) {
            console.log('📱 Opening WhatsApp...');
            setTimeout(() => shareWhatsApp(records[recordIndex]), 300);
          }
        }
      } else {
        console.error('❌ Failed to save photo URLs to backend:', updateRes.error);
        toast(`❌ Failed to save photos: ${updateRes.error}`);
      }
    } else {
      console.error('❌ ALL PHOTO UPLOADS FAILED - NO URLS RETURNED');
      console.error('   This means Cloudinary rejected all uploads');
      console.error('   Check the detailed error logs above');
      toast('❌ All uploads failed. Check console for details.');
    }
  } catch (e) {
    console.error('❌ BACKGROUND UPLOAD EXCEPTION:', e);
    toast(`❌ Upload error: ${e.message}`);
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('🏁 UPLOAD PROCESS COMPLETE');
  console.log('═══════════════════════════════════════════════');
}

async function uploadPhotosWithConcurrency(photos, limit) {
  console.log(`uploadPhotosWithConcurrency: Starting upload of ${photos.length} photos with concurrency ${limit}`);
  const uploaded = [];
  let index = 0;

  async function worker() {
    while (index < photos.length) {
      const currentIndex = index++;
      const photo = photos[currentIndex];
      console.log(`Worker uploading photo ${currentIndex + 1}:`, photo.name);
      // ✅ Use retry logic instead of direct upload
      const url = await uploadWithRetry(photo);
      if (url) {
        uploaded.push(url);
        console.log(`✅ Photo ${uploaded.length}/${photos.length} uploaded: ${url}`);
      } else {
        console.error(`❌ Photo ${currentIndex + 1} upload failed after all retries`);
      }
    }
  }

  const workers = [];
  const workerCount = Math.min(limit, photos.length);
  console.log(`Starting ${workerCount} workers`);
  for (let i = 0; i < workerCount; i++) workers.push(worker());
  await Promise.all(workers);
  
  console.log(`Upload complete. ${uploaded.length}/${photos.length} photos uploaded successfully`);
  return uploaded;
}

async function uploadSinglePhoto(photo) {
  console.log(`📤 uploadSinglePhoto: Starting upload for ${photo.name}, size: ${photo.blob?.size} bytes`);
  
  // ✅ Check internet connection first
  if (!navigator.onLine) {
    console.error('❌ No internet connection');
    toast('❌ No internet connection');
    return '';
  }
  
  if (!photo.blob) {
    console.error('❌ No blob found in photo object:', photo);
    toast('❌ Photo blob missing');
    return '';
  }
  
  const fd = new FormData();
  fd.append("file", photo.blob, photo.name);
  fd.append("upload_preset", CLOUD_PRESET);
  
  console.log(`🌐 Uploading to Cloudinary...`);
  console.log(`   Cloud Name: ${CLOUD_NAME}`);
  console.log(`   Preset: ${CLOUD_PRESET}`);
  console.log(`   File Size: ${photo.blob.size} bytes`);

  const controller = new AbortController();
  // ✅ Increased timeout to 60 seconds for slow connections
  const timeout = setTimeout(() => {
    console.error('⏱️ Upload timeout after 60 seconds');
    controller.abort();
  }, 60000);
  
  try {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    console.log(`🔗 Upload URL: ${uploadUrl}`);
    
    const r = await fetch(uploadUrl, {
      method: "POST",
      body: fd,
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    console.log(`📡 Response Status: ${r.status} ${r.statusText}`);
    
    // ✅ Log raw response for debugging
    const responseText = await r.text();
    console.log('📄 Raw response:', responseText);
    
    if (!r.ok) {
      console.error('❌ CLOUDINARY UPLOAD FAILED!');
      console.error('   Status:', r.status);
      console.error('   Status Text:', r.statusText);
      console.error('   Response Body:', responseText);
      
      // Parse error if JSON
      try {
        const errorJson = JSON.parse(responseText);
        console.error('   Error Details:', errorJson);
        if (errorJson.error && errorJson.error.message) {
          toast(`❌ Cloudinary: ${errorJson.error.message}`);
        } else {
          toast(`❌ Cloudinary error: ${r.status}`);
        }
      } catch (e) {
        toast(`❌ Cloudinary error: ${r.status} - ${responseText.substring(0, 50)}`);
      }
      
      return '';
    }
    
    const d = JSON.parse(responseText);
    console.log('✅ Upload response received:', d);
    
    if (d.secure_url) {
      console.log(`✅ SUCCESS! Cloudinary URL: ${d.secure_url}`);
      return d.secure_url;
    } else {
      console.error('❌ No secure_url in response:', d);
      toast('❌ No URL in Cloudinary response');
      return '';
    }
  } catch (e) {
    clearTimeout(timeout);
    console.error('❌ UPLOAD EXCEPTION!');
    console.error('   Error Name:', e.name);
    console.error('   Error Message:', e.message);
    console.error('   Full Error:', e);
    
    if (e.name === 'AbortError') {
      console.error('⏱️ Upload was aborted (timeout)');
      toast('❌ Upload timeout - Check internet');
    } else if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      console.error('🌐 Network error - No internet connection');
      toast('❌ No internet connection');
    } else {
      toast(`❌ Upload failed: ${e.message}`);
    }
    return '';
  }
}

// ✅ NEW: Retry logic for failed uploads
async function uploadWithRetry(photo, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    console.log(`🔁 Upload attempt ${i + 1}/${retries + 1} for ${photo.name}`);
    const url = await uploadSinglePhoto(photo);
    if (url) {
      console.log(`✅ Upload succeeded on attempt ${i + 1}`);
      return url;
    }
    if (i < retries) {
      console.log(`⏳ Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.error(`❌ All ${retries + 1} upload attempts failed for ${photo.name}`);
  toast(`❌ Upload failed after ${retries + 1} attempts - check console`);
  return '';
}

function renderQueuedPhotos() {
  console.log('renderQueuedPhotos called. Photos in queue:', queuedPhotos.length);
  const gallery = document.getElementById('addedPhotos');
  
  if (!gallery) {
    console.error('Gallery element not found!');
    return;
  }
  
  gallery.innerHTML = '';
  
  // Show all photos in gallery (not just from index 1)
  queuedPhotos.forEach((photo, index) => {
    console.log(`Rendering photo ${index + 1}:`, photo.name, 'URL:', photo.previewUrl);
    const thumb = document.createElement('div');
    thumb.style.cssText = 'position:relative;border:2px solid var(--gold-border);border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1';
    thumb.innerHTML = `
      <img src="${photo.previewUrl}" style="width:100%;height:100%;object-fit:cover" onclick="viewPhotoPreview(${index})" onerror="console.error('Failed to load preview image:', this.src)">
      <button class="prm" style="position:absolute;top:5px;right:5px;width:28px;height:28px;font-size:1rem;background:rgba(122,0,0,0.9);color:white;border:none;border-radius:50%;cursor:pointer;font-weight:bold" onclick="removePhoto(${index})">✕</button>
      <div style="position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem">${index + 1}</div>
    `;
    gallery.appendChild(thumb);
  });

  console.log('Gallery rendered with', queuedPhotos.length, 'photos');

  // Show/hide skip photos button
  const skipBtn = document.getElementById('skipPhotosBtn');
  if (skipBtn) {
    if (queuedPhotos.length > 0) {
      skipBtn.style.display = 'block';
    } else {
      skipBtn.style.display = 'none';
    }
  }
}

function viewPhotoPreview(index) {
  if (queuedPhotos[index]) {
    openImageViewer(queuedPhotos[index].previewUrl);
  }
}

function removePhoto(index) {
  const removed = queuedPhotos.splice(index, 1)[0];
  // ✅ PERFORMANCE: Clean up blob URL to free memory
  if (removed && removed.previewUrl && removed.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(removed.previewUrl);
  }
  renderQueuedPhotos();
  const msg = queuedPhotos.length ? `${queuedPhotos.length} photo(s) ready` : 'No photos';
  setUpMsg(msg, queuedPhotos.length ? "green" : 'gray');
  toast(`📸 ${queuedPhotos.length} photo(s) remaining`);
}


function prepAdd() {
  resetForm();
  document.getElementById('fReceipt').value = "";
  go('add');
}

// 🔧 DIAGNOSTIC: Test Cloudinary upload directly
window.testCloudinaryUpload = async function() {
  console.log('═══════════════════════════════════════════════');
  console.log('🧪 CLOUDINARY DIAGNOSTIC TEST');
  console.log('═══════════════════════════════════════════════');
  console.log('Configuration:');
  console.log('   CLOUD_NAME:', CLOUD_NAME);
  console.log('   CLOUD_PRESET:', CLOUD_PRESET);
  console.log('   Upload URL:', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
  console.log('───────────────────────────────────────────────');
  
  // Create a tiny test image (1x1 red pixel)
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 1, 1);
  
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      console.log('✅ Test image created (1x1 pixel, size:', blob.size, 'bytes)');
      
      const fd = new FormData();
      fd.append("file", blob, "test.jpg");
      fd.append("upload_preset", CLOUD_PRESET);
      
      console.log('📤 Sending test upload...');
      
      try {
        const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: fd
        });
        
        console.log('📡 Response Status:', r.status, r.statusText);
        
        const responseText = await r.text();
        console.log('📄 Response Body:', responseText);
        
        if (r.ok) {
          const data = JSON.parse(responseText);
          console.log('✅ SUCCESS! Upload worked!');
          console.log('   Cloudinary URL:', data.secure_url);
          console.log('───────────────────────────────────────────────');
          console.log('✅ CLOUDINARY IS CONFIGURED CORRECTLY');
          console.log('═══════════════════════════════════════════════');
          toast('✅ Cloudinary test passed!');
          resolve(true);
        } else {
          console.error('❌ UPLOAD FAILED');
          try {
            const errorData = JSON.parse(responseText);
            console.error('   Error:', errorData);
            if (errorData.error && errorData.error.message) {
              console.error('   Message:', errorData.error.message);
              toast(`❌ Test failed: ${errorData.error.message}`);
            }
          } catch (e) {
            console.error('   Raw error:', responseText);
          }
          console.log('───────────────────────────────────────────────');
          console.log('❌ CLOUDINARY CONFIGURATION ISSUE');
          console.log('   Check preset name and settings');
          console.log('═══════════════════════════════════════════════');
          resolve(false);
        }
      } catch (e) {
        console.error('❌ NETWORK ERROR:', e);
        console.log('───────────────────────────────────────────────');
        console.log('❌ CANNOT REACH CLOUDINARY');
        console.log('   Check internet connection');
        console.log('═══════════════════════════════════════════════');
        toast('❌ Network error: ' + e.message);
        resolve(false);
      }
    }, 'image/jpeg', 0.8);
  });
};

// Test Cloudinary upload directly
// UTILS
function go(s){
  document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
  document.getElementById('s-'+s).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('on'));
  document.getElementById('n-'+s).classList.add('on');
}

function calcBal(){
  const t=document.getElementById('fTotal').value||0, a=document.getElementById('fAdvance').value||0;
  document.getElementById('fBalance').value=t-a;
}

function filterRecords(f) {
  selectedDate = new Date().toISOString().slice(0, 10); // Reset to today
  curFilter = f;
  renderHome();
}

function setF(el,f){
  selectedDate = new Date().toISOString().slice(0, 10); // Reset to today
  curFilter=f;
  document.querySelectorAll('.fchip').forEach(x=>x.classList.remove('on'));
  el.classList.add('on'); renderHome();
}

function renderCalendarWidget() {
  const monthLabel = calendarDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('calendarMonth').textContent = monthLabel;

  const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const weekdayOffset = start.getDay();
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((weekdayOffset + daysInMonth) / 7) * 7;
  const todayStr = new Date().toISOString().slice(0, 10);
  const eventDates = new Set(records.flatMap(r => [r.from, r.to]).filter(Boolean));

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - weekdayOffset + 1;
    const cellDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayNumber);
    const cellKey = cellDate.toISOString().slice(0, 10);
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

function changeCalendarMonth(offset) {
  calendarDate.setMonth(calendarDate.getMonth() + offset);
  renderCalendarWidget();
}

function selectCalendarDate(dateStr) {
  selectedDate = dateStr; // Set the selected date (Daybook style)
  document.getElementById('srchQ').value = ''; // Clear search
  curFilter = 'all'; // Reset filter to show all statuses
  renderHome(); // Re-render with new date filter
}

function updateSliderDots(el) {
  const index = Math.round(el.scrollLeft / el.offsetWidth);
  const dots = el.parentElement.querySelectorAll('.s-dot');
  if (dots.length > 0) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }
}

function toast(m){
  const t=document.getElementById('toastEl');
  t.textContent=m; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

function showSpin(b){ document.getElementById('ovSpin').classList.toggle('show',b); }

function showBgSync(show) {
  let el = document.getElementById('bgSync');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bgSync';
    el.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 9999;
      display: none;
    `;
    el.innerText = "⏳ Syncing...";
    document.body.appendChild(el);
  }
  el.style.display = show ? 'block' : 'none';
}

function setUpMsg(m, color){
  const e=document.getElementById('upMsg');
  e.textContent=m;
  e.style.color=color;
}

function clearPhoto(){
  // ✅ PERFORMANCE: Clean up all blob URLs to free memory
  queuedPhotos.forEach(photo => {
    if (photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl);
    }
  });
  queuedPhotos=[];
  document.getElementById('addedPhotos').innerHTML = '';
  document.getElementById('upMsg').textContent = '';
}

function openRet(id,n){
  pendRet=id;
  document.getElementById('mRetMsg').textContent=n;
  document.getElementById('mReturn').classList.add('open');
}

function openDel(id){ pendDel=id; document.getElementById('mDelete').classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }

async function apiCall(action, id) {
  let url = SCRIPT_URL + '?key=' + SECRET_KEY + '&action=' + action + '&id=' + encodeURIComponent(id) + '&_ts=' + Date.now();
  try { 
    const r = await fetch(url, { cache: 'no-store' }); 
    return await r.json(); 
  } catch(e) { 
    return {ok:false, error:"Network Error"}; 
  }
}

async function doReturn(){ 
  closeM('mReturn'); 
  
  // Optimistic UI: Update status immediately
  const returnedId = pendRet;
  const returnedIndex = records.findIndex(r => r.id === returnedId);
  let originalRecord = null;
  
  if (returnedIndex !== -1) {
    originalRecord = {...records[returnedIndex]}; // Backup
    records[returnedIndex].status = 'returned'; // Update status
    renderHome();
    updateCounts();
    toast("Marking as returned...");
  }
  
  // Backend update
  const res = await apiCall('return', returnedId); 
  
  if (res.ok) {
    toast("✅ Returned");
    loadData(); // Sync with backend
  } else {
    // Rollback on failure
    if (originalRecord && returnedIndex !== -1) {
      records[returnedIndex] = originalRecord;
      renderHome();
      updateCounts();
    }
    toast("❌ Return failed: " + res.error);
  }
}
async function doDelete(){
closeM('mDelete');

const deletedId = pendDel;

// 🔥 STEP 1: Remove from UI immediately
const index = records.findIndex(r => r.id === deletedId);
let backup = null;

if (index !== -1) {
backup = {...records[index]};
records.splice(index, 1);
renderHome();
updateCounts();
}

toast("🗑️ Deleted");

// 🔥 STEP 2: Call backend in background
const res = await apiCall('delete', deletedId);

if (!res.ok) {
// ❌ rollback if failed
if (backup) {
records.unshift(backup);
renderHome();
updateCounts();
}
toast("❌ Delete failed: " + res.error);
}
}

function resetForm(){
  ['fName','fPhone','fAddress','fReceipt','fTotal','fAdvance','fBalance','fDeposit','fUser','fJewel'].forEach(id=>{
    const e=document.getElementById(id);
    if(e && id !== 'fJewel') e.value='';
  });
  document.getElementById('fJewel').value = 'Necklace';
  document.querySelectorAll('.jo').forEach(x=>x.classList.remove('sel'));
  document.querySelector('.jo[data-v="Necklace"]').classList.add('sel');
  clearPhoto();
  uploadedPhotos = [];
  currentEditId = null;
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.textContent = '✦ Save Record (सुरक्षित करें) ✦';
}

// Detail Modal Functions
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
    📅 Pickup: ${r.from || '-'}<br>
    🔄 Return: ${r.to || 'Not returned'}
  </div>

  <hr style="border:0; border-top:1px solid #E8D8A0; margin:10px 0;"/>

  <div style="margin-top:10px;">
    📸 Photos:
    <div style="position:relative;">
      <div class="img-slider" style="margin-top:6px;" onscroll="updateSliderDots(this)">
        ${photos.map(p => `<img src="${p}" style="width:100%; height:200px; object-fit:cover; border-radius:8px; scroll-snap-align:center;" onclick="viewFullPhoto('${p.replace(/'/g, "\\'")}')">`).join('')}
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
  clearPhoto();
  queuedPhotos = [];
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.textContent = '✦ Update Record (अपडेट करें) ✦';
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
  document.body.classList.remove('modal-open');
}

async function deletePhotoFromRecord(recordId, photoUrl) {
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
    const updatedPhotos = allPhotos.filter(url => url !== photoUrl);
    
    // Update the record with new photo URLs
    const newPhotoString = updatedPhotos.join('|');
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

function getPhotosFromRecord(r) {
  if (!r) return [];
  
  const photos = [];
  if (r.photoPreviewUrls) {
    const urls = String(r.photoPreviewUrls).split('|').map(x => x.trim()).filter(Boolean);
    photos.push(...urls);
  }
  if (r.photoUrls) {
    const urls = String(r.photoUrls).split('|').map(x => x.trim()).filter(Boolean);
    photos.push(...urls);
  }
  if (r.photoUrl) {
    const urls = String(r.photoUrl).split('|').map(x => x.trim()).filter(Boolean);
    photos.push(...urls);
  }

  // Debug: Log what URLs we found
  if (photos.length > 0) {
    console.log('getPhotosFromRecord - Found URLs:', photos);
  }

  // Remove duplicates and filter for real Cloudinary links
  return [...new Set(photos)].filter(isValidPhotoUrl);
}

function isValidPhotoUrl(url) {
  if (!url) return false;
  const s = String(url).trim();
  
  // Don't allow blob URLs in saved records (they're temporary)
  if (s.startsWith('blob:')) {
    console.warn('Blob URL found in saved record (should be Cloudinary URL):', s);
    return false;
  }
  
  // Filter out placeholder markers
  if (s.toUpperCase() === 'PENDING' || s === 'undefined' || s === 'null') return false;
  
  // Must be a real URL (http/https)
  return (s.startsWith('http://') || s.startsWith('https://')) && !s.includes(' ');
}

function getPrimaryPhoto(r) {
  const photos = getPhotosFromRecord(r);
  return photos.length ? photos[0] : '';
}

function openImageGallery(startIndex, photosArray) {
  const photos = Array.isArray(photosArray) ? photosArray : [photosArray];
  openImageViewer(photos[startIndex] || photos[0], photos);
}

function viewFullPhoto(url) {
  openImageViewer(url, [url]);
}

function viewPhotoPreview(index) {
  if (queuedPhotos[index]) {
    const allUrls = queuedPhotos.map(p => p.previewUrl);
    openImageViewer(queuedPhotos[index].previewUrl, allUrls);
  }
}

let currentImageGallery = [];
let currentImageIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

function openImageViewer(url, allPhotos = [url]) {
  currentImageGallery = allPhotos;
  currentImageIndex = allPhotos.indexOf(url);
  if (currentImageIndex === -1) currentImageIndex = 0;
  
  renderImageSlider();
  document.getElementById('imageViewerModal').classList.add('open');
  document.body.classList.add('modal-open');
  
  // Add touch event listeners
  const container = document.getElementById('imageSliderContainer');
  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
}

function renderImageSlider() {
  const slider = document.getElementById('imageSlider');
  const counter = document.getElementById('imageCounter');
  const dots = document.getElementById('imageDots');
  
  // Render slides
  slider.innerHTML = currentImageGallery.map(url => 
    `<div class="image-slide"><img src="${url}" alt="Photo"></div>`
  ).join('');
  
  // Update counter
  counter.textContent = `${currentImageIndex + 1} / ${currentImageGallery.length}`;
  
  // Render dots
  if (currentImageGallery.length > 1) {
    dots.innerHTML = currentImageGallery.map((_, i) => 
      `<div class="image-dot ${i === currentImageIndex ? 'active' : ''}"></div>`
    ).join('');
    dots.style.display = 'flex';
  } else {
    dots.style.display = 'none';
  }
  
  // Set slider position - faster transition
  slider.style.transform = `translateX(-${currentImageIndex * 100}%)`;
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0 && currentImageIndex < currentImageGallery.length - 1) {
      // Swipe left - next image
      currentImageIndex++;
      renderImageSlider();
    } else if (diff < 0 && currentImageIndex > 0) {
      // Swipe right - previous image
      currentImageIndex--;
      renderImageSlider();
    }
  }
}

function closeImageViewer() {
  const container = document.getElementById('imageSliderContainer');
  container.removeEventListener('touchstart', handleTouchStart);
  container.removeEventListener('touchend', handleTouchEnd);
  
  document.getElementById('imageViewerModal').classList.remove('open');
  document.body.classList.remove('modal-open');
  
  setTimeout(() => {
    document.getElementById('imageSlider').innerHTML = '';
    currentImageGallery = [];
    currentImageIndex = 0;
  }, 300);
}

function printRecord() {
  window.print();
}
function formatWhatsAppPhone(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return '';
  if (cleanPhone.length === 10) return '91' + cleanPhone;
  if (cleanPhone.startsWith('91') && cleanPhone.length >= 12) return cleanPhone;
  return cleanPhone;
}

function buildWhatsAppMessage(record) {
  const photos = getPhotosFromRecord(record).filter(url => url && url !== 'PENDING');
  const lines = [
    '*Mahalakshmi Rentals*',
    '',
    'Rental Details',
    '',
    `Customer: ${record.name || '-'}` ,
    `Phone: ${record.phone || '-'}` ,
    `Address: ${record.address || '-'}` ,
    `Receipt No: ${record.receiptNo || '-'}` ,
    `Item: ${record.jewel || '-'}` ,
    `Total: Rs. ${record.total || 0}` ,
    `Advance: Rs. ${record.advance || 0}` ,
    `Balance: Rs. ${record.balance || 0}` ,
    `Deposit: Rs. ${record.deposit || 0}` ,
    `Pickup: ${record.from || '-'}` ,
    `Return: ${record.to || '-'}` ,
    `Handled By: ${record.user || 'Worker'}`
  ];

  if (photos.length) {
    lines.push('', '*Photos:*');
    photos.forEach((url, i) => {
      lines.push(`${i + 1}. ${url}`);
    });
  }

  lines.push('', 'Thank you for choosing Mahalakshmi Rentals.');
  return lines.join('\n');
}

function shareWhatsApp(record) {
  if (!record) return;

  const msg = buildWhatsAppMessage(record);
  const encodedMsg = encodeURIComponent(msg);
  const phone = formatWhatsAppPhone(record.phone);

  const url = phone
    ? `https://wa.me/${phone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  // Use location.href for reliable "auto-share" in WebViews
  window.location.href = url;
}


function pickJ(el){
  document.querySelectorAll('.jo').forEach(x=>x.classList.remove('sel'));
  el.classList.add('sel');
  const input = document.getElementById('fJewel');
  input.value=el.dataset.v;
  input.blur(); // Remove cursor focus
}

function debounceSearch(){
  const q = document.getElementById('srchQ').value.trim();
  if (q.length) selectedDate = new Date().toISOString().slice(0, 10); // Reset to today when searching
  clearTimeout(searchTimeout);
  // ✅ PERFORMANCE: Debounce render to avoid lag during typing
  searchTimeout = setTimeout(renderHome, 300);
}

function syncData(){ 
  const btn = document.querySelector('.hd-sync');
  
  // Prevent rapid clicking (debounce)
  if (btn.disabled) return;
  
  btn.style.animation = 'spin 0.8s linear';
  btn.disabled = true;
  btn.textContent = '⟳ Syncing...';
  
  loadData().then(()=>{
    btn.style.animation = 'none';
    btn.disabled = false;
    btn.textContent = '⟳ Sync (सिंक)';
    setTimeout(() => { btn.style.animation = ''; }, 10);
    toast("✅ Data synced!"); 
  }).catch((err) => {
    btn.disabled = false;
    btn.textContent = '⟳ Sync (सिंक)';
    toast("❌ Sync failed!");
  });
}

// Card photo slider functions
// Handle Android back button
window.handleBackButton = function() {
  // Check if image viewer is open
  if (document.getElementById('imageViewerModal').classList.contains('open')) {
    closeImageViewer();
    return true;
  }
  
  // Check if detail modal is open
  if (document.getElementById('detailModal').classList.contains('open')) {
    closeDetail();
    return true;
  }
  
  // Check if any other modal is open
  if (document.getElementById('mReturn').classList.contains('open')) {
    closeM('mReturn');
    return true;
  }
  
  if (document.getElementById('mDelete').classList.contains('open')) {
    closeM('mDelete');
    return true;
  }
  
  // Check if on add screen, go back to home
  if (document.getElementById('s-add').classList.contains('active')) {
    go('home');
    return true;
  }
  
  // Let Android handle it (exit app)
  return false;
};

// Photo Slider Functions

function initApp() {
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) syncBtn.addEventListener('click', syncData);

  const homeBtn = document.getElementById('n-home');
  if (homeBtn) homeBtn.addEventListener('click', () => go('home'));

  const addBtn = document.getElementById('n-add');
  if (addBtn) addBtn.addEventListener('click', prepAdd);

  const addBigBtn = document.getElementById('addBigBtn');
  if (addBigBtn) addBigBtn.addEventListener('click', prepAdd);

  const searchInput = document.getElementById('srchQ');
  if (searchInput) searchInput.addEventListener('input', debounceSearch);

  renderCalendarWidget();

  const filterWrapper = document.querySelector('.filter-chips');
  if (filterWrapper) {
    filterWrapper.addEventListener('click', (e) => {
      const chip = e.target.closest('.fchip');
      if (!chip) return;
      setF(chip, chip.dataset.f);
    });
  }

  const prevMonthBtn = document.getElementById('prevMonth');
  if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeCalendarMonth(-1));

  const nextMonthBtn = document.getElementById('nextMonth');
  if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeCalendarMonth(1));

  const calendarDays = document.getElementById('calendarDays');
  if (calendarDays) {
    calendarDays.addEventListener('click', (e) => {
      const dayEl = e.target.closest('.cw-day');
      if (!dayEl || !dayEl.dataset.date) return;
      selectCalendarDate(dayEl.dataset.date);
    });
  }

  const totalInput = document.getElementById('fTotal');
  const advanceInput = document.getElementById('fAdvance');
  [totalInput, advanceInput].forEach((el) => {
    if (el) el.addEventListener('input', calcBal);
  });

  const jewelGrid = document.getElementById('jewPick');
  if (jewelGrid) {
    jewelGrid.addEventListener('click', (e) => {
      const tile = e.target.closest('.jo');
      if (!tile) return;
      pickJ(tile);
    });
  }

  const cameraBtn = document.getElementById('cameraBtn');
  if (cameraBtn) cameraBtn.addEventListener('click', openCamera);

  const galleryBtn = document.getElementById('galleryBtn');
  if (galleryBtn) galleryBtn.addEventListener('click', triggerGallery);

  const cameraInput = document.getElementById('cameraInput');
  if (cameraInput) cameraInput.addEventListener('change', function() { handleCameraPhoto(this); });

  const galleryInput = document.getElementById('galleryInput');
  if (galleryInput) galleryInput.addEventListener('change', function() { handleGalleryPhotos(this); });

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.addEventListener('click', () => saveEntry());

  const skipPhotosBtn = document.getElementById('skipPhotosBtn');
  if (skipPhotosBtn) skipPhotosBtn.addEventListener('click', () => saveEntry(true));

  const mReturnCancel = document.getElementById('mReturnCancel');
  if (mReturnCancel) mReturnCancel.addEventListener('click', () => closeM('mReturn'));

  const mReturnOk = document.getElementById('mReturnOk');
  if (mReturnOk) mReturnOk.addEventListener('click', doReturn);

  const mDeleteCancel = document.getElementById('mDeleteCancel');
  if (mDeleteCancel) mDeleteCancel.addEventListener('click', () => closeM('mDelete'));

  const mDeleteOk = document.getElementById('mDeleteOk');
  if (mDeleteOk) mDeleteOk.addEventListener('click', doDelete);

  const imageViewerClose = document.getElementById('imageViewerClose');
  if (imageViewerClose) imageViewerClose.addEventListener('click', closeImageViewer);

  const detailCloseBtn = document.getElementById('detailCloseBtn');
  if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetail);

  const detailCloseActionBtn = document.getElementById('detailCloseActionBtn');
  if (detailCloseActionBtn) detailCloseActionBtn.addEventListener('click', closeDetail);

  const detailWhatsAppBtn = document.getElementById('detailWhatsAppBtn');
  if (detailWhatsAppBtn) detailWhatsAppBtn.addEventListener('click', () => shareWhatsApp(curDetailRecord));

  const detailEditBtn = document.getElementById('detailEditBtn');
  if (detailEditBtn) detailEditBtn.addEventListener('click', () => {
    if (curDetailRecord) openEdit(curDetailRecord.id);
  });

  const detailPrintBtn = document.getElementById('detailPrintBtn');
  if (detailPrintBtn) detailPrintBtn.addEventListener('click', printRecord);
}

// Add touch support and swipe navigation
document.addEventListener('DOMContentLoaded', function() {
  initApp();

  // Swipe Navigation
  let touchStartX = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, {passive:true});

  document.addEventListener('touchend', e => {
    // Don't swipe if we are inside an image slider
    if (e.target.closest('.img-slider') || e.target.closest('.image-slider-container')) return;

    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 120) { // Threshold for swipe
      if (diff > 0) go('add'); // Swipe left -> New
      else go('home'); // Swipe right -> Home
    }
  }, {passive:true});
});

