const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendLowStockAlert } = require('../services/emailService');

// Get all products with availability
router.get('/', async (req, res) => {
  try {
    const productsResult = await db.query('SELECT * FROM products');
    const products = productsResult.rows || productsResult;
    
    if (products.length === 0) {
      return res.json([]);
    }
    
    // Optimize: Get all consumed stock in one query
    const productIds = products.map(p => p.id);
    const consumedResult = await db.query(
      `SELECT oi.product_id, COALESCE(SUM(oi.quantity), 0) as count 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.product_id = ANY($1) AND o.status IN ('New', 'Confirmed')
       GROUP BY oi.product_id`,
      [productIds]
    );
    const consumedData = consumedResult.rows || consumedResult;
    
    // Create a map for quick lookup
    const consumedMap = {};
    consumedData.forEach(item => {
      consumedMap[item.product_id] = parseInt(item.count) || 0;
    });
    
    // Calculate available quantity for each product
    const productsWithAvailability = products.map(product => {
      const consumed = consumedMap[product.id] || 0;
      const available = Math.max(0, (product.base_stock || 0) - consumed);
      
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
    });
    
    res.json(productsWithAvailability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    const products = result.rows || result;
    
    if (products.length === 0) return res.status(404).json({ error: 'Product not found' });
    
    const product = products[0];
    const consumed = await getConsumedStock(product.id);
    const available = Math.max(0, (product.base_stock || 0) - consumed);
    
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
    const result = await db.query(
      `INSERT INTO products (name, material, icon, rent_per_day, buy_price, type, category, base_stock, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [name, material, icon || '💎', rentPerDay, buy, type, category, baseStock || 5, imageUrl || null]
    );
    const insertedId = (result.rows || result)[0].id;
    res.status(201).json({ id: insertedId, ...req.body });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product (admin)
router.put('/:id', async (req, res) => {
  try {
    const { name, material, icon, rentPerDay, buy, type, category, baseStock, available } = req.body;
    await db.query(
      `UPDATE products SET name=$1, material=$2, icon=$3, rent_per_day=$4, buy_price=$5, type=$6, category=$7, base_stock=$8, available=$9 WHERE id=$10`,
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
    const productId = req.params.id;
    
    // First check if product exists
    const checkResult = await db.query('SELECT id, name FROM products WHERE id = $1', [productId]);
    const product = checkResult.rows?.[0] || checkResult[0];
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete the product
    await db.query('DELETE FROM products WHERE id = $1', [productId]);
    
    res.json({ 
      message: 'Product deleted successfully',
      productId: productId,
      productName: product.name
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate consumed stock
async function getConsumedStock(productId) {
  const result = await db.query(
    `SELECT COALESCE(SUM(oi.quantity), 0) as count FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = $1 AND o.status IN ('New', 'Confirmed')`,
    [productId]
  );
  const items = result.rows || result;
  return items[0]?.count || 0;
}

module.exports = router;
