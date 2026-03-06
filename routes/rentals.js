const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validateId, validatePagination } = require('../middleware/validation');
const inventoryService = require('../services/inventoryService');
const logger = require('../utils/logger');

// Get all rentals with return tracking
router.get('/', validatePagination, asyncHandler(async (req, res) => {
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
      "SELECT * FROM order_items WHERE order_id IN (?) AND mode = 'rent'",
      [rentalIds]
    );
    
    // Group items by order_id
    rentals.forEach(rental => {
      rental.items = allItems.filter(item => item.order_id === rental.id);
    });
  }
  
  res.json({ success: true, data: rentals });
}));

// Mark rental as returned
router.patch('/:id/return', validateId, asyncHandler(async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { returnDate, condition, notes } = req.body;
    const rentalId = req.params.id;
    
    // Update order with return information
    await connection.query(
      `UPDATE orders SET 
        return_date = ?,
        return_condition = ?,
        return_notes = ?,
        status = 'Returned'
      WHERE id = ?`,
      [returnDate || new Date(), condition || 'Good', notes, rentalId]
    );
    
    // Get rental items to release stock
    const [items] = await connection.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = ? AND mode = 'rent'",
      [rentalId]
    );
    
    // Release stock using inventory service
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));
      await inventoryService.releaseStock(rentalId, orderItems, 'Rental returned');
    }
    
    await connection.commit();
    logger.info(`Rental returned: ${rentalId}`, { condition, items: items.length });
    res.json({ success: true, message: 'Rental marked as returned', id: rentalId });
  } catch (error) {
    await connection.rollback();
    logger.error('Rental return failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}));

// Get overdue rentals
router.get('/overdue', asyncHandler(async (req, res) => {
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
      "SELECT * FROM order_items WHERE order_id IN (?) AND mode = 'rent'",
      [rentalIds]
    );
    
    // Group items by order_id
    rentals.forEach(rental => {
      rental.items = allItems.filter(item => item.order_id === rental.id);
    });
  }
  
  res.json({ success: true, data: rentals });
}));

module.exports = router;
