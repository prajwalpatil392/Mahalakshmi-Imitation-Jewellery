require('../setup');
const request = require('supertest');
const express = require('express');
const db = require('../../config/database');

const app = express();
app.use(express.json());
app.use('/api/orders', require('../../routes/orders'));

describe('Orders Routes', () => {
  
  describe('GET /api/orders', () => {
    
    it('should return all orders', async () => {
      const mockOrders = [
        {
          id: 1,
          customer_id: 1,
          order_date: '2024-01-15',
          status: 'confirmed',
          total: 5000,
          items: 2
        },
        {
          id: 2,
          customer_id: 2,
          order_date: '2024-01-16',
          status: 'pending',
          total: 3000,
          items: 1
        }
      ];
      
      db.query.mockResolvedValueOnce([mockOrders, []]);
      
      const res = await request(app).get('/api/orders');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
    
    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app).get('/api/orders');
      
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
  
  describe('POST /api/orders', () => {
    
    it('should create a new order', async () => {
      const newOrder = {
        customer: { name: 'John Doe', phone: '1234567890' },
        items: [
          { id: 1, name: 'Gold Bangle', quantity: 2, mode: 'buy', unitPrice: 5000 }
        ],
        total: 10000
      };
      
      const mockConnection = {
        query: jest.fn()
          .mockResolvedValueOnce([{ insertId: 1 }, []])
          .mockResolvedValueOnce([{ insertId: 1 }, []])
          .mockResolvedValueOnce([{}, []]),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      db.getConnection.mockResolvedValueOnce(mockConnection);
      
      const res = await request(app)
        .post('/api/orders')
        .send(newOrder);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('orderId');
    });
    
    it('should validate required fields', async () => {
      const mockConnection = {
        query: jest.fn(),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      db.getConnection.mockResolvedValueOnce(mockConnection);
      mockConnection.query.mockRejectedValueOnce(new Error('Validation failed'));
      
      const res = await request(app)
        .post('/api/orders')
        .send({});
      
      expect([400, 422]).toContain(res.status);
    });
    
    it('should handle database errors on create', async () => {
      const newOrder = {
        customer: { name: 'John Doe', phone: '1234567890' },
        items: [{ id: 1, name: 'Gold Bangle', quantity: 1, mode: 'buy', unitPrice: 5000 }],
        total: 5000
      };
      
      const mockConnection = {
        query: jest.fn(),
        beginTransaction: jest.fn().mockResolvedValue(),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      
      db.getConnection.mockResolvedValueOnce(mockConnection);
      mockConnection.query.mockRejectedValueOnce(new Error('Insert failed'));
      
      const res = await request(app)
        .post('/api/orders')
        .send(newOrder);
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('GET /api/orders/:id', () => {
    
    it('should return order details by ID', async () => {
      const mockOrder = {
        id: 1,
        customer_id: 1,
        order_date: '2024-01-15',
        status: 'confirmed',
        total: 5000
      };
      
      db.query.mockResolvedValueOnce([[mockOrder], []]);
      db.query.mockResolvedValueOnce([[{ product_id: 1, quantity: 2 }], []]);
      
      const res = await request(app).get('/api/orders/1');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
    });
    
    it('should return 404 for non-existent order', async () => {
      db.query.mockResolvedValueOnce([[], []]);
      
      const res = await request(app).get('/api/orders/999');
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('PUT /api/orders/:id', () => {
    
    it('should update order status', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1 }], []]); // Get order
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // Update
      
      const res = await request(app)
        .put('/api/orders/1')
        .send({ status: 'shipped' });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
    
    it('should fail updating non-existent order', async () => {
      db.query.mockResolvedValueOnce([[], []]); // Order not found
      
      const res = await request(app)
        .put('/api/orders/999')
        .send({ status: 'shipped' });
      
      expect(res.status).toBe(404);
    });
  });
});
