# 🚀 Production Deployment Steps

## Current Status: Ready for Deployment

All production-ready improvements have been implemented. Follow these steps to deploy.

---

## ✅ Pre-Deployment Checklist

### 1. Install Dependencies
```bash
npm install
```

This will install the new packages:
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `node-cache` - Caching
- `winston` - Logging
- `cloudinary` - Image storage

### 2. Update Environment Variables

Add these to your `.env` file (local) and Render dashboard (production):

```env
# Existing
DATABASE_URL=your_postgres_connection_string
PORT=5000

# Cloudinary (Required for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional
NODE_ENV=production
LOG_LEVEL=info
LOW_STOCK_THRESHOLD=5
CORS_ORIGIN=*
```

### 3. Run Database Migration

**IMPORTANT: Backup your database first!**

```bash
node scripts/create-inventory-table.js
```

This creates:
- `inventory_transactions` table for stock tracking
- `product_stock` view for real-time stock queries
- Indexes for performance

---

## 🧪 Local Testing

### 1. Start the Server
```bash
npm start
```

### 2. Test Health Endpoint
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-03-06T..."
}
```

### 3. Test Product Listing
```bash
curl http://localhost:5000/api/products
```

Expected response:
```json
{
  "success": true,
  "data": [...]
}
```

### 4. Test Rate Limiting
Make 101 requests quickly - should get rate limited:
```bash
for i in {1..101}; do curl http://localhost:5000/api/products; done
```

### 5. Test Image Upload
- Go to admin panel: http://localhost:5000/admin
- Try uploading a product image
- Verify it appears in Cloudinary dashboard

### 6. Test Order Creation with Stock Tracking
- Create an order through the client website
- Check that stock is reserved in `inventory_transactions` table
- Cancel the order and verify stock is released

---

## 📦 Deploy to Render

### 1. Commit Changes
```bash
git add .
git commit -m "feat: implement production-ready architecture"
git push origin main
```

### 2. Update Render Environment Variables
Go to Render Dashboard → Your Service → Environment:

Add all variables from `.env` file above.

### 3. Run Migration on Production

Option A: Use Render Shell
1. Go to Render Dashboard → Your Service → Shell
2. Run: `node scripts/create-inventory-table.js`

Option B: Temporary Migration Endpoint (Remove after use!)
Add to `server.js` temporarily:
```javascript
app.get('/run-migration', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.MIGRATION_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    require('./scripts/create-inventory-table');
    res.json({ success: true, message: 'Migration completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Then visit: `https://your-app.onrender.com/run-migration?secret=YOUR_SECRET`

**REMOVE THIS ENDPOINT AFTER MIGRATION!**

### 4. Deploy
Render will automatically deploy when you push to main.

Monitor the deployment logs for any errors.

---

## ✅ Post-Deployment Verification

### 1. Check Health
```bash
curl https://mahalakshmi-imitation-jewellery.onrender.com/health
```

### 2. Check Products Load
Visit: https://mahalakshmi-imitation-jewellery.onrender.com/buy

### 3. Check Admin Panel
Visit: https://mahalakshmi-imitation-jewellery.onrender.com/admin

### 4. Test Image Upload
- Upload a product image in admin panel
- Verify it loads correctly
- Check Cloudinary dashboard

### 5. Test Order Flow
- Add products to cart
- Place an order
- Check admin panel for new order
- Verify stock is reserved

### 6. Check Logs
View logs in Render Dashboard to ensure no errors.

---

## 🔍 What Changed?

### Server (server.js)
- ✅ Added helmet for security headers
- ✅ Added rate limiting on all API routes
- ✅ Added request/response logging
- ✅ Added global error handler
- ✅ Added 404 handler
- ✅ Improved health check endpoint

### Routes (orders.js, products.js, upload.js)
- ✅ Added input validation middleware
- ✅ Added asyncHandler for error handling
- ✅ Integrated inventory service for stock tracking
- ✅ Migrated image uploads to Cloudinary
- ✅ Added structured response format
- ✅ Added logging for all operations

### New Services
- ✅ `inventoryService.js` - Stock management
- ✅ `imageService.js` - Cloudinary integration
- ✅ `logger.js` - Winston logging

### New Middleware
- ✅ `errorHandler.js` - Global error handling
- ✅ `validation.js` - Input validation
- ✅ `rateLimiter.js` - Rate limiting

---

## 🆘 Troubleshooting

### Images Not Loading?
1. Check Cloudinary credentials in Render environment variables
2. Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
3. Check browser console for errors

### Database Errors?
1. Verify migration ran successfully
2. Check if `inventory_transactions` table exists:
   ```sql
   SELECT * FROM inventory_transactions LIMIT 1;
   ```
3. Check PostgreSQL version (should be 12+)

### Rate Limiting Too Strict?
Edit `middleware/rateLimiter.js` and increase limits:
```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Increase this
});
```

### Orders Failing?
1. Check if stock is available
2. Check logs for error messages
3. Verify `inventory_transactions` table exists

---

## 📊 Monitoring

### Check Logs
Logs are written to `logs/` directory:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

In production (Render), view logs in the dashboard.

### Monitor Performance
- Check response times in logs
- Monitor database query performance
- Watch for rate limit hits

---

## 🎉 Success!

Your system is now production-ready with:
- ✅ Security headers (helmet)
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling
- ✅ Logging
- ✅ Cloudinary image storage
- ✅ Inventory tracking
- ✅ Stock management

---

## 📚 Next Steps

1. **Monitor for 24 hours** - Watch logs for any issues
2. **Test all features** - Ensure everything works as expected
3. **Backup database** - Set up automated backups
4. **Add monitoring** - Consider Sentry or LogRocket
5. **Performance testing** - Load test with many concurrent users
6. **Documentation** - Update user guides if needed

---

## 🔗 Useful Links

- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Detailed implementation steps
- [Production Ready Summary](./PRODUCTION_READY_SUMMARY.md) - Overview of changes
- [Quick Reference](./QUICK_REFERENCE.md) - Common tasks reference

---

Need help? Check the logs or review the implementation guide!
