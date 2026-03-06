const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Customer login/signup
router.post('/login', asyncHandler(async (req, res) => {
  const { phone, name, password } = req.body;
  
  if (!phone) {
    throw new AppError('Phone number is required', 400, 'PHONE_REQUIRED');
  }
  
  // Check if customer exists
  const result = await db.query('SELECT * FROM customers WHERE phone = $1', [phone]);
  
  if (result.rows.length > 0) {
    // Existing customer - login
    const customer = result.rows[0];
    
    // If password is set, verify it
    if (customer.password && password) {
      const isValid = await bcrypt.compare(password, customer.password);
      if (!isValid) {
        throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
      }
    }
    
    return res.json({ 
      customer: { ...customer, password: undefined },
      message: 'Welcome back!'
    });
  } else {
    // New customer - signup
    if (!name) {
      throw new AppError('Name is required for new customers', 400, 'NAME_REQUIRED');
    }
    
    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    const insertResult = await db.query(
      'INSERT INTO customers (phone, name, password) VALUES ($1, $2, $3) RETURNING id, phone, name, created_at',
      [phone, name, hashedPassword]
    );
    
    const newCustomer = insertResult.rows[0];
    
    return res.status(201).json({
      customer: newCustomer,
      message: 'Account created successfully!'
    });
  }
}));

// Get customer by phone
router.get('/phone/:phone', asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM customers WHERE phone = $1', [req.params.phone]);
  
  if (result.rows.length === 0) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  
  res.json(result.rows[0]);
}));

// Get all customers (for admin)
router.get('/', asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM customers ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows });
}));

// Get customer by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  
  res.json(result.rows[0]);
}));

// Create new customer (admin endpoint)
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, phone, city, address } = req.body;
  
  // Validate required fields
  if (!name || !phone) {
    throw new AppError('Name and phone are required', 400, 'MISSING_FIELDS');
  }
  
  // Validate email format if provided
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
  }
  
  const result = await db.query(
    'INSERT INTO customers (name, email, phone, city, address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [name, email, phone, city, address]
  );
  
  res.status(201).json({ 
    success: true,
    data: { customerId: result.rows[0].id, name, email, phone, city, address }
  });
}));

// Update customer
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, email, city, address } = req.body;
  await db.query(
    'UPDATE customers SET name = COALESCE($1, name), email = COALESCE($2, email), city = COALESCE($3, city), address = COALESCE($4, address) WHERE id = $5',
    [name, email, city, address, req.params.id]
  );
  res.json({ success: true, message: 'Customer updated successfully' });
}));

// Save customer cart
router.post('/:id/cart', asyncHandler(async (req, res) => {
  const customerId = req.params.id;
  const { cart } = req.body;
  
  // Store cart as JSON in the database
  await db.query(
    'UPDATE customers SET cart_data = $1 WHERE id = $2',
    [JSON.stringify(cart), customerId]
  );
  
  res.json({ success: true, message: 'Cart saved successfully', cart });
}));

// Get customer cart
router.get('/:id/cart', asyncHandler(async (req, res) => {
  const customerId = req.params.id;
  const result = await db.query('SELECT cart_data FROM customers WHERE id = $1', [customerId]);
  
  if (result.rows.length === 0) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  
  const cartData = result.rows[0].cart_data;
  const cart = cartData ? JSON.parse(cartData) : [];
  
  res.json(cart);
}));

// Get customer orders
router.get('/:id/orders', asyncHandler(async (req, res) => {
  const customerId = req.params.id;
  
  // Get orders
  const ordersResult = await db.query(
    'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
    [customerId]
  );
  
  const orders = ordersResult.rows;
  
  // Get order items for all orders
  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id);
    const itemsResult = await db.query(
      'SELECT * FROM order_items WHERE order_id = ANY($1::int[])',
      [orderIds]
    );
    
    // Group items by order_id
    orders.forEach(order => {
      order.items = itemsResult.rows.filter(item => item.order_id === order.id);
    });
  }
  
  res.json(orders);
}));

module.exports = router;
