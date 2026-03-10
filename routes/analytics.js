const express = require('express');
const router = express.Router();

// Mixpanel server-side forwarding for better performance
const https = require('https');
const querystring = require('querystring');

// Forward events to Mixpanel server-side (reduces client-side requests)
async function forwardToMixpanel(events) {
  if (!process.env.MIXPANEL_TOKEN) {
    console.warn('Mixpanel token not configured');
    return;
  }
  
  try {
    const mixpanelEvents = events.map(event => ({
      event: event.name || event.type,
      properties: {
        ...event.properties,
        ...event.data,
        token: process.env.MIXPANEL_TOKEN,
        time: Math.floor(event.timestamp / 1000),
        distinct_id: event.sessionId || 'anonymous',
        $insert_id: `${event.timestamp}-${Math.random().toString(36).substr(2, 9)}`
      }
    }));
    
    const data = Buffer.from(JSON.stringify(mixpanelEvents)).toString('base64');
    const postData = querystring.stringify({ data });
    
    const options = {
      hostname: 'api.mixpanel.com',
      port: 443,
      path: '/track',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000 // 5 second timeout
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Mixpanel API error: ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Mixpanel request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    console.error('Error forwarding to Mixpanel:', error);
  }
}

// Forward events to Mixpanel server-side (reduces client-side requests)
async function forwardToMixpanel(events) {
  if (!process.env.MIXPANEL_TOKEN) {
    console.warn('Mixpanel token not configured');
    return;
  }

  try {
    const mixpanelEvents = events.map(event => ({
      event: event.name || event.type,
      properties: {
        ...event.properties,
        ...event.data,
        token: process.env.MIXPANEL_TOKEN,
        time: Math.floor(event.timestamp / 1000),
        distinct_id: event.sessionId || 'anonymous',
        $insert_id: `${event.timestamp}-${Math.random().toString(36).substr(2, 9)}`
      }
    }));

    const data = Buffer.from(JSON.stringify(mixpanelEvents)).toString('base64');
    const postData = querystring.stringify({ data });

    const options = {
      hostname: 'api.mixpanel.com',
      port: 443,
      path: '/track',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000 // 5 second timeout
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Mixpanel API error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Mixpanel request timeout'));
      });

      req.write(postData);
      req.end();
    });

  } catch (error) {
    console.error('Error forwarding to Mixpanel:', error);
  }
}
const router = express.Router();

// Analytics endpoint for batched events
router.post('/', async (req, res) => {
  try {
    const { events, batch } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid events data' });
    }
    
    // Process events asynchronously to avoid blocking the response
    setImmediate(() => {
      processAnalyticsEvents(events, req);
    });
    
    // Return success immediately
    res.status(200).json({ 
      status: 'success', 
      processed: events.length,
      batch: batch || false
    });
    
  } catch (error) {
    console.error('Analytics processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process analytics events
async function processAnalyticsEvents(events, req) {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Forward to Mixpanel server-side (non-blocking)
    setImmediate(() => {
      forwardToMixpanel(events).catch(error => {
        console.warn('Mixpanel forwarding failed:', error.message);
      });
    });
    
    for (const event of events) {
      // Add server-side metadata
      const enrichedEvent = {
        ...event,
        serverTimestamp: Date.now(),
        clientIP: clientIP,
        userAgent: userAgent,
        sessionId: req.sessionID || 'anonymous'
      };
      
      // Process different event types
      switch (event.type) {
        case 'page_view':
          await processPageView(enrichedEvent);
          break;
        case 'event':
          await processCustomEvent(enrichedEvent);
          break;
        case 'ecommerce':
          await processEcommerceEvent(enrichedEvent);
          break;
        case 'performance':
          await processPerformanceEvent(enrichedEvent);
          break;
        default:
          console.warn('Unknown event type:', event.type);
      }
    }
    
  } catch (error) {
    console.error('Error processing analytics events:', error);
  }
}

// Process page view events
async function processPageView(event) {
  // Log page views (you can store in database if needed)
  console.log('Page View:', {
    page: event.page,
    title: event.title,
    timestamp: new Date(event.timestamp).toISOString(),
    ip: event.clientIP?.substring(0, 10) + '...' // Truncate for privacy
  });
  
  // You can add database storage here:
  // await db.query('INSERT INTO page_views (page, title, timestamp, ip) VALUES (?, ?, ?, ?)', 
  //   [event.page, event.title, event.timestamp, event.clientIP]);
}

// Process custom events
async function processCustomEvent(event) {
  console.log('Custom Event:', {
    name: event.name,
    properties: event.properties,
    timestamp: new Date(event.timestamp).toISOString()
  });
  
  // Special handling for important events
  if (event.name === 'order_placed') {
    // Track conversion
    console.log('🎉 Conversion tracked:', event.properties);
  } else if (event.name === 'cart_abandoned') {
    // Track cart abandonment
    console.log('⚠️ Cart abandoned:', event.properties);
  }
}

// Process e-commerce events
async function processEcommerceEvent(event) {
  console.log('E-commerce Event:', {
    action: event.action,
    data: event.data,
    timestamp: new Date(event.timestamp).toISOString()
  });
  
  // Track revenue and conversions
  if (event.action === 'purchase' && event.data.total) {
    console.log('💰 Revenue tracked:', event.data.total, event.data.currency);
  }
}

// Process performance events
async function processPerformanceEvent(event) {
  const metrics = event.metrics;
  
  // Log performance issues
  if (metrics.loadTime > 3000) {
    console.warn('⚠️ Slow page load:', metrics.loadTime + 'ms');
  }
  
  if (metrics.responseTime > 1000) {
    console.warn('⚠️ Slow server response:', metrics.responseTime + 'ms');
  }
  
  // You can store performance metrics for monitoring
  console.log('Performance Metrics:', {
    loadTime: metrics.loadTime,
    domReady: metrics.domReady,
    responseTime: metrics.responseTime,
    page: event.page
  });
}

// Get analytics summary (optional endpoint for admin)
router.get('/summary', async (req, res) => {
  try {
    // This would typically query your analytics database
    const summary = {
      message: 'Analytics summary endpoint',
      note: 'Implement database queries here to return analytics data',
      timestamp: new Date().toISOString()
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;