# 🚀 Implementation Guide - Production-Ready Improvements

## Overview
This guide walks you through implementing all the architectural improvements for the Mahalakshmi Jewellery system.

---

## 📋 Prerequisites

### 1. Install New Dependencies
```bash
npm install express-rate-limit helmet node-cache winston express-validator
```

### 2. Update Environment Variables
Add to your `.env` file:
```env
# Existing variables
DATABASE_URL=your_postgres_url
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# New variables
NODE_ENV=production
LOG_LEVEL=info
```

---

## 🗄️ Step 1: Run Database Migration

**IMPORTANT: Backup your database first!**

```bash
# Run the migration script
node scripts/create-inventory-table.js
```

This will:
- ✅ Create `inventory_transactions` table
- ✅ Create `product_stock` view
- ✅ Add new columns to `products` table
- ✅ Add new columns to `orders` table
- ✅ Create performance indexes

---

## 🖼️ Step 2: Migrate Existing Images to Cloudinary

### Option A: Manual Migration (Recommended for small datasets)
1. Go to admin panel
2. Edit each product
3. Re-upload images (they'll automatically go to Cloudinary)

### Option B: Automated Migration Script
Create `scripts/migrate-images-to-cloudinary.js`:

```javascript
require('dotenv').config();
const db = require('../config/database');
const imageService = require('../services/imageService');
const path = require('path');
const fs = require('fs');

async function migrateImages() {
  try {
    const [products] = await db.query(
      'SELECT id, image_url FROM products WHERE image_url IS NOT NULL'
    );

    for (const product of products) {
      if (product.image_url && product.image_url.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, '..', product.image_url);
        
        if (fs.existsSync(localPath)) {
          console.log(`Uploading image for product ${product.id}...`);
          
          const result = await imageService.uploadProductImage(localPath, product.id);
          
          await db.query(
            'UPDATE products SET image_url = ? WHERE id = ?',
            [result.url, product.id]
          );
          
          console.log(`✅ Product ${product.id} migrated`);
        }
      }
    }

    console.log('✅ All images migrated to Cloudinary!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await db.end();
  }
}

migrateImages();
```

Run it:
```bash
node scripts/migrate-images-to-cloudinary.js
```

---

## 🔧 Step 3: Update Server.js

Replace your `server.js` with:

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for now, configure later
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logResponse(req, res, duration);
  });
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/health', async (req, res) => {
  const db = require('./config/database');
  try {
    await db.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Routes
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

// Frontend routes
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

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
```

---

## 📝 Step 4: Update Routes with Validation

### Example: Update routes/orders.js

Add at the top:
```javascript
const { asyncHandler } = require('../middleware/errorHandler');
const { validateOrder, validateId, validateStatusUpdate } = require('../middleware/validation');
const inventoryService = require('../services/inventoryService');
```

Update POST route:
```javascript
router.post('/', validateOrder, asyncHandler(async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const orderId = 'MLR-' + Date.now().toString().slice(-6);
    const { customer, items, total, status, customerId, paymentMethod } = req.body;
    
    // Check stock availability
    for (const item of items) {
      const stock = await inventoryService.getProductStock(item.id);
      if (stock.available_stock < (item.quantity || 1)) {
        throw new AppError(
          `Insufficient stock for ${item.name}. Available: ${stock.available_stock}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }
    }
    
    // ... rest of order creation code ...
    
    // Reserve stock
    const orderItems = items.map(item => ({
      product_id: item.id,
      quantity: item.quantity || 1
    }));
    await inventoryService.reserveStock(orderDbId, orderItems, 'Order placed');
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      data: { id: orderDbId, orderId, ...req.body }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));
```

---

## 🧪 Step 5: Test Everything

### 1. Test Health Endpoint
```bash
curl http://localhost:5000/health
```

### 2. Test Rate Limiting
```bash
# Make 101 requests quickly - should get rate limited
for i in {1..101}; do curl http://localhost:5000/api/products; done
```

### 3. Test Inventory
```bash
# Create an order and check stock
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer":{"name":"Test","phone":"1234567890"},"items":[{"id":1,"quantity":2,"mode":"buy"}],"total":100}'

# Check product stock
curl http://localhost:5000/api/products/1
```

### 4. Test Image Upload
- Go to admin panel
- Upload a product image
- Check if it appears in Cloudinary dashboard

---

## 📊 Step 6: Monitor and Optimize

### Check Logs
```bash
# View error logs
tail -f logs/error.log

# View all logs
tail -f logs/combined.log
```

### Monitor Performance
```bash
# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

---

## 🚀 Step 7: Deploy to Production

### 1. Update Environment Variables on Render
```
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=your_postgres_url
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 2. Run Migration on Production
```bash
# SSH into Render or use Render shell
node scripts/create-inventory-table.js
```

### 3. Deploy
```bash
git add .
git commit -m "feat: implement production-ready improvements"
git push origin main
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Health endpoint returns "healthy"
- [ ] Products load correctly
- [ ] Images load from Cloudinary
- [ ] Orders can be created
- [ ] Stock is reserved when order is placed
- [ ] Stock is released when order is cancelled
- [ ] Rate limiting works (try 101 requests)
- [ ] Validation errors are user-friendly
- [ ] Logs are being written
- [ ] Admin panel works
- [ ] Client website works

---

## 🆘 Troubleshooting

### Images not loading?
1. Check Cloudinary credentials in `.env`
2. Verify image URLs in database start with `https://res.cloudinary.com`
3. Check browser console for CORS errors

### Database errors?
1. Verify migration ran successfully
2. Check `inventory_transactions` table exists
3. Verify PostgreSQL version is 12+

### Rate limiting too strict?
Adjust in `middleware/rateLimiter.js`:
```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Increase this
  // ...
});
```

### Logs not appearing?
1. Check `logs/` directory exists
2. Verify write permissions
3. Check `LOG_LEVEL` environment variable

---

## 📚 Next Steps

1. **Add Unit Tests** - Test critical functions
2. **Set up CI/CD** - Automate testing and deployment
3. **Add Monitoring** - Use Sentry or LogRocket
4. **Implement Caching** - Cache product lists
5. **Add API Documentation** - Use Swagger
6. **Set up Backups** - Automate database backups

---

## 🎉 Congratulations!

Your system is now production-ready with:
- ✅ Proper error handling
- ✅ Input validation
- ✅ Rate limiting
- ✅ Logging
- ✅ Image storage on Cloudinary
- ✅ Inventory tracking
- ✅ Security headers
- ✅ Performance optimizations

Need help? Check the logs or contact support!
