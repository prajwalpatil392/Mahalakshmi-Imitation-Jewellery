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
    const [customers] = await db.queryCompat('SELECT * FROM customers WHERE phone = $1', [phone]);
    
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
      
      const result = await db.queryCompat(
        'INSERT INTO customers (phone, name, password) VALUES ($1, $2, $3) RETURNING id',
        [phone, name, hashedPassword]
      );
      
      const newCustomer = {
        id: (result.rows || result)[0].id,
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
    const [customers] = await db.queryCompat('SELECT * FROM customers WHERE phone = $1', [req.params.phone]);
    
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
    const [customers] = await db.queryCompat('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const [customers] = await db.queryCompat('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customers[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new customer (admin endpoint)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, city, address } = req.body;
    
    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const result = await db.queryCompat(
      'INSERT INTO customers (name, email, phone, city, address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, phone, city, address]
    );
    
    res.status(201).json({ customerId: (result.rows || result)[0].id, name, email, phone, city, address });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, email, city, address } = req.body;
    await db.queryCompat(
      'UPDATE customers SET name = COALESCE($1, name), email = COALESCE($2, email), city = COALESCE($3, city), address = COALESCE($4, address) WHERE id = $5',
      [name, email, city, address, req.params.id]
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
    await db.queryCompat(
      'UPDATE customers SET cart_data = $1 WHERE id = $2',
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
    const [customers] = await db.queryCompat('SELECT cart_data FROM customers WHERE id = $1', [customerId]);
    
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const cartData = customers[0].cart_data;
    const cart = cartData ? JSON.parse(cartData) : [];
    
    res.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
