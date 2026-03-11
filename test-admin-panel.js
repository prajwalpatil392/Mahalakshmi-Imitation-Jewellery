// Test script to verify admin panel functionality
const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'https://mahalakshmi-imitation-jewellery.onrender.com';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode === 200, data: json });
        } catch (e) {
          resolve({ ok: res.statusCode === 200, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function testAdminPanel() {
  console.log('🧪 Testing Admin Panel Functionality...\n');
  
  try {
    // Test 1: Check if enquiries API is working
    console.log('1. Testing Enquiries API...');
    const enquiriesResult = await makeRequest(`${BASE_URL}/api/enquiries`);
    
    if (enquiriesResult.ok) {
      const enquiries = enquiriesResult.data;
      console.log(`✅ Enquiries API working - Found ${Array.isArray(enquiries) ? enquiries.length : 'unknown'} enquiries`);
    } else {
      console.log(`❌ Enquiries API failed`);
    }
    
    // Test 2: Check if orders API is working
    console.log('\n2. Testing Orders API...');
    const ordersResult = await makeRequest(`${BASE_URL}/api/orders`);
    
    if (ordersResult.ok) {
      const orders = ordersResult.data;
      console.log(`✅ Orders API working - Found ${Array.isArray(orders) ? orders.length : 'unknown'} orders`);
    } else {
      console.log(`❌ Orders API failed`);
    }
    
    // Test 3: Check if products API is working
    console.log('\n3. Testing Products API...');
    const productsResult = await makeRequest(`${BASE_URL}/api/products`);
    
    if (productsResult.ok) {
      const products = productsResult.data;
      console.log(`✅ Products API working - Found ${Array.isArray(products) ? products.length : 'unknown'} products`);
    } else {
      console.log(`❌ Products API failed`);
    }
    
    // Test 4: Check if admin page loads
    console.log('\n4. Testing Admin Page Load...');
    const adminResult = await makeRequest(`${BASE_URL}/admin`);
    
    if (adminResult.ok) {
      const adminHtml = adminResult.data;
      const hasAutoFix = adminHtml.includes('admin-auto-fix.js');
      console.log(`✅ Admin page loads successfully`);
      console.log(`${hasAutoFix ? '✅' : '❌'} Auto-fix script ${hasAutoFix ? 'included' : 'missing'}`);
    } else {
      console.log(`❌ Admin page failed to load`);
    }
    
    console.log('\n🎯 Admin Panel Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAdminPanel();