// Photo/camera/upload logic module
// Handles all photo-related functionality: compression, upload, gallery, camera

// Global photo state variables (queuedPhotos is in state.js)
let currentImageGallery = [];
let currentImageIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

// Compress image for upload
async function compressImage(file) {
  log('compressImage started for:', file.name, 'Size:', file.size);
  return new Promise((resolve) => {
    // ✅ CRITICAL FIX: Never reject - always fallback to original file
    // Timeout the compression after 10 seconds to avoid hanging
    const compressionTimeout = setTimeout(() => {
      console.warn('⚠️ Compression timed out for:', file.name, '- using original file');
      resolve(file);
    }, 10000);

    const reader = new FileReader();
    reader.onerror = (error) => {
      console.warn('⚠️ FileReader error:', error, '- using original file');
      clearTimeout(compressionTimeout);
      resolve(file);
    };
    reader.onload = (e) => {
      log('FileReader loaded, creating image...');
      const img = new Image();
      img.onerror = (error) => {
        console.warn('⚠️ Image load error:', error, '- using original file');
        clearTimeout(compressionTimeout);
        resolve(file);
      };
      img.onload = () => {
        log('Image loaded. Original size:', img.width, 'x', img.height);

        try {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;

          // ✅ OPTIMIZATION: Reduced from 1200 to 900 for faster uploads
          const max = 900;
          if (w > h && w > max) {
            h = Math.round(h * (max / w));
            w = max;
          } else if (h > max) {
            w = Math.round(w * (max / h));
            h = max;
          }

          log('Resizing to:', w, 'x', h);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');

          ctx.imageSmoothingEnabled = true;
          if (ctx.imageSmoothingQuality !== undefined) {
            ctx.imageSmoothingQuality = 'high';
          }
          ctx.drawImage(img, 0, 0, w, h);

          // ✅ OPTIMIZATION: Reduced quality from 0.85 to 0.7 for smaller files
          // Still excellent quality for jewellery photos
          canvas.toBlob((blob) => {
            clearTimeout(compressionTimeout);
            if (blob) {
              log('✅ Compression complete. Final size:', blob.size);
              resolve(blob);
            } else {
              console.warn('⚠️ Failed to create blob - using original file');
              resolve(file);
            }
          }, 'image/jpeg', 0.7);
        } catch (e) {
          console.warn('⚠️ Canvas processing failed:', e, '- using original file');
          clearTimeout(compressionTimeout);
          resolve(file);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Open camera directly - no file picker
function openCamera() {
  const maxPhotos = LIMITS.MAX_PHOTOS;
  const remaining = maxPhotos - queuedPhotos.length;
  if (remaining <= 0) {
    toast(`⚠️ Maximum ${maxPhotos} photos reached`);
    return;
  }

  // Try Android Bridge burst capture first (3 photos in one session)
  if (window.AndroidCamera && typeof window.AndroidCamera.launchCameraBurst === 'function') {
    log('📸 Launching camera burst via Android Bridge:', remaining);
    window.AndroidCamera.launchCameraBurst(remaining);
    return;
  }

  if (window.AndroidCamera && typeof window.AndroidCamera.launchCamera === 'function') {
    log('📸 Launching camera via Android Bridge');
    window.AndroidCamera.launchCamera();
    return;
  }

  const cameraInput = document.getElementById('cameraInput');

  if (!cameraInput) {
    logError('cameraInput not found');
    return;
  }

  // Ensure correct attributes
  cameraInput.setAttribute('accept', 'image/*');
  cameraInput.setAttribute('capture', 'environment');

  try {
    cameraInput.click();
    log('📸 Camera input clicked');
  } catch (e) {
    logError('Camera open failed:', e);
    toast('❌ Camera access failed');
  }
}

// ✅ PERFORMANCE: Direct data URL to Blob conversion (no fetch overhead)
function dataURLToBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// ✅ PERFORMANCE FIX: Callback for native Android camera (receives optimized data URL)
window.handleCameraResult = async function(dataUrl) {
  console.log('📸 handleCameraResult called');
  console.log('   Data URL length:', dataUrl ? dataUrl.length : 0);
  
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    console.error('❌ Invalid data URL received');
    toast('❌ Camera capture failed');
    return;
  }
  
  if (queuedPhotos.length >= LIMITS.MAX_PHOTOS) {
    toast(`⚠️ Maximum ${LIMITS.MAX_PHOTOS} photos reached`);
    return;
  }
  
  toast("📸 Processing photo...");
  
  try {
    // ✅ PERFORMANCE: Direct conversion (no fetch overhead)
    const blob = dataURLToBlob(dataUrl);
    console.log('✅ Photo blob created. Size:', blob.size);
    
    // ✅ OPTIMIZATION: Skip JavaScript compression - already compressed in Java
    // Image is already resized to 900px and compressed to 70% quality natively
    const processedBlob = blob;
    console.log('✅ Photo ready. Final size:', processedBlob.size);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(processedBlob);
    
    // Add to queue
    queuedPhotos.push({
      name: `photo_${Date.now()}.jpg`,
      blob: processedBlob,
      previewUrl: previewUrl
    });
    
    console.log('✅ Photo added to queue. Total photos:', queuedPhotos.length);
    
    // Update UI
    renderQueuedPhotos();
    setUpMsg(`✅ ${queuedPhotos.length} photo(s) ready`, "green");
    toast(`✅ Photo ${queuedPhotos.length}/${LIMITS.MAX_PHOTOS} captured`);
    
  } catch (e) {
    console.error('❌ Failed to process camera photo:', e);
    toast('❌ Failed to process photo');
  }
};

// Trigger gallery for multiple selection
function triggerGallery() {
  document.getElementById('galleryInput').click();
}

// Handle single camera photo - optimized for quick successive captures
async function handleCameraPhoto(input) {
  console.log('handleCameraPhoto called');

  const files = input.files ? Array.from(input.files) : [];
  console.log('Files received:', files.length);

  input.value = '';

  if (files.length === 0) {
    console.error('No files received from camera input');
    return;
  }
  
  if (queuedPhotos.length >= LIMITS.MAX_PHOTOS) {
    toast(`⚠️ Maximum ${LIMITS.MAX_PHOTOS} photos reached`);
    return;
  }
  
  const file = files[0];
  console.log('Processing file:', file.name, 'Size:', file.size);
  toast("📸 Processing...");
  
  try {
    const processedBlob = await compressImage(file);
    console.log('✅ Photo processed. Size:', processedBlob.size);
    
    const previewUrl = URL.createObjectURL(processedBlob);

    queuedPhotos.push({
      name: file.name || `photo_${Date.now()}.jpg`,
      blob: processedBlob,
      previewUrl: previewUrl
    });
    
    console.log('Photo added to queue. Total photos:', queuedPhotos.length);
    renderQueuedPhotos();
    setUpMsg(`✅ ${queuedPhotos.length} photo(s) ready`, "green");
    toast(`✅ Photo ${queuedPhotos.length} added!`);
  } catch (e) {
    console.error("Critical photo processing error:", e);
    toast("❌ Error processing photo");
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

  const maxPhotos = LIMITS.MAX_PHOTOS;
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

      let processedBlob;
      try {
        processedBlob = await compressImage(file);
        console.log('Compressed to:', processedBlob.size);
      } catch (compressErr) {
        console.warn('Compression failed for', file.name, '- using original', compressErr);
        processedBlob = file; // Fallback
      }
      
      queuedPhotos.push({
        name: file.name || `photo_${Date.now()}.jpg`,
        blob: processedBlob,
        previewUrl: URL.createObjectURL(processedBlob)
      });
      processed++;
      setUpMsg(`⏳ Processed ${processed}/${files.length}...`, "orange");
    } catch (e) {
      console.error("Critical processing failed for", file.name, e);
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
    console.log('uploadPhotosInBackground: No photos to upload');
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
    const uploadedResults = await uploadPhotosWithConcurrency(photos, 2);

    console.log('───────────────────────────────────────────────');
    console.log(`📊 Upload Results: ${uploadedResults.length}/${photos.length} successful`);
    console.log('───────────────────────────────────────────────');

    if (uploadedResults.length > 0) {
      const recordIndex = records.findIndex(r => r.id === recordId);
      if (recordIndex !== -1) {
        const record = records[recordIndex];
        
        // Filter out uploads that the user deleted while in progress
        const validUploadedUrls = [];
        uploadedResults.forEach(u => {
          if (record.photoUrls.includes(u.previewUrl)) {
            validUploadedUrls.push(u.url);
          } else {
            console.log('🚫 Filtered out deleted upload URL:', u.url);
          }
        });

        // Get existing Cloudinary URLs from the record
        const existingUrls = record.photoUrls || '';
        const existingCloudinaryUrls = existingUrls.split('|')
          .filter(url => url.trim() && (url.startsWith('http://') || url.startsWith('https://')))
          .filter(url => !url.includes('blob:'));

        // Combine non-deleted new URLs with existing ones
        const allCloudinaryUrls = [...new Set([...existingCloudinaryUrls, ...validUploadedUrls])];
        const finalUrlString = allCloudinaryUrls.join('|');

        console.log('💾 Saving Cloudinary URLs to backend...');
        console.log('   Record ID:', recordId);
        console.log('   URLs:', finalUrlString);
        console.log('   Calling apiGet with action=updatePhoto');

        const updateRes = await apiGet('updatePhoto', { id: recordId, url: finalUrlString });
        console.log('📡 Backend updatePhoto response:', updateRes);

        if (updateRes.ok) {
          console.log('✅ Photos saved to backend successfully!');
          toast(`✅ ${validUploadedUrls.length} photo(s) uploaded!`);

          // Revoke blob URLs to free memory
          let revokedCount = 0;
          photos.forEach(photo => {
            if (photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(photo.previewUrl);
              revokedCount++;
              log('🧹 Revoked blob URL after upload:', photo.name);
            }
          });
          if (revokedCount > 0) {
            log(`✅ Cleaned up ${revokedCount} blob URLs after Cloudinary upload`);
          }

          // Update local record with final list of URLs
          records[recordIndex].photoUrls = finalUrlString;
          normalizePhotoUrlsField(records[recordIndex]);
          delete records[recordIndex]._hasPendingPhotos;
          delete records[recordIndex]._syncing;

          updateCache();
          renderHome();
          console.log('🔄 UI updated to show uploaded photos');

          if (triggerWhatsApp) {
            console.log('📱 Opening WhatsApp...');
            setTimeout(() => shareWhatsApp(records[recordIndex]), 300);
          }
        } else {
          console.error('❌ Failed to save photo URLs to backend:', updateRes.error);
          toast(`❌ Failed to save photos: ${updateRes.error}`);
        }
      } else {
        console.error('❌ Record not found in local array! ID:', recordId);
        console.error('   Available IDs:', records.map(r => r.id));
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
        uploaded.push({ previewUrl: photo.previewUrl, url: url });
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
  console.log(`📤 uploadSinglePhoto: Starting for ${photo.name}, size: ${photo.blob ? photo.blob.size : 'EMPTY'} bytes`);
  
  if (!photo.blob || photo.blob.size === 0) {
    console.error('❌ Photo blob is missing or zero bytes');
    return '';
  }
  
  const fd = new FormData();
  fd.append("file", photo.blob, photo.name);
  fd.append("upload_preset", CLOUD_PRESET);
  
  console.log(`🌐 POST: https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000); // 90s for slow uploads
  
  try {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const r = await fetch(uploadUrl, {
      method: "POST",
      body: fd,
      signal: controller.signal
    });
    clearTimeout(timeout);

    console.log(`📡 Status: ${r.status} ${r.statusText}`);
    const responseText = await r.text();
    console.log('📄 Raw Response:', responseText.substring(0, 500));
    
    if (!r.ok) {
      let errorMsg = `Upload failed (${r.status})`;
      try {
        const errJson = JSON.parse(responseText);
        if (errJson.error && errJson.error.message) errorMsg = errJson.error.message;
      } catch (e) {}
      console.error('❌ Cloudinary Error:', errorMsg);
      toast(`❌ Cloudinary: ${errorMsg}`);
      return '';
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('❌ Cloudinary returned non-JSON response:', responseText.substring(0, 200));
      toast('❌ Upload failed: unexpected server response');
      return '';
    }
    if (data.secure_url) {
      console.log('✅ Upload Successful:', data.secure_url);
      return data.secure_url;
    }
    
    console.error('❌ No secure_url in response');
    return '';
  } catch (e) {
    clearTimeout(timeout);
    const isTimeout = e.name === 'AbortError';
    console.error(`❌ Upload ${isTimeout ? 'Timeout' : 'Error'}:`, e.message);
    toast(`❌ Upload ${isTimeout ? 'Timeout' : 'Failed'}`);
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
  
  // ✅ FIX: Preserve existing photos section, only update queued photos
  const existingSection = document.getElementById('existingPhotosSection');
  
  // Clear only non-existing photo elements
  const children = Array.from(gallery.children);
  children.forEach(child => {
    if (child.id !== 'existingPhotosSection') {
      gallery.removeChild(child);
    }
  });
  
  // Show all queued photos in gallery
  queuedPhotos.forEach((photo, index) => {
    console.log(`Rendering photo ${index + 1}:`, photo.name, 'URL:', photo.previewUrl);
    const thumb = document.createElement('div');
    thumb.style.cssText = 'position:relative;border:2px solid var(--gold-border);border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1';
    thumb.innerHTML = `
      <img src="${photo.previewUrl}" style="width:100%;height:100%;object-fit:cover" loading="lazy" data-action="view-preview" data-index="${index}" onerror="console.error('Failed to load preview image:', this.src)">
      <button class="prm" style="position:absolute;top:5px;right:5px;width:28px;height:28px;font-size:1rem;background:rgba(122,0,0,0.9);color:white;border:none;border-radius:50%;cursor:pointer;font-weight:bold" data-action="remove-photo" data-index="${index}">✕</button>
      <div style="position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem">NEW ${index + 1}</div>
    `;
    gallery.appendChild(thumb);
  });

  console.log('Gallery rendered with', queuedPhotos.length, 'new photos');

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

// ✅ Render existing photos in edit mode with remove support
function renderExistingPhotosInForm(photoUrls) {
  const gallery = document.getElementById('addedPhotos');
  if (!gallery) return;

  const oldSection = document.getElementById('existingPhotosSection');
  if (oldSection) {
    oldSection.remove();
  }
  
  // Create a section for existing photos
  const existingSection = document.createElement('div');
  existingSection.id = 'existingPhotosSection';
  existingSection.style.cssText = 'margin-bottom:15px;padding:10px;background:rgba(218,165,32,0.1);border-radius:8px;border:1px solid var(--gold-border)';
  
  const header = document.createElement('div');
  header.style.cssText = 'font-size:0.9rem;color:var(--gold);margin-bottom:8px;font-weight:bold';
  header.textContent = `📷 Existing Photos (${photoUrls.length}) - Tap X to remove`;
  existingSection.appendChild(header);
  
  const photoGrid = document.createElement('div');
  photoGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px';
  
  photoUrls.forEach((url, index) => {
    const thumb = document.createElement('div');
    thumb.style.cssText = 'position:relative;border:2px solid var(--gold-border);border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1';
    thumb.innerHTML = `
      <img src="${url}" style="width:100%;height:100%;object-fit:cover" loading="lazy" data-action="open-image-viewer" data-url="${url}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage%20error%3C/text%3E%3C/svg%3E'">
      <button class="prm" style="position:absolute;top:5px;right:5px;width:28px;height:28px;font-size:1rem;background:rgba(122,0,0,0.9);color:white;border:none;border-radius:50%;cursor:pointer;font-weight:bold" data-action="remove-existing-photo" data-index="${index}">✕</button>
      <div style="position:absolute;bottom:3px;left:3px;background:rgba(0,0,0,0.7);color:white;padding:2px 4px;border-radius:3px;font-size:0.65rem">${index + 1}</div>
    `;
    photoGrid.appendChild(thumb);
  });
  
  existingSection.appendChild(photoGrid);
  
  // Insert at the top of the gallery
  gallery.insertBefore(existingSection, gallery.firstChild);
}

function removeExistingPhotoInEdit(index) {
  if (index < 0 || index >= editingExistingPhotos.length) return;
  editingExistingPhotos.splice(index, 1);
  renderExistingPhotosInForm(editingExistingPhotos);
  renderQueuedPhotos();
  const total = editingExistingPhotos.length + queuedPhotos.length;
  setUpMsg(`📷 ${total} photo(s) ready after edit`, total ? "blue" : "gray");
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

function openImageViewer(url, allPhotos = [url]) {
  currentImageGallery = allPhotos;
  currentImageIndex = allPhotos.indexOf(url);
  if (currentImageIndex === -1) currentImageIndex = 0;
  
  renderImageSlider();
  document.getElementById('imageViewerModal').classList.add('open');
  document.body.classList.add('modal-open');
  
  // Attach touch events for swiping
  const container = document.getElementById('imageSliderContainer');
  if (container) {
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
  }
}

function renderImageSlider() {
  const slider = document.getElementById('imageSlider');
  const counter = document.getElementById('imageCounter');
  const dots = document.getElementById('imageDots');
  
  // Render slides
  slider.innerHTML = currentImageGallery.map(url => 
    `<div class="image-slide"><img src="${url}" alt="Photo" loading="lazy"></div>`
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

// ✅ NEW: Card photo slider navigation (home cards with image carousel)
function navigateCardSlider(recordId, direction) {
  const container = document.querySelector(`.card-slider-container[data-id="${recordId}"]`);
  if (!container) return;

  const track = container.querySelector('.card-slider-track');
  const slides = container.querySelectorAll('.card-slide');
  const dots = container.querySelectorAll('.card-dot');
  const counter = container.querySelector('.card-slider-counter');

  if (slides.length === 0) return;

  // Get current index from data attribute or calculate
  let currentIdx = parseInt(container.dataset.currentSlide) || 0;

  // Navigate
  if (direction === 'next') {
    currentIdx = (currentIdx + 1) % slides.length;
  } else {
    currentIdx = (currentIdx - 1 + slides.length) % slides.length;
  }

  // Update container state
  container.dataset.currentSlide = currentIdx;

  // Update track position (smooth animation)
  track.style.transform = `translateX(-${currentIdx * 100}%)`;

  // Update active dot
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentIdx);
  });

  // Update counter
  if (counter && slides.length > 1) {
    counter.textContent = `${currentIdx + 1}/${slides.length}`;
  }
}

// ✅ Handle dot clicks in card slider
function handleCardDotClick(event) {
  const dot = event.target.closest('.card-dot');
  if (!dot) return;

  const container = dot.closest('.card-slider-container');
  if (!container) return;

  const dots = container.querySelectorAll('.card-dot');
  const targetIdx = Array.from(dots).indexOf(dot);

  if (targetIdx === -1) return;

  const track = container.querySelector('.card-slider-track');
  const counter = container.querySelector('.card-slider-counter');

  container.dataset.currentSlide = targetIdx;
  track.style.transform = `translateX(-${targetIdx * 100}%)`;

  dots.forEach((d, idx) => {
    d.classList.toggle('active', idx === targetIdx);
  });

  if (counter) {
    const slides = container.querySelectorAll('.card-slide');
    counter.textContent = `${targetIdx + 1}/${slides.length}`;
  }
}


function closeImageViewer() {
  const container = document.getElementById('imageSliderContainer');
  if (container) {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchend', handleTouchEnd);
  }

  document.getElementById('imageViewerModal').classList.remove('open');
  document.body.classList.remove('modal-open');
  
  setTimeout(() => {
    document.getElementById('imageSlider').innerHTML = '';
    currentImageGallery = [];
    currentImageIndex = 0;
  }, 300);
}

function setUpMsg(m, color){
  const e=document.getElementById('upMsg');
  e.textContent=m;
  e.style.color=color;
}

function clearPhoto(){
  // ✅ MEMORY LEAK FIX: Clean up blob URLs — but skip ones handed off to a saved record
  let revokedCount = 0;
  queuedPhotos.forEach(photo => {
    if (photo._handedOff) {
      log('⏭️ Skipping revoke for handed-off blob URL:', photo.name);
      return; // Don't revoke — still needed for display until Cloudinary upload
    }
    if (photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl);
      revokedCount++;
      log('🧹 Revoked blob URL:', photo.name);
    }
  });
  if (revokedCount > 0) {
    log(`✅ Cleaned up ${revokedCount} blob URLs`);
  }
  queuedPhotos=[];
  
  // ✅ FIX: Only clear queued photos, preserve existing photos section in edit mode
  const gallery = document.getElementById('addedPhotos');
  const existingSection = document.getElementById('existingPhotosSection');
  
  if (gallery) {
    if (existingSection) {
      // In edit mode: keep existing photos, only clear new photos
      const children = Array.from(gallery.children);
      children.forEach(child => {
        if (child.id !== 'existingPhotosSection') {
          gallery.removeChild(child);
        }
      });
    } else {
      // In add mode: clear everything
      gallery.innerHTML = '';
    }
  }
}
