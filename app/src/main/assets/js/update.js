// ============================================================================
// 🔄 GITHUB AUTO-UPDATE MODULE
// ============================================================================

async function checkUpdatesManual() {
  console.log('🔄 Checking for updates from GitHub...');
  toast('🔍 Checking for updates...');

  try {
    const response = await fetch('https://api.github.com/repos/prajwalpatil392/Mahalakshmi-Imitation-Jewellery/releases/latest');
    if (!response.ok) {
      throw new Error('Could not fetch release info from GitHub');
    }

    const release = await response.json();
    const serverTag = String(release.tag_name || '').trim();
    if (!serverTag) {
      toast('⚠️ No release found on GitHub.');
      return;
    }

    // Get local version
    let localTag = '1.0';
    if (window.AndroidCamera && typeof window.AndroidCamera.getAppVersionName === 'function') {
      localTag = window.AndroidCamera.getAppVersionName();
    }

    console.log(`Version comparison: Local=${localTag}, Server=${serverTag}`);

    // Parse versions (strip 'v' prefix)
    const localClean = localTag.replace(/^v/i, '');
    const serverClean = serverTag.replace(/^v/i, '');

    if (localClean === serverClean) {
      toast(`✅ App is up to date (v${localTag})`);
      return;
    }

    // Find APK asset
    const apkAsset = (release.assets || []).find(asset => asset.name && asset.name.endsWith('.apk'));
    if (!apkAsset || !apkAsset.browser_download_url) {
      toast('⚠️ Update found, but no APK file is attached to the GitHub release.');
      return;
    }

    const downloadUrl = apkAsset.browser_download_url;
    showUpdatePrompt(serverTag, downloadUrl);

  } catch (error) {
    console.error('Update check failed:', error);
    toast('❌ Update check failed: ' + error.message);
  }
}

function showUpdatePrompt(newVersion, downloadUrl) {
  // Remove existing update elements
  const oldModal = document.getElementById('updatePromptModal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'updatePromptModal';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="
      background: #FFFBF0;
      border: 2px solid #D4AF37;
      border-radius: 12px;
      width: 85%;
      max-width: 320px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: 'Inter', sans-serif;
      text-align: center;
    ">
      <h3 style="color: #7A0000; margin-top: 0; margin-bottom: 12px; font-family: 'Cinzel', serif;">👑 Update Available!</h3>
      <p style="font-size: 14px; color: #1E0A00; margin-bottom: 20px; line-height: 1.5;">
        A new version (<b>${newVersion}</b>) is available. Would you like to update?
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="updateCancelBtn" style="
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          flex: 1;
        ">Cancel</button>
        <button id="updateConfirmBtn" style="
          background: #7A0000;
          color: #FFF;
          border: 1px solid #D4AF37;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          flex: 1;
        ">Update</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('updateCancelBtn').addEventListener('click', () => {
    modal.remove();
  });

  document.getElementById('updateConfirmBtn').addEventListener('click', () => {
    modal.remove();
    startApkDownload(downloadUrl);
  });
}

function startApkDownload(downloadUrl) {
  if (window.AndroidCamera && typeof window.AndroidCamera.triggerUpdate === 'function') {
    showDownloadProgressOverlay();
    window.AndroidCamera.triggerUpdate(downloadUrl);
  } else {
    // Web browser fallback
    window.open(downloadUrl, '_blank');
  }
}

function showDownloadProgressOverlay() {
  const oldOverlay = document.getElementById('downloadProgressOverlay');
  if (oldOverlay) oldOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'downloadProgressOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    color: #FFF;
    font-family: 'Inter', sans-serif;
  `;

  overlay.innerHTML = `
    <div style="text-align: center;">
      <div class="loader" style="
        border: 4px solid rgba(255,255,255,0.1);
        border-top: 4px solid #D4AF37;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px auto;
      "></div>
      <div id="downloadStatusText" style="font-size: 15px; font-weight: bold;">Downloading Update...</div>
      <div style="font-size: 12px; color: #ccc; margin-top: 5px;">Please do not close the app</div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  document.body.appendChild(overlay);
}

// Global callback invoked from Android Java code
window.onUpdateProgress = function(status) {
  console.log(`onUpdateProgress: ${status}`);
  const statusText = document.getElementById('downloadStatusText');
  const overlay = document.getElementById('downloadProgressOverlay');

  if (status === 'Failed') {
    if (overlay) overlay.remove();
  } else if (status === 'Installing...') {
    if (statusText) statusText.innerText = 'Launching Installer...';
    setTimeout(() => {
      if (overlay) overlay.remove();
    }, 3000);
  } else if (statusText) {
    statusText.innerText = status;
  }
};
