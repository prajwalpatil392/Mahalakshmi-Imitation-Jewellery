const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendOrderConfirmation, sendAdminOrderNotification } = require('../services/emailService');
const { sendOrderConfirmationSMS, sendAdminOrderNotificationSMS } = require('../services/smsService');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { status, limit } = req.query;
    let query = "SELECT * FROM orders WHERE type = 'order'";
    const params = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    
    const [orders] = await db.query(query, params);
    
    // Optimize: Get all items in one query instead of N queries
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const [allItems] = await db.query(
        'SELECT * FROM order_items WHERE order_id IN (?)',
        [orderIds]
      );
      
      // Group items by order_id
      orders.forEach(order => {
        order.items = allItems.filter(item => item.order_id === order.id);
      });
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const order = orders[0];
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    order.items = items;
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const orderId = 'MLR-' + Date.now().toString().slice(-6);
    const { customer, items, total, status, customerId, paymentMethod } = req.body;
    
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
    const [result] = await connection.query(
      `INSERT INTO orders (order_id, type, customer_id, customer_name, customer_phone, customer_email, customer_address, customer_event, customer_notes, total, status, placed_at, timestamp, product_names, payment_method, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, 'order', customerId || null, customer.name, customer.phone, customer.email || null, customer.address || null, customer.event || null, customer.notes || null, total, status || 'New', new Date().toLocaleString('en-IN'), Date.now(), productNames, payment_method, payment_status]
    );
    
    const orderDbId = result.insertId;
    
    // Insert order items with quantities
    for (const item of items) {
      const quantity = item.quantity || 1;
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_icon, mode, quantity, price, rental_from, rental_to, rental_days, rental_total) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderDbId, item.id, item.name, item.icon, item.mode, quantity, item.unitPrice || item.price, 
         item.rentalData?.from, item.rentalData?.to, item.rentalData?.days, item.rentalData?.total]
      );
    }
    
    // Clear customer cart if customerId provided
    if (customerId) {
      await connection.query('UPDATE customers SET cart_data = NULL WHERE id = ?', [customerId]);
    }
    
    await connection.commit();
    
    // Send notifications
    const createdOrder = { ...req.body, order_id: orderId, product_names: productNames };
    await sendOrderConfirmation(createdOrder);
    await sendAdminOrderNotification(createdOrder);
    await sendOrderConfirmationSMS(createdOrder);
    await sendAdminOrderNotificationSMS(createdOrder);
    
    res.status(201).json({ id: orderDbId, orderId, payment_method, payment_status, ...req.body });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ id: req.params.id, status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalResult] = await db.query("SELECT COUNT(*) as count FROM orders WHERE type = 'order'");
    const [newResult] = await db.query("SELECT COUNT(*) as count FROM orders WHERE type = 'order' AND status = 'New'");
    const [revenueResult] = await db.query("SELECT SUM(total) as total FROM orders WHERE type = 'order' AND status IN ('Confirmed', 'Delivered', 'Completed')");
    
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
