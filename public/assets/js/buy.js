let products = [];
let cart = CartManager.getCart(); // Load from centralized cart manager

async function loadProducts() {
  try {
    if(typeof api !== 'undefined') {
      const allProducts = await api.getProducts();
      // Ensure we have an array before filtering
      if (Array.isArray(allProducts)) {
        products = allProducts.filter(p => p.type === 'buy' || p.type === 'both');
      } else {
        console.error('Unexpected products payload (not an array):', allProducts);
        products = [];
      }
    } else {
      products = [
        {id:1,name:"Lakshmi Haram Set",material:"Antique Gold Finish",icon:"📿",buy:3200,availableQty:5,isAvailable:true},
        {id:3,name:"Temple Necklace",material:"Gold-Plated Copper",icon:"💛",buy:2400,availableQty:5,isAvailable:true},
        {id:4,name:"Jimikki Earrings",material:"South Indian Style",icon:"👂",buy:950,availableQty:5,isAvailable:true},
        {id:6,name:"Kangan Bangles (Set 4)",material:"Gold-Plated Brass",icon:"⭕",buy:1200,availableQty:8,isAvailable:true},
        {id:8,name:"Antique Toe Ring Pair",material:"Sterling Silver Finish",icon:"🦶",buy:450,availableQty:10,isAvailable:true}
      ];      
    }
  } catch (error) {
    console.error('Error loading products:', error);
    // Fallback to local demo products if API fails
    products = [
      {id:1,name:"Lakshmi Haram Set",material:"Antique Gold Finish",icon:"📿",buy:3200,availableQty:5,isAvailable:true},
      {id:3,name:"Temple Necklace",material:"Gold-Plated Copper",icon:"💛",buy:2400,availableQty:5,isAvailable:true},
      {id:4,name:"Jimikki Earrings",material:"South Indian Style",icon:"👂",buy:950,availableQty:5,isAvailable:true},
      {id:6,name:"Kangan Bangles (Set 4)",material:"Gold-Plated Brass",icon:"⭕",buy:1200,availableQty:8,isAvailable:true},
      {id:8,name:"Antique Toe Ring Pair",material:"Sterling Silver Finish",icon:"🦶",buy:450,availableQty:10,isAvailable:true}
    ];
  }
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  
  grid.innerHTML = products.map(p => {
    const availQty = p.availableQty || 0;
    const isAvail = p.isAvailable && availQty > 0;
    
    const availClass = !isAvail || availQty === 0 ? 'avail-no' : 
                       availQty <= 2 ? 'avail-low' : 'avail-yes';
    const availText = !isAvail || availQty === 0 ? 'Sold' : 
                      availQty <= 2 ? `Only ${availQty} left!` : `${availQty} Available`;
    
    const cartItem = cart.find(c => c.id === p.id && c.mode === 'buy');
    const inCartQty = cartItem?.quantity || 0;
    
    let buyBtn;
    if (!isAvail) {
      buyBtn = `<button class="btn-cart" style="opacity:.5;cursor:not-allowed;background:#3a1010;">✗ Sold Out</button>`;
    } else if (inCartQty > 0) {
      buyBtn = `<div class="btn-cart btn-added" style="display:flex;align-items:center;justify-content:center;gap:8px;">
        <button onclick="decreaseQty(${p.id}, event)" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;">−</button>
        <span style="font-weight:700;">${inCartQty}</span>
        <button onclick="addToCart(${p.id}, event)" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;">+</button>
      </div>`;
    } else {
      buyBtn = `<button class="btn-cart" onclick="addToCart(${p.id}, event)">🛒 Add to Cart</button>`;
    }
    
    // Handle image URL - use API base or show icon
    let imgStyle = '';
    let imgContent = `<span style="font-size:5rem;">${p.icon}</span>`;
    
    if (p.image_url) {
      let imageUrl = p.image_url;

      // If it's a relative path, attach server URL
      if (!imageUrl.startsWith('http')) {
        imageUrl = `https://mahalakshmi-imitation-jewellery.onrender.com${imageUrl}`;
      }

      // Force HTTPS (fix mixed content)
      imageUrl = imageUrl.replace('http://', 'https://');

      imgStyle = `background-image:url('${imageUrl}');background-size:cover;background-position:center;`;

      imgContent = `<img src="${imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;"
        onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'font-size:5rem;\\'>${p.icon}</span><span class=\\'avail-tag ${availClass}\\'>${availText}</span>';" />`;
    }
    
    return `
      <div class="product-card">
        <div class="product-img" style="position:relative;${imgStyle}">
          ${imgContent}
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
  event?.preventDefault();
  event?.stopPropagation();
  
  const p = products.find(x => x.id === id);
  if (!p) return;
  
  const availableQty = p.availableQty || 0;
  const existing = cart.find(c => c.id === id && c.mode === 'buy');
  const currentQty = existing?.quantity || 0;
  
  if (currentQty >= availableQty) {
    showToast(`Only ${availableQty} available!`);
    return;
  }
  
  if (existing) {
    existing.quantity++;
    existing.price = p.buy * existing.quantity;
  } else {
    cart.push({
      id, 
      name: p.name, 
      icon: p.icon, 
      mode: 'buy',
      quantity: 1, 
      unitPrice: p.buy, 
      price: p.buy
    });
  }
  
  CartManager.saveCart(cart);
  updateCartBadge();
  renderProducts();
  showToast(`✓ "${p.name}" added to cart!`);
}

function decreaseQty(id, event) {
  event?.preventDefault();
  event?.stopPropagation();
  
  const existing = cart.find(c => c.id === id && c.mode === 'buy');
  if (!existing) return;
  
  if (existing.quantity <= 1) {
    cart = cart.filter(c => !(c.id === id && c.mode === 'buy'));
  } else {
    existing.quantity--;
    existing.price = existing.unitPrice * existing.quantity;
  }
  
  CartManager.saveCart(cart);
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
  
  const sections = [];
  let total = 0;
  
  // Buy Items Section
  if (buyItems.length > 0) {
    const buySection = [`<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(201,150,58,0.1);border-left:3px solid #C9963A;margin-bottom:12px;">
        <span style="font-size:1.1rem;">💰</span>
        <span style="font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F0C96B;flex:1;">Buy Items</span>
        <span style="font-size:.7rem;color:rgba(240,201,107,0.6);background:rgba(201,150,58,0.2);padding:2px 8px;border-radius:10px;">${buyItems.length}</span>
      </div>`];
    
    buyItems.forEach(item => {
      const idx = cart.indexOf(item);
      const qty = item.quantity || 1;
      total += item.price;
      buySection.push(`<div class="cart-item">
        <div class="cart-item-icon">${item.icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-mode">💰 Purchase</div>
          <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
            <button onclick="updateCartQuantity(${idx},-1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;border-radius:2px;">−</button>
            <span style="color:var(--gold-light);font-weight:600;min-width:20px;text-align:center;">${qty}</span>
            <button onclick="updateCartQuantity(${idx},1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;border-radius:2px;">+</button>
          </div>
          <div class="cart-item-price">₹${item.price.toLocaleString()} ${qty > 1 ? `(₹${item.unitPrice} × ${qty})` : ''}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">✕</button>
      </div>`);
    });
    buySection.push('</div>');
    sections.push(buySection.join(''));
  }
  
  // Rent Items Section
  if (rentItems.length > 0) {
    const rentSection = [`<div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(201,150,58,0.1);border-left:3px solid #C9963A;margin-bottom:12px;">
        <span style="font-size:1.1rem;">📅</span>
        <span style="font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F0C96B;flex:1;">Rental Items</span>
        <span style="font-size:.7rem;color:rgba(240,201,107,0.6);background:rgba(201,150,58,0.2);padding:2px 8px;border-radius:10px;">${rentItems.length}</span>
      </div>`];
    
    rentItems.forEach(item => {
      const idx = cart.indexOf(item);
      const qty = item.quantity || 1;
      total += item.price;
      const rentalInfo = item.rentalData ? 
        `<div style="font-size:.75rem;color:rgba(240,201,107,0.5);margin-top:4px;">
          ${item.rentalData.from} → ${item.rentalData.to} (${item.rentalData.days} days)
        </div>` : '';
      
      rentSection.push(`<div class="cart-item">
        <div class="cart-item-icon">${item.icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-mode">📅 Rental</div>
          ${rentalInfo}
          <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
            <button onclick="updateCartQuantity(${idx},-1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;border-radius:2px;">−</button>
            <span style="color:var(--gold-light);font-weight:600;min-width:20px;text-align:center;">${qty}</span>
            <button onclick="updateCartQuantity(${idx},1)" style="background:var(--maroon);color:var(--gold-light);border:none;width:24px;height:24px;cursor:pointer;font-size:1rem;border-radius:2px;">+</button>
          </div>
          <div class="cart-item-price">₹${item.price.toLocaleString()} ${qty > 1 ? `(₹${item.unitPrice}/day × ${qty})` : ''}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">✕</button>
      </div>`);
    });
    rentSection.push('</div>');
    sections.push(rentSection.join(''));
  }
  
  body.innerHTML = sections.join('');
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
  renderProducts();
}

function goToCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }

  CartManager.saveCart(cart);

  // if we are on any page other than the client home, just redirect straight
  // to the client with a hash that triggers the modal.  no confirmation shown
  // so the user only has to click once.
  if (!window.location.pathname.includes('mahalakshmi-client.html')) {
    window.location.href = 'mahalakshmi-client.html#checkout';
    return;
  }

  // already on client, open immediately
  window.location.hash = 'checkout';
  if (typeof openCheckout === 'function') {
    openCheckout();
  }
}

loadProducts();
updateCartBadge();
