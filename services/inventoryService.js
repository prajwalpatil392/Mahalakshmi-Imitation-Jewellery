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
           VALUES ($1, $2, 'reserve', $3, $4, NOW())`,
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
   * @param {Array} items - Order items [{product_id, quantity}] (optional, will fetch if not provided)
   * @param {string} reason - Reason for release
   */
  async releaseStock(orderId, items = null, reason = 'Order cancelled') {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      let itemsToRelease = items;
      
      // If items not provided, fetch from inventory_transactions
      if (!itemsToRelease) {
        const result = await connection.query(
          `SELECT product_id, SUM(quantity) as total_quantity
           FROM inventory_transactions
           WHERE order_id = $1 AND transaction_type = 'reserve'
           GROUP BY product_id`,
          [orderId]
        );
        
        itemsToRelease = result.rows.map(row => ({
          product_id: row.product_id,
          quantity: parseInt(row.total_quantity)
        }));
      }

      if (!itemsToRelease || itemsToRelease.length === 0) {
        console.warn(`No reserved stock found for order ${orderId}`);
        await connection.commit();
        return;
      }

      // Release each product's stock
      for (const item of itemsToRelease) {
        await connection.query(
          `INSERT INTO inventory_transactions 
           (product_id, order_id, transaction_type, quantity, reason, created_at)
           VALUES ($1, $2, 'release', $3, $4, NOW())`,
          [item.product_id, orderId, item.quantity, reason]
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
    
    const result = await dbConn.query(
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
      WHERE p.id = $1
      GROUP BY p.id, p.name, p.base_stock`,
      [productId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    return result.rows[0];
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

    const result = await db.query(
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
      WHERE p.id = ANY($1::int[])
      GROUP BY p.id, p.name, p.base_stock`,
      [productIds]
    );

    return result.rows;
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
         VALUES ($1, 'adjust', $2, $3, $4, NOW())`,
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
      const result = await connection.query(
        'SELECT base_stock FROM products WHERE id = $1',
        [productId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Product ${productId} not found`);
      }

      const oldBaseStock = result.rows[0].base_stock;
      const difference = newBaseStock - oldBaseStock;

      // Update base stock
      await connection.query(
        'UPDATE products SET base_stock = $1, updated_at = NOW() WHERE id = $2',
        [newBaseStock, productId]
      );

      // Record adjustment transaction
      if (difference !== 0) {
        await connection.query(
          `INSERT INTO inventory_transactions 
           (product_id, transaction_type, quantity, reason, created_by, created_at)
           VALUES ($1, 'adjust', $2, $3, $4, NOW())`,
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
    const result = await db.query(
      `SELECT 
        it.*,
        o.order_id,
        o.customer_name
      FROM inventory_transactions it
      LEFT JOIN orders o ON it.order_id = o.id
      WHERE it.product_id = $1
      ORDER BY it.created_at DESC
      LIMIT $2`,
      [productId, limit]
    );

    return result.rows;
  }

  /**
   * Get low stock products
   * @param {number} threshold - Stock threshold (default: 5)
   * @returns {Promise<Array>} Products with low stock
   */
  async getLowStockProducts(threshold = 5) {
    const result = await db.query(
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
      HAVING (p.base_stock + COALESCE(SUM(
        CASE 
          WHEN it.transaction_type = 'reserve' THEN -it.quantity
          WHEN it.transaction_type = 'release' THEN it.quantity
          WHEN it.transaction_type = 'adjust' THEN it.quantity
          ELSE 0 
        END
      ), 0)) <= $1
      ORDER BY available_stock ASC`,
      [threshold]
    );

    return result.rows;
  }
}

module.exports = new InventoryService();
