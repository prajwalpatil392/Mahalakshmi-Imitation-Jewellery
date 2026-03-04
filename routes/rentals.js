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
      query += ' HAVING rental_status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY o.timestamp DESC';
    
    const [rentals] = await db.query(query, params);
    
    // Optimize: Get all items in one query
    if (rentals.length > 0) {
      const rentalIds = rentals.map(r => r.id);
      const [allItems] = await db.query(
        'SELECT * FROM order_items WHERE order_id IN (?) AND mode = "rent"',
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
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { returnDate, condition, notes } = req.body;
    
    // Update order with return information
    await connection.query(
      `UPDATE orders SET 
        return_date = ?,
        return_condition = ?,
        return_notes = ?,
        status = 'Returned'
      WHERE id = ?`,
      [returnDate || new Date(), condition || 'Good', notes, req.params.id]
    );
    
    // Get rental items to restore inventory
    const [items] = await connection.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ? AND mode = "rent"',
      [req.params.id]
    );
    
    // Restore inventory for each item
    for (const item of items) {
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await connection.commit();
    res.json({ message: 'Rental marked as returned', id: req.params.id });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Get overdue rentals
router.get('/overdue', async (req, res) => {
  try {
    const [rentals] = await db.query(`
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
      const [allItems] = await db.query(
        'SELECT * FROM order_items WHERE order_id IN (?) AND mode = "rent"',
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
