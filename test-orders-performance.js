const https = require('https');

async function testOrdersPerformance() {
  const baseUrl = 'https://mahalakshmi-imitation-jewellery.onrender.com';
  const endpoint = '/api/orders';
  
  console.log('Testing orders API performance...\n');
  
  // Test 1: Initial request (cache miss)
  console.log('Test 1: Initial request (cache miss)');
  const start1 = Date.now();
  
  try {
    const response1 = await makeRequest(baseUrl + endpoint);
    const duration1 = Date.now() - start1;
    const etag1 = response1.headers.etag;
    
    console.log(`Status: ${response1.statusCode}`);
    console.log(`Duration: ${duration1}ms`);
    console.log(`ETag: ${etag1}`);
    console.log(`Response size: ${JSON.stringify(response1.data).length} bytes\n`);
    
    // Test 2: Subsequent request with ETag (should be 304)
    console.log('Test 2: Subsequent request with ETag (should be 304)');
    const start2 = Date.now();
    
    const response2 = await makeRequest(baseUrl + endpoint, {
      'If-None-Match': etag1
    });
    const duration2 = Date.now() - start2;
    
    console.log(`Status: ${response2.statusCode}`);
    console.log(`Duration: ${duration2}ms`);
    console.log(`Improvement: ${duration1 - duration2}ms (${Math.round((1 - duration2/duration1) * 100)}% faster)\n`);
    
    // Test 3: Multiple concurrent requests
    console.log('Test 3: Multiple concurrent requests (5 requests)');
    const start3 = Date.now();
    
    const promises = Array(5).fill().map(() => 
      makeRequest(baseUrl + endpoint, { 'If-None-Match': etag1 })
    );
    
    const responses3 = await Promise.all(promises);
    const duration3 = Date.now() - start3;
    
    console.log(`All requests completed in: ${duration3}ms`);
    console.log(`Average per request: ${Math.round(duration3/5)}ms`);
    console.log(`All returned 304: ${responses3.every(r => r.statusCode === 304)}`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Performance-Test',
        ...headers
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

testOrdersPerformance();