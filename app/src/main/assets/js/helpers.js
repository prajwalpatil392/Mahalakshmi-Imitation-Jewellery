// ============================================================================
// 🛠️ HELPERS MODULE: WhatsApp, Print, and Message Formatting
// ============================================================================
// Responsibility: Reusable helper functions for sharing and printing
// Does NOT contain: UI rendering, form logic, API calls

// ============================================================================
// 📱 WHATSAPP HELPERS
// ============================================================================

function formatWhatsAppPhone(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return '';
  if (cleanPhone.length === 10) return '91' + cleanPhone;
  if (cleanPhone.startsWith('91') && cleanPhone.length >= 12) return cleanPhone;
  return cleanPhone;
}

function buildWhatsAppMessage(record) {
  const photos = getPhotosFromRecord(record).filter(url => url && url !== 'PENDING');
  const photoCount = photos.length;

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
    `Pickup: ${formatDateDisplay(record.from) || '-'}` ,
    record.retDate ? `Expected Return: ${formatDateDisplay(record.to) || '-'}` : `Return: ${formatDateDisplay(record.to) || '-'}`
  ];

  if (record.retDate) {
    lines.push(`Actual Return: ${formatDateDisplay(record.retDate) || '-'}`);
  }

  lines.push(`User: ${record.user || 'User'}`);

  // ✅ PRIVACY: Don't send image links to customers
  // Just mention the photo count if photos exist
  if (photoCount > 0) {
    lines.push('', `📷 ${photoCount} photo(s) attached in our records`);
  }

  lines.push('', 'Thank you for choosing Mahalakshmi Rentals.');
  return lines.join('\n');
}

function shareWhatsApp(record) {
  const targetRecord = record || curDetailRecord;
  if (!targetRecord) {
    console.error('shareWhatsApp: no record available');
    toast('⚠️ No record selected for WhatsApp');
    return;
  }

  const msg = buildWhatsAppMessage(targetRecord);
  const phone = formatWhatsAppPhone(targetRecord.phone);

  console.log('shareWhatsApp:', { phone, messageLength: msg.length });

  // ✅ FIX: Use Android native bridge for WhatsApp
  if (window.AndroidCamera && typeof window.AndroidCamera.shareWhatsApp === 'function') {
    console.log('📱 Opening WhatsApp via Android bridge');
    window.AndroidCamera.shareWhatsApp(msg, phone || '');
  } else {
    // Fallback for web
    const encodedMsg = encodeURIComponent(msg);
    const url = phone
      ? `https://wa.me/${phone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank');
  }
}

function shareApp() {
  const appName = "💍 Mahalakshmi Jewellery Rentals";
  const msg = `*${appName}*\nCheck out our jewellery rental management app!\n\nManage your bookings, photos, and receipts easily.`;

  if (window.AndroidCamera && typeof window.AndroidCamera.shareWhatsApp === 'function') {
    window.AndroidCamera.shareWhatsApp(msg, "");
  } else {
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }
}

// ============================================================================
// 🖨️ PRINT HELPERS
// ============================================================================

function printRecord() {
  console.log('📄 printRecord called');
  
  if (!curDetailRecord) {
    toast('⚠️ No record selected for printing');
    return;
  }
  
  try {
    const record = curDetailRecord;
    const photos = getPhotosFromRecord(record);
    
    // Create modal HTML with key:value pairs like a traditional bill
    const modalHTML = `
      <div class="print-modal-overlay active" id="printModalOverlay">
        <div class="print-modal-container">
          <div class="print-modal-header">
            <h2>📄 Print Receipt</h2>
            <button class="print-close-btn" data-action="close-print">×</button>
          </div>
          <div class="print-modal-body">
            <div class="print-receipt">
              <div class="receipt-header">
                <h1>🏛️ Mahalaxmi Rentals</h1>
                <div class="subtitle">Jewellery Rental Receipt</div>
              </div>
              
              <div class="bill-divider"></div>
              
              <div class="bill-row">
                <span class="bill-key">Receipt No:</span>
                <span class="bill-value">${record.receiptNo}</span>
              </div>
              
              <div class="bill-row">
                <span class="bill-key">Date:</span>
                <span class="bill-value">${formatDateDisplay(record.from)}</span>
              </div>
              
              <div class="bill-row">
                <span class="bill-key">Status:</span>
                <span class="bill-value">
                  <span class="status-badge ${
                    record.status === STATUS.ACTIVE ? 'status-active' : 
                    record.status === STATUS.OVERDUE ? 'status-overdue' : 
                    'status-returned'
                  }">${record.status || 'Active'}</span>
                </span>
              </div>
              
              <div class="bill-row">
                <span class="bill-key">User:</span>
                <span class="bill-value">${record.user || 'System'}</span>
              </div>
              
              <div class="bill-divider"></div>
              <div class="section-title">👤 CUSTOMER DETAILS</div>
              
              <div class="bill-row">
                <span class="bill-key">Name:</span>
                <span class="bill-value">${record.name}</span>
              </div>
              
              <div class="bill-row">
                <span class="bill-key">Phone:</span>
                <span class="bill-value">${record.phone || 'N/A'}</span>
              </div>
              
              <div class="bill-row">
                <span class="bill-key">Address:</span>
                <span class="bill-value">${record.address || 'N/A'}</span>
              </div>
              
              <div class="bill-divider"></div>
              <div class="section-title">💍 JEWELLERY DETAILS</div>
              
              <div class="bill-row">
                <span class="bill-key">Item Type:</span>
                <span class="bill-value">${record.jewel}</span>
              </div>
              
              <div class="bill-row">
                <span class="bill-key">Deposit:</span>
                <span class="bill-value">₹${record.deposit || '0'}</span>
              </div>
              
              <div class="bill-divider"></div>
              <div class="section-title">📅 RENTAL PERIOD</div>
              
              <div class="bill-row">
                <span class="bill-key">Pickup Date:</span>
                <span class="bill-value">${formatDateDisplay(record.from)}</span>
              </div>
              
              <div class="bill-row">
                <span class="bill-key">${record.retDate ? 'Expected Return:' : 'Return Date:'}</span>
                <span class="bill-value">${formatDateDisplay(record.to)}</span>
              </div>
              
              ${record.retDate ? `
              <div class="bill-row">
                <span class="bill-key">Actual Return:</span>
                <span class="bill-value">${formatDateDisplay(record.retDate)}</span>
              </div>
              ` : ''}
              
              <div class="bill-divider"></div>
              <div class="section-title">💰 PAYMENT SUMMARY</div>
              
              <div class="bill-row">
                <span class="bill-key">Total Amount:</span>
                <span class="bill-value">₹${record.total}</span>
              </div>
              
              <div class="bill-row">
                <span class="bill-key">Advance Paid:</span>
                <span class="bill-value">₹${record.advance}</span>
              </div>
              
              <div class="bill-row total-row">
                <span class="bill-key">Balance Due:</span>
                <span class="bill-value">₹${record.balance}</span>
              </div>
              
              ${photos.length > 0 ? `
              <div class="bill-divider"></div>
              <div class="section-title">📷 JEWELLERY PHOTOS (${photos.length})</div>
              <div class="photos-grid">
                ${photos.map((url, index) => `
                  <div class="photo-item">
                    <img src="${url}" alt="Photo ${index + 1}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3EImage%20error%3C/text%3E%3C/svg%3E'">
                  </div>
                `).join('')}
              </div>
              ` : ''}
              
              <div class="bill-divider"></div>
              <div class="footer">
                <p>Thank you for choosing Mahalaxmi Rentals</p>
                <p>For inquiries, contact us with receipt number</p>
                <p style="margin-top: 6px; font-size: 0.55rem; color: #999;">Printed: ${new Date().toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
          <div class="print-modal-footer">
            <button class="print-btn" data-action="print">🖨️ Print</button>
            <button class="print-btn secondary" data-action="close-print">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to body
    const existingModal = document.getElementById('printModalOverlay');
    if (existingModal) {
      existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.classList.add(CLASSES.MODAL_OPEN);
    
    toast('📄 Print preview ready');
    
  } catch (e) {
    console.error('❌ Print error:', e);
    toast('❌ Print failed: ' + e.message);
  }
}

function closePrintModal() {
  const modal = document.getElementById('printModalOverlay');
  if (modal) {
    modal.classList.remove(CLASSES.ACTIVE);
    document.body.classList.remove(CLASSES.MODAL_OPEN);
    setTimeout(() => modal.remove(), 300);
  }
}
