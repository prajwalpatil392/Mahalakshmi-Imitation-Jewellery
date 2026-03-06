const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendOrderConfirmation, sendAdminOrderNotification } = require('../services/emailService');
const { sendOrderConfirmationSMS, sendAdminOrderNotificationSMS } = require('../services/smsService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validateOrder, validateId, validateStatusUpdate, validatePagination } = require('../middleware/validation');
const inventoryService = require('../services/inventoryService');
const logger = require('../utils/logger');

// Get all orders
router.get('/', validatePagination, asyncHandler(async (req, res) => {
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
  
  res.json({ success: true, data: orders });
}));

// Get single order
router.get('/:id', validateId, asyncHandler(async (req, res) => {
  const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (orders.length === 0) {
    throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  }
  
  const order = orders[0];
  const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  order.items = items;
  
  res.json({ success: true, data: order });
}));

// Create order
router.post('/', validateOrder, asyncHandler(async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const orderId = 'MLR-' + Date.now().toString().slice(-6);
    const { customer, items, total, status, customerId, paymentMethod } = req.body;
    
    // Check stock availability for all items
    for (const item of items) {
      const stock = await inventoryService.getProductStock(item.id);
      const requestedQty = item.quantity || 1;
      
      if (stock.available_stock < requestedQty) {
        throw new AppError(
          `Insufficient stock for ${item.name}. Available: ${stock.available_stock}, Requested: ${requestedQty}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }
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
    
    // Insert order with RETURNING clause for PostgreSQL
    const [result] = await connection.query(
      `INSERT INTO orders (order_id, type, customer_id, customer_name, customer_phone, customer_email, customer_address, customer_event, customer_notes, total, status, placed_at, timestamp, product_names, payment_method, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [orderId, 'order', customerId || null, customer.name, customer.phone, customer.email || null, customer.address || null, customer.event || null, customer.notes || null, total, status || 'New', new Date().toLocaleString('en-IN'), Date.now(), productNames, payment_method, payment_status]
    );
    
    const orderDbId = result[0].id;
    
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
    
    // Reserve stock using inventory service
    const orderItems = items.map(item => ({
      product_id: item.id,
      quantity: item.quantity || 1
    }));
    await inventoryService.reserveStock(orderDbId, orderItems, `Order ${orderId} placed`);
    
    // Clear customer cart if customerId provided
    if (customerId) {
      await connection.query('UPDATE customers SET cart_data = NULL WHERE id = ?', [customerId]);
    }
    
    await connection.commit();
    
    logger.info(`Order created: ${orderId}`, { orderId, orderDbId, total, items: items.length });
    
    // Send notifications
    const createdOrder = { ...req.body, order_id: orderId, product_names: productNames };
    await sendOrderConfirmation(createdOrder);
    await sendAdminOrderNotification(createdOrder);
    await sendOrderConfirmationSMS(createdOrder);
    await sendAdminOrderNotificationSMS(createdOrder);
    
    res.status(201).json({ 
      success: true, 
      data: { id: orderDbId, orderId, payment_method, payment_status, ...req.body } 
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Order creation failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}));

// Update order status
router.patch('/:id/status', validateId, validateStatusUpdate, asyncHandler(async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  
  // Get current order status
  const [orders] = await db.query('SELECT status FROM orders WHERE id = ?', [orderId]);
  if (orders.length === 0) {
    throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  }
  
  const oldStatus = orders[0].status;
  
  // Update status
  await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
  
  // Release stock if order is cancelled or returned
  if ((status === 'Cancelled' || status === 'Returned') && (oldStatus === 'New' || oldStatus === 'Confirmed')) {
    const [items] = await db.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
    const orderItems = items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity
    }));
    await inventoryService.releaseStock(orderId, orderItems, `Order ${status.toLowerCase()}`);
    logger.info(`Stock released for order ${orderId}`, { status, items: orderItems.length });
  }
  
  res.json({ success: true, data: { id: orderId, status, oldStatus } });
}));

// Delete order
router.delete('/:id', validateId, asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  
  // Get order items before deletion
  const [items] = await db.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
  
  // Release stock
  if (items.length > 0) {
    const orderItems = items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity
    }));
    await inventoryService.releaseStock(orderId, orderItems, 'Order deleted');
  }
  
  // Delete order (cascade will delete order_items)
  await db.query('DELETE FROM orders WHERE id = ?', [orderId]);
  
  logger.info(`Order deleted: ${orderId}`);
  res.json({ success: true, message: 'Order deleted' });
}));

// Get order statistics
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const [totalResult] = await db.query("SELECT COUNT(*) as count FROM orders WHERE type = 'order'");
  const [newResult] = await db.query("SELECT COUNT(*) as count FROM orders WHERE type = 'order' AND status = 'New'");
  const [revenueResult] = await db.query("SELECT SUM(total) as total FROM orders WHERE type = 'order' AND status IN ('Confirmed', 'Delivered', 'Completed')");
  
  res.json({
    success: true,
    data: {
      totalOrders: totalResult[0].count,
      newOrders: newResult[0].count,
      totalRevenue: revenueResult[0].total || 0
    }
  });
}));

module.exports = router;
