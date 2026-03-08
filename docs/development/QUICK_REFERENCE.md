# 🚀 Quick Reference Card

## 📦 Installation

```bash
# Install new dependencies
npm install express-rate-limit helmet node-cache winston express-validator

# Run database migration
node scripts/create-inventory-table.js

# Start server
npm start
```

---

## 🔧 Common Tasks

### Upload Image to Cloudinary
```javascript
const imageService = require('./services/imageService');
const result = await imageService.uploadProductImage(filePath, productId);
// Returns: { url, publicId, width, height }
```

### Reserve Stock
```javascript
const inventoryService = require('./services/inventoryService');
await inventoryService.reserveStock(orderId, [
  { product_id: 1, quantity: 2 },
  { product_id: 2, quantity: 1 }
]);
```

### Release Stock
```javascript
await inventoryService.releaseStock(orderId, 'Order cancelled');
```

### Check Stock
```javascript
const stock = await inventoryService.getProductStock(productId);
console.log(stock.available_stock);
```

### Log Messages
```javascript
const logger = require('./utils/logger');
logger.info('Order created', { orderId: 123 });
logger.error('Payment failed', { error: err.message });
```

### Throw Errors
```javascript
const { AppError } = require('./middleware/errorHandler');
throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
```

---

## 🛣️ Route Examples

### With Validation
```javascript
const { validateOrder } = require('./middleware/validation');
const { asyncHandler } = require('./middleware/errorHandler');

router.post('/', validateOrder, asyncHandler(async (req, res) => {
  // Your code here
  res.json({ success: true, data: result });
}));
```

### With Rate Limiting
```javascript
const { orderLimiter } = require('./middleware/rateLimiter');

router.post('/orders', orderLimiter, createOrder);
```

---

## 🗄️ Database Queries

### Get Product with Stock
```javascript
const [result] = await db.query(`
  SELECT p.*, ps.available_stock
  FROM products p
  LEFT JOIN product_stock ps ON p.id = ps.id
  WHERE p.id = ?
`, [productId]);
```

### Get Low Stock Products
```javascript
const lowStock = await inventoryService.getLowStockProducts(5);
```

### Get Transaction History
```javascript
const history = await inventoryService.getTransactionHistory(productId, 50);
```

---

## 🔍 Debugging

### Check Health
```bash
curl http://localhost:5000/health
```

### View Logs
```bash
# All logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# Last 100 lines
tail -n 100 logs/combined.log
```

### Test Rate Limiting
```bash
# Make 101 requests (should get rate limited)
for i in {1..101}; do curl http://localhost:5000/api/products; done
```

### Check Database
```bash
# Connect to database
psql $DATABASE_URL

# Check tables
\dt

# Check inventory transactions
SELECT * FROM inventory_transactions ORDER BY created_at DESC LIMIT 10;

# Check product stock
SELECT * FROM product_stock;
```

---

## 🚨 Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `PRODUCT_NOT_FOUND` | 404 | Product doesn't exist |
| `INSUFFICIENT_STOCK` | 400 | Not enough stock |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `DUPLICATE_ENTRY` | 409 | Record already exists |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## 📝 Environment Variables

```env
# Required
NODE_ENV=production
DATABASE_URL=postgresql://...
PORT=5000

# Cloudinary (Required for images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional
LOG_LEVEL=info
CORS_ORIGIN=*
LOW_STOCK_THRESHOLD=5
```

---

## 🧪 Testing Endpoints

### Health Check
```bash
curl http://localhost:5000/health
```

### Get Products
```bash
curl http://localhost:5000/api/products
```

### Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "John Doe",
      "phone": "1234567890"
    },
    "items": [
      {"id": 1, "quantity": 2, "mode": "buy"}
    ],
    "total": 1000
  }'
```

### Upload Image
```bash
curl -X POST http://localhost:5000/api/upload/product \
  -F "image=@/path/to/image.jpg" \
  -F "productId=1"
```

---

## 🔒 Security Checklist

- [x] Rate limiting enabled
- [x] Input validation active
- [x] Helmet.js security headers
- [x] HTTPS enforced (in production)
- [x] SQL injection prevention (parameterized queries)
- [x] Error messages don't leak sensitive info
- [x] CORS configured
- [x] File upload restrictions

---

## 📊 Performance Tips

### 1. Use Batch Queries
```javascript
// Bad: N+1 queries
for (const order of orders) {
  order.items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
}

// Good: Single query
const [allItems] = await db.query('SELECT * FROM order_items WHERE order_id IN (?)', [orderIds]);
```

### 2. Add Indexes
```sql
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_orders_status ON orders(status);
```

### 3. Use Caching (Future)
```javascript
const cache = require('node-cache');
const myCache = new cache({ stdTTL: 600 });

const products = myCache.get('products');
if (!products) {
  const products = await getProducts();
  myCache.set('products', products);
}
```

---

## 🆘 Troubleshooting

### Images not loading?
1. Check Cloudinary credentials
2. Verify `image_url` in database
3. Check browser console for errors

### Stock not updating?
1. Verify `inventory_transactions` table exists
2. Check if migration ran successfully
3. Look for errors in logs

### Rate limiting too strict?
Edit `middleware/rateLimiter.js`:
```javascript
max: 200, // Increase from 100
```

### Logs not appearing?
1. Check `logs/` directory exists
2. Verify write permissions
3. Check `LOG_LEVEL` env variable

---

## 📞 Quick Commands

```bash
# Install dependencies
npm install

# Run migration
node scripts/create-inventory-table.js

# Start server
npm start

# Start with nodemon
npm run dev

# Run tests
npm test

# Check logs
tail -f logs/combined.log

# Check health
curl http://localhost:5000/health

# Deploy to Render
git push origin main
```

---

## 🎯 Priority Order

1. ✅ Install dependencies
2. ✅ Run database migration
3. ✅ Update environment variables
4. ✅ Update server.js
5. ✅ Test locally
6. ✅ Deploy to production
7. ✅ Migrate images to Cloudinary
8. ✅ Monitor logs

---

**Keep this file handy for quick reference!** 📌
