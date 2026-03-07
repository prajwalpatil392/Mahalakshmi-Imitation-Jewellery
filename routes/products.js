const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendLowStockAlert } = require('../services/emailService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validateProduct, validateId, validatePagination } = require('../middleware/validation');
const logger = require('../utils/logger');

// Get all products with availability
router.get('/', validatePagination, asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM products');
  const products = result.rows;

  // If there are no products yet, return empty list early
  if (!products || products.length === 0) {
    return res.json({ success: true, data: [] });
  }

  // Optimize: Get all consumed stock in one query
  const productIds = products.map(p => p.id);
  const consumedMap = {};
  
  // Try to get consumed stock, but don't fail if order_items table doesn't exist
  if (productIds.length > 0) {
    try {
      const consumedResult = await db.query(
        `SELECT oi.product_id, COALESCE(SUM(oi.quantity), 0) as count 
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE oi.product_id = ANY($1::int[]) AND o.status IN ('New', 'Confirmed')
         GROUP BY oi.product_id`,
        [productIds]
      );
      
      // Create a map for quick lookup
      consumedResult.rows.forEach(item => {
        consumedMap[item.product_id] = parseInt(item.count);
      });
    } catch (error) {
      // If order_items table doesn't exist, just continue without consumed stock
      console.warn('Could not fetch consumed stock:', error.message);
    }
  }
  
  // Calculate available quantity for each product
  const productsWithAvailability = products.map(product => {
    const consumed = consumedMap[product.id] || 0;
    const available = Math.max(0, (product.base_stock || 0) - consumed);

    // Sanitize image URL - fix common issues
    let imageUrl = product.image_url;

    if (imageUrl) {
      // Fix double protocol (https://http://...)
      imageUrl = imageUrl.replace(/https?:\/\/https?:\/\//gi, 'https://');
      
      // Fix missing separator (domain.comhttp://...)
      imageUrl = imageUrl.replace(/\.com(https?:\/\/)/gi, '.com/');
      imageUrl = imageUrl.replace(/\.net(https?:\/\/)/gi, '.net/');
      
      // Fix malformed protocol separator (http//)
      imageUrl = imageUrl.replace(/https?\/\//gi, 'https://');
      
      // If relative path, prepend host
      if (!imageUrl.startsWith('http')) {
        imageUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
      }
      
      // Force HTTPS for security
      imageUrl = imageUrl.replace(/^http:\/\//i, 'https://');
    }

    return {
      id: product.id,
      name: product.name,
      material: product.material,
      icon: product.icon,
      rentPerDay: product.rent_per_day,
      buy: product.buy_price,
      type: product.type,
      category: product.category,
      baseStock: product.base_stock || 0,
      available: product.available !== false,
      availableQty: available,
      isAvailable: available > 0 && product.available !== false,
      image_url: imageUrl
    };
  });
  
  res.json({ success: true, data: productsWithAvailability });
}));

// Get single product
router.get('/:id', validateId, asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }
  
  const product = result.rows[0];
  const consumed = await getConsumedStock(product.id);
  const available = Math.max(0, product.base_stock - consumed);
  
  res.json({
    success: true,
    data: {
      id: product.id,
      name: product.name,
      material: product.material,
      icon: product.icon,
      rentPerDay: Number(product.rent_per_day),
      buy: Number(product.buy_price),
      type: product.type,
      category: product.category,
      baseStock: product.base_stock,
      available: product.available,
      availableQty: available,
      isAvailable: available > 0 && product.available,
      image_url: product.image_url
    }
  });
}));

// Create product (admin)
router.post('/', validateProduct, asyncHandler(async (req, res) => {
  const { name, material, icon, rentPerDay, buy, type, category, baseStock, imageUrl } = req.body;
  const result = await db.query(
    `INSERT INTO products (name, material, icon, rent_per_day, buy_price, type, category, base_stock, image_url) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [name, material, icon || '💎', rentPerDay, buy, type, category, baseStock || 5, imageUrl || null]
  );
  
  const productId = result.rows[0].id;
  logger.info('Product created', { id: productId, name });
  res.status(201).json({ success: true, data: { id: productId, ...req.body } });
}));

// Update product (admin)
router.put('/:id', validateId, validateProduct, asyncHandler(async (req, res) => {
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
    logger.warn('Low stock alert sent', { productId: req.params.id, name, stock: availableQty });
  }
  
  logger.info('Product updated', { id: req.params.id, name });
  res.json({ success: true, data: { id: req.params.id, ...req.body } });
}));

// Delete product (admin)
router.delete('/:id', validateId, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  logger.info('Product deleted', { id: req.params.id });
  res.json({ success: true, message: 'Product deleted' });
}));

// Helper function to calculate consumed stock
async function getConsumedStock(productId) {
  const result = await db.query(
    `SELECT COALESCE(SUM(oi.quantity), 0) as count FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = $1 AND o.status IN ('New', 'Confirmed')`,
    [productId]
  );
  return parseInt(result.rows[0].count);
}

module.exports = router;
