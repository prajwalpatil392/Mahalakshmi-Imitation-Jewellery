// Unified Cart Display - Shows Buy and Rent items in separate categories
// Use this in all pages for consistent cart display

function renderUnifiedCart(containerId = 'cartItemsContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const cart = CartManager.getCart();
  
  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:rgba(240,201,107,0.4);">
        <div style="font-size:3rem;margin-bottom:16px;">🛒</div>
        <p>Your cart is empty</p>
        <p style="font-size:.85rem;margin-top:8px;">Add some beautiful jewellery!</p>
      </div>
    `;
    return;
  }
  
  // Separate items by mode
  const buyItems = cart.filter(item => item.mode === 'buy');
  const rentItems = cart.filter(item => item.mode === 'rent');
  
  let html = '';
  
  // Buy Items Section
  if (buyItems.length > 0) {
    html += `
      <div class="cart-category">
        <div class="cart-category-header">
          <span class="cart-category-icon">💰</span>
          <span class="cart-category-title">Buy Items</span>
          <span class="cart-category-count">${buyItems.length} item${buyItems.length > 1 ? 's' : ''}</span>
        </div>
        ${buyItems.map((item, idx) => renderCartItem(item, cart.indexOf(item))).join('')}
      </div>
    `;
  }
  
  // Rent Items Section
  if (rentItems.length > 0) {
    html += `
      <div class="cart-category">
        <div class="cart-category-header">
          <span class="cart-category-icon">📅</span>
          <span class="cart-category-title">Rental Items</span>
          <span class="cart-category-count">${rentItems.length} item${rentItems.length > 1 ? 's' : ''}</span>
        </div>
        ${rentItems.map((item, idx) => renderCartItem(item, cart.indexOf(item))).join('')}
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function renderCartItem(item, index) {
  const rentalInfo = item.rentalData ? 
    `<div style="font-size:.75rem;color:rgba(240,201,107,0.5);margin-top:4px;">
      📅 ${item.rentalData.from} → ${item.rentalData.to} (${item.rentalData.days} days)
    </div>` : '';
  
  return `
    <div class="cart-item">
      <div class="cart-item-icon">${item.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">
          ${item.mode === 'buy' ? 
            `₹${item.unitPrice.toLocaleString()} × ${item.quantity}` : 
            `₹${item.unitPrice.toLocaleString()}/day × ${item.quantity}`
          }
        </div>
        ${rentalInfo}
      </div>
      <div class="cart-item-price">₹${item.price.toLocaleString()}</div>
      <button class="cart-item-remove" onclick="removeFromCart(${index})" title="Remove">✕</button>
    </div>
  `;
}

// Add CSS for cart categories
const cartCategoryStyles = `
<style>
.cart-category {
  margin-bottom: 24px;
}

.cart-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(201,150,58,0.1);
  border-left: 3px solid var(--gold);
  margin-bottom: 12px;
}

.cart-category-icon {
  font-size: 1.2rem;
}

.cart-category-title {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gold-light);
  flex: 1;
}

.cart-category-count {
  font-size: 0.75rem;
  color: rgba(240,201,107,0.6);
  background: rgba(201,150,58,0.2);
  padding: 2px 8px;
  border-radius: 10px;
}
</style>
`;

// Auto-inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('unified-cart-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'unified-cart-styles';
  styleElement.innerHTML = cartCategoryStyles;
  document.head.appendChild(styleElement);
}
