// Analytics Optimizer
// Manages analytics tracking efficiently to prevent performance issues

(function() {
  'use strict';
  
  // Analytics configuration
  const ANALYTICS_CONFIG = {
    // Set to false to disable all analytics
    enabled: true,
    
    // Batch events to reduce network requests
    batchSize: 5,
    batchTimeout: 2000, // 2 seconds
    
    // Queue for batching events
    eventQueue: [],
    batchTimer: null,
    
    // Performance monitoring
    maxRequestTime: 200, // ms
    failureRetryCount: 2
  };
  
  // Event batching system
  function batchEvent(eventData) {
    if (!ANALYTICS_CONFIG.enabled) return;
    
    ANALYTICS_CONFIG.eventQueue.push({
      ...eventData,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100) // Truncate for privacy
    });
    
    // Clear existing timer
    if (ANALYTICS_CONFIG.batchTimer) {
      clearTimeout(ANALYTICS_CONFIG.batchTimer);
    }
    
    // Send immediately if batch is full, otherwise wait for timeout
    if (ANALYTICS_CONFIG.eventQueue.length >= ANALYTICS_CONFIG.batchSize) {
      sendBatch();
    } else {
      ANALYTICS_CONFIG.batchTimer = setTimeout(sendBatch, ANALYTICS_CONFIG.batchTimeout);
    }
  }
  
  // Send batched events
  async function sendBatch() {
    if (ANALYTICS_CONFIG.eventQueue.length === 0) return;
    
    const events = [...ANALYTICS_CONFIG.eventQueue];
    ANALYTICS_CONFIG.eventQueue = [];
    
    if (ANALYTICS_CONFIG.batchTimer) {
      clearTimeout(ANALYTICS_CONFIG.batchTimer);
      ANALYTICS_CONFIG.batchTimer = null;
    }
    
    try {
      const startTime = performance.now();
      
      // Use sendBeacon for better performance if available
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon('/api/analytics', JSON.stringify({
          events,
          batch: true
        }));
        
        if (!success) {
          // Fallback to fetch
          await sendWithFetch(events);
        }
      } else {
        await sendWithFetch(events);
      }
      
      const duration = performance.now() - startTime;
      if (duration > ANALYTICS_CONFIG.maxRequestTime) {
        console.warn(`Analytics request took ${duration.toFixed(2)}ms (threshold: ${ANALYTICS_CONFIG.maxRequestTime}ms)`);
      }
      
    } catch (error) {
      console.warn('Analytics batch failed:', error);
      // Could implement retry logic here
    }
  }
  
  // Fallback fetch method
  async function sendWithFetch(events) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events, batch: true }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  // Track page views
  function trackPageView() {
    batchEvent({
      type: 'page_view',
      page: window.location.pathname,
      title: document.title,
      referrer: document.referrer
    });
  }
  
  // Track user interactions
  function trackEvent(eventName, properties = {}) {
    batchEvent({
      type: 'event',
      name: eventName,
      properties: {
        ...properties,
        page: window.location.pathname
      }
    });
  }
  
  // Track e-commerce events
  function trackEcommerce(action, data = {}) {
    batchEvent({
      type: 'ecommerce',
      action,
      data: {
        ...data,
        currency: 'INR'
      }
    });
  }
  
  // Track performance metrics
  function trackPerformance() {
    if (!window.performance || !window.performance.timing) return;
    
    const timing = window.performance.timing;
    const navigation = window.performance.navigation;
    
    const metrics = {
      // Page load metrics
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: timing.responseStart - timing.navigationStart,
      
      // Network metrics
      dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
      connectTime: timing.connectEnd - timing.connectStart,
      responseTime: timing.responseEnd - timing.responseStart,
      
      // Navigation type
      navigationType: navigation.type
    };
    
    batchEvent({
      type: 'performance',
      metrics
    });
  }
  
  // Initialize analytics
  function initAnalytics() {
    if (!ANALYTICS_CONFIG.enabled) {
      console.log('Analytics disabled');
      return;
    }
    
    // Track initial page view
    trackPageView();
    
    // Track performance metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(trackPerformance, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(trackPerformance, 1000);
      });
    }
    
    // Track user engagement
    let engagementTimer;
    let engagementTime = 0;
    
    function startEngagementTimer() {
      engagementTimer = setInterval(() => {
        engagementTime += 1;
      }, 1000);
    }
    
    function stopEngagementTimer() {
      if (engagementTimer) {
        clearInterval(engagementTimer);
        engagementTimer = null;
      }
    }
    
    // Track engagement time
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopEngagementTimer();
        if (engagementTime > 0) {
          trackEvent('engagement', { timeSpent: engagementTime });
        }
      } else {
        startEngagementTimer();
      }
    });
    
    // Start engagement timer
    startEngagementTimer();
    
    // Send any remaining events before page unload
    window.addEventListener('beforeunload', () => {
      if (ANALYTICS_CONFIG.eventQueue.length > 0) {
        sendBatch();
      }
    });
    
    // Track errors
    window.addEventListener('error', (event) => {
      trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });
  }
  
  // Expose analytics functions globally
  window.Analytics = {
    track: trackEvent,
    trackPageView,
    trackEcommerce,
    trackPerformance,
    
    // Configuration
    enable: () => { ANALYTICS_CONFIG.enabled = true; },
    disable: () => { ANALYTICS_CONFIG.enabled = false; },
    isEnabled: () => ANALYTICS_CONFIG.enabled,
    
    // Manual batch sending
    flush: sendBatch
  };
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }
  
})();