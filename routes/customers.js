const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Customer login/signup
router.post('/login', async (req, res) => {
  try {
    const { phone, name, password } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Check if customer exists
    const [customers] = await db.query('SELECT * FROM customers WHERE phone = ?', [phone]);
    
    if (customers.length > 0) {
      // Existing customer - login
      const customer = customers[0];
      
      // If password is set, verify it
      if (customer.password && password) {
        const isValid = await bcrypt.compare(password, customer.password);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }
      
      return res.json({ 
        customer: { ...customer, password: undefined },
        message: 'Welcome back!'
      });
    } else {
      // New customer - signup
      if (!name) {
        return res.status(400).json({ error: 'Name is required for new customers' });
      }
      
      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      
      const [result] = await db.query(
        'INSERT INTO customers (phone, name, password) VALUES (?, ?, ?)',
        [phone, name, hashedPassword]
      );
      
      const newCustomer = {
        id: result.insertId,
        phone,
        name,
        created_at: new Date()
      };
      
      return res.status(201).json({
        customer: newCustomer,
        message: 'Account created successfully!'
      });
    }
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer by phone
router.get('/phone/:phone', async (req, res) => {
  try {
    const [customers] = await db.query('SELECT * FROM customers WHERE phone = ?', [req.params.phone]);
    
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customers[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all customers (for admin)
router.get('/', async (req, res) => {
  try {
    const [customers] = await db.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    await db.query(
      'UPDATE customers SET name = ?, email = ? WHERE id = ?',
      [name, email, req.params.id]
    );
    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Save customer cart
router.post('/:id/cart', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { cart } = req.body;
    
    // Store cart as JSON in the database
    await db.query(
      'UPDATE customers SET cart_data = ? WHERE id = ?',
      [JSON.stringify(cart), customerId]
    );
    
    res.json({ message: 'Cart saved successfully', cart });
  } catch (error) {
    console.error('Save cart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer cart
router.get('/:id/cart', async (req, res) => {
  try {
    const customerId = req.params.id;
    const [customers] = await db.query('SELECT cart_data FROM customers WHERE id = ?', [customerId]);
    
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const cartData = customers[0].cart_data;
    const cart = cartData ? JSON.parse(cartData) : [];
    
    res.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer orders
router.get('/:id/orders', async (req, res) => {
  try {
    const customerId = req.params.id;
    const [orders] = await db.query(
      `SELECT o.*, 
        GROUP_CONCAT(
          JSON_OBJECT(
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'price', oi.price,
            'mode', oi.mode,
            'rental_from', oi.rental_from,
            'rental_to', oi.rental_to
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.customer_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC`,
      [customerId]
    );
    
    // Parse items JSON
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: order.items ? JSON.parse(`[${order.items}]`) : []
    }));
    
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
