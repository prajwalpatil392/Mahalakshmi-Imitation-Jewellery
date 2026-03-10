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
  
  // Remove unused preload hints
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
        }
        
        // Remove unused preload
        if (!isUsed && link.parentNode) {
          console.warn(`Removing unused preload: ${href}`);
          link.remove();
        }
      }, 2000);
    });
  }
  
  // Initialize optimizations when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeFontLoading();
      optimizeSocketIO();
      removeUnusedPreloads();
    });
  } else {
    optimizeFontLoading();
    optimizeSocketIO();
    removeUnusedPreloads();
  }
  
  // Expose utility functions globally
  window.ResourceOptimizer = {
    lazyLoadScript,
    optimizeFontLoading,
    removeUnusedPreloads
  };
})();