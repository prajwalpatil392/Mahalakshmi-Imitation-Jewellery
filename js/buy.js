let products = [];
let cart = CartManager.getCart(); // Load from centralized cart manager

async function loadProducts() {
  try {
    if(typeof api !== 'undefined') {
      const allProducts = await api.getProducts();
      products = allProducts.filter(p => p.type === 'buy' || p.type === 'both');
    } else {
      products = [
        {id:1,name:"Lakshmi Haram Set",material:"Antique Gold Finish",icon:"📿",buy:3200,availableQty:5,isAvailable:true},
        {id:3,name:"Temple Necklace",material:"Gold-Plated Copper",icon:"💛",buy:2400,availableQty:5,isAvailable:true},
        {id:4,name:"Jimikki Earrings",material:"South Indian Style",icon:"👂",buy:950,availableQty:5,isAvailable:true},
        {id:6,name:"Kangan Bangles (Set 4)",material:"Gold-Plated Brass",icon:"⭕",buy:1200,availableQty:8,isAvailable:true},
        {id:8,name:"Antique Toe Ring Pair",material:"Sterling Silver Finish",icon:"🦶",buy:450,availableQty:10,isAvailable:true}
      ];
    }
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = products.map(p => {
    const availQty = p.availableQty || 0;
    const isAvail = p.isAvailable && availQty > 0;
    
    let availClass, availText;
    if(!isAvail || availQty===0){ availClass='avail-no'; availText='Sold'; }
    else if(availQty<=2){ availClass='avail-low'; availText=`Only ${availQty} left!`; }
    else{ availClass='avail-yes'; availText=`${availQty} Available`; }
    
    const cartItem = cart.find(c=>c.id===p.id&&c.mode==='buy');
    const inCartQty = cartItem ? cartItem.quantity : 0;
    
    let buyBtn = '';
    if(!isAvail){
      buyBtn = `<button class="btn-cart" style="opacity:.5;cursor:not-allowed;background:#3a1010;">✗ Sold Out</button>`;
    } else if(inCartQty > 0){
      buyBtn = `<div class="btn-cart btn-added" style="display:flex;align-items:center;justify-content:center;gap:8px;">
        <button onclick="decreaseQty(${p.id}, event)" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;">−</button>
        <span style="font-weight:700;">${inCartQty}</span>
        <button onclick="addToCart(${p.id}, event)" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;">+</button>
      </div>`;
    } else {
      buyBtn = `<button class="btn-cart" onclick="addToCart(${p.id}, event)">🛒 Add to Cart</button>`;
    }
    
    return `
      <div class="product-card">
        <div class="product-img" style="position:relative;${p.image_url ? `background-image:url('http://localhost:5000${p.image_url}');background-size:cover;background-position:center;` : ''}">
          ${!p.image_url ? p.icon : ''}
          <span class="avail-tag ${availClass}">${availText}</span>
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-material">${p.material}</div>
          <div class="product-price">₹${p.buy.toLocaleString()}</div>
          ${buyBtn}
        </div>
      </div>
    `;
  }).join('');
}

function addToCart(id, event) {
  if(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const p = products.find(x=>x.id===id);
  if(!p) return;
  
  const availableQty = p.availableQty || 0;
  const existing = cart.find(c=>c.id===id&&c.mode==='buy');
  const currentQty = existing ? existing.quantity : 0;
  
  if(currentQty >= availableQty){
    showToast(`Only ${availableQty} available!`);
    return;
  }
  
  if(existing){
    existing.quantity++;
    existing.price = p.buy * existing.quantity;
  } else {
    cart.push({
      id, name:p.name, icon:p.icon, mode:'buy',
      quantity:1, unitPrice:p.buy, price:p.buy
    });
  }
  
  localStorage.setItem('mlr_cart', JSON.stringify(cart));
  CartManager.saveCart(cart); // Save using cart manager
  updateCartBadge();
  renderProducts();
  showToast(`✓ "${p.name}" added to cart!`);
}

function decreaseQty(id, event) {
  if(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const existing = cart.find(c=>c.id===id&&c.mode==='buy');
  if(!existing) return;
  
  if(existing.quantity <= 1){
    cart = cart.filter(c => !(c.id===id&&c.mode==='buy'));
  } else {
    existing.quantity--;
    existing.price = existing.unitPrice * existing.quantity;
  }
  
  localStorage.setItem('mlr_cart', JSON.stringify(cart));
  CartManager.saveCart(cart); // Save using cart manager
  updateCartBadge();
  renderProducts();
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  if(total > 0){
    badge.textContent = total;
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
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
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
  renderCart();
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
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
      total += item.price;
      html += `<div class="cart-item">
        <div class="cart-item-icon">${item.icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-mode">💰 Purchase</div>
          <div class="cart-item-price">Qty: ${item.quantity} × ₹${item.unitPrice.toLocaleString()} = ₹${item.price.toLocaleString()}</div>
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
      total += item.price;
      html += `<div class="cart-item">
        <div class="cart-item-icon">${item.icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-mode">📅 Rental</div>
          ${item.rentalData ? `<div style="font-size:.75rem;color:rgba(240,201,107,0.5);margin-top:4px;">
            ${item.rentalData.from} → ${item.rentalData.to} (${item.rentalData.days} days)
          </div>` : ''}
          <div class="cart-item-price">Qty: ${item.quantity} × ₹${item.unitPrice.toLocaleString()}/day = ₹${item.price.toLocaleString()}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">✕</button>
      </div>`;
    });
    html += `</div>`;
  }
  
  body.innerHTML = html;
  document.getElementById('cartTotal').textContent = '₹' + total.toLocaleString();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  CartManager.saveCart(cart);
  updateCartBadge();
  renderCart();
  renderProducts();
}

function goToCheckout() {
  CartManager.saveCart(cart);
  window.location.href = 'mahalakshmi-client.html#checkout';
}

loadProducts();
updateCartBadge();
