// Disable Analytics completely to prevent errors
(function() {
  'use strict';
  
  // Create a stub Analytics object that does nothing
  window.Analytics = {
    track: function(eventName, properties) {
      // Do nothing - analytics disabled
      console.log('Analytics disabled - would have tracked:', eventName, properties);
    },
    
    init: function() {
      // Do nothing
    },
    
    identify: function() {
      // Do nothing  
    },
    
    page: function() {
      // Do nothing
    }
  };
  
  console.log('Analytics completely disabled - stub object created');
})();