const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all rentals with return tracking
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT o.*, 
        CASE 
          WHEN o.return_date IS NOT NULL THEN 'returned'
          WHEN o.expected_return_date < NOW() THEN 'overdue'
          ELSE 'active'
        END as rental_status
      FROM orders o
      WHERE o.type = 'order'
      AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.mode = 'rent')
    `;
    
    const params = [];
    if (status) {
      query += ' AND CASE WHEN o.return_date IS NOT NULL THEN \'returned\' WHEN o.expected_return_date < NOW() THEN \'overdue\' ELSE \'active\' END = $1';
      params.push(status);
    }
    
    query += ' ORDER BY o.timestamp DESC';
    
    const [rentals] = await db.queryCompat(query, params);
    
    // Optimize: Get all items in one query
    if (rentals.length > 0) {
      const rentalIds = rentals.map(r => r.id);
      const [allItems] = await db.queryCompat(
        "SELECT * FROM order_items WHERE order_id = ANY($1) AND mode = 'rent'",
        [rentalIds]
      );
      
      // Group items by order_id
      rentals.forEach(rental => {
        rental.items = allItems.filter(item => item.order_id === rental.id);
      });
    }
    
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark rental as returned
router.patch('/:id/return', async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const { returnDate, condition, notes } = req.body;
    
    // Update order with return information
    await client.query(
      `UPDATE orders SET 
        return_date = $1,
        return_condition = $2,
        return_notes = $3,
        status = 'Returned'
      WHERE id = $4`,
      [returnDate || new Date(), condition || 'Good', notes, req.params.id]
    );
    
    // Get rental items to restore inventory
    const itemsResult = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = $1 AND mode = 'rent'",
      [req.params.id]
    );
    const items = itemsResult.rows;
    
    // Restore inventory for each item
    for (const item of items) {
      await client.query(
        'UPDATE products SET base_stock = base_stock + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Rental marked as returned', id: req.params.id });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get overdue rentals
router.get('/overdue', async (req, res) => {
  try {
    const [rentals] = await db.queryCompat(`
      SELECT o.* FROM orders o
      WHERE o.type = 'order'
      AND o.return_date IS NULL
      AND o.expected_return_date < NOW()
      AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.mode = 'rent')
      ORDER BY o.expected_return_date ASC
    `);
    
    // Optimize: Get all items in one query
    if (rentals.length > 0) {
      const rentalIds = rentals.map(r => r.id);
      const [allItems] = await db.queryCompat(
        "SELECT * FROM order_items WHERE order_id = ANY($1) AND mode = 'rent'",
        [rentalIds]
      );
      
      // Group items by order_id
      rentals.forEach(rental => {
        rental.items = allItems.filter(item => item.order_id === rental.id);
      });
    }
    
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
