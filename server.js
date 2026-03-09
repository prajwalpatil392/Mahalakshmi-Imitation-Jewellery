require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Make io available to routes
app.set('io', io);

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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Test database connection
db.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('⚠️ Database connection failed:', err.message);
  } else {
    console.log('✅ Database Connected');
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
