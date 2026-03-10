const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendOrderConfirmation, sendAdminOrderNotification } = require('../services/emailService');
const { sendOrderConfirmationSMS, sendAdminOrderNotificationSMS } = require('../services/smsService');
const cacheService = require('../services/cacheService');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const cacheKey = cacheService.generateOrdersKey(status, limit);
    
    // Try to get from cache first
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      const etag = cachedData.etag;
      
      // Check if client has current version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      
      // Set caching headers and return cached data
      res.set({
        'ETag': etag,
        'Cache-Control': 'private, max-age=60'
      });
      
      return res.json(cachedData.orders);
    }
    
    // First, get the latest timestamp for ETag generation
    const [latestOrder] = await db.queryCompat(
      "SELECT MAX(timestamp) as latest_timestamp FROM orders WHERE type = 'order'"
    );
    
    const etag = `"orders-${latestOrder[0].latest_timestamp || 0}-${status || 'all'}-${limit || 'all'}"`;
    
    // Check if client has current version
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    let query = "SELECT * FROM orders WHERE type = 'order'";
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }
    
    const [orders] = await db.queryCompat(query, params);
    
    // Optimize: Get all items in one query instead of N queries
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const [allItems] = await db.queryCompat(
        'SELECT * FROM order_items WHERE order_id = ANY($1)',
        [orderIds]
      );
      
      // Group items by order_id using Map for better performance
      const itemsMap = new Map();
      allItems.forEach(item => {
        if (!itemsMap.has(item.order_id)) {
          itemsMap.set(item.order_id, []);
        }
        itemsMap.get(item.order_id).push(item);
      });
      
      orders.forEach(order => {
        order.items = itemsMap.get(order.id) || [];
      });
    }
    
    // Cache the result
    cacheService.set(cacheKey, { orders, etag });
    
    // Set caching headers
    res.set({
      'ETag': etag,
      'Cache-Control': 'private, max-age=60' // Cache for 1 minute
    });
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const [orders] = await db.queryCompat('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const order = orders[0];
    const [items] = await db.queryCompat('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = items;
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const orderId = 'MLR-' + Date.now().toString().slice(-6);
    const { customer, items, total, status, customerId, paymentMethod } = req.body;
    
    // Validate that all products exist in the database
    const productIds = items.map(item => item.id);
    const productCheckResult = await client.query(
      'SELECT id FROM products WHERE id = ANY($1)',
      [productIds]
    );
    
    const existingProductIds = productCheckResult.rows.map(row => row.id);
    const missingProductIds = productIds.filter(id => !existingProductIds.includes(id));
    
    if (missingProductIds.length > 0) {
      throw new Error(`Products with IDs ${missingProductIds.join(', ')} do not exist. Please refresh your cart.`);
    }
    
    // Build product names summary
    const productNames = items.map(item => {
      const qty = item.quantity || 1;
      const name = item.name;
      return qty > 1 ? `${name} (×${qty})` : name;
    }).join(', ');
    
    // Set default payment method if not provided
    const payment_method = paymentMethod || 'Cash on Delivery';
    const payment_status = paymentMethod === 'online' ? 'pending' : 'pending';
    
    // Insert order with customer_id, product_names, and payment info
    const result = await client.query(
      `INSERT INTO orders (order_id, type, customer_id, customer_name, customer_phone, customer_email, customer_address, customer_event, customer_notes, total, status, placed_at, timestamp, product_names, payment_method, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
      [orderId, 'order', customerId || null, customer.name, customer.phone, customer.email || null, customer.address || null, customer.event || null, customer.notes || null, total, status || 'New', new Date().toLocaleString('en-IN'), Date.now(), productNames, payment_method, payment_status]
    );
    
    const orderDbId = result.rows[0].id;
    
    // Insert order items with quantities
    for (const item of items) {
      const quantity = item.quantity || 1;
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_icon, mode, quantity, price, rental_from, rental_to, rental_days, rental_total) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [orderDbId, item.id, item.name, item.icon, item.mode, quantity, item.unitPrice || item.price, 
         item.rentalData?.from, item.rentalData?.to, item.rentalData?.days, item.rentalData?.total]
      );
    }
    
    // Clear customer cart if customerId provided
    if (customerId) {
      await client.query('UPDATE customers SET cart_data = NULL WHERE id = $1', [customerId]);
    }
    
    await client.query('COMMIT');
    
    // Invalidate orders cache since new order was created
    cacheService.invalidateOrdersCache();
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('orderCreated', { 
        id: orderDbId, 
        orderId, 
        customer: req.body.customer,
        total,
        status: status || 'New'
      });
    }
    
    // Send notifications
    const createdOrder = { ...req.body, order_id: orderId, product_names: productNames };
    await sendOrderConfirmation(createdOrder);
    await sendAdminOrderNotification(createdOrder);
    await sendOrderConfirmationSMS(createdOrder);
    await sendAdminOrderNotificationSMS(createdOrder);
    
    res.status(201).json({ id: orderDbId, orderId, payment_method, payment_status, ...req.body });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await db.queryCompat('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    
    // Invalidate orders cache since order was updated
    cacheService.invalidateOrdersCache();
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('orderUpdated', { id: req.params.id, status });
    }
    
    res.json({ id: req.params.id, status });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    await db.queryCompat('DELETE FROM orders WHERE id = $1', [req.params.id]);
    
    // Invalidate orders cache since order was deleted
    cacheService.invalidateOrdersCache();
    
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalResult] = await db.queryCompat("SELECT COUNT(*) as count FROM orders WHERE type = 'order'");
    const [newResult] = await db.queryCompat("SELECT COUNT(*) as count FROM orders WHERE type = 'order' AND status = 'New'");
    const [revenueResult] = await db.queryCompat("SELECT SUM(total) as total FROM orders WHERE type = 'order' AND status IN ('Confirmed', 'Delivered', 'Completed')");
    
    res.json({
      totalOrders: totalResult[0].count,
      newOrders: newResult[0].count,
      totalRevenue: revenueResult[0].total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
