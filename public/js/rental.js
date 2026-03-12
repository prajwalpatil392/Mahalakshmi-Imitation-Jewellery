let products = [];
let cart = CartManager.getCart(); // Load from centralized cart manager
let selectedProduct = null;

async function loadProducts() {
  try {
    if(typeof api !== 'undefined') {
      const allProducts = await api.getProducts();
      // Ensure we have an array before filtering
      if (Array.isArray(allProducts)) {
        products = allProducts.filter(p => p.type === 'rent' || p.type === 'both');
      } else {
        console.error('Unexpected products payload (not an array):', allProducts);
        products = [];
      }
    } else {
      products = [
        {id:1,name:"Lakshmi Haram Set",material:"Antique Gold Finish",icon:"📿",rentPerDay:150,availableQty:5,isAvailable:true},
        {id:2,name:"Bridal Maang Tikka",material:"Kundan & Meenakari",icon:"👑",rentPerDay:80,availableQty:5,isAvailable:true},
        {id:3,name:"Temple Necklace",material:"Gold-Plated Copper",icon:"💛",rentPerDay:120,availableQty:5,isAvailable:true},
        {id:4,name:"Jimikki Earrings",material:"South Indian Style",icon:"👂",rentPerDay:50,availableQty:5,isAvailable:true},
        {id:5,name:"Full Bridal Set",material:"Antique Gold 12-Piece",icon:"🌸",rentPerDay:600,availableQty:3,isAvailable:true}
      ];
    }
  } catch (error) {
    console.error('Error loading products:', error);
    // Fallback to local demo products if API fails
    products = [
      {id:1,name:"Lakshmi Haram Set",material:"Antique Gold Finish",icon:"📿",rentPerDay:150,availableQty:5,isAvailable:true},
      {id:2,name:"Bridal Maang Tikka",material:"Kundan & Meenakari",icon:"👑",rentPerDay:80,availableQty:5,isAvailable:true},
      {id:3,name:"Temple Necklace",material:"Gold-Plated Copper",icon:"💛",rentPerDay:120,availableQty:5,isAvailable:true},
      {id:4,name:"Jimikki Earrings",material:"South Indian Style",icon:"👂",rentPerDay:50,availableQty:5,isAvailable:true},
      {id:5,name:"Full Bridal Set",material:"Antique Gold 12-Piece",icon:"🌸",rentPerDay:600,availableQty:3,isAvailable:true}
    ];
  }
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  ProductRenderer.renderGrid(grid, products, {
    mode: 'rent',
    cart,
    baseURL: typeof api !== 'undefined' ? api.baseURL : '',
    openRentalModal: true
  });
}

function openRentalModal(id) {
  selectedProduct = products.find(p => p.id === id);
  if(!selectedProduct) return;

  document.getElementById('productName').textContent = `${selectedProduct.icon} ${selectedProduct.name} — ₹${selectedProduct.rentPerDay}/day`;
  document.getElementById('rentalQty').value = 1;
  document.getElementById('availInfo').textContent = `${selectedProduct.availableQty} available`;

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dateFrom').min = today;
  document.getElementById('dateTo').min = today;
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  document.getElementById('rentalInfo').textContent = 'Select dates to see rental cost';

  document.getElementById('rentalModal').classList.add('open');
}

function closeModal() {
  document.getElementById('rentalModal').classList.remove('open');
}

function updateQty(change) {
  const input = document.getElementById('rentalQty');
  const newQty = Math.max(1, parseInt(input.value) + change);

  if(newQty > selectedProduct.availableQty){
    showToast(`Only ${selectedProduct.availableQty} available!`);
    return;
  }

  input.value = newQty;
  calcDays();
}

function calcDays() {
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const qty = parseInt(document.getElementById('rentalQty').value) || 1;
  const info = document.getElementById('rentalInfo');

  if(!from || !to){
    info.textContent = 'Select both dates';
    return;
  }

  const d1 = new Date(from);
  const d2 = new Date(to);

  if(d2 <= d1){
    info.textContent = '⚠️ End date must be after start date';
    return;
  }

  const days = Math.ceil((d2 - d1) / (1000*60*60*24));
  const unitTotal = days * selectedProduct.rentPerDay;
  const total = unitTotal * qty;

  info.innerHTML = `📅 <strong>${days} day${days>1?'s':''}</strong> × ₹${selectedProduct.rentPerDay}/day ${qty>1?`× ${qty} items`:''} = <strong>₹${total.toLocaleString()}</strong>`;
}

function confirmRental() {
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  const qty = parseInt(document.getElementById('rentalQty').value) || 1;

  if(!from || !to){
    showToast('Please select rental dates');
    return;
  }

  const d1 = new Date(from);
  const d2 = new Date(to);

  if(d2 <= d1){
    showToast('End date must be after start date');
    return;
  }

  const days = Math.ceil((d2 - d1) / (1000*60*60*24));
  const unitTotal = days * selectedProduct.rentPerDay;

  for(let i=0; i<qty; i++){
    cart.push({
      id: selectedProduct.id,
      name: selectedProduct.name,
      icon: selectedProduct.icon,
      mode: 'rent',
      quantity: 1,
      unitPrice: unitTotal,
      price: unitTotal,
      rentalData: {from, to, days, total: unitTotal}
    });
  }

  CartManager.saveCart(cart); // Save using cart manager
  updateCartBadge();
  closeModal();
  showToast(`✓ "${selectedProduct.name}" added to cart!`);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const mobileBadge = document.getElementById('cartBadgeMobile');
  const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  if(total > 0){
    badge.textContent = total;
    badge.classList.add('visible');
    if(mobileBadge) mobileBadge.textContent = total;
  } else {
    badge.classList.remove('visible');
    if(mobileBadge) mobileBadge.textContent = '0';
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function goToCart() {
  openCart();
}

function openCart() {
  document.getElementById('cartOverlayDrawer').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
  renderCart();
}

function closeCart() {
  document.getElementById('cartOverlayDrawer').classList.remove('open');
  document.getElementById('cartDrawer').classList.remove('open');
}

function renderCart() {
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');

  if (cart.length === 0) {
    body.innerHTML = '<div class="cart-empty">🛒<br><br>Your cart is empty<br><small>Add items to get started</small></div>';
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';

  // Separate items by mode
  const buyItems = cart.filter(item => item.mode === 'buy');
  const rentItems = cart.filter(item => item.mode === 'rent');

  let html = '';
  let total = 0;

  // Buy Items Section
  if (buyItems.length > 0) {
    html += `<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(201,150,58,0.1);border-left:3px solid #C9963A;margin-bottom:12px;">
        <span style="font-size:1.1rem;">💰</span>
        <span style="font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F0C96B;flex:1;">Buy Items</span>
        <span style="font-size:.7rem;color:rgba(240,201,107,0.6);background:rgba(201,150,58,0.2);padding:2px 8px;border-radius:10px;">${buyItems.length}</span>
      </div>`;

    buyItems.forEach(item => {
      const idx = cart.indexOf(item);
      const qty = item.quantity || 1;
      total += item.price;
      html += `<div class="cart-item">
        <div class="cart-item-icon">${item.icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-mode">💰 Purchase</div>
          <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
            <button onclick="updateCartQuantity(${idx},-1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;border-radius:2px;">−</button>
            <span style="color:var(--gold-light);font-weight:600;min-width:20px;text-align:center;">${qty}</span>
            <button onclick="updateCartQuantity(${idx},1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;border-radius:2px;">+</button>
          </div>
          <div class="cart-item-price">₹${item.price.toLocaleString()} ${qty>1?`(₹${item.unitPrice} × ${qty})`:''}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">✕</button>
      </div>`;
    });
    html += `</div>`;
  }

  // Rent Items Section
  if (rentItems.length > 0) {
    html += `<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(201,150,58,0.1);border-left:3px solid #C9963A;margin-bottom:12px;">
        <span style="font-size:1.1rem;">📅</span>
        <span style="font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F0C96B;flex:1;">Rental Items</span>
        <span style="font-size:.7rem;color:rgba(240,201,107,0.6);background:rgba(201,150,58,0.2);padding:2px 8px;border-radius:10px;">${rentItems.length}</span>
      </div>`;

    rentItems.forEach(item => {
      const idx = cart.indexOf(item);
      const qty = item.quantity || 1;
      total += item.price;
      html += `<div class="cart-item">
        <div class="cart-item-icon">${item.icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-mode">📅 Rental</div>
          ${item.rentalData ? `<div style="font-size:.75rem;color:rgba(240,201,107,0.5);margin-top:4px;">
            ${item.rentalData.from} → ${item.rentalData.to} (${item.rentalData.days} days)
          </div>` : ''}
          <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
            <button onclick="updateCartQuantity(${idx},-1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;border-radius:2px;">−</button>
            <span style="color:var(--gold-light);font-weight:600;min-width:20px;text-align:center;">${qty}</span>
            <button onclick="updateCartQuantity(${idx},1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;border-radius:2px;">+</button>
          </div>
          <div class="cart-item-price">₹${item.price.toLocaleString()} ${qty>1?`(₹${item.unitPrice}/day × ${qty})`:''}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">✕</button>
      </div>`;
    });
    html += `</div>`;
  }

  body.innerHTML = html;
  document.getElementById('cartTotal').textContent = '₹' + total.toLocaleString();
}

function updateCartQuantity(idx, change) {
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
    showToast(`Only ${product.availableQty} available!`);
    return;
  }

  item.quantity = newQty;
  item.price = item.unitPrice * newQty;

  CartManager.saveCart(cart);
  updateCartBadge();
  renderCart();
  renderProducts();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  CartManager.saveCart(cart);
  updateCartBadge();
  renderCart();
  renderProducts();       // Immediate UI update
  loadProducts();         // Refresh product availability from API
}

function goToCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }

  CartManager.saveCart(cart);

  // same logic as buy.js – if we're not on the client homepage, send the
  // user there directly with #checkout.  avoid the extra confirmation step
  // so only one interaction is required.
  if (!window.location.pathname.includes('mahalakshmi-client.html')) {
    window.location.href = 'mahalakshmi-client.html#checkout';
    return;
  }

  // already on client page – open checkout right away
  window.location.hash = 'checkout';
  if (typeof openCheckout === 'function') {
    openCheckout();
  }
}

loadProducts();
updateCartBadge();

// Mobile menu toggle functions
function toggleMobileMenu() {
  const nav = document.getElementById('mainNav');
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburger');

  navLinks.classList.toggle('active');
  hamburger.classList.toggle('active');
  nav.classList.toggle('mobile-nav-open');
}

function closeMobileMenu() {
  const nav = document.getElementById('mainNav');
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburger');

  navLinks.classList.remove('active');
  hamburger.classList.remove('active');
  nav.classList.remove('mobile-nav-open');
}

// Placeholder functions for login and orders (redirect to home page)
function openLoginModal() {
  window.location.href = 'mahalakshmi-client.html';
}

function openMyOrders() {
  window.location.href = 'mahalakshmi-client.html#orders';
}
