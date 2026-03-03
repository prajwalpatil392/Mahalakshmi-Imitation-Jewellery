const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendLowStockAlert } = require('../services/emailService');

// Get all products with availability
router.get('/', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products');
    
    // Calculate available quantity for each product
    const productsWithAvailability = await Promise.all(products.map(async (product) => {
      const consumed = await getConsumedStock(product.id);
      const available = Math.max(0, product.base_stock - consumed);
      
      return {
        id: product.id,
        name: product.name,
        material: product.material,
        icon: product.icon,
        rentPerDay: product.rent_per_day,
        buy: product.buy_price,
        type: product.type,
        category: product.category,
        baseStock: product.base_stock,
        available: product.available,
        availableQty: available,
        isAvailable: available > 0 && product.available,
        image_url: product.image_url
      };
    }));
    
    res.json(productsWithAvailability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });
    
    const product = products[0];
    const consumed = await getConsumedStock(product.id);
    const available = Math.max(0, product.base_stock - consumed);
    
    res.json({
      id: product.id,
      name: product.name,
      material: product.material,
      icon: product.icon,
      rentPerDay: product.rent_per_day,
      buy: product.buy_price,
      type: product.type,
      category: product.category,
      baseStock: product.base_stock,
      available: product.available,
      availableQty: available,
      isAvailable: available > 0 && product.available,
      image_url: product.image_url
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (admin)
router.post('/', async (req, res) => {
  try {
    const { name, material, icon, rentPerDay, buy, type, category, baseStock, imageUrl } = req.body;
    const [result] = await db.query(
      `INSERT INTO products (name, material, icon, rent_per_day, buy_price, type, category, base_stock, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, material, icon || '💎', rentPerDay, buy, type, category, baseStock || 5, imageUrl || null]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product (admin)
router.put('/:id', async (req, res) => {
  try {
    const { name, material, icon, rentPerDay, buy, type, category, baseStock, available } = req.body;
    await db.query(
      `UPDATE products SET name=?, material=?, icon=?, rent_per_day=?, buy_price=?, type=?, category=?, base_stock=?, available=? WHERE id=?`,
      [name, material, icon, rentPerDay, buy, type, category, baseStock, available, req.params.id]
    );
    
    // Check for low stock and send alert
    const consumed = await getConsumedStock(req.params.id);
    const availableQty = Math.max(0, baseStock - consumed);
    const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD || 5);
    
    if (availableQty <= threshold) {
      await sendLowStockAlert({ name, stock: availableQty });
    }
    
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete product (admin)
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate consumed stock
async function getConsumedStock(productId) {
  const [items] = await db.query(
    `SELECT COALESCE(SUM(oi.quantity), 0) as count FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = ? AND o.status IN ('New', 'Confirmed')`,
    [productId]
  );
  return items[0].count;
}

module.exports = router;
