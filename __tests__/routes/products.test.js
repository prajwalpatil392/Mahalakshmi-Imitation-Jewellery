require('../setup');
const request = require('supertest');
const express = require('express');
const db = require('../../config/database');

// Create test app with products route
const app = express();
app.use(express.json());
app.use('/api/products', require('../../routes/products'));

describe('Products Routes', () => {
  
  describe('GET /api/products', () => {
    
    it('should return all products with availability', async () => {
      const mockProducts = [
        {
          id: 1,
          name: 'Gold Bangle',
          material: 'Gold',
          icon: 'bangle.png',
          rent_per_day: 100,
          buy_price: 5000,
          type: 'Bangle',
          category: 'Bridal',
          base_stock: 10,
          available: 1,
          image_url: '/images/bangle.jpg'
        },
        {
          id: 2,
          name: 'Silver Ring',
          material: 'Silver',
          icon: 'ring.png',
          rent_per_day: 50,
          buy_price: 500,
          type: 'Ring',
          category: 'Daily',
          base_stock: 20,
          available: 1,
          image_url: '/images/ring.jpg'
        }
      ];
      
      db.query.mockResolvedValueOnce([mockProducts, []]);
      db.query.mockResolvedValue([[{ count: 0 }], []]); // getConsumedStock returns 0 for all
      
      const res = await request(app).get('/api/products');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('availableQty');
    });
    
    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database connection failed'));
      
      const res = await request(app).get('/api/products');
      
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
    
    it('should return empty array when no products exist', async () => {
      db.query.mockResolvedValueOnce([[], []]);
      
      const res = await request(app).get('/api/products');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });
  
  describe('GET /api/products/:id', () => {
    
    it('should return a single product by ID', async () => {
      const mockProduct = {
        id: 1,
        name: 'Gold Bangle',
        material: 'Gold',
        icon: 'bangle.png',
        rent_per_day: 100,
        buy_price: 5000,
        type: 'Bangle',
        category: 'Bridal',
        base_stock: 10,
        available: 1
      };
      
      db.query.mockResolvedValueOnce([[mockProduct], []]);
      db.query.mockResolvedValueOnce([[{ count: 0 }], []]); // getConsumedStock
      
      const res = await request(app).get('/api/products/1');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'Gold Bangle');
      expect(res.body).toHaveProperty('id', 1);
    });
    
    it('should return 404 for non-existent product', async () => {
      db.query.mockResolvedValueOnce([[], []]);
      
      const res = await request(app).get('/api/products/999');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Product not found');
    });
    
    it('should handle invalid product ID', async () => {
      const res = await request(app).get('/api/products/invalid');
      
      expect([400, 500]).toContain(res.status);
    });
  });
});
