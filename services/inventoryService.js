const db = require('../config/database');

class InventoryService {
  /**
   * Reserve stock when order is placed
   * @param {number} orderId - Order ID
   * @param {Array} items - Order items [{product_id, quantity}]
   * @param {string} reason - Reason for reservation
   */
  async reserveStock(orderId, items, reason = 'Order placed') {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      for (const item of items) {
        // Check current available stock
        const stock = await this.getProductStock(item.product_id, connection);

        if (stock.available_stock < item.quantity) {
          throw new Error(
            `Insufficient stock for product ID ${item.product_id}. ` +
            `Available: ${stock.available_stock}, Requested: ${item.quantity}`
          );
        }

        // Record reservation transaction
        await connection.query(
          `INSERT INTO inventory_transactions 
           (product_id, order_id, transaction_type, quantity, reason, created_at)
           VALUES (?, ?, 'reserve', ?, ?, NOW())`,
          [item.product_id, orderId, item.quantity, reason]
        );
      }

      await connection.commit();
      console.log(`✅ Stock reserved for order ${orderId}`);
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Stock reservation failed for order ${orderId}:`, error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Release stock when order is cancelled or returned
   * @param {number} orderId - Order ID
   * @param {string} reason - Reason for release
   */
  async releaseStock(orderId, reason = 'Order cancelled') {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get all reserved items for this order
      const [reservedItems] = await connection.query(
        `SELECT product_id, SUM(quantity) as total_quantity
         FROM inventory_transactions
         WHERE order_id = ? AND transaction_type = 'reserve'
         GROUP BY product_id`,
        [orderId]
      );

      if (reservedItems.length === 0) {
        console.warn(`No reserved stock found for order ${orderId}`);
        await connection.commit();
        return;
      }

      // Release each product's stock
      for (const item of reservedItems) {
        await connection.query(
          `INSERT INTO inventory_transactions 
           (product_id, order_id, transaction_type, quantity, reason, created_at)
           VALUES (?, ?, 'release', ?, ?, NOW())`,
          [item.product_id, orderId, item.total_quantity, reason]
        );
      }

      await connection.commit();
      console.log(`✅ Stock released for order ${orderId}`);
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Stock release failed for order ${orderId}:`, error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get current stock for a product
   * @param {number} productId - Product ID
   * @param {Object} connection - Optional DB connection (for transactions)
   * @returns {Promise<Object>} Stock information
   */
  async getProductStock(productId, connection = null) {
    const dbConn = connection || db;
    
    const [result] = await dbConn.query(
      `SELECT 
        p.id,
        p.name,
        p.base_stock,
        COALESCE(SUM(
          CASE 
            WHEN it.transaction_type = 'reserve' THEN -it.quantity
            WHEN it.transaction_type = 'release' THEN it.quantity
            WHEN it.transaction_type = 'adjust' THEN it.quantity
            ELSE 0 
          END
        ), 0) as stock_change,
        p.base_stock + COALESCE(SUM(
          CASE 
            WHEN it.transaction_type = 'reserve' THEN -it.quantity
            WHEN it.transaction_type = 'release' THEN it.quantity
            WHEN it.transaction_type = 'adjust' THEN it.quantity
            ELSE 0 
          END
        ), 0) as available_stock
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id
      WHERE p.id = ?
      GROUP BY p.id, p.name, p.base_stock`,
      [productId]
    );

    if (result.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    return result[0];
  }

  /**
   * Get stock for multiple products (optimized)
   * @param {Array<number>} productIds - Array of product IDs
   * @returns {Promise<Array>} Array of stock information
   */
  async getMultipleProductsStock(productIds) {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    const [results] = await db.query(
      `SELECT 
        p.id,
        p.name,
        p.base_stock,
        COALESCE(SUM(
          CASE 
            WHEN it.transaction_type = 'reserve' THEN -it.quantity
            WHEN it.transaction_type = 'release' THEN it.quantity
            WHEN it.transaction_type = 'adjust' THEN it.quantity
            ELSE 0 
          END
        ), 0) as stock_change,
        p.base_stock + COALESCE(SUM(
          CASE 
            WHEN it.transaction_type = 'reserve' THEN -it.quantity
            WHEN it.transaction_type = 'release' THEN it.quantity
            WHEN it.transaction_type = 'adjust' THEN it.quantity
            ELSE 0 
          END
        ), 0) as available_stock
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id
      WHERE p.id IN (?)
      GROUP BY p.id, p.name, p.base_stock`,
      [productIds]
    );

    return results;
  }

  /**
   * Manually adjust stock (admin only)
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity to adjust (positive or negative)
   * @param {string} reason - Reason for adjustment
   * @param {number} userId - Admin user ID
   */
  async adjustStock(productId, quantity, reason, userId = null) {
    try {
      await db.query(
        `INSERT INTO inventory_transactions 
         (product_id, transaction_type, quantity, reason, created_by, created_at)
         VALUES (?, 'adjust', ?, ?, ?, NOW())`,
        [productId, quantity, reason, userId]
      );

      console.log(`✅ Stock adjusted for product ${productId}: ${quantity > 0 ? '+' : ''}${quantity}`);
    } catch (error) {
      console.error(`❌ Stock adjustment failed for product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update base stock for a product
   * @param {number} productId - Product ID
   * @param {number} newBaseStock - New base stock value
   * @param {string} reason - Reason for update
   * @param {number} userId - Admin user ID
   */
  async updateBaseStock(productId, newBaseStock, reason, userId = null) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get current base stock
      const [product] = await connection.query(
        'SELECT base_stock FROM products WHERE id = ?',
        [productId]
      );

      if (product.length === 0) {
        throw new Error(`Product ${productId} not found`);
      }

      const oldBaseStock = product[0].base_stock;
      const difference = newBaseStock - oldBaseStock;

      // Update base stock
      await connection.query(
        'UPDATE products SET base_stock = ?, updated_at = NOW() WHERE id = ?',
        [newBaseStock, productId]
      );

      // Record adjustment transaction
      if (difference !== 0) {
        await connection.query(
          `INSERT INTO inventory_transactions 
           (product_id, transaction_type, quantity, reason, created_by, created_at)
           VALUES (?, 'adjust', ?, ?, ?, NOW())`,
          [productId, difference, reason || `Base stock updated from ${oldBaseStock} to ${newBaseStock}`, userId]
        );
      }

      await connection.commit();
      console.log(`✅ Base stock updated for product ${productId}: ${oldBaseStock} → ${newBaseStock}`);
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Base stock update failed for product ${productId}:`, error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get inventory transaction history for a product
   * @param {number} productId - Product ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Transaction history
   */
  async getTransactionHistory(productId, limit = 50) {
    const [transactions] = await db.query(
      `SELECT 
        it.*,
        o.order_id,
        o.customer_name
      FROM inventory_transactions it
      LEFT JOIN orders o ON it.order_id = o.id
      WHERE it.product_id = ?
      ORDER BY it.created_at DESC
      LIMIT ?`,
      [productId, limit]
    );

    return transactions;
  }

  /**
   * Get low stock products
   * @param {number} threshold - Stock threshold (default: 5)
   * @returns {Promise<Array>} Products with low stock
   */
  async getLowStockProducts(threshold = 5) {
    const [products] = await db.query(
      `SELECT 
        p.id,
        p.name,
        p.base_stock,
        p.base_stock + COALESCE(SUM(
          CASE 
            WHEN it.transaction_type = 'reserve' THEN -it.quantity
            WHEN it.transaction_type = 'release' THEN it.quantity
            WHEN it.transaction_type = 'adjust' THEN it.quantity
            ELSE 0 
          END
        ), 0) as available_stock
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id
      WHERE p.available = true
      GROUP BY p.id, p.name, p.base_stock
      HAVING available_stock <= ?
      ORDER BY available_stock ASC`,
      [threshold]
    );

    return products;
  }
}

module.exports = new InventoryService();
