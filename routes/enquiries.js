const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validateId, validatePagination } = require('../middleware/validation');

// Get all enquiries
router.get('/', validatePagination, asyncHandler(async (req, res) => {
  const { status, limit } = req.query;
  let query = 'SELECT * FROM enquiries WHERE 1=1';
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    query += ` AND status = $${paramIndex++}`;
    params.push(status);
  }
  
  query += ' ORDER BY timestamp DESC';
  
  if (limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(parseInt(limit));
  }
  
  const result = await db.query(query, params);
  res.json({ success: true, data: result.rows });
}));

// Get single enquiry
router.get('/:id', validateId, asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM enquiries WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    throw new AppError('Enquiry not found', 404, 'ENQUIRY_NOT_FOUND');
  }
  res.json({ success: true, data: result.rows[0] });
}));

// Create enquiry
router.post('/', asyncHandler(async (req, res) => {
  const orderId = 'ENQ-' + Date.now().toString().slice(-6);
  
  // Support both formats: { customer: {...} } and flat { name, email, ... }
  let customer, requestType;
  if (req.body.customer) {
    customer = req.body.customer;
    requestType = req.body.requestType;
  } else {
    // Flat format from test
    const { name, email, phone, subject, message } = req.body;
    
    // Validate required fields
    if (!name || !phone || !message) {
      throw new AppError('Name, phone, and message are required', 400, 'MISSING_FIELDS');
    }
    
    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }
    
    customer = { name, email, phone, event: subject, notes: message };
    requestType = 'enquiry';
  }
  
  const result = await db.query(
    `INSERT INTO enquiries (order_id, customer_name, customer_phone, customer_email, customer_event, customer_notes, request_type, status, placed_at, timestamp) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [orderId, customer.name, customer.phone, customer.email, customer.event, customer.notes, requestType, 'New', new Date().toLocaleString('en-IN'), Date.now()]
  );
  
  res.status(201).json({ 
    success: true,
    data: { id: result.rows[0].id, enquiryId: result.rows[0].id, orderId, ...req.body }
  });
}));

// Update enquiry status
router.patch('/:id/status', validateId, asyncHandler(async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE enquiries SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ success: true, data: { id: req.params.id, status } });
}));

// Update enquiry (full update)
router.put('/:id', validateId, asyncHandler(async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE enquiries SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ success: true, data: { id: req.params.id, status }, message: 'Enquiry updated successfully' });
}));

// Delete enquiry
router.delete('/:id', validateId, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM enquiries WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Enquiry deleted' });
}));

module.exports = router;
