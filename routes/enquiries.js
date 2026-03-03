const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all enquiries
router.get('/', async (req, res) => {
  try {
    const { status, limit } = req.query;
    let query = 'SELECT * FROM enquiries WHERE 1=1';
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
    
    const [enquiries] = await db.query(query, params);
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single enquiry
router.get('/:id', async (req, res) => {
  try {
    const [enquiries] = await db.query('SELECT * FROM enquiries WHERE id = ?', [req.params.id]);
    if (enquiries.length === 0) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(enquiries[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create enquiry
router.post('/', async (req, res) => {
  try {
    const orderId = 'ENQ-' + Date.now().toString().slice(-6);
    const { customer, requestType } = req.body;
    
    const [result] = await db.query(
      `INSERT INTO enquiries (order_id, customer_name, customer_phone, customer_email, customer_event, customer_notes, request_type, status, placed_at, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, customer.name, customer.phone, customer.email, customer.event, customer.notes, requestType, 'New', new Date().toLocaleString('en-IN'), Date.now()]
    );
    
    res.status(201).json({ id: result.insertId, orderId, ...req.body });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update enquiry status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE enquiries SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ id: req.params.id, status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete enquiry
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM enquiries WHERE id = ?', [req.params.id]);
    res.json({ message: 'Enquiry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
