/**
 * Shared Product Renderer - Reusable product card HTML generation
 * Used by buy.html, rental.html, and mahalakshmi-client.html
 */
const ProductRenderer = (function() {
  'use strict';

  function getAvailability(availQty, isAvail) {
    const qty = availQty || 0;
    const avail = isAvail && qty > 0;
    let availClass, availText;
    if (!avail || qty === 0) {
      availClass = 'avail-no';
      availText = 'Sold';
    } else if (qty <= 2) {
      availClass = 'avail-low';
      availText = `Only ${qty} left!`;
    } else {
      availClass = 'avail-yes';
      availText = `${qty} Available`;
    }
    return { availClass, availText, canAct: avail };
  }

  function getImageHtml(p, baseURL) {
    const url = p.image_url;
    const apiBase = (typeof api !== 'undefined' && api?.baseURL) || baseURL || '';
    let imgStyle = '';
    let imgContent = '';

    if (url) {
      const fullUrl = url.startsWith('http') ? url : `${apiBase}${url}`;
      imgStyle = `background-image:url('${fullUrl}');background-size:cover;background-position:center;`;
      imgContent = ''; // Background image handles it; icon shown when no image
    } else {
      imgContent = `<span style="font-size:5rem;">${p.icon || '💎'}</span>`;
    }

    return { imgStyle, imgContent };
  }

  /**
   * Build HTML for a single product card
   * @param {Object} p - Product
   * @param {Object} opts - { mode: 'buy'|'rent'|'both', cart: [], baseURL: '', onAddBuy, onAddRent, onDecrease, openRentalModal }
   */
  function renderCard(p, opts) {
    const cart = opts.cart || [];
    const { availClass, availText, canAct } = getAvailability(p.availableQty, p.isAvailable);
    const { imgStyle, imgContent } = getImageHtml(p, opts.baseURL);
    const cartItem = cart.find(c => c.id === p.id && c.mode === 'buy');
    const inCartQty = cartItem?.quantity || 0;

    let priceHtml = '';
    let actionsHtml = '';
    const buy = p.buy ?? p.buy_price;
    const rent = p.rentPerDay ?? p.rent_per_day;

    if (opts.mode === 'buy') {
      if (buy != null) priceHtml = `<div class="product-price">₹${Number(buy).toLocaleString()}</div>`;
    } else if (opts.mode === 'rent') {
      if (rent != null) priceHtml = `<div class="product-price">₹${Number(rent).toLocaleString()}/day</div>`;
    } else if (opts.mode === 'both') {
      if (rent != null && buy != null) {
        priceHtml = `<div class="product-pricing">
          <div><div class="price-label">Rent/Day</div><div class="price-val">₹${Number(rent).toLocaleString()}</div></div>
          <div class="price-divider"></div>
          <div><div class="price-label">Buy</div><div class="price-val">₹${Number(buy).toLocaleString()}</div></div>
        </div>`;
      } else if (rent != null) {
        priceHtml = `<div class="product-price">₹${Number(rent).toLocaleString()}/day</div>`;
      } else if (buy != null) {
        priceHtml = `<div class="product-price">₹${Number(buy).toLocaleString()}</div>`;
      }
    }

    // Actions
    if (opts.mode === 'buy') {
      if (!canAct) {
        actionsHtml = `<button class="btn-cart" style="opacity:.5;cursor:not-allowed;background:#3a1010;">✗ Sold Out</button>`;
      } else if (inCartQty > 0 && opts.onDecrease) {
        actionsHtml = `<div class="btn-cart btn-added" style="display:flex;align-items:center;justify-content:center;gap:8px;">
          <button onclick="decreaseQty(${p.id}, event)" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;">−</button>
          <span style="font-weight:700;">${inCartQty}</span>
          <button onclick="addToCart(${p.id}, event)" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;">+</button>
        </div>`;
      } else if (opts.onAddBuy) {
        actionsHtml = `<button class="btn-cart" onclick="addToCart(${p.id}, event)">🛒 Add to Cart</button>`;
      }
    } else if (opts.mode === 'rent') {
      if (canAct && opts.openRentalModal) {
        actionsHtml = `<button class="btn-rent" onclick="openRentalModal(${p.id})">📅 Book Rental</button>`;
      } else {
        actionsHtml = `<button class="btn-rent" style="opacity:.5;cursor:not-allowed;background:#3a1010;">✗ Unavailable</button>`;
      }
    } else if (opts.mode === 'both') {
      let buyBtn = '';
      let rentBtn = '';
      if ((p.type === 'buy' || p.type === 'both') && canAct) {
        if (inCartQty > 0 && opts.onDecrease) {
          buyBtn = `<div class="btn-cart btn-added" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:8px;">
            <button onclick="event.stopPropagation();decreaseFromProduct(${p.id})" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;">−</button>
            <span style="font-weight:700;">${inCartQty}</span>
            <button onclick="event.stopPropagation();addToCart(${p.id},'buy')" style="background:var(--gold-dark);color:#fff;border:none;width:28px;height:28px;cursor:pointer;">+</button>
          </div>`;
        } else {
          buyBtn = `<button class="btn-cart" onclick="addToCart(${p.id},'buy')">🛒 Add to Cart</button>`;
        }
      }
      if ((p.type === 'rent' || p.type === 'both') && canAct && opts.openRentalModal) {
        rentBtn = `<button class="btn-rent" onclick="openRentalModal(${p.id})">📅 Book Rental</button>`;
      }
      actionsHtml = `<div class="product-actions">${buyBtn}${rentBtn}</div>`;
      if (!buyBtn && !rentBtn && !canAct) {
        actionsHtml = `<button class="btn-full" style="opacity:.5;cursor:not-allowed;background:#3a1010;color:#ff8888;">✗ Sold</button>`;
      }
    }

    return `
    <div class="product-card">
      <div class="product-img" style="position:relative;${imgStyle}">
        ${imgContent}
        <span class="avail-tag ${availClass}">${availText}</span>
      </div>
      <div class="product-info">
        <div class="product-name">${(p.name || '').replace(/</g, '&lt;')}</div>
        <div class="product-material">${(p.material || '').replace(/</g, '&lt;')}</div>
        ${priceHtml}
        ${actionsHtml}
      </div>
    </div>`;
  }

  /**
   * Render products into a grid element
   * @param {HTMLElement} gridEl - Target element
   * @param {Array} products - Product list
   * @param {Object} opts - Same as renderCard
   */
  function renderGrid(gridEl, products, opts) {
    if (!gridEl || !Array.isArray(products)) return;
    gridEl.innerHTML = products.map(p => renderCard(p, opts)).join('');
  }

  return {
    getAvailability,
    getImageHtml,
    renderCard,
    renderGrid
  };
})();
