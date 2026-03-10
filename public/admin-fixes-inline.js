// Inline fixes for admin panel - add this script to fix the issues

// Override the renderEnquiriesPage function to load from API
if (typeof renderEnquiriesPage !== 'undefined') {
  const originalRenderEnquiriesPage = renderEnquiriesPage;
  
  window.renderEnquiriesPage = async function() {
    try {
      // Load enquiries from API first
      if (typeof api !== 'undefined' && api.getEnquiries) {
        console.log('Loading enquiries from API...');
        const enquiries = await api.getEnquiries();
        console.log('Loaded enquiries:', enquiries.length);
        
        // Store in cache for getEnquiries() function
        window.enquiriesCache = enquiries;
      }
    } catch (error) {
      console.error('Error loading enquiries:', error);
    }
    
    // Call original function
    originalRenderEnquiriesPage();
  };
}

// Override the showPage function to refresh data when switching pages
if (typeof showPage !== 'undefined') {
  const originalShowPage = showPage;
  
  window.showPage = function(id) {
    // Call original showPage first
    originalShowPage(id);
    
    // Then refresh the page data
    setTimeout(() => {
      switch(id) {
        case 'enquiries':
          if (typeof renderEnquiriesPage === 'function') {
            renderEnquiriesPage();
          }
          break;
        case 'products':
          if (typeof renderProductsPage === 'function') {
            renderProductsPage();
          }
          break;
        case 'orders':
          if (typeof renderOrdersPage === 'function') {
            renderOrdersPage();
          }
          break;
        case 'customers':
          if (typeof renderCustomersPage === 'function') {
            renderCustomersPage();
          }
          break;
        case 'rentals':
          if (typeof renderRentalsPage === 'function') {
            renderRentalsPage();
          }
          break;
      }
    }, 100);
  };
}

// Override getEnquiries to use cached data
if (typeof getEnquiries !== 'undefined') {
  const originalGetEnquiries = getEnquiries;
  
  window.getEnquiries = function() {
    // Return cached data if available
    if (window.enquiriesCache && window.enquiriesCache.length > 0) {
      return window.enquiriesCache;
    }
    
    // Fallback to original function
    return originalGetEnquiries();
  };
}

console.log('Admin panel fixes applied successfully');