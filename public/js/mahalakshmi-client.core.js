// -- PRODUCTS DATA (loaded from API) ---------------------------------------
let products = [];

// Fallback products if API is not available
const fallbackProducts = [
  {id:1,name:"Lakshmi Haram Set",material:"Antique Gold Finish",icon:"📿",rentPerDay:150,buy:3200,type:"both",category:"Haram",availableQty:5,isAvailable:true},
  {id:2,name:"Bridal Maang Tikka",material:"Kundan & Meenakari",icon:"👑",rentPerDay:80,buy:1800,type:"both",category:"Maang Tikka",availableQty:5,isAvailable:true},
  {id:3,name:"Temple Necklace",material:"Gold-Plated Copper",icon:"💛",rentPerDay:120,buy:2400,type:"both",category:"Necklace",availableQty:5,isAvailable:true},
  {id:4,name:"Jimikki Earrings",material:"South Indian Style",icon:"👂",rentPerDay:50,buy:950,type:"both",category:"Earrings",availableQty:5,isAvailable:true},
  {id:5,name:"Full Bridal Set",material:"Antique Gold 12-Piece",icon:"🌸",rentPerDay:600,buy:null,type:"rent",category:"Bridal",availableQty:3,isAvailable:true},
  {id:6,name:"Kangan Bangles (Set 4)",material:"Gold-Plated Brass",icon:"⭕",rentPerDay:null,buy:1200,type:"buy",category:"Bangles",availableQty:8,isAvailable:true},
  {id:7,name:"Navaratna Necklace",material:"Stone-Studded",icon:"🔮",rentPerDay:180,buy:2800,type:"both",category:"Necklace",availableQty:4,isAvailable:true},
  {id:8,name:"Antique Toe Ring Pair",material:"Sterling Silver Finish",icon:"🦶",rentPerDay:null,buy:450,type:"buy",category:"Anklets",availableQty:10,isAvailable:true}
];

// -- CART STATE ------------------------------------------------------------
let cart = CartManager.getCart(); // Load from localStorage
let currentFilter = 'all';
let currentCategory = null; // For category filter from category chips
let rentalProductId = null;

// -- HELPER FUNCTIONS -----------------------------------------------------
// Format price - remove .00 if whole number
function formatPrice(price) {
  const num = parseFloat(price);
  if (isNaN(num)) return '0';
  // If it's a whole number, don't show decimals
  return num % 1 === 0 ? num.toLocaleString() : num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

let currentStep = 1;

// Load products from API
async function loadProducts() {
  try {
    // Check if api is defined
    if(typeof api === 'undefined') {
      console.warn('API not available, using fallback products');
      products = fallbackProducts;
      renderProducts(currentFilter);
      return;
    }

    const allProducts = await api.getProducts();

    // Ensure we have an array before using it
    if (Array.isArray(allProducts)) {
      products = allProducts;
      console.log('✅ Products loaded from API:', products.length);
    } else {
      console.error('Unexpected products payload (not an array):', allProducts);
      products = fallbackProducts;
    }
    renderProducts(currentFilter);
  } catch (error) {
    console.error('❌ Error loading products from API:', error);
    console.log('Using fallback products');
    products = fallbackProducts;
    renderProducts(currentFilter);
    showToast('Using offline mode - some features may be limited', 'error');
  }
}
// -- RENDER PRODUCTS -------------------------------------------------------
function renderProducts(filter='all'){
  const grid = document.getElementById('productsGrid');
  let list = filter==='all' ? products : products.filter(p=>p.type===filter);
  if (currentCategory) {
    list = list.filter(p=>p.category===currentCategory||p.name.includes(currentCategory));
  }
  grid.innerHTML = list.map(p=>{
    const availQty = p.availableQty || 0;
    const isAvail = p.isAvailable;
    const badgeClass = p.type==='both'?'badge-both':p.type==='rent'?'badge-rent':'badge-buy';
    const badgeText = p.type==='both'?'Rent & Buy':p.type==='rent'?'For Rent':'For Sale';

    // Availability display
    let availClass, availText;
    if(!isAvail || availQty===0){ availClass='avail-no'; availText='Sold'; }
    else if(availQty<=2){ availClass='avail-low'; availText=`Only ${availQty} left!`; }
    else{ availClass='avail-yes'; availText=`${availQty} Available`; }

    const canAct = isAvail && availQty > 0;

    // Check if item is in cart
    const cartItem = cart.find(c=>c.id===p.id&&c.mode==='buy');
    const inCartQty = cartItem ? cartItem.quantity : 0;

    const rentBtn = (p.type==='rent'||p.type==='both') && canAct
      ? `<button class="btn-rent" onclick="openRentalModal(${p.id})">📅 Book Rental</button>`
      : '';

    let buyBtn = '';
    if(p.type==='buy'||p.type==='both'){
      if(!canAct){
        buyBtn = '';
      } else if(inCartQty > 0){
        // Show quantity controls if in cart
        buyBtn = `<div class="btn-cart btn-added" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:8px;">
          <button onclick="event.stopPropagation();decreaseFromProduct(${p.id})" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;font-size:1.1rem;border-radius:2px;">−</button>
          <span style="font-weight:700;min-width:30px;text-align:center;">${inCartQty}</span>
          <button onclick="event.stopPropagation();addToCart(${p.id},'buy')" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;font-size:1.1rem;border-radius:2px;">+</button>
        </div>`;
      } else {
        buyBtn = `<button class="btn-cart" id="bcart-${p.id}" onclick="addToCart(${p.id},'buy')">🛒 Add to Cart</button>`;
      }
    }

    let actions = '';
    if(!canAct){
      actions = `<button class="btn-full" style="opacity:.5;cursor:not-allowed;background:#3a1010;color:#ff8888;border:1px solid #8B1A1A;">✗ Sold</button>`;
    } else if(rentBtn && buyBtn){
      actions = `<div class="product-actions">${buyBtn}${rentBtn}</div>`;
    } else if(rentBtn){
      actions = `<div class="product-actions">${rentBtn}</div>`;
    } else if(buyBtn){
      actions = `<div class="product-actions">${buyBtn}</div>`;
    }
    return `
    <div class="product-card">
      <div class="product-img" style="${p.image_url ? `background-image:url('${p.image_url.startsWith('http') ? p.image_url : api.baseURL + p.image_url}');background-size:cover;background-position:center;` : ''}">
        ${!p.image_url ? p.icon : ''}
        <span class="product-badge ${badgeClass}">${badgeText}</span>
        <span class="avail-tag ${availClass}">${availText}</span>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-material">${p.material}</div>
        <div class="product-pricing">
          ${p.rentPerDay?`<div><div class="price-label">Rent/Day</div><div class="price-val">₹${p.rentPerDay}</div></div>`:''}
          ${p.rentPerDay&&p.buy?'<div class="price-divider"></div>':''}
          ${p.buy?`<div><div class="price-label">Buy</div><div class="price-val">₹${p.buy}</div></div>`:''}
        </div>
        ${actions}
      </div>
    </div>`;
  }).join('');
}

function decreaseFromProduct(id){
  const cartItem = cart.find(c=>c.id===id&&c.mode==='buy');
  if(!cartItem) return;

  if(cartItem.quantity <= 1){
    // Remove from cart
    const idx = cart.indexOf(cartItem);
    cart.splice(idx, 1);
  } else {
    cartItem.quantity--;
    cartItem.price = cartItem.unitPrice * cartItem.quantity;
  }

  updateCartUI();
  renderProducts(currentFilter);
}

function filterProducts(type, btn){
  currentFilter = type; // Store current filter
  currentCategory = null; // Clear category when switching type tabs
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderProducts(type);
}

function filterByCategory(cat){
  document.getElementById('products').scrollIntoView({behavior:'smooth'});
  setTimeout(()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tab')[0].classList.add('active');
    currentFilter = 'all';
    currentCategory = cat;
    renderProducts('all');
  },400);
}

// -- CART LOGIC ------------------------------------------------------------
function addToCart(id, mode, rentalData=null){
  const p = products.find(x=>x.id===id);
  if(!p) return;

  // Check available stock
  const availableQty = p.availableQty || 0;
  const existing = cart.find(c=>c.id===id&&c.mode===mode&&JSON.stringify(c.rentalData)===JSON.stringify(rentalData));
  const currentQtyInCart = existing ? existing.quantity : 0;

  // Validate stock before adding
  if(currentQtyInCart >= availableQty){
    showToast(`Only ${availableQty} available!`, 'error');
    return;
  }

  if(existing){
    existing.quantity = (existing.quantity || 1) + 1;
    existing.price = mode==='buy' ? p.buy * existing.quantity : (rentalData ? rentalData.total * existing.quantity : p.rentPerDay * existing.quantity);
  } else {
    const item = {
      id, name:p.name, icon:p.icon, mode,
      quantity: 1,
      unitPrice: mode==='buy' ? p.buy : (rentalData ? rentalData.total : p.rentPerDay),
      price: mode==='buy' ? p.buy : (rentalData ? rentalData.total : p.rentPerDay),
      rentalData: rentalData||null
    };
    cart.push(item);
  }

  // Track analytics
  if (window.Analytics) {
    window.Analytics.trackEcommerce('add_to_cart', {
      productId: id,
      productName: p.name,
      category: p.category,
      mode: mode,
      price: mode==='buy' ? p.buy : (rentalData ? rentalData.total : p.rentPerDay),
      quantity: 1
    });
  }

  updateCartUI();
  renderProducts(currentFilter);
  if(mode==='buy'){
    const btn = document.getElementById(`bcart-${id}`);
    if(btn){
      const qty = cart.find(c=>c.id===id&&c.mode===mode)?.quantity || 1;
      btn.innerHTML = `✓ In Cart (${qty})`;
      btn.classList.add('btn-added');
    }
  }
  showToast(`✓ "${p.name}" added to cart!`);
}

function removeFromCart(idx){
  cart.splice(idx,1);
  updateCartUI();
  renderCartItems();
  renderProducts(currentFilter); // Immediate UI update
  loadProducts(); // Refresh product availability from API
}

function clearCart(){
  cart=[];
  updateCartUI();
  renderCartItems();
  renderProducts(currentFilter); // Immediate UI update
  loadProducts(); // Refresh product availability from API
}

function updateCartUI(){
  const badge = document.getElementById('cartBadge');
  const mobileBadge = document.getElementById('cartBadgeMobile');
  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  if(totalItems>0){
    badge.textContent=totalItems;
    badge.classList.add('visible');
    if(mobileBadge) mobileBadge.textContent=totalItems;
  } else {
    badge.classList.remove('visible');
    if(mobileBadge) mobileBadge.textContent='0';
  }

  // Save cart to localStorage
  CartManager.saveCart(cart);

  // Update all buy buttons
  cart.forEach(item => {
    if(item.mode === 'buy') {
      const btn = document.getElementById(`bcart-${item.id}`);
      if(btn) {
        btn.innerHTML = `✓ In Cart (${item.quantity})`;
        btn.classList.add('btn-added');
      }
    }
  });
}

function openCart(){
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
  renderCartItems();
}
function closeCart(){
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartDrawer').classList.remove('open');
}

function renderCartItems(){
  const el = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if(cart.length===0){
    el.innerHTML=`<div class="cart-empty"><div class="empty-icon">🛒</div><p>Your cart is empty</p><p style="margin-top:8px;font-size:.8rem;">Browse our collection and add items!</p></div>`;
    footer.style.display='none'; return;
  }
  footer.style.display='block';

  // Separate items by mode
  const buyItems = cart.filter(item => item.mode === 'buy');
  const rentItems = cart.filter(item => item.mode === 'rent');

  let html = '';
  let total = 0;

  // Buy Items Section
  if (buyItems.length > 0) {
    html += `<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(201,150,58,0.1);border-left:3px solid var(--gold);margin-bottom:12px;">
        <span style="font-size:1.1rem;">💰</span>
        <span style="font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-light);flex:1;">Buy Items</span>
        <span style="font-size:.7rem;color:rgba(240,201,107,0.6);background:rgba(201,150,58,0.2);padding:2px 8px;border-radius:10px;">${buyItems.length}</span>
      </div>`;

    buyItems.forEach(item => {
      const idx = cart.indexOf(item);
      const itemTotal = parseFloat(item.price || 0);
      total += itemTotal;
      const qty = item.quantity || 1;

      html += `<div class="cart-item">
        <div class="ci-icon">${item.icon}</div>
        <div class="ci-info">
          <div class="ci-name">${item.name}</div>
          <span class="ci-type buy">Purchase</span>
          <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
            <button onclick="updateQuantity(${idx},-1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;">−</button>
            <span style="color:var(--gold-light);font-weight:600;min-width:20px;text-align:center;">${qty}</span>
            <button onclick="updateQuantity(${idx},1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;">+</button>
          </div>
          <div class="ci-price">₹${formatPrice(itemTotal)} ${qty>1?`(₹${formatPrice(item.unitPrice)} × ${qty})`:''}</div>
        </div>
        <button class="ci-remove" onclick="removeFromCart(${idx})">✕</button>
      </div>`;
    });

    html += `</div>`;
  }

  // Rent Items Section
  if (rentItems.length > 0) {
    html += `<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(201,150,58,0.1);border-left:3px solid var(--gold);margin-bottom:12px;">
        <span style="font-size:1.1rem;">📅</span>
        <span style="font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-light);flex:1;">Rental Items</span>
        <span style="font-size:.7rem;color:rgba(240,201,107,0.6);background:rgba(201,150,58,0.2);padding:2px 8px;border-radius:10px;">${rentItems.length}</span>
      </div>`;

    rentItems.forEach(item => {
      const idx = cart.indexOf(item);
      const itemTotal = parseFloat(item.price || 0);
      total += itemTotal;
      const qty = item.quantity || 1;
      const datesHtml = item.rentalData ? `<div class="ci-dates">📅 ${item.rentalData.from} → ${item.rentalData.to} (${item.rentalData.days} days)</div>`:'';

      html += `<div class="cart-item">
        <div class="ci-icon">${item.icon}</div>
        <div class="ci-info">
          <div class="ci-name">${item.name}</div>
          <span class="ci-type rent">Rental</span>
          ${datesHtml}
          <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
            <button onclick="updateQuantity(${idx},-1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;">−</button>
            <span style="color:var(--gold-light);font-weight:600;min-width:20px;text-align:center;">${qty}</span>
            <button onclick="updateQuantity(${idx},1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;">+</button>
          </div>
          <div class="ci-price">₹${formatPrice(itemTotal)} ${qty>1?`(₹${formatPrice(item.unitPrice)}/day × ${qty})`:''}</div>
        </div>
        <button class="ci-remove" onclick="removeFromCart(${idx})">✕</button>
      </div>`;
    });

    html += `</div>`;
  }

  el.innerHTML = html;
  document.getElementById('cartTotal').textContent='₹'+formatPrice(total);
}

function updateQuantity(idx, change) {
  const item = cart[idx];
  const newQty = (item.quantity || 1) + change;

  if(newQty <= 0) {
    removeFromCart(idx);
    return;
  }

  const product = products.find(p => p.id === item.id);
  if(!product) return;

  // Check if enough stock available
  if(newQty > product.availableQty) {
    showToast(`Only ${product.availableQty} available!`, 'error');
    return;
  }

  item.quantity = newQty;
  item.price = item.unitPrice * newQty;

  updateCartUI();
  renderCartItems();
  renderProducts(currentFilter);
}

// -- RENTAL MODAL ----------------------------------------------------------
function openRentalModal(id){
  rentalProductId=id;
  const p=products.find(x=>x.id===id);
  document.getElementById('rentalProductName').textContent=`📿 ${p.name} — ₹${p.rentPerDay}/day`;
  document.getElementById('rental-qty').value = 1;
  document.getElementById('rental-avail-info').textContent = `${p.availableQty} available`;
  const today=new Date().toISOString().split('T')[0];
  document.getElementById('rent-from').min=today;
  document.getElementById('rent-to').min=today;
  document.getElementById('rent-from').value='';
  document.getElementById('rent-to').value='';
  document.getElementById('rentalDaysInfo').textContent='Select dates to see rental duration & cost';
  document.getElementById('rentalModal').classList.add('open');
}
function closeRentalModal(){ document.getElementById('rentalModal').classList.remove('open'); }

function updateRentalQty(change) {
  const input = document.getElementById('rental-qty');
  const p = products.find(x=>x.id===rentalProductId);
  const newQty = Math.max(1, parseInt(input.value) + change);

  if(newQty > p.availableQty) {
    showToast(`Only ${p.availableQty} available!`, 'error');
    return;
  }

  input.value = newQty;
  calcDays();
}

function calcDays(){
  const from=document.getElementById('rent-from').value;
  const to=document.getElementById('rent-to').value;
  const qty = parseInt(document.getElementById('rental-qty').value) || 1;
  const info=document.getElementById('rentalDaysInfo');
  if(!from||!to){ info.textContent='Select both dates'; return; }
  const d1=new Date(from), d2=new Date(to);
  if(d2<=d1){ info.textContent='⚠️ End date must be after start date'; return; }
  const days=Math.ceil((d2-d1)/(1000*60*60*24));
  const p=products.find(x=>x.id===rentalProductId);
  const unitTotal=days*p.rentPerDay;
  const total=unitTotal*qty;
  info.innerHTML=`📅 <strong>${days} day${days>1?'s':''}</strong> rental &nbsp;|&nbsp; ₹${formatPrice(p.rentPerDay)}/day × ${days} ${qty>1?`× ${qty} items`:''} = <strong>₹${formatPrice(total)}</strong>`;
}

function confirmRental(){
  const from=document.getElementById('rent-from').value;
  const to=document.getElementById('rent-to').value;
  const qty = parseInt(document.getElementById('rental-qty').value) || 1;
  if(!from||!to){ showToast('Please select rental dates','error'); return; }
  const d1=new Date(from), d2=new Date(to);
  if(d2<=d1){ showToast('End date must be after start date','error'); return; }
  const days=Math.ceil((d2-d1)/(1000*60*60*24));
  const p=products.find(x=>x.id===rentalProductId);
  const unitTotal=days*p.rentPerDay;
  const total=unitTotal*qty;

  // Add to cart with quantity
  for(let i=0; i<qty; i++) {
    addToCart(rentalProductId,'rent',{from,to,days,total:unitTotal});
  }

  closeRentalModal();
}

// -- CHECKOUT --------------------------------------------------------------
function openCheckout(){
  if(cart.length===0){ showToast('Your cart is empty!','error'); return; }
  closeCart();

  // Pre-fill customer details if logged in (like Amazon)
  if(currentUser){
    document.getElementById('co-name').value = currentUser.name || '';
    document.getElementById('co-phone').value = currentUser.phone || '';
    document.getElementById('co-email').value = currentUser.email || '';
    document.getElementById('co-address').value = currentUser.address || '';

    // Show a subtle indicator that info is pre-filled
    if(currentUser.name && currentUser.phone){
      showToast('✓ Your details are pre-filled', 'success');
    }
  }

  currentStep=1;
  updateStepUI();
  populateOrderSummary();

  // Small delay to ensure cart drawer closes first
  setTimeout(() => {
    document.getElementById('checkoutModal').classList.add('open');
  }, 100);
}
function closeCheckout(){
  document.getElementById('checkoutModal').classList.remove('open');
  // Reset after success
  if(currentStep===4){ cart=[]; updateCartUI(); renderProducts('all'); }
}

function goStep(n){
  console.log('Going to step:', n);
  if(n===3){
    const name=document.getElementById('co-name').value.trim();
    const phone=document.getElementById('co-phone').value.trim();

    // Validate required fields
    if(!name){
      showToast('⚠️ Please enter your full name','error');
      document.getElementById('co-name').focus();
      return;
    }
    if(!phone){
      showToast('⚠️ Please enter your phone number','error');
      document.getElementById('co-phone').focus();
      return;
    }

    // Validate phone number format (basic check)
    const phoneRegex = /^[+]?[\d\s-]{10,}$/;
    if(!phoneRegex.test(phone)){
      showToast('⚠️ Please enter a valid phone number','error');
      document.getElementById('co-phone').focus();
      return;
    }

    populateConfirm();
  }
  currentStep=n; updateStepUI();
  console.log('Current step is now:', currentStep);
}

function updateStepUI(){
  for(let i=1;i<=3;i++){
    const el=document.getElementById(`cstep${i}`);
    el.classList.remove('active','done');
    if(i<currentStep) el.classList.add('done');
    else if(i===currentStep) el.classList.add('active');
  }
  document.querySelectorAll('.checkout-panel').forEach(p=>p.classList.remove('active'));
  const panelId = currentStep<=3 ? `cpanel${currentStep}` : 'cpanelSuccess';
  document.getElementById(panelId).classList.add('active');
}

function populateOrderSummary(){
  let total=0;
  const el = document.getElementById('orderSummaryItems');
  el.innerHTML=cart.map(item=>{
    total+=item.price;
    const typeClass=item.mode==='rent'?'badge-rent':'badge-buy';
    const typeText=item.mode==='rent'?'Rental':'Purchase';
    const dates=item.rentalData?`<br><small style="color:rgba(240,201,107,0.4);">📅 ${item.rentalData.from} → ${item.rentalData.to} (${item.rentalData.days}d)</small>`:'';
    return `<div class="osi"><div><span class="osi-name">${item.icon} ${item.name}</span><span class="osi-type ${typeClass}">${typeText}</span>${dates}</div><span class="osi-price">₹${item.price.toLocaleString()}</span></div>`;
  }).join('');
  document.getElementById('summaryTotal').textContent='₹'+total.toLocaleString();
}

function populateConfirm(){
  const name=document.getElementById('co-name').value;
  const phone=document.getElementById('co-phone').value;
  const email=document.getElementById('co-email').value;
  const address=document.getElementById('co-address').value;
  const event=document.getElementById('co-event').value;
  const notes=document.getElementById('co-notes').value;
  let total=cart.reduce((s,i)=>s+i.price,0);
  document.getElementById('confirmSummary').innerHTML=`
    <strong style="color:var(--gold-light);">Customer:</strong> ${name}<br>
    <strong style="color:var(--gold-light);">Phone:</strong> ${phone}<br>
    ${email?`<strong style="color:var(--gold-light);">Email:</strong> ${email}<br>`:''}
    ${address?`<strong style="color:var(--gold-light);">Address:</strong> ${address}<br>`:''}
    ${event?`<strong style="color:var(--gold-light);">Occasion:</strong> ${event}<br>`:''}
    ${notes?`<strong style="color:var(--gold-light);">Notes:</strong> ${notes}<br>`:''}
    <strong style="color:var(--gold-light);">Items:</strong> ${cart.length} item(s)<br>
    <strong style="color:var(--gold-light);font-size:1.1em;">Total: ₹${total.toLocaleString()}</strong>
  `;
}

async function placeOrder(){
  const btn=document.getElementById('placeOrderBtn');
  btn.textContent='Processing...'; btn.disabled=true;

  try {
    const name=document.getElementById('co-name').value;
    const phone=document.getElementById('co-phone').value;
    const email=document.getElementById('co-email').value;
    const address=document.getElementById('co-address').value;
    const event=document.getElementById('co-event').value;
    const notes=document.getElementById('co-notes').value;
    const total=cart.reduce((s,i)=>s+parseFloat(i.price || 0),0);

    // Get selected payment method
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

    const orderData = {
      customer:{name,phone,email,address,event,notes},
      items:cart,
      total,
      status:'New',
      customerId: currentUser ? currentUser.id : null,
      paymentMethod: paymentMethod // Add payment method
    };

    // Track analytics - order attempt
    if (window.Analytics) {
      window.Analytics.trackEcommerce('begin_checkout', {
        total: total,
        currency: 'INR',
        itemCount: cart.length,
        paymentMethod: paymentMethod
      });
    }

    // Update current user info for next time (like Amazon saves your details)
    if(currentUser){
      currentUser.email = email || currentUser.email;
      currentUser.address = address || currentUser.address;
      CartManager.saveCustomer(currentUser);
    }

    // Check if API is available
    if(typeof api === 'undefined') {
      // Offline mode - save to localStorage
      const orderId = 'MLR-' + Date.now().toString().slice(-6);
      const order = {...orderData, orderId, placedAt: new Date().toLocaleString('en-IN'), timestamp: Date.now()};
      const orders = JSON.parse(localStorage.getItem('mlr_orders') || '[]');
      orders.unshift(order);
      localStorage.setItem('mlr_orders', JSON.stringify(orders));
      document.getElementById('successOrderId').textContent='Order ID: #'+orderId;
      showToast('⚠️ Order saved locally. Please contact admin to confirm.', 'error');

      // Track offline order
      if (window.Analytics) {
        window.Analytics.track('order_offline', { orderId, total });
      }

      currentStep=4; updateStepUI();
      cart = [];
      CartManager.clearCart();
      updateCartUI();
    } else {
      // Online mode - handle based on payment method
      if (paymentMethod === 'online') {
        // For online payment, initiate payment FIRST, create order AFTER verification
        await initiateOnlinePayment(orderData);
      } else if (paymentMethod === 'upi') {
        // For UPI, show payment UI FIRST, create order AFTER user confirms payment
        openUPIPayment(orderData);
      } else {
        // COD or Cash at Shop - create order immediately
        const result = await api.createOrder(orderData);
        document.getElementById('successOrderId').textContent='Order ID: #'+result.orderId;
        showToast('✅ Order placed successfully!');

        // Track successful order
        if (window.Analytics) {
          window.Analytics.trackEcommerce('purchase', {
            orderId: result.orderId,
            total: total,
            currency: 'INR',
            paymentMethod: paymentMethod,
            items: cart.map(item => ({
              productId: item.id,
              productName: item.name,
              category: item.category || 'Unknown',
              quantity: item.quantity || 1,
              price: item.unitPrice
            }))
          });
        }

        currentStep=4; updateStepUI();
        cart = [];
        CartManager.clearCart();
        updateCartUI();
        await loadProducts();
      }
    }
  } catch (error) {
    console.error('Error placing order:', error);
    showToast('Failed to place order. Please try again.', 'error');

    // Track order failure
    if (window.Analytics) {
      window.Analytics.track('order_failed', {
        error: error.message,
        total: cart.reduce((s,i)=>s+parseFloat(i.price || 0),0)
      });
    }

    btn.textContent='✦ Place Order'; btn.disabled=false;
  }
}

// Handle online payment with Razorpay
async function initiateOnlinePayment(orderData) {
  try {
    // Generate temporary order ID for payment
    const tempOrderId = 'MLR-' + Date.now().toString().slice(-6);

    // Create Razorpay order (no database order yet)
    const response = await fetch(`${api.baseURL}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: orderData.total,
        orderId: tempOrderId,
        customerInfo: {
          name: orderData.customer.name,
          phone: orderData.customer.phone
        }
      })
    });

    const razorpayOrder = await response.json();

    if (!response.ok) {
      throw new Error(razorpayOrder.error || 'Failed to create payment order');
    }

    // Configure Razorpay
    const options = {
      key: razorpayOrder.keyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'Mahalakshmi Jewellery',
      description: `Order ${tempOrderId}`,
      order_id: razorpayOrder.orderId,
      handler: async function(response) {
        // Payment successful - NOW create the order
        await verifyPaymentAndCreateOrder(response, orderData);
      },
      prefill: {
        name: orderData.customer.name,
        contact: orderData.customer.phone,
        email: orderData.customer.email
      },
      theme: {
        color: '#C9963A'
      },
      modal: {
        ondismiss: function() {
          showToast('Payment cancelled', 'error');
          document.getElementById('placeOrderBtn').textContent='✦ Place Order';
          document.getElementById('placeOrderBtn').disabled=false;
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Payment initiation error:', error);
    showToast('Failed to initiate payment: ' + error.message, 'error');
    document.getElementById('placeOrderBtn').textContent='✦ Place Order';
    document.getElementById('placeOrderBtn').disabled=false;
  }
}

// Verify payment and create order after successful payment
async function verifyPaymentAndCreateOrder(razorpayResponse, orderData) {
  try {
    // First verify the payment signature
    const verifyResponse = await fetch(`${api.baseURL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature
      })
    });

    const verifyResult = await verifyResponse.json();

    if (verifyResult.success) {
      // Payment verified - NOW create the order in database
      const result = await api.createOrder({
        ...orderData,
        paymentId: razorpayResponse.razorpay_payment_id,
        paymentStatus: 'paid'
      });

      document.getElementById('successOrderId').textContent='Order ID: #'+result.orderId;
      showToast('✅ Payment successful! Order confirmed.');
      currentStep=4; updateStepUI();
      cart = [];
      CartManager.clearCart();
      updateCartUI();
      await loadProducts();
    } else {
      showToast('Payment verification failed', 'error');
      document.getElementById('placeOrderBtn').textContent='✦ Place Order';
      document.getElementById('placeOrderBtn').disabled=false;
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    showToast('Payment verification failed: ' + error.message, 'error');
    document.getElementById('placeOrderBtn').textContent='✦ Place Order';
    document.getElementById('placeOrderBtn').disabled=false;
  }
}

async function submitEnquiry(){
  const name=document.getElementById('f-name').value.trim();
  const phone=document.getElementById('f-phone').value.trim();
  if(!name||!phone){ showToast('Please enter name and phone','error'); return; }

  try {
    const enquiryData = {
      customer:{
        name,
        phone,
        email:document.getElementById('f-email').value,
        event:document.getElementById('f-event').value,
        notes:document.getElementById('f-msg').value
      },
      requestType:document.getElementById('f-type').value
    };

    // Check if API is available
    if(typeof api === 'undefined') {
      // Offline mode
      const orderId = 'ENQ-' + Date.now().toString().slice(-6);
      const enquiry = {...enquiryData, orderId, placedAt: new Date().toLocaleString('en-IN'), timestamp: Date.now()};
      const enquiries = JSON.parse(localStorage.getItem('mlr_enquiries') || '[]');
      enquiries.unshift(enquiry);
      localStorage.setItem('mlr_enquiries', JSON.stringify(enquiries));
      showToast('⚠️ Enquiry saved locally. Please call admin directly.');
    } else {
      await api.createEnquiry(enquiryData);
      showToast('✅ Request sent! Admin will contact you within 1 hour.');
    }

    ['f-name','f-phone','f-email','f-event','f-msg'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('f-type').value='';
  } catch (error) {
    console.error('Error submitting enquiry:', error);
    showToast('Failed to submit enquiry. Please try again.', 'error');
  }
}

function showToast(msg, type='success'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast'+(type==='error'?' error-toast':'');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// -- CUSTOMER LOGIN -------------------------------------------------------
let currentUser = CartManager.getCustomer(); // Load from CartManager

function checkUserSession(){
  currentUser = CartManager.getCustomer();
  if(currentUser){
    updateLoginButton();
    // Load cart from backend if logged in
    if(currentUser.id && typeof api !== 'undefined'){
      CartManager.loadFromBackend(currentUser.id).then(backendCart => {
        cart = backendCart;
        updateCartUI();
      }).catch(err => console.error('Error loading cart:', err));
    }
  }
}

function updateLoginButton(){
  const btn = document.getElementById('loginBtn');
  if(currentUser){
    btn.innerHTML = `👤 ${currentUser.name.split(' ')[0]}`;
    btn.onclick = showUserMenu;
  } else {
    btn.innerHTML = '👤 Login';
    btn.onclick = openLoginModal;
  }
}

function openLoginModal(){
  document.getElementById('loginModal').classList.add('open');
}

function closeLoginModal(){
  document.getElementById('loginModal').classList.remove('open');
}

function doCustomerLogin(){
  const phone = document.getElementById('loginPhone').value.trim();
  const name = document.getElementById('loginName').value.trim();

  if(!phone){
    showToast('Please enter your phone number', 'error');
    return;
  }

  if(phone.length < 10){
    showToast('Please enter a valid phone number', 'error');
    return;
  }

  // Try API first
  if(typeof api !== 'undefined'){
    api.customerLogin(phone, name)
      .then(async result => {
        if(result.error){
          showToast(result.error, 'error');
          return;
        }

        currentUser = result.customer;
        CartManager.saveCustomer(currentUser);

        // Load cart from backend and merge with local cart
        const backendCart = await CartManager.loadFromBackend(currentUser.id);
        cart = backendCart;

        updateLoginButton();
        updateCartUI();
        closeLoginModal();
        showToast(result.message || 'Login successful!');
      })
      .catch(error => {
        console.error('Login error:', error);
        // Fallback to localStorage
        doLocalLogin(phone, name);
      });
  } else {
    // Fallback to localStorage
    doLocalLogin(phone, name);
  }
}

function doLocalLogin(phone, name){
  // Check if user exists in localStorage
  let users = JSON.parse(localStorage.getItem('mlr_customers') || '[]');
  let user = users.find(u => u.phone === phone);

  if(!user){
    // New user - require name
    if(!name){
      showToast('Please enter your name for first time login', 'error');
      return;
    }
    user = {phone, name, createdAt: Date.now()};
    users.push(user);
    localStorage.setItem('mlr_customers', JSON.stringify(users));
    showToast(`Welcome ${name}! Account created.`);
  } else {
    showToast(`Welcome back ${user.name}!`);
  }

  // Save session
  currentUser = user;
  localStorage.setItem('mlr_customer', JSON.stringify(user));
  updateLoginButton();
  closeLoginModal();
}

function showUserMenu(){
  const menu = confirm(`Logged in as: ${currentUser.name}\n${currentUser.phone}\n\nClick OK to logout`);
  if(menu){
    doCustomerLogout();
  }
}

function doCustomerLogout(){
  currentUser = null;
  CartManager.clearCustomer();
  updateLoginButton();
  showToast('Logged out successfully');
}

// -- MY ORDERS -------------------------------------------------------------
async function openMyOrders(){
  document.getElementById('myOrdersModal').classList.add('open');
  await loadMyOrders();
}

function closeMyOrders(){
  document.getElementById('myOrdersModal').classList.remove('open');
}

async function loadMyOrders(){
  const el = document.getElementById('myOrdersList');
  el.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(240,201,107,0.6);">Loading orders...</div>';

  try {
    let orders = [];

    // Try to load from API
    if(typeof api !== 'undefined') {
      const apiOrders = await api.getOrders();
      if (Array.isArray(apiOrders)) {
        orders = apiOrders;
      } else {
        console.error('Unexpected orders payload (not an array):', apiOrders);
        orders = [];
      }
    } else {
      // Fallback to localStorage
      orders = JSON.parse(localStorage.getItem('mlr_orders') || '[]');
    }

    if(orders.length === 0){
      el.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <div style="font-size:4rem;margin-bottom:16px;">📦</div>
          <p style="color:rgba(240,201,107,0.6);font-size:1.1rem;margin-bottom:8px;">No orders yet</p>
          <p style="color:rgba(240,201,107,0.4);font-size:.9rem;">Your orders will appear here after checkout</p>
        </div>
      `;
      return;
    }

    el.innerHTML = orders.map(order => {
      const statusColors = {
        'New': '#ffaa44',
        'Confirmed': '#4CAF50',
        'Delivered': '#2196F3',
        'Returned': '#9C27B0',
        'Completed': '#4CAF50',
        'Cancelled': '#f44336'
      };
      const statusColor = statusColors[order.status] || '#ffaa44';

      return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(201,150,58,0.2);padding:20px;margin-bottom:16px;border-radius:4px;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px;">
            <div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;color:var(--gold-light);margin-bottom:4px;">
                ${order.orderId || order.order_id}
              </div>
              <div style="font-size:.85rem;color:rgba(240,201,107,0.5);">
                ${order.placedAt || order.placed_at || new Date(order.timestamp).toLocaleString()}
              </div>
            </div>
            <div style="background:${statusColor};color:#fff;padding:6px 12px;border-radius:3px;font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;">
              ${order.status}
            </div>
          </div>

          <div style="border-top:1px solid rgba(201,150,58,0.1);padding-top:12px;margin-bottom:12px;">
            ${(order.items || []).map(item => `
              <div style="display:flex;justify-content:space-between;padding:8px 0;color:rgba(240,201,107,0.8);font-size:.9rem;">
                <span>${item.icon || item.product_icon} ${item.name || item.product_name} ${item.quantity > 1 ? `(×${item.quantity})` : ''}</span>
                <span style="color:var(--gold-light);">₹${formatPrice(item.price || 0)}</span>
              </div>
            `).join('')}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(201,150,58,0.2);padding-top:12px;">
            <div style="color:rgba(240,201,107,0.6);font-size:.85rem;">
              <div><strong>Customer:</strong> ${order.customer?.name || order.customer_name}</div>
              <div><strong>Phone:</strong> ${order.customer?.phone || order.customer_phone}</div>
            </div>
            <div style="text-align:right;">
              <div style="color:rgba(240,201,107,0.6);font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;">Total</div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;color:var(--gold-light);font-weight:700;">
                ₹${formatPrice(order.total || 0)}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading orders:', error);
    el.innerHTML = `
      <div style="text-align:center;padding:40px;color:#ff6b6b;">
        <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
        <p>Failed to load orders</p>
        <p style="font-size:.85rem;margin-top:8px;color:rgba(240,201,107,0.4);">${error.message}</p>
      </div>
    `;
  }
}

// Open UPI payment (Google Pay, PhonePe, etc.)
function openUPIPayment(orderData) {
  const upiId = UPI_ID; // From config.js
  const name = UPI_NAME;
  const amount = orderData.total;
  const tempOrderId = 'MLR-' + Date.now().toString().slice(-6);
  const note = `Order ${tempOrderId}`;

  // Create UPI payment URL
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  // Show UPI payment modal
  const modal = document.createElement('div');
  modal.id = 'upiModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--maroon-deep);border:1px solid var(--gold);padding:30px;max-width:400px;width:100%;border-radius:10px;text-align:center;">
      <h3 style="color:var(--gold-light);margin-bottom:20px;">📱 Pay via UPI</h3>
      <div style="background:white;padding:20px;border-radius:10px;margin-bottom:20px;">
        <div id="qrcode" style="display:flex;justify-content:center;"></div>
      </div>
      <p style="color:rgba(240,201,107,0.8);margin-bottom:15px;">Scan QR code or click button below</p>
      <p style="color:var(--gold-light);font-size:1.2rem;margin-bottom:20px;">₹${amount}</p>
      <button id="upiLaunchBtn" style="width:100%;padding:15px;background:var(--gold);color:var(--maroon-deep);border:none;border-radius:5px;font-weight:bold;font-size:1rem;cursor:pointer;margin-bottom:10px;">
        Open UPI App
      </button>
      <button id="confirmPaymentBtn" style="width:100%;padding:12px;background:var(--green);color:white;border:none;border-radius:5px;font-weight:bold;cursor:pointer;margin-bottom:10px;">
        ✓ I've Paid
      </button>
      <button onclick="document.getElementById('upiModal')?.remove()" style="width:100%;padding:10px;background:transparent;color:rgba(240,201,107,0.5);border:1px solid rgba(201,150,58,0.3);border-radius:5px;cursor:pointer;">
        Cancel
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  // Generate QR code
  const qrData = upiUrl;
  const qr = document.getElementById('qrcode');
  // Simple QR code using Google Charts API
  qr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}" alt="UPI QR Code">`;

  // attach click handler that checks if uri handler exists
  document.getElementById('upiLaunchBtn').addEventListener('click', () => {
    const upiBtn = document.getElementById('upiLaunchBtn');
    if (upiBtn) upiBtn.disabled = true;

    // attempt to open the URI; browsers may block if no handler
    window.location.href = upiUrl;

    setTimeout(() => {
      // after delay, check if still on page (no handler likely)
      if (document.getElementById('upiModal')) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile) {
          showToast('📱 UPI payments work on mobile devices only. Use the QR code with your mobile.', 'info');
        } else {
          showToast('⚠️ UPI app not found. Please install a UPI app.', 'error');
        }
        if (upiBtn) upiBtn.disabled = false;
      }
    }, 1500);
  });

  // Handle payment confirmation - CREATE ORDER ONLY AFTER CONFIRMATION
  document.getElementById('confirmPaymentBtn').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Creating order...';
    }

    try {
      // NOW create the order after user confirms payment
      const result = await api.createOrder(orderData);

      const modal = document.getElementById('upiModal');
      if (modal) modal.remove();

      document.getElementById('successOrderId').textContent='Order ID: #'+result.orderId;
      showToast('✅ Order placed! Payment will be verified by admin.');
      currentStep=4; updateStepUI();
      cart = [];
      CartManager.clearCart();
      updateCartUI();
      await loadProducts();
    } catch (error) {
      console.error('Error creating order:', error);
      showToast('Failed to create order. Please try again.', 'error');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✓ I\'ve Paid';
      }
    }
  });
}

// Confirm UPI payment (legacy function - kept for compatibility)
function confirmUPIPayment(orderId) {
  const modal = document.getElementById('upiModal');
  if (modal) modal.remove();
  document.getElementById('successOrderId').textContent='Order ID: #'+orderId;
  showToast('✅ Payment confirmation received! Admin will verify.');
  currentStep=4; updateStepUI();
  cart = [];
  CartManager.clearCart();
  updateCartUI();
  loadProducts();
}

// -- LOAD PAYMENT METHODS --------------------------------------------------
async function loadPaymentMethods() {
  try {
    if (typeof api === 'undefined' || !api.getPaymentMethods) return;

    const methods = await api.getPaymentMethods();

    // Show/hide online payment option based on availability
    const onlineOption = document.getElementById('onlinePaymentOption');
    if (onlineOption) {
      if (methods.online && methods.razorpayKeyId) {
        onlineOption.style.display = 'flex';
      } else {
        onlineOption.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error loading payment methods:', error);
    const onlineOption = document.getElementById('onlinePaymentOption');
    if (onlineOption) onlineOption.style.display = 'none';
  }
}

// -- INIT ------------------------------------------------------------------
checkUserSession();
loadProducts();
loadPaymentMethods(); // Load available payment methods
updateCartUI();

// Auto-open cart if coming from buy/rental page
if(window.location.hash === '#cart'){
  setTimeout(() => openCart(), 500);
}

// Auto-open checkout when hash is present and there are items in cart
if(window.location.hash === '#checkout'){
  if(cart.length > 0) {
    openCheckout();
    // clear the hash so that refreshing doesn't re-open the modal
    history.replaceState(null, '', window.location.pathname);
  } else {
    showToast('Your cart is empty!', 'error');
    history.replaceState(null, '', window.location.pathname);
  }
}

// -- REAL-TIME UPDATES WITH SOCKET.IO --------------------------------------
// Initialize Socket.IO only if available
if (typeof io !== 'undefined') {
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

  socket.on('productAdded', async () => {
    await loadProducts();
    showToast('✨ New products available!');
  });

  socket.on('productUpdated', async () => {
    await loadProducts();
  });

  socket.on('productDeleted', async () => {
    await loadProducts();
  });

  socket.on('disconnect', () => {
    console.log('⚠️ Real-time updates disconnected');
  });
} else {
  console.log('⚠️ Socket.IO not available - real-time updates disabled');
}
