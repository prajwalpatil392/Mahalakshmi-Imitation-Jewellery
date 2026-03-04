require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files and public static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// public directory contains HTML, CSS, JS and other client assets
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mahalakshmi API is running' });
});

// Serve frontend pages (routes still available but files now live in public)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mahalakshmi-client.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mahalakshmi-admin.html'));
});

app.get('/buy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'buy.html'));
});

app.get('/rental', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rental.html'));
});

// Test database connection
db.getConnection()
  .then(connection => {
    if (connection && connection.release) {
      connection.release();
    }
    console.log('✅ Database Connected');
  })
  .catch(err => {
    console.warn('⚠️  Database connection test failed (will retry on first request):', err.message);
  });

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
