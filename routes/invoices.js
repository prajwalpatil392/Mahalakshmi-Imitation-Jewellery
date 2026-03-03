const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateInvoice } = require('../services/invoiceService');
const path = require('path');

// Generate invoice for an order
router.post('/:orderId', async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[0];
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    order.items = items;
    
    const filepath = await generateInvoice(order);
    
    // Update order with invoice path
    await db.query('UPDATE orders SET invoice_path = ? WHERE id = ?', [filepath, order.id]);
    
    res.json({ message: 'Invoice generated', filepath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download invoice
router.get('/:orderId/download', async (req, res) => {
  try {
    const [orders] = await db.query('SELECT invoice_path FROM orders WHERE id = ?', [req.params.orderId]);
    if (orders.length === 0 || !orders[0].invoice_path) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.download(orders[0].invoice_path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
