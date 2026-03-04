require('../setup');
const request = require('supertest');
const express = require('express');
const db = require('../../config/database');
const path = require('path');

const app = express();
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mahalakshmi API is running' });
});

// Mock database connection
db.getConnection = jest.fn();

describe('API Health & General Routes', () => {
  
  describe('GET /api/health', () => {
    
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('message');
    });
    
    it('should have correct response format', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(typeof res.body.status).toBe('string');
      expect(typeof res.body.message).toBe('string');
    });
  });
  
  describe('Database Connection', () => {
    
    it('should test database connection on startup', async () => {
      const mockConnection = { release: jest.fn() };
      db.getConnection.mockResolvedValueOnce(mockConnection);
      
      const connection = await db.getConnection();
      
      expect(connection).toBeDefined();
      expect(connection).toHaveProperty('release');
    });
    
    it('should handle database connection errors', async () => {
      db.getConnection.mockRejectedValueOnce(new Error('Connection failed'));
      
      try {
        await db.getConnection();
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Connection failed');
      }
    });
  });
});
