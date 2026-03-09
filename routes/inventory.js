const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Update product stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { baseStock } = req.body;
    const result = await db.queryCompat(
      'UPDATE products SET base_stock = $1 WHERE id = $2 RETURNING *',
      [Math.max(0, baseStock), req.params.id]
    );
    res.json({ id: req.params.id, baseStock: Math.max(0, baseStock) });
  } catch (error) {
    console.error('Stock update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Toggle product availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const { available } = req.body;
    const result = await db.queryCompat(
      'UPDATE products SET available = $1 WHERE id = $2 RETURNING *',
      [available, req.params.id]
    );
    res.json({ id: req.params.id, available });
  } catch (error) {
    console.error('Availability update error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
