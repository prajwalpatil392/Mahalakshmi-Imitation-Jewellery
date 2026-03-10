// Centralized Cart Manager for Mahalakshmi Jewellery
// This file manages cart state across all pages and syncs with backend

const CartManager = {
  STORAGE_KEY: 'mlr_cart',
  CUSTOMER_KEY: 'mlr_customer',
  _syncTimeout: null, // For throttling sync calls
  
  // Get cart from localStorage
  getCart() {
    try {
      const cartData = localStorage.getItem(this.STORAGE_KEY);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Error loading cart:', error);
      return [];
    }
  },
  
  // Save cart to localStorage
  saveCart(cart) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
      this.throttledSyncWithBackend(cart);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  },
  
  // Get logged in customer
  getCustomer() {
    try {
      const customerData = localStorage.getItem(this.CUSTOMER_KEY);
      return customerData ? JSON.parse(customerData) : null;
    } catch (error) {
      console.error('Error loading customer:', error);
      return null;
    }
  },
  
  // Save customer data
  saveCustomer(customer) {
    try {
      localStorage.setItem(this.CUSTOMER_KEY, JSON.stringify(customer));
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  },
  
  // Clear customer data (logout)
  clearCustomer() {
    localStorage.removeItem(this.CUSTOMER_KEY);
  },
  
  // Add item to cart
  addItem(product, mode, quantity = 1, rentalData = null) {
    const cart = this.getCart();
    const rentalKey = rentalData ? JSON.stringify(rentalData) : null;
    const existing = cart.find(c => 
      c.id === product.id && 
      c.mode === mode && 
      (rentalKey ? JSON.stringify(c.rentalData) === rentalKey : !c.rentalData)
    );
    
    if (existing) {
      existing.quantity += quantity;
      existing.price = existing.unitPrice * existing.quantity;
    } else {
      const unitPrice = mode === 'buy' ? product.buy : (rentalData?.total || product.rentPerDay);
      cart.push({
        id: product.id,
        name: product.name,
        icon: product.icon,
        mode,
        quantity,
        unitPrice,
        price: unitPrice * quantity,
        rentalData: rentalData || null
      });
    }
    
    this.saveCart(cart);
    return cart;
  },
  
  // Update item quantity
  updateQuantity(id, mode, quantity, rentalData = null) {
    const cart = this.getCart();
    const item = cart.find(c => 
      c.id === id && 
      c.mode === mode && 
      JSON.stringify(c.rentalData) === JSON.stringify(rentalData)
    );
    
    if (item) {
      if (quantity <= 0) {
        return this.removeItem(id, mode, rentalData);
      }
      item.quantity = quantity;
      item.price = item.unitPrice * quantity;
      this.saveCart(cart);
    }
    
    return cart;
  },
  
  // Remove item from cart
  removeItem(id, mode, rentalData = null) {
    let cart = this.getCart();
    cart = cart.filter(c => 
      !(c.id === id && 
        c.mode === mode && 
        JSON.stringify(c.rentalData) === JSON.stringify(rentalData))
    );
    this.saveCart(cart);
    return cart;
  },
  
  // Clear entire cart
  clearCart() {
    this.saveCart([]);
    return [];
  },
  
  // Get cart total
  getTotal() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + (item.price || 0), 0);
  },
  
  // Get cart item count
  getItemCount() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  },
  
  // Throttled sync to prevent excessive API calls
  throttledSyncWithBackend(cart) {
    // Clear existing timeout
    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout);
    }
    
    // Set new timeout to sync after 1 second of inactivity
    this._syncTimeout = setTimeout(() => {
      this.syncWithBackend(cart);
    }, 1000);
  },
  
  // Sync cart with backend (if customer is logged in)
  async syncWithBackend(cart) {
    const customer = this.getCustomer();
    if (!customer?.id) return; // Not logged in, skip sync
    
    try {
      if (typeof api !== 'undefined' && api.syncCart) {
        await api.syncCart(customer.id, cart);
      }
    } catch (error) {
      console.error('Error syncing cart:', error);
    }
  },
  
  // Load cart from backend (when customer logs in)
  async loadFromBackend(customerId) {
    try {
      if (typeof api !== 'undefined' && api.getCustomerCart) {
        const backendCart = await api.getCustomerCart(customerId);
        if (backendCart && backendCart.length > 0) {
          // Merge with local cart
          const localCart = this.getCart();
          const mergedCart = this.mergeCarts(localCart, backendCart);
          this.saveCart(mergedCart);
          return mergedCart;
        }
      }
    } catch (error) {
      console.error('Error loading cart from backend:', error);
    }
    return this.getCart();
  },
  
  // Merge local and backend carts
  mergeCarts(localCart, backendCart) {
    const merged = [...localCart];
    
    backendCart.forEach(backendItem => {
      const existing = merged.find(c => 
        c.id === backendItem.id && 
        c.mode === backendItem.mode &&
        JSON.stringify(c.rentalData) === JSON.stringify(backendItem.rentalData)
      );
      
      if (existing) {
        // Take the higher quantity
        existing.quantity = Math.max(existing.quantity, backendItem.quantity);
        existing.price = existing.unitPrice * existing.quantity;
      } else {
        merged.push(backendItem);
      }
    });
    
    return merged;
  }
};

// Make it globally available
window.CartManager = CartManager;
