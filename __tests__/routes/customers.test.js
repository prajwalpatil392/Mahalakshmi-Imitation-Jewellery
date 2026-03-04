require('../setup');
const request = require('supertest');
const express = require('express');
const db = require('../../config/database');

const app = express();
app.use(express.json());
app.use('/api/customers', require('../../routes/customers'));

describe('Customers Routes', () => {
  
  describe('GET /api/customers', () => {
    
    it('should return all customers', async () => {
      const mockCustomers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          city: 'Mumbai'
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '0987654321',
          city: 'Bangalore'
        }
      ];
      
      db.query.mockResolvedValueOnce([mockCustomers, []]);
      
      const res = await request(app).get('/api/customers');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });
  
  describe('POST /api/customers', () => {
    
    it('should create a new customer', async () => {
      const newCustomer = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1111111111',
        city: 'Delhi',
        address: '123 Main St'
      };
      
      db.query.mockResolvedValueOnce([{ insertId: 1 }, []]);
      
      const res = await request(app)
        .post('/api/customers')
        .send(newCustomer);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('customerId');
    });
    
    it('should validate email format', async () => {
      const invalidCustomer = {
        name: 'Test',
        email: 'invalid-email',
        phone: '1111111111'
      };
      
      const res = await request(app)
        .post('/api/customers')
        .send(invalidCustomer);
      
      expect([400, 422]).toContain(res.status);
    });
    
    it('should require mandatory fields', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({ name: 'Test' });
      
      expect([400, 422]).toContain(res.status);
    });
  });
  
  describe('GET /api/customers/:id', () => {
    
    it('should return customer details by ID', async () => {
      const mockCustomer = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };
      
      db.query.mockResolvedValueOnce([[mockCustomer], []]);
      
      const res = await request(app).get('/api/customers/1');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'John Doe');
    });
    
    it('should return 404 for non-existent customer', async () => {
      db.query.mockResolvedValueOnce([[], []]);
      
      const res = await request(app).get('/api/customers/999');
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('PUT /api/customers/:id', () => {
    
    it('should update customer information', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1 }], []]); // Get customer
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // Update
      
      const res = await request(app)
        .put('/api/customers/1')
        .send({ city: 'Pune' });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });
});
