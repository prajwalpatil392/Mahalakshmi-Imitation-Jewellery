require('../setup');
const request = require('supertest');
const express = require('express');
const authRoute = require('../../routes/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoute);

describe('Authentication Routes', () => {
  
  describe('POST /api/auth/register', () => {
    
    it('should register a new admin successfully', async () => {
      db.query.mockResolvedValueOnce([[], []]); // No existing admin
      db.query.mockResolvedValueOnce([{ insertId: 1 }, []]); // Insert successful
      
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testadmin', password: 'password123' });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Admin created successfully');
    });
    
    it('should fail if admin already exists', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1, username: 'testadmin' }], []]); // Admin exists
      
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testadmin', password: 'password123' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Admin already exists');
    });
    
    it('should return error on database error', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testadmin', password: 'password123' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Database error');
    });
    
    it('should require username and password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});
      
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    
    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      db.query.mockResolvedValueOnce(
        [[{ id: 1, username: 'testadmin', password: hashedPassword }], []],
        { username: 'testadmin', password: 'password123' }
      );
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testadmin', password: 'password123' });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.username).toBe('testadmin');
      
      // Verify JWT token is valid
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.username).toBe('testadmin');
    });
    
    it('should fail with invalid username', async () => {
      db.query.mockResolvedValueOnce([[], []]); // No admin found
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password123' });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
    
    it('should fail with incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      db.query.mockResolvedValueOnce(
        [[{ id: 1, username: 'testadmin', password: hashedPassword }], []]
      );
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testadmin', password: 'wrongpassword' });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
    
    it('should return error on database error', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testadmin', password: 'password123' });
      
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Database error');
    });
  });
});
