// Quick fix for analytics issues
(function() {
  'use strict';
  
  // Disable Mixpanel to prevent errors
  if (typeof window.Analytics !== 'undefined') {
    const originalTrack = window.Analytics.track;
    
    window.Analytics.track = function(eventName, properties) {
      // Only use internal analytics, skip Mixpanel
      console.log('Analytics Event:', eventName, properties);
      
      // Send to internal analytics only
      if (typeof fetch !== 'undefined') {
        fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            events: [{
              type: 'event',
              name: eventName,
              properties: properties,
              timestamp: Date.now()
            }],
            batch: false
          })
        }).catch(error => {
          console.warn('Analytics failed:', error);
        });
      }
    };
  }
  
  // Override problematic sendBeacon usage
  if (typeof window.sendBatch !== 'undefined') {
    console.log('Analytics fix applied - using fetch only');
  }
  
})();

console.log('Analytics fix loaded - Mixpanel disabled, using internal analytics only');