require('../setup');
const request = require('supertest');
const express = require('express');
const db = require('../../config/database');

const app = express();
app.use(express.json());
app.use('/api/enquiries', require('../../routes/enquiries'));

describe('Enquiries Routes', () => {
  
  describe('POST /api/enquiries', () => {
    
    it('should create a new enquiry', async () => {
      const newEnquiry = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        subject: 'Product Inquiry',
        message: 'I want to know more about gold bangles'
      };
      
      db.query.mockResolvedValueOnce([{ insertId: 1 }, []]);
      
      const res = await request(app)
        .post('/api/enquiries')
        .send(newEnquiry);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('enquiryId');
    });
    
    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .send({ name: 'John' });
      
      expect([400, 422]).toContain(res.status);
    });
    
    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/enquiries')
        .send({
          name: 'John',
          email: 'invalid-email',
          phone: '1234567890',
          subject: 'Test',
          message: 'Test message'
        });
      
      expect([400, 422]).toContain(res.status);
    });
  });
  
  describe('GET /api/enquiries', () => {
    
    it('should return all enquiries', async () => {
      const mockEnquiries = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Product Inquiry',
          status: 'pending',
          created_at: '2024-01-15'
        }
      ];
      
      db.query.mockResolvedValueOnce([mockEnquiries, []]);
      
      const res = await request(app).get('/api/enquiries');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
  
  describe('GET /api/enquiries/:id', () => {
    
    it('should return enquiry details', async () => {
      const mockEnquiry = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      db.query.mockResolvedValueOnce([[mockEnquiry], []]);
      
      const res = await request(app).get('/api/enquiries/1');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
    });
  });
  
  describe('PUT /api/enquiries/:id', () => {
    
    it('should update enquiry status', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1 }], []]); // Get enquiry
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // Update
      
      const res = await request(app)
        .put('/api/enquiries/1')
        .send({ status: 'resolved' });
      
      expect(res.status).toBe(200);
    });
  });
});
