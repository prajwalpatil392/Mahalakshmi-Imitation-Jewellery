const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Update product stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { baseStock } = req.body;
    await db.query('UPDATE products SET base_stock = ? WHERE id = ?', [Math.max(0, baseStock), req.params.id]);
    res.json({ id: req.params.id, baseStock: Math.max(0, baseStock) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle product availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const { available } = req.body;
    await db.query('UPDATE products SET available = ? WHERE id = ?', [available, req.params.id]);
    res.json({ id: req.params.id, available });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
