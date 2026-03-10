// Admin Panel Diagnostic Script
console.log('=== ADMIN PANEL DIAGNOSTIC ===');

// Check if API is available
console.log('API available:', typeof api !== 'undefined');
if (typeof api !== 'undefined') {
  console.log('API base URL:', api.baseURL);
}

// Test API calls
async function testAPIs() {
  console.log('Testing API endpoints...');
  
  try {
    if (typeof api !== 'undefined') {
      // Test products
      console.log('Testing products API...');
      const products = await api.getProducts();
      console.log('Products loaded:', products.length);
      
      // Test orders
      console.log('Testing orders API...');
      const orders = await api.getOrders();
      console.log('Orders loaded:', orders.length);
      
      // Test enquiries
      console.log('Testing enquiries API...');
      const enquiries = await api.getEnquiries();
      console.log('Enquiries loaded:', enquiries.length);
      
      // Test customers
      console.log('Testing customers API...');
      const customers = await api.getAllCustomers();
      console.log('Customers loaded:', customers.length);
      
    } else {
      console.error('API not available');
    }
  } catch (error) {
    console.error('API test failed:', error);
  }
}

// Run tests when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testAPIs);
} else {
  testAPIs();
}

// Check for JavaScript errors
window.addEventListener('error', function(e) {
  console.error('JavaScript Error:', e.error);
});

console.log('=== DIAGNOSTIC SCRIPT LOADED ===');