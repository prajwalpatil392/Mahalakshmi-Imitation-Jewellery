// ============================================================
// SUBSCRIPTION SYSTEM — Auto-renewing yearly counter
// ============================================================
// Start date : June 11 every year (fixed day/month)
// Duration   : 1 year exactly
// Auto-reset : On June 11 each new year the counter resets
//              itself — no APK rebuild, no code change needed.
// Reminder   : Shows warning at 30 days, alert on expiry day.
// ============================================================

const CONTACT_NUMBER = '9113581092';

// ── Core date logic ───────────────────────────────────────

/**
 * Returns the current subscription window:
 *   start  = the most recent June 11 that is today or in the past
 *   expiry = start + exactly 1 year
 */
function getSubscriptionDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build June 11 for the current calendar year
  const june11ThisYear = new Date(today.getFullYear(), 5, 11); // month is 0-indexed

  // If today is before June 11 this year, the active window started June 11 last year
  const start = today >= june11ThisYear
    ? new Date(today.getFullYear(), 5, 11)
    : new Date(today.getFullYear() - 1, 5, 11);

  const expiry = new Date(start);
  expiry.setFullYear(expiry.getFullYear() + 1);

  return { start, expiry };
}

function getDaysRemaining() {
  const { expiry } = getSubscriptionDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.floor((expiry - today) / 86400000);
  return diff >= 0 ? diff : 0;
}

function getDaysUsed() {
  const { start } = getSubscriptionDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.floor((today - start) / 86400000);
}

// ── Badge in header ───────────────────────────────────────

function updateSubscriptionDisplay() {
  const headerDate = document.getElementById('headerDate');
  if (!headerDate) return;

  const existing = document.getElementById('subscriptionStatus');
  if (existing) existing.remove();

  const days = getDaysRemaining();

  let color, label;
  if (days === 0) {
    color = '#e74c3c';
    label = '⚠️ Expired Today!';
  } else if (days <= 7) {
    color = '#e74c3c';
    label = `🔴 ${days}d left — Renew Now!`;
  } else if (days <= 30) {
    color = '#f39c12';
    label = `🟡 ${days} days left`;
  } else {
    color = '#2ecc71';
    label = `✓ ${days} days left`;
  }

  const statusDiv = document.createElement('div');
  statusDiv.id = 'subscriptionStatus';
  statusDiv.style.cssText = 'margin-top:6px; text-align:center;';
  statusDiv.innerHTML = `
    <div onclick="showSubscriptionDetails()"
         style="font-size:0.75rem; color:white; background:${color};
                padding:4px 10px; border-radius:12px; display:inline-block;
                font-weight:700; font-family:'Cinzel',serif;
                box-shadow:0 2px 5px rgba(0,0,0,0.2); cursor:pointer;">
      ${label}
    </div>`;
  headerDate.appendChild(statusDiv);
}

// ── Expiry reminder popup (shows once per day) ────────────

function _maybeShowExpiryReminder() {
  const days = getDaysRemaining();

  // Only remind at ≤30 days or on expiry
  if (days > 30) return;

  // Show once per calendar day to avoid spamming
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastShown = localStorage.getItem('subReminderShown');
  if (lastShown === todayStr) return;
  localStorage.setItem('subReminderShown', todayStr);

  const isExpired = days === 0;
  const title     = isExpired ? '⚠️ Subscription Expired!'   : `⏰ Subscription Expiring Soon`;
  const body      = isExpired
    ? 'Your subscription has expired. Please contact the administrator to renew and continue using the app.'
    : `Your subscription expires in <strong>${days} day${days === 1 ? '' : 's'}</strong>. Please renew before it expires.`;
  const btnColor  = isExpired ? '#e74c3c' : '#f39c12';

  const overlay = document.createElement('div');
  overlay.id = 'subReminderOverlay';
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.65);
    display:flex; align-items:center; justify-content:center;
    z-index:20000; padding:20px;`;

  overlay.innerHTML = `
    <div style="background:white; border-radius:24px; padding:28px 24px;
                max-width:360px; width:100%; text-align:center;
                box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <div style="font-size:52px; margin-bottom:12px;">${isExpired ? '🔴' : '⏰'}</div>
      <h3 style="color:#6A0000; font-family:'Cinzel',serif;
                 margin:0 0 14px; font-size:1.1rem;">${title}</h3>
      <p style="color:#444; font-size:0.88rem; line-height:1.6; margin-bottom:20px;">${body}</p>

      <!-- Progress bar -->
      <div style="background:#f0f0f0; border-radius:8px; height:10px;
                  margin-bottom:8px; overflow:hidden;">
        <div style="height:100%; border-radius:8px; background:${btnColor};
                    width:${Math.round((getDaysUsed() / 365) * 100)}%;
                    transition:width 0.4s;"></div>
      </div>
      <div style="font-size:0.75rem; color:#888; margin-bottom:20px;">
        ${getDaysUsed()} / 365 days used
      </div>

      <div style="background:#f0f7ff; border-radius:12px; padding:12px;
                  margin-bottom:20px; font-size:0.82rem; color:#0056b3;">
        Contact for renewal:<br>
        <strong>Administrator — ${CONTACT_NUMBER}</strong>
      </div>

      <button onclick="document.getElementById('subReminderOverlay').remove()"
              style="width:100%; padding:14px; background:#6A0000; color:white;
                     border:none; border-radius:12px; font-weight:700; font-size:0.95rem;
                     cursor:pointer; font-family:'Cinzel',serif;">
        OK, Got It
      </button>
    </div>`;

  document.body.appendChild(overlay);
}

// ── Detail modal (tapped from badge) ─────────────────────

function showSubscriptionDetails() {
  const days  = getDaysRemaining();
  const used  = getDaysUsed();
  const { start, expiry } = getSubscriptionDates();

  const fmt = (date) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const existing = document.getElementById('subscriptionDetailModal');
  if (existing) existing.remove();

  const progressPct  = Math.min(100, Math.round((used / 365) * 100));
  const barColor     = days <= 7 ? '#e74c3c' : days <= 30 ? '#f39c12' : '#2ecc71';

  const statusBlock = days === 0
    ? `<div style="font-size:2rem; font-weight:800; color:#e74c3c;
                   font-family:'Cinzel',serif;">Expired</div>`
    : `<div style="font-size:2.5rem; font-weight:800; color:${barColor};
                   font-family:'Cinzel',serif;">${days}</div>
       <div style="font-size:0.9rem; color:#666; font-weight:600;">Days Remaining</div>`;

  const modal = document.createElement('div');
  modal.className = 'modal-bg open';
  modal.id = 'subscriptionDetailModal';
  modal.style.cssText = 'display:flex; z-index:10001;';
  modal.addEventListener('click',      (e) => e.stopPropagation());
  modal.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
  modal.addEventListener('touchend',   (e) => e.stopPropagation(), { passive: false });

  modal.innerHTML = `
    <div class="modal-box"
         style="max-width:400px; padding:25px; background:white;
                border-radius:24px; text-align:center;"
         onclick="event.stopPropagation()"
         ontouchstart="event.stopPropagation()"
         ontouchend="event.stopPropagation()">

      <div style="font-size:50px; margin-bottom:15px;">💎</div>
      <h3 style="color:#6A0000; font-family:'Cinzel',serif; margin:0 0 10px;">
        Premium Subscription
      </h3>

      <!-- Days counter -->
      <div style="background:#f9f9f9; padding:20px; border-radius:18px;
                  margin-bottom:16px; border:2px solid #E8D8A0;">
        ${statusBlock}
      </div>

      <!-- Progress bar -->
      <div style="background:#eee; border-radius:8px; height:12px;
                  margin-bottom:6px; overflow:hidden;">
        <div style="height:100%; border-radius:8px; background:${barColor};
                    width:${progressPct}%; transition:width 0.4s;"></div>
      </div>
      <div style="font-size:0.75rem; color:#888; margin-bottom:16px;">
        ${used} / 365 days used (${progressPct}%)
      </div>

      <!-- Dates -->
      <div style="text-align:left; font-size:0.85rem; color:#444;
                  margin-bottom:16px; background:#fff9e6;
                  padding:15px; border-radius:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span>📅 Started:</span>
          <span style="font-weight:700;">${fmt(start)}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>⏰ Renews On:</span>
          <span style="font-weight:700;">${fmt(expiry)}</span>
        </div>
      </div>

      ${days <= 30 ? `
      <div style="background:#fff3cd; padding:12px; border-radius:12px;
                  margin-bottom:14px; font-size:0.8rem; color:#856404; font-weight:600;">
        ⚠️ Please renew soon to avoid any interruption.
      </div>` : ''}

      <!-- Contact -->
      <div style="background:#f0f7ff; padding:14px; border-radius:12px;
                  margin-bottom:20px; font-size:0.8rem; color:#0056b3; line-height:1.5;">
        For renewal &amp; support, contact:<br>
        <strong>Administrator — ${CONTACT_NUMBER}</strong>
      </div>

      <button onclick="document.getElementById('subscriptionDetailModal').remove()"
              style="width:100%; padding:14px; background:#6A0000; color:white;
                     border:none; border-radius:12px; font-weight:700;
                     cursor:pointer; font-family:'Cinzel',serif;">
        Close Window
      </button>
    </div>`;

  document.body.appendChild(modal);
}

// ── Initialization ────────────────────────────────────────

function initSubscription() {
  // Show badge after header is visible
  setTimeout(updateSubscriptionDisplay, 800);

  // Show expiry reminder popup once per day if ≤ 30 days left
  setTimeout(_maybeShowExpiryReminder, 2000);
}
