// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://mahalakshmi-backend.onrender.com/api'; // Update this after deployment

// UPI Configuration
const UPI_ID = 'prajwal1111@slc'; // Your UPI ID
const UPI_NAME = 'Mahalakshmi Jewellery';

const api = {
  baseURL: API_BASE_URL.replace('/api', ''),
  // Products
  async getProducts() {
    const response = await fetch(`${API_BASE_URL}/products`);
    return response.json();
  },
  
  async getProduct(id) {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    return response.json();
  },
  
  async createProduct(productData) {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    return response.json();
  },
  
  // Orders
  async createOrder(orderData) {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return response.json();
  },
  
  async getOrders(status = null) {
    let url = `${API_BASE_URL}/orders`;
    if (status) url += `?status=${status}`;
    const response = await fetch(url);
    return response.json();
  },
  
  async updateOrderStatus(id, status) {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return response.json();
  },
  
  async deleteOrder(id) {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },
  
  async getOrderStats() {
    const response = await fetch(`${API_BASE_URL}/orders/stats/summary`);
    return response.json();
  },
  
  // Enquiries
  async createEnquiry(enquiryData) {
    const response = await fetch(`${API_BASE_URL}/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiryData)
    });
    return response.json();
  },
  
  async getEnquiries(status = null) {
    let url = `${API_BASE_URL}/enquiries`;
    if (status) url += `?status=${status}`;
    const response = await fetch(url);
    return response.json();
  },
  
  async updateEnquiryStatus(id, status) {
    const response = await fetch(`${API_BASE_URL}/enquiries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return response.json();
  },
  
  async deleteEnquiry(id) {
    const response = await fetch(`${API_BASE_URL}/enquiries/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },
  
  // Inventory
  async updateStock(id, baseStock) {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseStock })
    });
    return response.json();
  },
  
  async toggleAvailability(id, available) {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available })
    });
    return response.json();
  },
  
  // Upload
  async uploadProductImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${API_BASE_URL}/upload/product`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  },
  
  // Auth
  async login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },
  
  async register(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },
  
  // Customers
  async customerLogin(phone, name) {
    const response = await fetch(`${API_BASE_URL}/customers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name })
    });
    return response.json();
  },
  
  async getCustomerByPhone(phone) {
    const response = await fetch(`${API_BASE_URL}/customers/phone/${phone}`);
    return response.json();
  },
  
  async getAllCustomers() {
    const response = await fetch(`${API_BASE_URL}/customers`);
    return response.json();
  },
  
  // Customer Cart
  async syncCart(customerId, cartItems) {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cartItems })
    });
    return response.json();
  },
  
  async getCustomerCart(customerId) {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/cart`);
    return response.json();
  },
  
  // Customer Orders
  async getCustomerOrders(customerId) {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/orders`);
    return response.json();
  },

  // Payment methods
  async getPaymentMethods() {
    const response = await fetch(`${API_BASE_URL}/payments/methods`);
    return response.json();
  }
};
