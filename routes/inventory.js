const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validateId } = require('../middleware/validation');

// Update product stock
router.patch('/:id/stock', validateId, asyncHandler(async (req, res) => {
  const { baseStock } = req.body;
  
  if (baseStock === undefined || baseStock === null) {
    throw new AppError('baseStock is required', 400, 'MISSING_FIELD');
  }
  
  await db.query('UPDATE products SET base_stock = $1 WHERE id = $2', [Math.max(0, baseStock), req.params.id]);
  res.json({ success: true, data: { id: req.params.id, baseStock: Math.max(0, baseStock) } });
}));

// Toggle product availability
router.patch('/:id/availability', validateId, asyncHandler(async (req, res) => {
  const { available } = req.body;
  
  if (available === undefined || available === null) {
    throw new AppError('available is required', 400, 'MISSING_FIELD');
  }
  
  await db.query('UPDATE products SET available = $1 WHERE id = $2', [available, req.params.id]);
  res.json({ success: true, data: { id: req.params.id, available } });
}));

module.exports = router;
