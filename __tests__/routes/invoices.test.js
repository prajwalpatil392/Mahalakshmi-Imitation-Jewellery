require('../setup');
const request = require('supertest');
const express = require('express');
const db = require('../../config/database');

const app = express();
app.use(express.json());
app.use('/api/invoices', require('../../routes/invoices'));

describe('Invoices Routes', () => {
  
  describe('GET /api/invoices/:orderId', () => {
    
    it('should retrieve invoice for an order', async () => {
      const mockInvoice = {
        id: 1,
        order_id: 1,
        invoice_number: 'INV-2024-001',
        total_amount: 5000,
        tax: 900,
        status: 'issued'
      };
      
      db.query.mockResolvedValueOnce([[mockInvoice], []]);
      
      const res = await request(app).get('/api/invoices/1');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('invoice_number');
    });
    
    it('should return 404 if invoice not found', async () => {
      db.query.mockResolvedValueOnce([[], []]);
      
      const res = await request(app).get('/api/invoices/999');
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('POST /api/invoices', () => {
    
    it('should generate invoice for an order', async () => {
      db.query.mockResolvedValueOnce([[{ total: 5000 }], []]); // Get order
      db.query.mockResolvedValueOnce([{ insertId: 1 }, []]); // Create invoice
      
      const res = await request(app)
        .post('/api/invoices')
        .send({ order_id: 1 });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('invoiceId');
    });
    
    it('should fail for non-existent order', async () => {
      db.query.mockResolvedValueOnce([[], []]); // Order not found
      
      const res = await request(app)
        .post('/api/invoices')
        .send({ order_id: 999 });
      
      expect(res.status).toBe(404);
    });
  });
});
