// Admin Panel Fixes - Add this script to fix the admin panel issues

// Fix 1: Ensure enquiries are loaded from API
async function fixLoadEnquiriesFromAPI(){
  try{
    if(typeof api !== 'undefined'){
      console.log('Loading enquiries from API...');
      window.enquiriesCache = await api.getEnquiries();
      console.log('Enquiries loaded:', window.enquiriesCache.length);
      return window.enquiriesCache;
    }
  }catch(e){
    console.error('Failed to load enquiries from API:', e);
  }
  return [];
}

// Fix 2: Override getEnquiries to use cached data
function fixGetEnquiries(){
  if(window.enquiriesCache) return window.enquiriesCache;
  return [];
}

// Fix 3: Enhanced renderEnquiriesPage that loads from API
async function fixRenderEnquiriesPage(){
  await fixLoadEnquiriesFromAPI();
  const enqs = fixGetEnquiries();
  const tb=document.getElementById('allEnqTable');
  if(enqs.length===0){
    tb.innerHTML=`<tr><td colspan="10"><div class="empty-state"><div class="ei">💬</div><p>No enquiries yet.</p></div></td></tr>`;
    return;
  }
  
  tb.innerHTML=enqs.map(e=>{
    const status = e.status || 'New';
    const orderId = e.order_id || e.orderId || 'N/A';
    const placedAt = e.placed_at || e.placedAt || '—';
    const customerName = e.customer_name || e.customer?.name || '—';
    const customerPhone = e.customer_phone || e.customer?.phone || '—';
    const customerEmail = e.customer_email || e.customer?.email || '—';
    const customerEvent = e.customer_event || e.customer?.event || '—';
    const customerNotes = e.customer_notes || e.customer?.notes || '—';
    
    return `<tr>
      <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">${orderId}</td>
      <td><strong style="color:var(--text);">${customerName}</strong></td>
      <td style="color:var(--text-dim);">${customerPhone}</td>
      <td style="color:var(--text-dim);">${customerEmail}</td>
      <td><span class="badge badge-enquiry">${e.request_type||'General'}</span></td>
      <td style="color:var(--text-dim);">${customerEvent}</td>
      <td style="color:var(--text-dim);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${customerNotes}">${customerNotes}</td>
      <td><span class="badge badge-${status.toLowerCase()}">${status}</span></td>
      <td style="color:var(--text-dim);font-size:.78rem;">${placedAt}</td>
      <td><div class="action-btns">
        ${status==='New'?`<button class="ab ab-confirm" onclick="updateEnquiryStatus('${orderId}','Confirmed')">Acknowledge</button>`:''}
        <button class="ab ab-cancel" onclick="updateEnquiryStatus('${orderId}','Cancelled')">Close</button>
      </div></td>
    </tr>`;
  }).join('');
}

// Fix 4: Add enquiry status update function
async function updateEnquiryStatus(orderId, status) {
  try {
    if (typeof api !== 'undefined') {
      // Find the enquiry by order_id
      const enquiries = fixGetEnquiries();
      const enquiry = enquiries.find(e => e.order_id === orderId || e.orderId === orderId);
      
      if (enquiry) {
        await api.updateEnquiryStatus(enquiry.id, status);
        showToast(`Enquiry ${orderId} ${status.toLowerCase()}`);
        
        // Refresh enquiries
        await fixLoadEnquiriesFromAPI();
        await fixRenderEnquiriesPage();
      }
    }
  } catch (error) {
    console.error('Error updating enquiry status:', error);
    showToast('Failed to update enquiry status', 'error');
  }
}

// Fix 5: Enhanced init function
function fixInit() {
  console.log('Initializing admin panel with fixes...');
  
  // Load all data from API
  if (typeof loadProductsFromAPI === 'function') {
    loadProductsFromAPI();
  }
  
  fixLoadEnquiriesFromAPI();
  
  if (typeof loadOrdersFromAPI === 'function') {
    loadOrdersFromAPI();
  }
  
  // Override the original functions
  window.renderEnquiriesPage = fixRenderEnquiriesPage;
  window.getEnquiries = fixGetEnquiries;
  window.loadEnquiriesFromAPI = fixLoadEnquiriesFromAPI;
  
  console.log('Admin panel fixes applied successfully');
}

// Apply fixes when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixInit);
} else {
  fixInit();
}

console.log('Admin panel fixes loaded');