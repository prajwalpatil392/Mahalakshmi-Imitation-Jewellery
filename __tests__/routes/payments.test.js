require('../setup');
const request = require('supertest');
const express = require('express');
const db = require('../../config/database');

const app = express();
app.use(express.json());
app.use('/api/payments', require('../../routes/payments'));

describe('Payments Routes', () => {
  
  describe('POST /api/payments/initiate', () => {
    
    it('should initiate a payment successfully', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1, total: 5000 }], []]); // Get order
      db.query.mockResolvedValueOnce([{ insertId: 1 }, []]); // Create payment record
      
      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          order_id: 1,
          payment_method: 'razorpay'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('paymentId');
    });
    
    it('should validate payment method', async () => {
      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          order_id: 1,
          payment_method: 'invalid_method'
        });
      
      expect([400, 422]).toContain(res.status);
    });
    
    it('should fail for non-existent order', async () => {
      db.query.mockResolvedValueOnce([[], []]); // Order not found
      
      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          order_id: 999,
          payment_method: 'razorpay'
        });
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('POST /api/payments/verify', () => {
    
    it('should verify payment successfully', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1, order_id: 1 }], []]); // Get payment
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // Update payment status
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // Update order status
      
      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          payment_id: 1,
          razorpay_payment_id: 'pay_123456'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
    
    it('should fail verification for invalid payment', async () => {
      db.query.mockResolvedValueOnce([[], []]); // Payment not found
      
      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          payment_id: 999,
          razorpay_payment_id: 'pay_123456'
        });
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('GET /api/payments/:id', () => {
    
    it('should get payment details', async () => {
      const mockPayment = {
        id: 1,
        order_id: 1,
        amount: 5000,
        status: 'completed',
        payment_method: 'razorpay'
      };
      
      db.query.mockResolvedValueOnce([[mockPayment], []]);
      
      const res = await request(app).get('/api/payments/1');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('amount', 5000);
    });
    
    it('should return 404 for non-existent payment', async () => {
      db.query.mockResolvedValueOnce([[], []]);
      
      const res = await request(app).get('/api/payments/999');
      
      expect(res.status).toBe(404);
    });
  });
});
