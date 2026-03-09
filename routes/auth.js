const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [admins] = await db.queryCompat('SELECT * FROM admins WHERE username = $1', [username]);
    if (admins.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const admin = admins[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, username: admin.username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register (first time setup only)
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [existing] = await db.queryCompat('SELECT * FROM admins WHERE username = $1', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Admin already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.queryCompat('INSERT INTO admins (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
