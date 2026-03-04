require('../setup');
const request = require('supertest');
const express = require('express');
const db = require('../../config/database');

const app = express();
app.use(express.json());
app.use('/api/rentals', require('../../routes/rentals'));

describe('Rentals Routes', () => {
  
  describe('POST /api/rentals', () => {
    
    it('should create a new rental', async () => {
      const newRental = {
        product_id: 1,
        customer_id: 1,
        rental_start_date: '2024-01-20',
        rental_end_date: '2024-01-25',
        rental_days: 5,
        daily_rate: 100,
        total_amount: 500
      };
      
      db.query.mockResolvedValueOnce([[{ base_stock: 10 }], []]); // Check stock
      db.query.mockResolvedValueOnce([{ insertId: 1 }, []]); // Create rental
      
      const res = await request(app)
        .post('/api/rentals')
        .send(newRental);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('rentalId');
    });
    
    it('should fail if product has insufficient stock', async () => {
      db.query.mockResolvedValueOnce([[{ base_stock: 0 }], []]); // No stock
      
      const res = await request(app)
        .post('/api/rentals')
        .send({
          product_id: 1,
          customer_id: 1,
          rental_start_date: '2024-01-20',
          rental_end_date: '2024-01-25'
        });
      
      expect(res.status).toBe(400);
    });
    
    it('should validate rental dates', async () => {
      const res = await request(app)
        .post('/api/rentals')
        .send({
          product_id: 1,
          customer_id: 1,
          rental_start_date: '2024-01-25',
          rental_end_date: '2024-01-20' // End before start
        });
      
      expect([400, 422]).toContain(res.status);
    });
  });
  
  describe('GET /api/rentals', () => {
    
    it('should return all rentals', async () => {
      const mockRentals = [
        {
          id: 1,
          product_id: 1,
          customer_id: 1,
          status: 'active',
          rental_start_date: '2024-01-20',
          rental_end_date: '2024-01-25'
        }
      ];
      
      db.query.mockResolvedValueOnce([mockRentals, []]);
      
      const res = await request(app).get('/api/rentals');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
  
  describe('GET /api/rentals/:id', () => {
    
    it('should return rental details', async () => {
      const mockRental = {
        id: 1,
        product_id: 1,
        status: 'active'
      };
      
      db.query.mockResolvedValueOnce([[mockRental], []]);
      
      const res = await request(app).get('/api/rentals/1');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
    });
  });
  
  describe('PUT /api/rentals/:id', () => {
    
    it('should update rental status', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1 }], []]);
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      
      const res = await request(app)
        .put('/api/rentals/1')
        .send({ status: 'returned' });
      
      expect(res.status).toBe(200);
    });
  });
});
