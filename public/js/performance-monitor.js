// Performance Monitor for Third-Party Scripts
(function() {
  'use strict';
  
  const PerformanceMonitor = {
    thresholds: {
      scriptLoad: 200,    // ms
      apiRequest: 150,    // ms
      totalBlocking: 500  // ms
    },
    
    metrics: {
      scriptLoads: [],
      apiRequests: [],
      totalBlockingTime: 0
    },
    
    // Monitor script loading performance
    monitorScriptLoad(scriptSrc, startTime) {
      const loadTime = performance.now() - startTime;
      
      this.metrics.scriptLoads.push({
        src: scriptSrc,
        loadTime,
        timestamp: Date.now()
      });
      
      if (loadTime > this.thresholds.scriptLoad) {
        console.warn(`⚠️ Slow script load: ${scriptSrc} took ${loadTime.toFixed(2)}ms`);
        
        // Track slow script loads
        if (window.Analytics) {
          Analytics.track('slow_script_load', {
            script: scriptSrc,
            loadTime: Math.round(loadTime),
            threshold: this.thresholds.scriptLoad
          });
        }
      }
      
      return loadTime;
    },
    
    // Monitor API request performance
    monitorApiRequest(url, startTime, success = true) {
      const requestTime = performance.now() - startTime;
      
      this.metrics.apiRequests.push({
        url,
        requestTime,
        success,
        timestamp: Date.now()
      });
      
      if (requestTime > this.thresholds.apiRequest) {
        console.warn(`⚠️ Slow API request: ${url} took ${requestTime.toFixed(2)}ms`);
        
        // Track slow API requests
        if (window.Analytics) {
          Analytics.track('slow_api_request', {
            url: url.replace(/https?:\/\/[^\/]+/, ''), // Remove domain for privacy
            requestTime: Math.round(requestTime),
            success,
            threshold: this.thresholds.apiRequest
          });
        }
      }
      
      return requestTime;
    },
    
    // Monitor total blocking time from third-party scripts
    calculateBlockingTime() {
      if (!window.performance || !performance.getEntriesByType) return 0;
      
      const resources = performance.getEntriesByType('resource');
      let totalBlocking = 0;
      
      resources.forEach(resource => {
        if (resource.initiatorType === 'script' && 
            resource.name.includes('mixpanel') || 
            resource.name.includes('analytics')) {
          
          // Calculate blocking time (simplified)
          const blockingTime = resource.responseEnd - resource.fetchStart;
          totalBlocking += blockingTime;
        }
      });
      
      this.metrics.totalBlockingTime = totalBlocking;
      
      if (totalBlocking > this.thresholds.totalBlocking) {
        console.warn(`⚠️ High third-party blocking time: ${totalBlocking.toFixed(2)}ms`);
        
        if (window.Analytics) {
          Analytics.track('high_blocking_time', {
            blockingTime: Math.round(totalBlocking),
            threshold: this.thresholds.totalBlocking
          });
        }
      }
      
      return totalBlocking;
    },
    
    // Get performance summary
    getSummary() {
      return {
        scriptLoads: this.metrics.scriptLoads.length,
        avgScriptLoadTime: this.metrics.scriptLoads.reduce((sum, s) => sum + s.loadTime, 0) / this.metrics.scriptLoads.length || 0,
        apiRequests: this.metrics.apiRequests.length,
        avgApiRequestTime: this.metrics.apiRequests.reduce((sum, r) => sum + r.requestTime, 0) / this.metrics.apiRequests.length || 0,
        totalBlockingTime: this.metrics.totalBlockingTime,
        slowScripts: this.metrics.scriptLoads.filter(s => s.loadTime > this.thresholds.scriptLoad),
        slowRequests: this.metrics.apiRequests.filter(r => r.requestTime > this.thresholds.apiRequest)
      };
    },
    
    // Report performance metrics
    reportMetrics() {
      const summary = this.getSummary();
      
      if (window.Analytics) {
        Analytics.track('performance_summary', {
          scriptLoads: summary.scriptLoads,
          avgScriptLoadTime: Math.round(summary.avgScriptLoadTime),
          apiRequests: summary.apiRequests,
          avgApiRequestTime: Math.round(summary.avgApiRequestTime),
          totalBlockingTime: Math.round(summary.totalBlockingTime),
          slowScriptsCount: summary.slowScripts.length,
          slowRequestsCount: summary.slowRequests.length
        });
      }
      
      return summary;
    }
  };
  
  // Override fetch to monitor API requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const startTime = performance.now();
    const url = args[0];
    
    return originalFetch.apply(this, args)
      .then(response => {
        PerformanceMonitor.monitorApiRequest(url, startTime, response.ok);
        return response;
      })
      .catch(error => {
        PerformanceMonitor.monitorApiRequest(url, startTime, false);
        throw error;
      });
  };
  
  // Monitor script loading
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set;
      
      Object.defineProperty(element, 'src', {
        set: function(value) {
          const startTime = performance.now();
          
          element.addEventListener('load', () => {
            PerformanceMonitor.monitorScriptLoad(value, startTime);
          });
          
          element.addEventListener('error', () => {
            PerformanceMonitor.monitorScriptLoad(value, startTime);
          });
          
          originalSrcSetter.call(this, value);
        },
        get: function() {
          return this.getAttribute('src');
        }
      });
    }
    
    return element;
  };
  
  // Report metrics periodically
  setInterval(() => {
    PerformanceMonitor.calculateBlockingTime();
  }, 30000); // Every 30 seconds
  
  // Report final metrics before page unload
  window.addEventListener('beforeunload', () => {
    PerformanceMonitor.reportMetrics();
  });
  
  // Expose globally
  window.PerformanceMonitor = PerformanceMonitor;
  
})();