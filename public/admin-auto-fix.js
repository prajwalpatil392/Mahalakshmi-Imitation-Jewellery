// Auto-fix for admin panel - loads automatically
(function() {
  'use strict';
  
  console.log('🔧 Admin Auto-Fix Loading...');
  
  // Wait for page to load
  function applyFixes() {
    // Fix 1: Ensure enquiries load from API
    if (typeof window.renderEnquiriesPage === 'function') {
      const originalRenderEnquiriesPage = window.renderEnquiriesPage;
      
      window.renderEnquiriesPage = async function() {
        try {
          if (typeof api !== 'undefined') {
            console.log('🔄 Loading enquiries from API...');
            window.enquiriesCache = await api.getEnquiries();
            console.log('✅ Enquiries loaded:', window.enquiriesCache.length);
            
            // Override getEnquiries to use cached data
            window.getEnquiries = function() {
              return window.enquiriesCache || [];
            };
          }
        } catch (e) {
          console.error('❌ Failed to load enquiries:', e);
        }
        
        // Call original function
        if (originalRenderEnquiriesPage) {
          originalRenderEnquiriesPage();
        }
      };
    }
    
    // Fix 2: Ensure orders load from API
    if (typeof window.renderOrdersPage === 'function') {
      const originalRenderOrdersPage = window.renderOrdersPage;
      
      window.renderOrdersPage = async function(search='', statusFilter='') {
        try {
          if (typeof loadOrdersFromAPI === 'function') {
            console.log('🔄 Loading orders from API...');
            await loadOrdersFromAPI();
            console.log('✅ Orders loaded from API');
          }
        } catch (e) {
          console.error('❌ Failed to load orders:', e);
        }
        
        // Call original function
        if (originalRenderOrdersPage) {
          originalRenderOrdersPage(search, statusFilter);
        }
      };
    }
    
    // Fix 3: Auto-load data when switching pages
    if (typeof window.showPage === 'function') {
      const originalShowPage = window.showPage;
      
      window.showPage = function(id) {
        // Call original showPage first
        originalShowPage(id);
        
        // Then load data for specific pages
        setTimeout(() => {
          switch(id) {
            case 'enquiries':
              if (typeof window.renderEnquiriesPage === 'function') {
                window.renderEnquiriesPage();
              }
              break;
            case 'orders':
              if (typeof window.renderOrdersPage === 'function') {
                window.renderOrdersPage();
              }
              break;
          }
        }, 100);
      };
    }
    
    console.log('✅ Admin Auto-Fix Applied Successfully!');
  }
  
  // Apply fixes when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFixes);
  } else {
    applyFixes();
  }
  
  // Also apply after a short delay to ensure all scripts are loaded
  setTimeout(applyFixes, 2000);
  
})();