
// -- HELPER FUNCTIONS -----------------------------------------------------
// Format price - remove .00 if whole number and remove leading zeros
function formatPrice(price) {
  const num = parseFloat(price);
  if (isNaN(num)) return '0';
  // If it's a whole number, don't show decimals
  return num % 1 === 0 ? num.toLocaleString() : num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// -- DATA STORE (shared via localStorage with client) --------------------
const STORE_KEY='mlr_orders';
const ENQUIRY_KEY='mlr_enquiries';
const AVAIL_KEY='mlr_availability';
const STATUS_KEY='mlr_order_status';
const INVENTORY_KEY='mlr_inventory';

function getOrders(){
  // Try API first, fallback to localStorage
  if(typeof api !== 'undefined' && window.ordersCache){
    return window.ordersCache;
  }
  try{return JSON.parse(localStorage.getItem(STORE_KEY)||'[]');}catch(e){return[];}
}

async function loadOrdersFromAPI(){
  try{
    if(typeof api !== 'undefined'){
      window.ordersCache = await api.getOrders();
      return window.ordersCache;
    }
  }catch(e){
    console.error('Failed to load orders from API:', e);
  }
  return getOrders();
}

async function loadEnquiriesFromAPI(){
  try{
    if(typeof api !== 'undefined'){
      window.enquiriesCache = await api.getEnquiries();
      return window.enquiriesCache;
    }
  }catch(e){
    console.error('Failed to load enquiries from API:', e);
  }
  return getEnquiries();
}

function getEnquiries(){
  // Return cached data if available, otherwise fallback to localStorage
  if(window.enquiriesCache) return window.enquiriesCache;
  try{return JSON.parse(localStorage.getItem(ENQUIRY_KEY)||'[]');}catch(e){return[];}
}
function getStatuses(){try{return JSON.parse(localStorage.getItem(STATUS_KEY)||'{}');}catch(e){return{};}}
function saveStatuses(s){localStorage.setItem(STATUS_KEY,JSON.stringify(s));}
function getAvailability(){try{return JSON.parse(localStorage.getItem(AVAIL_KEY)||'{}');}catch(e){return{};}}
function saveAvailability(a){localStorage.setItem(AVAIL_KEY,JSON.stringify(a));}
function getInventory(){try{return JSON.parse(localStorage.getItem(INVENTORY_KEY)||'{}');}catch(e){return{};}}
function saveInventory(inv){localStorage.setItem(INVENTORY_KEY,JSON.stringify(inv));}

// Get base stock - use product's baseStock from API, fallback to localStorage
function getBaseStock(id){
  const product = products.find(p => p.id === id);
  if (product && product.baseStock !== undefined) {
    return product.baseStock;
  }
  const inv=getInventory();
  return inv[id]!==undefined?inv[id]:5;
}

function setBaseStock(id,qty){
  const inv=getInventory();
  inv[id]=Math.max(0,qty);
  saveInventory(inv);
  
  // Also update in products array
  const product = products.find(p => p.id === id);
  if (product) {
    product.baseStock = Math.max(0,qty);
  }
  
  // Update in backend if API available
  if (typeof api !== 'undefined' && api.updateStock) {
    api.updateStock(id, Math.max(0,qty)).catch(err => console.error('Error updating stock:', err));
  }
}

// Compute how many units of a product are currently consumed by active (New/Confirmed) orders
function getConsumedStock(productId){
  const orders=getOrders().filter(o=>o.type==='order');
  const statuses=getStatuses();
  let consumed=0;
  orders.forEach(order=>{
    const s=statuses[order.orderId]||order.status;
    if(s==='Cancelled'||s==='Returned') return; // freed up
    (order.items||[]).forEach(item=>{
      if(item.id===productId || item.product_id===productId) {
        const qty = item.quantity || 1;
        consumed += qty;
      }
    });
  });
  return consumed;
}

function getAvailableQty(productId){
  return Math.max(0, getBaseStock(productId) - getConsumedStock(productId));
}

// -- PRODUCTS (load from API) --------------------------------------------
let products = [];

async function loadProductsFromAPI() {
  try {
    if (typeof api !== 'undefined') {
      products = await api.getProducts();
      console.log('Products loaded from API:', products.length);
    } else {
      // Fallback to hardcoded products
      products = [
        {id:1,name:"Lakshmi Haram Set",material:"Antique Gold Finish",icon:"💿",rentPerDay:150,buy:3200,type:"both",category:"Haram"},
        {id:2,name:"Bridal Maang Tikka",material:"Kundan & Meenakari",icon:"👑",rentPerDay:80,buy:1800,type:"both",category:"Maang Tikka"},
        {id:3,name:"Temple Necklace",material:"Gold-Plated Copper",icon:"💎",rentPerDay:120,buy:2400,type:"both",category:"Necklace"},
        {id:4,name:"Jimikki Earrings",material:"South Indian Style",icon:"💍",rentPerDay:50,buy:950,type:"both",category:"Earrings"},
        {id:5,name:"Full Bridal Set",material:"Antique Gold 12-Piece",icon:"👰",rentPerDay:600,buy:null,type:"rent",category:"Bridal"},
        {id:6,name:"Kangan Bangles (Set 4)",material:"Gold-Plated Brass",icon:"⭕",rentPerDay:null,buy:1200,type:"buy",category:"Bangles"},
        {id:7,name:"Navaratna Necklace",material:"Stone-Studded",icon:"💎",rentPerDay:180,buy:2800,type:"both",category:"Necklace"},
        {id:8,name:"Antique Toe Ring Pair",material:"Sterling Silver Finish",icon:"💍",rentPerDay:null,buy:450,type:"buy",category:"Anklets"},
      ];
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

let currentDetailId=null;
let currentDetailType='order';

// -- LOGIN ----------------------------------------------------------------
async function doLogin(){
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  
  if (!u || !p) {
    showToast('Please enter both username and password', 'error');
    return;
  }
  
  // Show loading state
  const loginBtn = document.querySelector('.login-btn');
  const originalText = loginBtn.textContent;
  loginBtn.textContent = 'Signing in...';
  loginBtn.disabled = true;
  
  try {
    // Use the API to authenticate
    const response = await api.login(u, p);
    
    if (response.token) {
      // Save session with token
      localStorage.setItem('mlr_admin_session', 'true');
      localStorage.setItem('mlr_admin_token', response.token);
      localStorage.setItem('mlr_admin_user', response.username);
      localStorage.setItem('mlr_admin_time', Date.now());
      
      // Hide login screen and show app
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      
      showToast('Welcome back!');
      init();
    } else {
      showToast(response.error || 'Invalid credentials', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed. Please check your connection and try again.', 'error');
  } finally {
    // Restore button state
    loginBtn.textContent = originalText;
    loginBtn.disabled = false;
  }
}

function doLogout(){
  // Clear session and tokens
  localStorage.removeItem('mlr_admin_session');
  localStorage.removeItem('mlr_admin_token');
  localStorage.removeItem('mlr_admin_user');
  localStorage.removeItem('mlr_admin_time');
  
  document.getElementById('app').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('loginPass').value='';
}

// Check if already logged in
function checkSession(){
  const session = localStorage.getItem('mlr_admin_session');
  const loginTime = localStorage.getItem('mlr_admin_time');
  
  if(session === 'true' && loginTime){
    // Check if session is less than 24 hours old
    const hoursSinceLogin = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
    
    if(hoursSinceLogin < 24){
      // Auto-login
      document.getElementById('loginScreen').style.display='none';
      document.getElementById('app').style.display='flex';
      init();
      return true;
    } else {
      // Session expired
      localStorage.removeItem('mlr_admin_session');
      localStorage.removeItem('mlr_admin_time');
    }
  }
  return false;
}

// -- INIT -----------------------------------------------------------------
function init(){
  loadProductsFromAPI(); // Load products from backend
  loadEnquiriesFromAPI(); // Load enquiries from backend

  // Restore last visited page (persist across browser refresh)
  const savedPage = localStorage.getItem('mlr_admin_current_page') || 'dashboard';
  try {
    showPage(savedPage);
  } catch (e) {
    showPage('dashboard');
  }
  
  // Auto-refresh every 30 seconds (reduced from 5 seconds)
  // Only refresh when page is visible to reduce unnecessary requests
  setInterval(() => {
    if (!document.hidden) {
      refreshAll();
    }
  }, 30000);
  
  refreshAll();
  document.getElementById('topbarDate').textContent=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}

async function refreshAll(){
  // Load critical data (in parallel) to reduce perceived buffering
  await Promise.all([
    loadOrdersFromAPI(),
    loadEnquiriesFromAPI(),
  ]);

  // Always keep dashboard stats fresh (quick)
  await renderDashboard();

  // Refresh the current visible page reliably
  const currentPage = document.querySelector('.page.active');
  if (currentPage) {
    switch (currentPage.id) {
      case 'page-orders':
        await renderOrdersPage();
        break;
      case 'page-rentals':
        await renderRentalsPage();
        break;
      case 'page-enquiries':
        renderEnquiriesPage();
        break;
      case 'page-products':
        renderProductsPage();
        break;
      case 'page-customers':
        renderCustomersPage();
        break;
      case 'page-dashboard':
      default:
        // already rendered above
        break;
    }
  }

  updateNotifBadges();
}

// -- NAVIGATION -----------------------------------------------------------
const pageTitles={dashboard:'Dashboard',orders:'All Orders',rentals:'Rental Bookings',enquiries:'Customer Enquiries',products:'Product Management',customers:'Customer Directory'};
async function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  const nav=document.getElementById('nav-'+id);
  if(nav) nav.classList.add('active');
  else document.querySelectorAll('.nav-item')[0].classList.add('active');
  document.getElementById('topbarTitle').textContent=pageTitles[id]||id;

  // Persist selected page so browser refresh stays here
  localStorage.setItem('mlr_admin_current_page', id);

  // Render immediately on navigation (so user doesn't need extra clicks)
  try {
    switch (id) {
      case 'orders':
        await loadOrdersFromAPI();
        await renderOrdersPage();
        break;
      case 'rentals':
        await loadOrdersFromAPI();
        await renderRentalsPage();
        break;
      case 'enquiries':
        await loadEnquiriesFromAPI();
        renderEnquiriesPage();
        break;
      case 'products':
        await loadProductsFromAPI();
        renderProductsPage();
        break;
      case 'customers':
        await loadOrdersFromAPI();
        await loadEnquiriesFromAPI();
        renderCustomersPage();
        break;
      case 'dashboard':
      default:
        await loadOrdersFromAPI();
        await loadEnquiriesFromAPI();
        await renderDashboard();
        break;
    }
    updateNotifBadges();
  } catch (e) {
    console.error('Navigation render error:', e);
  }
  
  // Close sidebar on mobile after navigation
  if(window.innerWidth <= 768) closeSidebar();
}

// -- SIDEBAR TOGGLE (MOBILE) ----------------------------------------------
function toggleSidebar(){
  const sidebar=document.getElementById('sidebar');
  const overlay=document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

function closeSidebar(){
  const sidebar=document.getElementById('sidebar');
  const overlay=document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

// -- BADGE HELPERS ---------------------------------------------------------
function updateNotifBadges(){
  const orders=getOrders();
  const statuses=getStatuses();
  const newOrders=orders.filter(o=>{
    const orderId = getOrderId(o);
    return o.type==='order'&&(statuses[orderId]||o.status)==='New';
  }).length;
  const nb=document.getElementById('newOrdersBadge');
  nb.textContent=newOrders; nb.style.display=newOrders>0?'inline':'none';
  const nc=document.getElementById('notifCount');
  nc.textContent=newOrders; nc.className='notif-count'+(newOrders>0?' visible':'');

  const enqs=getEnquiries();
  const newEnqs=enqs.filter(e=>{
    const orderId = getOrderId(e);
    return (statuses[orderId]||e.status)==='New';
  }).length;
  const eb=document.getElementById('newEnqBadge');
  eb.textContent=newEnqs; eb.style.display=newEnqs>0?'inline':'none';
}

// -- STATUS HELPER --------------------------------------------------------
function getEffectiveStatus(item){
  const statuses=getStatuses();
  return statuses[item.orderId || item.order_id]||item.status;
}

// Helper to get order ID (handles both orderId and order_id)
function getOrderId(item) {
  return item.orderId || item.order_id || 'N/A';
}

async function setStatus(id,status){
  const statuses=getStatuses();
  statuses[id]=status; saveStatuses(statuses);
  if(typeof api !== 'undefined'){
    const order=getOrders().find(o=>(o.orderId||o.order_id)===id&&o.type==='order');
    const enquiry=order?null:getEnquiries().find(e=>(e.orderId||e.order_id)===id);
    const apiStatus=enquiry&&status==='Confirmed'?'Contacted':enquiry&&status==='Cancelled'?'Closed':status;
    try{
      if(order&&order.id!=null) await api.updateOrderStatus(order.id,status);
      else if(enquiry&&enquiry.id!=null) await api.updateEnquiryStatus(enquiry.id,apiStatus);
    }catch(e){ console.error('Failed to persist status:',e); showToast('Status saved locally; sync failed','error'); }
  }
  refreshAll();
  showToast('Status updated to: '+status);
}

function statusBadge(s){
  const map={New:'badge-new',Confirmed:'badge-confirmed',Delivered:'badge-confirmed',Completed:'badge-confirmed',Cancelled:'badge-cancelled',Returned:'badge-returned',Contacted:'badge-confirmed',Closed:'badge-cancelled'};
  return `<span class="badge ${map[s]||'badge-new'}">${s}</span>`;
}

// -- DASHBOARD ------------------------------------------------------------
async function renderDashboard(){
  const orders=getOrders();
  const enqs=getEnquiries();
  const statuses=getStatuses();
  const allOrders=orders.filter(o=>o.type==='order');
  const newOrders=allOrders.filter(o=>{
    const orderId = getOrderId(o);
    return (statuses[orderId]||o.status)==='New';
  });
  const confirmed=allOrders.filter(o=>{
    const orderId = getOrderId(o);
    const s = statuses[orderId]||o.status;
    return s==='Confirmed'||s==='Delivered'||s==='Completed';
  });
  let revenue=confirmed.reduce((s,o)=>s+parseFloat(o.total||0),0);
  if(typeof api !== 'undefined' && api.getOrderStats){
    try{
      const stats=await api.getOrderStats();
      if(stats&&stats.totalRevenue!=null) revenue=parseFloat(stats.totalRevenue)||revenue;
    }catch(e){ /* use client calc as fallback */ }
  }
  const allRentals=allOrders.flatMap(o=>(o.items||[]).filter(i=>i.mode==='rent').map(i=>({...i,order:o})));
  const activeRentals=allRentals.filter(o=>{
    const orderId = getOrderId(o.order);
    const s=statuses[orderId]||o.order.status;
    return s==='Confirmed'||s==='New';
  });
  const newEnqs=enqs.filter(e=>{
    const orderId = getOrderId(e);
    return (statuses[orderId]||e.status)==='New';
  });

  document.getElementById('totalOrders').textContent=allOrders.length;
  document.getElementById('newOrdersCount').textContent=newOrders.length+' new';
  document.getElementById('activeRentals').textContent=activeRentals.length;
  document.getElementById('totalEnquiries').textContent=enqs.length;
  document.getElementById('newEnquiriesCount').textContent=newEnqs.length+' pending';
  document.getElementById('totalRevenue').textContent='₹'+formatPrice(revenue);

  // Recent orders table
  const tb=document.getElementById('recentOrdersTable');
  const recent=[...allOrders,...enqs].sort((a,b)=>b.timestamp-a.timestamp).slice(0,8);
  if(recent.length===0){
    tb.innerHTML=`<tr><td colspan="8"><div class="empty-state"><div class="ei">📫</div><p>No orders yet. When customers place orders on the client site, they appear here live.</p><p style="margin-top:8px;font-size:.8rem;color:rgba(201,150,58,0.3);">Tip: Open the client HTML file in another tab and place a test order!</p></div></td></tr>`;
    return;
  }
  tb.innerHTML=recent.map(item=>{
    const isOrder=item.type==='order';
    const status=getEffectiveStatus(item);
    
    // Build product names for orders
    let itemDisplay = 'Enquiry';
    if(isOrder) {
      const items = item.items || [];
      if (items.length === 0) {
        itemDisplay = 'No items';
      } else {
        const productNames = items.map(i => {
          const qty = i.quantity || 1;
          const name = i.product_name || i.name || i.productName || 'Unknown Item';
          return qty > 1 ? `${name} (×${qty})` : name;
        }).join(', ');
        itemDisplay = productNames || `${items.length} item(s)`;
      }
    }
    
    const typeLabel=isOrder?'<span class="badge badge-buy">Order</span>':'<span class="badge badge-enquiry">Enquiry</span>';
    const orderId = getOrderId(item);
    const placedAt = item.placedAt || item.placed_at || '—';
    const customerName = item.customer?.name || item.customer_name || '—';
    return `<tr>
      <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">${orderId}</td>
      <td style="color:var(--text);">${customerName}</td>
      <td>${typeLabel}</td>
      <td style="color:var(--text-dim);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${itemDisplay}">${itemDisplay}</td>
      <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">${isOrder?'₹'+formatPrice(item.total||0):'—'}</td>
      <td>${statusBadge(status)}</td>
      <td style="color:var(--text-dim);font-size:.78rem;">${placedAt}</td>
      <td><div class="action-btns">
        ${status==='New'?`<button class="ab ab-confirm" onclick="setStatus('${orderId}','Confirmed')">Confirm</button>`:''}
        ${status==='New'||status==='Confirmed'?`<button class="ab ab-cancel" onclick="setStatus('${orderId}','Cancelled')">Cancel</button>`:''}
        <button class="ab ab-view" onclick="openDetail('${orderId}','${item.type}')">View</button>
      </div></td>
    </tr>`;
  }).join('');

  // Enquiries table
  const etb=document.getElementById('recentEnqTable');
  if(enqs.length===0){
    etb.innerHTML=`<tr><td colspan="8"><div class="empty-state"><div class="ei">💬</div><p>No enquiries yet.</p></div></td></tr>`;
    return;
  }
  etb.innerHTML=enqs.slice(0,5).map(e=>{
    const status=getEffectiveStatus(e);
    const orderId = getOrderId(e);
    const placedAt = e.placedAt || e.placed_at || '—';
    const customerName = e.customer?.name || e.customer_name || '—';
    const customerPhone = e.customer?.phone || e.customer_phone || '—';
    const customerEvent = e.customer?.event || e.customer_event || '—';
    return `<tr>
      <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">${orderId}</td>
      <td>${customerName}</td>
      <td style="color:var(--text-dim);">${customerPhone}</td>
      <td><span class="badge badge-enquiry">${e.requestType||'General'}</span></td>
      <td style="color:var(--text-dim);">${customerEvent}</td>
      <td>${statusBadge(status)}</td>
      <td style="color:var(--text-dim);font-size:.78rem;">${placedAt}</td>
      <td><div class="action-btns">
        ${status==='New'?`<button class="ab ab-confirm" onclick="setStatus('${orderId}','Confirmed')">Acknowledge</button>`:''}
        <button class="ab ab-view" onclick="openDetail('${orderId}','enquiry')">View</button>
      </div></td>
    </tr>`;
  }).join('');
}

// -- ORDERS PAGE ----------------------------------------------------------
async function renderOrdersPage(search='',statusFilter=''){
  const orders = await loadOrdersFromAPI();
  const allOrders = orders.filter(o=>o.type==='order');
  const tb=document.getElementById('allOrdersTable');
  let filtered=allOrders;
  if(search) filtered=filtered.filter(o=>o.customer?.name?.toLowerCase().includes(search.toLowerCase())||o.orderId?.includes(search)||o.order_id?.includes(search));
  if(statusFilter) filtered=filtered.filter(o=>getEffectiveStatus(o)===statusFilter);
  if(filtered.length===0){tb.innerHTML=`<tr><td colspan="8"><div class="empty-state"><div class="ei">📫</div><p>No orders found.</p></div></td></tr>`;return;}
  tb.innerHTML=filtered.map(o=>{
    const status=getEffectiveStatus(o);
    const items=(o.items||[]);
    const hasRentals=items.some(i=>i.mode==='rent');
    const orderId = o.orderId || o.order_id;
    const customerName = o.customer?.name || o.customer_name || '—';
    const customerPhone = o.customer?.phone || o.customer_phone || '—';
    const customerEvent = o.customer?.event || o.customer_event;
    const placedAt = o.placedAt || o.placed_at;
    const total = o.total || 0;
    
    // Build product names list
    const productNames = items.map(item => {
      const qty = item.quantity || 1;
      const name = item.product_name || item.name || item.productName || 'Unknown Item';
      return qty > 1 ? `${name} (×${qty})` : name;
    }).join(', ');
    
    const itemsDisplay = productNames || `${items.length} item(s)`;
    
    return `<tr>
      <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">${orderId}</td>
      <td><strong style="color:var(--text);">${customerName}</strong>${customerEvent?`<br><small style="color:var(--text-dim);">${customerEvent}</small>`:''}</td>
      <td style="color:var(--text-dim);">${customerPhone}</td>
      <td style="color:var(--text-dim);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${productNames}">${itemsDisplay}${hasRentals?' 📅':''}</td>
      <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">₹${formatPrice(total)}</td>
      <td>${statusBadge(status)}</td>
      <td style="color:var(--text-dim);font-size:.78rem;">${placedAt}</td>
      <td><div class="action-btns">
        ${status==='New'?`<button class="ab ab-confirm" onclick="setStatus('${orderId}','Confirmed')">Confirm</button>`:''}
        ${status==='Confirmed'&&hasRentals?`<button class="ab ab-returned" onclick="setStatus('${orderId}','Returned')">Returned</button>`:''}
        ${status!=='Cancelled'&&status!=='Returned'?`<button class="ab ab-cancel" onclick="setStatus('${orderId}','Cancelled')">Cancel</button>`:''}
        <button class="ab ab-view" onclick="openDetail('${orderId}','order')">View</button>
      </div></td>
    </tr>`;
  }).join('');
}

// -- RENTALS PAGE ---------------------------------------------------------
async function renderRentalsPage(){
  try {
    // Load rentals directly from the rentals API
    const response = await fetch('/api/rentals');
    const rentals = await response.json();
    
    const tb = document.getElementById('rentalsTable');
    
    if (!Array.isArray(rentals) || rentals.length === 0) {
      tb.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="ei">📅</div><p>No rental bookings yet.</p></div></td></tr>`;
      return;
    }
    
    const rentalRows = [];
    rentals.forEach(rental => {
      (rental.items || []).forEach(item => {
        rentalRows.push({ order: rental, item });
      });
    });
    
    if (rentalRows.length === 0) {
      tb.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="ei">📅</div><p>No rental items found.</p></div></td></tr>`;
      return;
    }
    
    tb.innerHTML = rentalRows.map(({order, item}) => {
      const status = order.rental_status || getEffectiveStatus(order);
      const orderId = getOrderId(order);
      const customerName = order.customer?.name || order.customer_name || '—';
      const customerPhone = order.customer?.phone || order.customer_phone || '';
      
      // Calculate rental period
      const fromDate = order.rental_start_date || order.placed_at || '—';
      const toDate = order.expected_return_date || '—';
      const days = order.rental_days || '—';
      
      return `<tr>
        <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">${orderId}</td>
        <td><strong style="color:var(--text);">${customerName}</strong><br><small style="color:var(--text-dim);">${customerPhone}</small></td>
        <td>${item.icon || ''} <span style="color:var(--text);">${item.product_name || item.name || 'Unknown Item'}</span></td>
        <td style="color:var(--text-dim);">${fromDate}</td>
        <td style="color:var(--text-dim);">${toDate}</td>
        <td style="text-align:center;">${days}</td>
        <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">₹${formatPrice(item.price || 0)}</td>
        <td>${statusBadge(status)}</td>
        <td><div class="action-btns">
          ${status === 'New' ? `<button class="ab ab-confirm" onclick="setStatus('${orderId}','Confirmed')">Confirm</button>` : ''}
          ${status === 'Confirmed' || status === 'active' ? `<button class="ab ab-returned" onclick="setStatus('${orderId}','Returned')">Mark Returned</button>` : ''}
          <button class="ab ab-view" onclick="openDetail('${orderId}','order')">View</button>
        </div></td>
      </tr>`;
    }).join('');
    
  } catch (error) {
    console.error('Error loading rentals:', error);
    const tb = document.getElementById('rentalsTable');
    tb.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="ei">âŒ</div><p>Error loading rentals. Please try again.</p></div></td></tr>`;
  }
}

// -- ENQUIRIES PAGE -------------------------------------------------------
function renderEnquiriesPage(){
  const enqs=getEnquiries();
  const tb=document.getElementById('allEnqTable');
  if(enqs.length===0){tb.innerHTML=`<tr><td colspan="10"><div class="empty-state"><div class="ei">💬</div><p>No enquiries yet.</p></div></td></tr>`;return;}
  tb.innerHTML=enqs.map(e=>{
    const status=getEffectiveStatus(e);
    const orderId = getOrderId(e);
    const placedAt = e.placedAt || e.placed_at || '—';
    const customerName = e.customer?.name || e.customer_name || '—';
    const customerPhone = e.customer?.phone || e.customer_phone || '—';
    const customerEmail = e.customer?.email || e.customer_email || '—';
    const customerEvent = e.customer?.event || e.customer_event || '—';
    const customerNotes = e.customer?.notes || e.customer_notes || '—';
    return `<tr>
      <td style="font-family:'Cormorant Garamond',serif;color:var(--gold-light);">${orderId}</td>
      <td><strong style="color:var(--text);">${customerName}</strong></td>
      <td style="color:var(--text-dim);">${customerPhone}</td>
      <td style="color:var(--text-dim);">${customerEmail}</td>
      <td><span class="badge badge-enquiry">${e.requestType||'General'}</span></td>
      <td style="color:var(--text-dim);">${customerEvent}</td>
      <td style="color:var(--text-dim);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${customerNotes}">${customerNotes}</td>
      <td>${statusBadge(status)}</td>
      <td style="color:var(--text-dim);font-size:.78rem;">${placedAt}</td>
      <td><div class="action-btns">
        ${status==='New'?`<button class="ab ab-confirm" onclick="setStatus('${orderId}','Confirmed')">Acknowledge</button>`:''}
        <button class="ab ab-cancel" onclick="setStatus('${orderId}','Cancelled')">Close</button>
      </div></td>
    </tr>`;
  }).join('');
}

// -- PRODUCTS PAGE --------------------------------------------------------
let currentProductFilter = 'all';

function filterProductsByType(type, btn) {
  currentProductFilter = type;
  document.querySelectorAll('#page-products .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderProductsPage();
}

// Toggle inventory tabs dropdown (mobile)
function toggleInvTabs() {
  const dropdown = document.getElementById('invTabsDropdown');
  const hamburger = document.getElementById('invTabsHamburger');
  dropdown.classList.toggle('open');
  
  // Change icon
  const icon = hamburger.querySelector('.hamburger-icon');
  icon.textContent = dropdown.classList.contains('open') ? '✕' : '☰';
}

// Select inventory tab and update label (mobile)
function selectInvTab(label) {
  const labelEl = document.getElementById('invTabsLabel');
  labelEl.textContent = label;
  
  // Close dropdown
  const dropdown = document.getElementById('invTabsDropdown');
  dropdown.classList.remove('open');
  
  // Reset icon
  const hamburger = document.getElementById('invTabsHamburger');
  const icon = hamburger.querySelector('.hamburger-icon');
  icon.textContent = '☰';
}

function renderProductsPage(){
  const grid=document.getElementById('adminProductGrid');
  
  // Filter products based on type
  let filteredProducts = products;
  if (currentProductFilter !== 'all') {
    filteredProducts = products.filter(p => p.type === currentProductFilter);
  }
  
  if (filteredProducts.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-dim);">No products found for this category.</div>';
    return;
  }
  
  grid.innerHTML=filteredProducts.map(p=>{
    const base=getBaseStock(p.id);
    const consumed=getConsumedStock(p.id);
    const available=Math.max(0,base-consumed);
    const pct=base>0?Math.round((available/base)*100):0;

    // Color coding
    let stockClass='good', barColor='var(--green-bright)';
    if(available===0){stockClass='danger';barColor='#ff6b6b';}
    else if(available<=2){stockClass='warn';barColor='#ffaa44';}

    // Status label
    let statusLabel, statusClass;
    if(available===0){statusLabel='OUT OF STOCK';statusClass='unavail';}
    else if(available<=2){statusLabel=`⚠ LOW — ${available} left`;statusClass='warn-btn';}
    else{
      statusLabel=`✓ In Stock — ${available} available`;
      statusClass='avail';
    }

    const outOverlay=available===0?`<div class="out-of-stock-overlay"><span>Out of Stock</span></div>`:'';
    
    // Product type badge
    let typeBadge = '';
    if (p.type === 'rent') typeBadge = '<span class="badge" style="background:rgba(100,150,255,0.2);color:#6b9fff;border:1px solid rgba(100,150,255,0.3);font-size:.7rem;margin-left:4px;">📅 Rent</span>';
    else if (p.type === 'buy') typeBadge = '<span class="badge" style="background:rgba(255,180,100,0.2);color:#ffb464;border:1px solid rgba(255,180,100,0.3);font-size:.7rem;margin-left:4px;">💎 Buy</span>';
    else if (p.type === 'both') typeBadge = '<span class="badge" style="background:rgba(201,150,58,0.2);color:var(--gold-light);border:1px solid rgba(201,150,58,0.3);font-size:.7rem;margin-left:4px;">💎 Both</span>';

    return `<div class="prod-admin-card">
      ${outOverlay}
      ${p.image_url ? `<div style="text-align:center;margin-bottom:10px;"><img src="${p.image_url.startsWith('http') ? p.image_url : api.baseURL + p.image_url}" alt="${p.name}" style="max-width:100%;height:150px;object-fit:cover;border-radius:4px;border:1px solid rgba(201,150,58,0.2);"/></div>` : ''}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;">
        <span class="pac-icon" style="font-size:2rem;margin:0;">${p.icon}</span>
        <span class="badge ${available===0?'badge-cancelled':available<=2?'':'badge-confirmed'}" style="${available>2?'background:rgba(26,107,26,0.2);color:var(--green-bright);border:1px solid rgba(76,175,80,0.3);':''}">
          ${available===0?'Out of Stock':available<=2?'Low Stock':'In Stock'}
        </span>
      </div>
      <div class="pac-name">${p.name}${typeBadge}</div>
      <div class="pac-material" style="margin-bottom:10px;">${p.material} · ${p.category}</div>

      <div class="inv-stats">
        <div class="inv-stat neutral"><div class="inv-stat-num">${base}</div><div class="inv-stat-lbl">Total</div></div>
        <div class="inv-stat ${consumed>0?'warn':'good'}"><div class="inv-stat-num">${consumed}</div><div class="inv-stat-lbl">In Orders</div></div>
        <div class="inv-stat ${stockClass}"><div class="inv-stat-num">${available}</div><div class="inv-stat-lbl">Available</div></div>
      </div>

      <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>

      <div class="inv-row">
        <span class="inv-label">Total Stock</span>
        <div class="inv-controls">
          <button class="inv-btn" onclick="adjustStock(${p.id},-1)">-</button>
          <input class="inv-qty" type="number" value="${base}" min="0" onchange="setStockDirect(${p.id},this.value)" id="inv-input-${p.id}"/>
          <button class="inv-btn" onclick="adjustStock(${p.id},1)">+</button>
        </div>
      </div>

      <div class="pac-pricing" style="margin-bottom:10px;">
        ${p.rentPerDay?`<div class="pac-price"><div class="pac-price-label">Rent/Day</div><div class="pac-price-val">₹${p.rentPerDay}</div></div>`:''}
        ${p.buy?`<div class="pac-price"><div class="pac-price-label">Buy</div><div class="pac-price-val">₹${p.buy}</div></div>`:''}
      </div>

      <div class="toggle-avail ${available===0?'unavail':available<=2?'unavail':''} ${available>2?'avail':''}"
        style="${available<=2&&available>0?'border-color:#ffaa44;color:#ffaa44;':''}cursor:default;pointer-events:none;">
        ${statusLabel}
      </div>

      <button class="pac-delete-btn" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
        🗑️ Delete Product
      </button>
    </div>`;
  }).join('');
}

function adjustStock(id,delta){
  const current=getBaseStock(id);
  const newVal=Math.max(0,current+delta);
  setBaseStock(id,newVal);
  const input=document.getElementById(`inv-input-${id}`);
  if(input) input.value=newVal;
  syncAvailabilityFromStock(id,newVal);
  renderProductsPage();
  const p=products.find(x=>x.id===id);
  const avail=getAvailableQty(id);
  showToast(`"${p.name}" stock: ${newVal} total, ${avail} available`);
}

function setStockDirect(id,val){
  const newVal=Math.max(0,parseInt(val)||0);
  setBaseStock(id,newVal);
  syncAvailabilityFromStock(id,newVal);
  renderProductsPage();
  const p=products.find(x=>x.id===id);
  showToast(`"${p.name}" stock set to ${newVal}`);
}

// Delete product
async function deleteProduct(id, name) {
  // Confirm deletion
  const confirmed = confirm(`⚠️ Are you sure you want to delete "${name}"?\n\nThis action cannot be undone!`);
  
  if (!confirmed) return;
  
  try {
    // Check if API is available
    if (typeof api === 'undefined') {
      showToast('API not available - cannot delete product', 'error');
      return;
    }
    
    // Call API to delete product
    const response = await fetch(`${api.baseURL}/api/products/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete product');
    }
    
    // Remove from local products array
    const index = products.findIndex(p => p.id === id);
    if (index > -1) {
      products.splice(index, 1);
    }
    
    // Re-render products page
    renderProductsPage();
    
    showToast(`✅ "${name}" deleted successfully`);
    
    // Reload products from API to ensure sync
    await loadProductsFromAPI();
    renderProductsPage();
    
  } catch (error) {
    console.error('Error deleting product:', error);
    showToast(`Failed to delete product: ${error.message}`, 'error');
  }
}

// Keep old availability flag in sync so client side reflects out-of-stock
function syncAvailabilityFromStock(id,baseQty){
  const avail=getAvailability();
  const available=Math.max(0,baseQty-getConsumedStock(id));
  avail[id]=(available>0);
  saveAvailability(avail);
}

// -- CUSTOMERS PAGE -------------------------------------------------------
function renderCustomersPage(search=''){
  loadOrdersFromAPI().then(() => {
    const orders=getOrders().filter(o=>o.type==='order');
    const enqs=getEnquiries();
  const custMap={};
  
  // Helper function to normalize phone numbers
  const normalizePhone = (phone) => {
    if (!phone) return null;
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // If starts with 91 and has 12 digits, remove country code
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.substring(2);
    }
    return digits;
  };
  
  [...orders,...enqs].forEach(item=>{
    // Handle both nested customer object and flat fields
    const customerPhone = item.customer?.phone || item.customer_phone;
    const customerName = item.customer?.name || item.customer_name;
    const customerEmail = item.customer?.email || item.customer_email || '';
    
    if(!customerPhone) return;
    
    // Normalize phone number for grouping
    const normalizedPhone = normalizePhone(customerPhone);
    if(!normalizedPhone) return;
    
    if(!custMap[normalizedPhone]){
      custMap[normalizedPhone]={name:customerName,phone:customerPhone,email:customerEmail,orders:[],enquiries:[]};
    }
    
    // Check if it's an order or enquiry (enquiries don't have type field in DB)
    const isOrder = item.type === 'order' || (item.total !== undefined && item.total !== null);
    
    if(isOrder) {
      custMap[normalizedPhone].orders.push(item);
    } else {
      custMap[normalizedPhone].enquiries.push(item);
    }
  });
  const custs=Object.values(custMap);
  const container=document.getElementById('customersContainer');
  let filtered=custs;
  if(search) filtered=custs.filter(c=>c.name?.toLowerCase().includes(search.toLowerCase())||c.phone?.includes(search));
  if(filtered.length===0){
    container.innerHTML=`<div class="empty-state"><div class="ei">💎</div><p>No customers yet. Customers who place orders or enquiries appear here.</p></div>`;
    return;
  }
  container.innerHTML=filtered.map(c=>{
    const totalSpend=c.orders.reduce((s,o)=>s+parseFloat(o.total||0),0);
    return `<div class="customer-card">
      <div class="cust-info">
        <h4>${c.name || 'Unknown Customer'}</h4>
        <p>📞 ${c.phone}${c.email?` &nbsp;|&nbsp; ✉️ ${c.email}`:''}</p>
        <p style="margin-top:4px;">${c.orders.length} order(s) &nbsp;·&nbsp; ${c.enquiries.length} enquiry(ies)</p>
      </div>
      <div class="cust-stats">
        <div class="cs-num">₹${formatPrice(totalSpend)}</div>
        <div class="cs-label">Total Value</div>
      </div>
    </div>`;
  }).join('');
  }); // Close the promise
}

// -- ORDER DETAIL MODAL ---------------------------------------------------
function openDetail(id, type){
  const all=[...getOrders(),...getEnquiries()];
  const item=all.find(o=>(o.orderId === id || o.order_id === id));
  if(!item) return;
  const status=getEffectiveStatus(item);
  const placedAt = item.placedAt || item.placed_at || '—';
  document.getElementById('detailTitle').textContent=(type==='enquiry'?'💬 Enquiry: ':'💎₹ Order: ')+id;
  
  // Handle both nested customer object and flat fields
  const customerName = item.customer?.name || item.customer_name || '—';
  const customerPhone = item.customer?.phone || item.customer_phone || '—';
  const customerEmail = item.customer?.email || item.customer_email || '—';
  const customerEvent = item.customer?.event || item.customer_event || '—';
  const customerAddress = item.customer?.address || item.customer_address || '—';
  
  let html=`<div class="detail-grid">
    <div class="detail-field"><label>Customer Name</label><span>${customerName}</span></div>
    <div class="detail-field"><label>Phone</label><span>${customerPhone}</span></div>
    <div class="detail-field"><label>Email</label><span>${customerEmail}</span></div>
    <div class="detail-field"><label>Occasion</label><span>${customerEvent}</span></div>
    <div class="detail-field"><label>Delivery Address</label><span>${customerAddress}</span></div>
    <div class="detail-field"><label>Date & Time</label><span>${placedAt}</span></div>
  </div>`;
  if(type==='order'&&item.items?.length>0){
    html+=`<div class="detail-items"><h4>Order Items</h4>`;
    item.items.forEach(i=>{
      const typeLabel=i.mode==='rent'?'Rental':'Purchase';
      const tc=i.mode==='rent'?'badge-rent':'badge-buy';
      const dates=i.rentalData?`<br><small style="color:var(--text-dim);">📅 ${i.rentalData.from} â†’ ${i.rentalData.to} (${i.rentalData.days} days)</small>`:'';
      const itemName = i.product_name || i.name || i.productName || 'Unknown Item';
      html+=`<div class="di-row"><div class="di-name">${i.icon||''} ${itemName} <span class="badge ${tc}">${typeLabel}</span>${dates}</div><div class="di-price">₹${formatPrice(i.price||0)}</div></div>`;
    });
    html+=`<div class="di-row" style="border-top:1px solid rgba(201,150,58,0.2);padding-top:10px;"><div style="color:var(--text-dim);text-transform:uppercase;font-size:.75rem;letter-spacing:.1em;">Total</div><div class="di-price" style="font-size:1.3rem;">₹${formatPrice(item.total||0)}</div></div></div>`;
  }
  
  // Handle customer notes from both formats
  const customerNotes = item.customer?.notes || item.customer_notes;
  if(customerNotes){
    html+=`<div class="detail-field" style="margin-bottom:16px;"><label>Notes / Message</label><span>${customerNotes}</span></div>`;
  }
  html+=`<div class="status-change">
    <label>Update Status:</label>
    <select class="status-select" id="detailStatus">
      <option ${status==='New'?'selected':''}>New</option>
      <option ${status==='Confirmed'?'selected':''}>Confirmed</option>
      <option ${status==='Returned'?'selected':''}>Returned</option>
      <option ${status==='Cancelled'?'selected':''}>Cancelled</option>
    </select>
    <button class="status-update-btn" onclick="setStatus('${id}',document.getElementById('detailStatus').value);closeDetail();">Update</button>
  </div>`;
  document.getElementById('detailContent').innerHTML=html;
  document.getElementById('detailModal').classList.add('open');
  currentDetailId=id; currentDetailType=type;
}
function closeDetail(){ document.getElementById('detailModal').classList.remove('open'); }
document.getElementById('detailModal').addEventListener('click',function(e){ if(e.target===this) closeDetail(); });

// -- TOAST ----------------------------------------------------------------
function showToast(msg,type='success'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast'+(type==='error'?' error-toast':'');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// -- CHECK SESSION ON PAGE LOAD -------------------------------------------
checkSession();

// -- BULK IMPORT FUNCTIONS -------------------------------------------------
function openBulkImportModal() {
  document.getElementById('bulkImportModal').classList.add('open');
  document.getElementById('bulkImportFile').value = '';
  document.getElementById('bulkImportProgress').style.display = 'none';
  document.getElementById('importResults').innerHTML = '';
}

function closeBulkImportModal() {
  document.getElementById('bulkImportModal').classList.remove('open');
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const products = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;
    
    const product = {};
    headers.forEach((header, index) => {
      const value = values[index];
      if (header === 'rentPerDay' || header === 'buy') {
        product[header] = value ? parseFloat(value) : null;
      } else if (header === 'baseStock') {
        product[header] = value ? parseInt(value) : 5;
      } else {
        product[header] = value || null;
      }
    });
    
    if (product.name && product.material && product.category && product.type) {
      products.push(product);
    }
  }
  
  return products;
}

async function processBulkImport() {
  const fileInput = document.getElementById('bulkImportFile');
  const file = fileInput.files[0];
  
  if (!file) {
    showToast('Please select a file to import', 'error');
    return;
  }
  
  const progressDiv = document.getElementById('bulkImportProgress');
  const progressText = document.getElementById('progressText');
  const progressCount = document.getElementById('progressCount');
  const progressBar = document.getElementById('progressBar');
  const resultsDiv = document.getElementById('importResults');
  
  progressDiv.style.display = 'block';
  resultsDiv.innerHTML = '';
  
  try {
    const text = await file.text();
    let products = [];
    
    if (file.name.endsWith('.json')) {
      products = JSON.parse(text);
      if (!Array.isArray(products)) {
        throw new Error('JSON must be an array of products');
      }
    } else if (file.name.endsWith('.csv')) {
      products = parseCSV(text);
    } else {
      throw new Error('Unsupported file format. Use CSV or JSON.');
    }
    
    if (products.length === 0) {
      throw new Error('No valid products found in file');
    }
    
    progressText.textContent = 'Importing products...';
    progressCount.textContent = `0/${products.length}`;
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // Validate required fields
        if (!product.name || !product.material || !product.category || !product.type) {
          throw new Error('Missing required fields');
        }
        
        // Validate type-specific prices
        if (product.type === 'rent' && !product.rentPerDay) {
          throw new Error('Rent price required for rent type');
        }
        if (product.type === 'buy' && !product.buy) {
          throw new Error('Buy price required for buy type');
        }
        if (product.type === 'both' && (!product.rentPerDay || !product.buy)) {
          throw new Error('Both prices required for both type');
        }
        
        // Set defaults
        product.icon = product.icon || '💎';
        product.baseStock = product.baseStock || 5;
        product.imageUrl = product.imageUrl || null;
        
        // Create product via API
        await api.createProduct(product);
        successCount++;
        
        resultsDiv.innerHTML += `<div style="color:#4CAF50;font-size:0.85rem;padding:4px;">✓ ${product.name}</div>`;
      } catch (error) {
        failCount++;
        errors.push({ product: product.name || `Row ${i + 1}`, error: error.message });
        resultsDiv.innerHTML += `<div style="color:#ff6b6b;font-size:0.85rem;padding:4px;">✗ ${product.name || `Row ${i + 1}`}: ${error.message}</div>`;
      }
      
      // Update progress
      const progress = ((i + 1) / products.length) * 100;
      progressBar.style.width = `${progress}%`;
      progressCount.textContent = `${i + 1}/${products.length}`;
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    progressText.textContent = `Complete: ${successCount} succeeded, ${failCount} failed`;
    
    if (successCount > 0) {
      showToast(`✅ Successfully imported ${successCount} products!`);
      await loadProductsFromAPI();
      renderProductsPage();
    }
    
    if (failCount > 0) {
      showToast(`⚠️ ${failCount} products failed to import`, 'error');
    }
    
  } catch (error) {
    console.error('Bulk import error:', error);
    showToast(`Import failed: ${error.message}`, 'error');
    progressText.textContent = 'Import failed';
  }
}

// -- ADD PRODUCT FUNCTIONS -------------------------------------------------
function openAddProductModal() {
  document.getElementById('addProductModal').classList.add('open');
  // Reset form
  document.getElementById('newProductName').value = '';
  document.getElementById('newProductMaterial').value = '';
  document.getElementById('newProductIcon').value = '💎';
  document.getElementById('newProductCategory').value = '';
  document.getElementById('newProductType').value = 'both';
  document.getElementById('newProductRent').value = '';
  document.getElementById('newProductBuy').value = '';
  document.getElementById('newProductStock').value = '5';
  togglePriceFields();
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('open');
}

function togglePriceFields() {
  const type = document.getElementById('newProductType').value;
  const rentGroup = document.getElementById('rentPriceGroup');
  const buyGroup = document.getElementById('buyPriceGroup');
  
  if (type === 'rent') {
    rentGroup.style.display = 'block';
    buyGroup.style.display = 'none';
    document.getElementById('newProductBuy').value = '';
  } else if (type === 'buy') {
    rentGroup.style.display = 'none';
    buyGroup.style.display = 'block';
    document.getElementById('newProductRent').value = '';
  } else {
    rentGroup.style.display = 'block';
    buyGroup.style.display = 'block';
  }
}

async function saveNewProduct() {
  const name = document.getElementById('newProductName').value.trim();
  const material = document.getElementById('newProductMaterial').value.trim();
  const icon = document.getElementById('newProductIcon').value.trim() || '💎';
  const category = document.getElementById('newProductCategory').value.trim();
  const type = document.getElementById('newProductType').value;
  const rentPerDay = parseFloat(document.getElementById('newProductRent').value) || null;
  const buy = parseFloat(document.getElementById('newProductBuy').value) || null;
  const baseStock = parseInt(document.getElementById('newProductStock').value) || 5;
  const imageFile = document.getElementById('newProductImage').files[0];
  
  // Validation
  if (!name || !material || !category) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  if (type === 'rent' && !rentPerDay) {
    showToast('Please enter rent per day price', 'error');
    return;
  }
  
  if (type === 'buy' && !buy) {
    showToast('Please enter buy price', 'error');
    return;
  }
  
  if (type === 'both' && (!rentPerDay || !buy)) {
    showToast('Please enter both rent and buy prices', 'error');
    return;
  }
  
  try {
    let imageUrl = null;
    
    // Upload image if selected
    if (imageFile) {
      showToast('Uploading image...', 'info');
      const uploadResult = await api.uploadProductImage(imageFile);
      imageUrl = uploadResult.imageUrl;
    }
    
    const productData = {
      name, material, icon, rentPerDay, buy, type, category, baseStock, imageUrl
    };
    
    if (typeof api !== 'undefined') {
      const result = await api.createProduct(productData);
      showToast('✅ Product added successfully!');
      closeAddProductModal();
      // Reload products
      await loadProductsFromAPI();
      renderProductsPage();
    } else {
      showToast('Backend not available', 'error');
    }
  } catch (error) {
    console.error('Error adding product:', error);
    showToast('Failed to add product', 'error');
  }
}

// Image preview
document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('newProductImage');
  if (imageInput) {
    imageInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('previewImg').src = e.target.result;
          document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

// -- CHANGE PASSWORD FUNCTIONS ---------------------------------------------
function showChangePassword() {
  document.getElementById('changePasswordModal').classList.add('open');
  // Clear form
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.remove('open');
}

async function saveNewPassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showToast('New password must be at least 6 characters', 'error');
    return;
  }
  
  try {
    const username = localStorage.getItem('mlr_admin_user');
    
    // Update password using the dedicated endpoint
    const updateResponse = await fetch(`${api.baseURL}/api/auth/update-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username: username,
        currentPassword: currentPassword,
        newPassword: newPassword 
      })
    });
    
    const result = await updateResponse.json();
    
    if (updateResponse.ok) {
      showToast('✅ Password updated successfully!');
      closeChangePasswordModal();
    } else {
      showToast(result.error || 'Failed to update password', 'error');
    }
    
  } catch (error) {
    console.error('Password change error:', error);
    showToast('Failed to update password. Please try again.', 'error');
  }
}

// Close modal when clicking outside
document.getElementById('changePasswordModal').addEventListener('click', function(e) {
  if (e.target === this) closeChangePasswordModal();
});

// -- REAL-TIME UPDATES WITH SOCKET.IO --------------------------------------
const socket = io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Real-time updates connected');
});

// Throttle function to prevent excessive API calls
let lastRefreshTime = 0;
const REFRESH_THROTTLE = 2000; // 2 seconds minimum between refreshes

function throttledRefresh() {
  const now = Date.now();
  if (now - lastRefreshTime > REFRESH_THROTTLE) {
    lastRefreshTime = now;
    refreshAll();
  }
}

socket.on('productAdded', async (product) => {
  console.log('New product added:', product);
  await loadProductsFromAPI();
  renderProductsPage();
  showToast('✨ New product added!');
});

socket.on('productUpdated', async (product) => {
  console.log('Product updated:', product);
  await loadProductsFromAPI();
  renderProductsPage();
  showToast('✨ Product updated!');
});

socket.on('productDeleted', async (data) => {
  console.log('Product deleted:', data);
  await loadProductsFromAPI();
  renderProductsPage();
  showToast('Product deleted');
});

socket.on('orderCreated', async (order) => {
  console.log('New order:', order);
  await loadOrdersFromAPI();
  throttledRefresh(); // Use throttled refresh instead of immediate refreshAll
  showToast('💎” New order received!');
});

socket.on('orderUpdated', async (data) => {
  console.log('Order updated:', data);
  await loadOrdersFromAPI();
  throttledRefresh(); // Use throttled refresh instead of immediate refreshAll
});

socket.on('disconnect', () => {
  console.log('⚠️ Real-time updates disconnected');
});
