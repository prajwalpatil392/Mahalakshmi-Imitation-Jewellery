// Resource Loading Optimizer
// Prevents unnecessary preload warnings by managing resource loading efficiently

(function() {
  'use strict';
  
  // Optimize font loading
  function optimizeFontLoading() {
    const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    fontLinks.forEach(link => {
      // Only load fonts when they're actually needed
      if (link.media === 'print') {
        // Font is already optimized with print media trick
        return;
      }
      
      // Add loading optimization
      link.setAttribute('media', 'print');
      link.setAttribute('onload', "this.media='all'");
    });
  }
  
  // Lazy load external scripts
  function lazyLoadScript(src, condition = () => true) {
    return new Promise((resolve, reject) => {
      if (!condition()) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // Optimize Socket.IO loading
  function optimizeSocketIO() {
    const socketScript = document.querySelector('script[src*="socket.io"]');
    if (socketScript && !window.io) {
      // Remove the script tag and load it only when needed
      socketScript.remove();
      
      // Load Socket.IO when user interacts with the page
      let loaded = false;
      const loadSocketIO = () => {
        if (loaded) return;
        loaded = true;
        
        lazyLoadScript('/socket.io/socket.io.js')
          .then(() => {
            console.log('Socket.IO loaded on demand');
            // Initialize socket connection if needed
            if (typeof initializeSocket === 'function') {
              initializeSocket();
            }
          })
          .catch(err => console.warn('Socket.IO failed to load:', err));
      };
      
      // Load on first user interaction
      ['click', 'scroll', 'keydown', 'touchstart'].forEach(event => {
        document.addEventListener(event, loadSocketIO, { once: true, passive: true });
      });
      
      // Or load after 3 seconds if no interaction
      setTimeout(loadSocketIO, 3000);
    }
  }
  
  // Remove unused preload hints and prevent warnings
  function removeUnusedPreloads() {
    const preloadLinks = document.querySelectorAll('link[rel="preload"]');
    preloadLinks.forEach(link => {
      const href = link.getAttribute('href');
      const as = link.getAttribute('as');
      
      // Check if the resource is actually used
      setTimeout(() => {
        let isUsed = false;
        
        if (as === 'script') {
          isUsed = document.querySelector(`script[src="${href}"]`) !== null;
        } else if (as === 'style') {
          isUsed = document.querySelector(`link[href="${href}"][rel="stylesheet"]`) !== null;
        } else if (as === 'font') {
          // Check if font is actually used in CSS
          const fontFamily = link.getAttribute('crossorigin') ? 
            href.match(/family=([^&:]+)/)?.[1] : null;
          if (fontFamily) {
            const decodedFamily = decodeURIComponent(fontFamily.replace(/\+/g, ' '));
            isUsed = Array.from(document.styleSheets).some(sheet => {
              try {
                return Array.from(sheet.cssRules || []).some(rule => 
                  rule.style && rule.style.fontFamily && 
                  rule.style.fontFamily.includes(decodedFamily)
                );
              } catch (e) {
                return false;
              }
            });
          }
        } else if (as === 'image') {
          isUsed = document.querySelector(`img[src="${href}"]`) !== null;
        }
        
        // Remove unused preload to prevent browser warnings
        if (!isUsed && link.parentNode) {
          console.warn(`Removing unused preload: ${href}`);
          link.remove();
        }
      }, 1000); // Reduced timeout to catch issues faster
    });
  }
  
  // Prevent preload warnings by ensuring resources are used
  function preventPreloadWarnings() {
    // Monitor for dynamically added preload links
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.tagName === 'LINK' && 
              node.getAttribute('rel') === 'preload') {
            
            const href = node.getAttribute('href');
            const as = node.getAttribute('as');
            
            // Set a timeout to check if the resource gets used
            setTimeout(() => {
              let isUsed = false;
              
              if (as === 'script') {
                isUsed = document.querySelector(`script[src="${href}"]`) !== null;
              } else if (as === 'style') {
                isUsed = document.querySelector(`link[href="${href}"][rel="stylesheet"]`) !== null;
              }
              
              // If not used, remove to prevent warning
              if (!isUsed && node.parentNode) {
                console.warn(`Preventing preload warning by removing: ${href}`);
                node.remove();
              }
            }, 500);
          }
        });
      });
    });
    
    observer.observe(document.head, { childList: true, subtree: true });
  }
  
  // Initialize optimizations when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeFontLoading();
      optimizeSocketIO();
      removeUnusedPreloads();
      preventPreloadWarnings();
    });
  } else {
    optimizeFontLoading();
    optimizeSocketIO();
    removeUnusedPreloads();
    preventPreloadWarnings();
  }
  
  // Expose utility functions globally
  window.ResourceOptimizer = {
    lazyLoadScript,
    optimizeFontLoading,
    removeUnusedPreloads,
    preventPreloadWarnings
  };
})();