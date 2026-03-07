// API Configuration
const API_BASE_URL = "https://mahalakshmi-imitation-jewellery.onrender.com/api";

// UPI Configuration
const UPI_ID = 'prajwal1111@slc'; // Your UPI ID
const UPI_NAME = 'Mahalakshmi Jewellery';

const api = {
  baseURL: API_BASE_URL.replace('/api', ''),
  
  // Products
  async getProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      const data = await response.json();

      if (!response.ok) {
        const message = (data && data.error) 
          ? data.error 
          : `Failed to fetch products (status ${response.status})`;
        throw new Error(message);
      }

      return data.data || data;
    } catch (error) {
      console.error('getProducts error:', error);
      throw new Error(error.message || 'Failed to fetch products');
    }
  },
  
  async getProduct(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product');
      }
      return data.data || data;
    } catch (error) {
      console.error('getProduct error:', error);
      throw new Error(error.message || 'Failed to fetch product');
    }
  },
  
  async createProduct(productData) {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create product');
    }
    return data.data || data;
  },
  
  // Orders
  async createOrder(orderData) {
    console.log("ORDER DATA SENT:", orderData);

    try {
      let response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('Too many order requests. Please wait a few minutes and try again.');
      }

      // retry once if server was sleeping
      if (!response.ok && response.status !== 429) {
        await new Promise(r => setTimeout(r, 2000));

        response = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to create order (status ${response.status})`);
      }

      return data.data || data;
    } catch (err) {
      console.error("Order API error:", err);
      throw new Error(err.message || 'Failed to create order');
    }
  },
  
  async getOrders(status = null) {
    try {
      let url = `${API_BASE_URL}/orders`;
      if (status) url += `?status=${status}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        const message = (data && data.error)
          ? data.error
          : `Failed to fetch orders (status ${response.status})`;
        throw new Error(message);
      }
      return data.data || data;
    } catch (error) {
      console.error('getOrders error:', error);
      throw new Error(error.message || 'Failed to fetch orders');
    }
  },
  
  async updateOrderStatus(id, status) {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update order status');
    }
    return data.data || data;
  },
  
  async deleteOrder(id) {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete order');
    }
    return data;
  },
  
  async getOrderStats() {
    const response = await fetch(`${API_BASE_URL}/orders/stats/summary`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch order stats');
    }
    return data.data || data;
  },
  
  // Enquiries
  async createEnquiry(enquiryData) {
    const response = await fetch(`${API_BASE_URL}/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiryData)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create enquiry');
    }
    return data.data || data;
  },
  
  async getEnquiries(status = null) {
    try {
      let url = `${API_BASE_URL}/enquiries`;
      if (status) url += `?status=${status}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch enquiries');
      }
      return data.data || data;
    } catch (error) {
      console.error('getEnquiries error:', error);
      throw new Error(error.message || 'Failed to fetch enquiries');
    }
  },
  
  async updateEnquiryStatus(id, status) {
    const response = await fetch(`${API_BASE_URL}/enquiries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update enquiry status');
    }
    return data.data || data;
  },
  
  async deleteEnquiry(id) {
    const response = await fetch(`${API_BASE_URL}/enquiries/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete enquiry');
    }
    return data;
  },
  
  // Inventory
  async updateStock(id, baseStock) {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseStock })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update stock');
    }
    return data.data || data;
  },
  
  async toggleAvailability(id, available) {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to toggle availability');
    }
    return data.data || data;
  },
  
  // Upload
  async uploadProductImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${API_BASE_URL}/upload/product`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload image');
    }
    return data;
  },
  
  // Auth
  async login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    return data;
  },
  
  async register(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  },
  
  // Customers
  async customerLogin(phone, name) {
    const response = await fetch(`${API_BASE_URL}/customers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Customer login failed');
    }
    return data;
  },
  
  async getCustomerByPhone(phone) {
    const response = await fetch(`${API_BASE_URL}/customers/phone/${phone}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch customer');
    }
    return data;
  },
  
  async getAllCustomers() {
    try {
      const response = await fetch(`${API_BASE_URL}/customers`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers');
      }
      return data.data || data;
    } catch (error) {
      console.error('getAllCustomers error:', error);
      throw new Error(error.message || 'Failed to fetch customers');
    }
  },
  
  // Customer Cart
  async syncCart(customerId, cartItems) {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cartItems })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sync cart');
    }
    return data;
  },
  
  async getCustomerCart(customerId) {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/cart`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch cart');
    }
    return data;
  },
  
  // Customer Orders
  async getCustomerOrders(customerId) {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/orders`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch customer orders');
    }
    return data;
  },

  // Payment methods
  async getPaymentMethods() {
    const response = await fetch(`${API_BASE_URL}/payments/methods`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch payment methods');
    }
    return data;
  }
};
