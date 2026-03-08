# Production Deployment Guide - Mahalakshmi Jewellery

## ✅ Critical Fixes Applied

### 1. Trust Proxy Configuration ✓
**Issue**: `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false`

**Fix Applied**: Added `app.set('trust proxy', 1);` in `server.js` before middleware initialization.

**Why**: Render uses a reverse proxy. Without this setting, Express cannot properly detect client IPs, breaking rate limiting and logging.

---

### 2. Cloudinary Configuration ✓
**Issue**: `Must supply api_secret` error during image uploads

**Fix Applied**: Updated `config/cloudinary.js` to:
- Support `CLOUDINARY_URL` environment variable (recommended for Render)
- Fallback to individual env vars (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- Added validation to detect missing credentials at startup

**Configuration**:
```bash
# Option 1 (Recommended for Render):
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Option 2 (Individual variables):
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

### 3. Image Upload Pipeline ✓
**Issue**: Upload route not handling multer memory storage correctly

**Fix Applied**: Updated `services/imageService.js` to:
- Handle both Buffer (memory storage) and file paths
- Use `upload_stream` for buffer uploads to Cloudinary
- Return both `publicId` and `public_id` for compatibility

**Route**: `POST /api/upload/product`
- Accepts: `multipart/form-data` with `image` field
- Returns: `{ success: true, imageUrl, publicId, filename }`

---

### 4. Image URL Sanitization ✓
**Issue**: Malformed URLs like `https://domain.comhttp//domain.com/uploads/file.jpeg`

**Fix Applied**: Enhanced URL sanitization in `routes/products.js`:
- Fixes double protocol: `https://http://` → `https://`
- Fixes missing separator: `domain.comhttp://` → `domain.com/`
- Fixes malformed separator: `http//` → `https://`
- Forces HTTPS for security
- Validates URL format

---

### 5. PostgreSQL Compatibility ✓
**Status**: All routes already use PostgreSQL syntax (`$1, $2, $3`)

**Verified Files**:
- ✓ `routes/products.js` - Uses `$1, $2` placeholders
- ✓ `routes/orders.js` - Uses `$1, $2` placeholders and `RETURNING id`
- ✓ `routes/customers.js` - PostgreSQL compatible
- ✓ `routes/enquiries.js` - PostgreSQL compatible
- ✓ `routes/inventory.js` - PostgreSQL compatible
- ✓ `scripts/seedProducts.js` - Fixed to use `$1, $2` syntax

**Database**: Pure PostgreSQL pool in `config/database.js`

---

### 6. Error Handling ✓
**Issue**: Frontend showing `Error: [object Object]`

**Fix Applied**: Updated `public/config.js` to:
- Properly extract error messages from API responses
- Handle nested error objects: `data?.error?.message || data?.error || data?.message`
- Preserve original error messages instead of wrapping them

---

### 7. Rate Limiting ✓
**Status**: Re-enabled for production

**Configuration** (`middleware/rateLimiter.js`):
- General API: 100 requests / 15 minutes
- Auth: 5 attempts / 15 minutes
- Orders: 50 orders / hour
- Uploads: 20 uploads / hour
- Enquiries: 5 enquiries / hour

**Note**: Rate limiting was temporarily disabled for testing. Now re-enabled for production.

---

## 🚀 Render Deployment Checklist

### Environment Variables (Set in Render Dashboard)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Security
JWT_SECRET=your_secure_jwt_secret_here
NODE_ENV=production

# Cloudinary (CRITICAL - Must be set!)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Email (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Mahalakshmi Jewellery <your-email@gmail.com>
ADMIN_EMAIL=admin@mahalakshmi.com

# SMS (Optional - Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
SMS_ENABLED=false

# Payment (Optional)
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_ENABLED=false

# Features
ENABLE_COD=true
ENABLE_CASH_AT_SHOP=true
ENABLE_ONLINE_PAYMENT=false
LOW_STOCK_THRESHOLD=5
```

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production-ready deployment"
   git push origin main
   ```

2. **Render Configuration**
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment: Node
   - Auto-Deploy: Enabled

3. **Database Setup**
   - Create PostgreSQL database on Render
   - Copy `DATABASE_URL` to environment variables
   - Run migrations (if needed)

4. **Cloudinary Setup** (CRITICAL)
   - Login to Cloudinary dashboard
   - Copy credentials
   - Set `CLOUDINARY_URL` in Render environment variables
   - Format: `cloudinary://api_key:api_secret@cloud_name`

5. **Test Deployment**
   - Check `/health` endpoint
   - Test image upload
   - Create test order
   - Verify database connection

---

## 🔍 Debugging Guide

### Check Logs
```bash
# In Render dashboard, view logs for:
- Database connection status
- Cloudinary configuration validation
- API request/response logs
- Error stack traces
```

### Common Issues

#### 1. Database Connection Failed
**Symptoms**: `Database connection failed` in logs

**Solutions**:
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL database is running
- Ensure SSL is enabled: `ssl: { rejectUnauthorized: false }`

#### 2. Cloudinary Upload Fails
**Symptoms**: `Must supply api_secret` error

**Solutions**:
- Verify `CLOUDINARY_URL` is set in Render environment
- Check format: `cloudinary://api_key:api_secret@cloud_name`
- Restart service after setting env vars

#### 3. Rate Limiting Blocks Testing
**Symptoms**: `429 Too Many Requests` errors

**Solutions**:
- Temporarily disable in `server.js`: Comment out `app.use('/api/', apiLimiter);`
- Or increase limits in `middleware/rateLimiter.js`
- Re-enable before production deployment

#### 4. Images Not Loading
**Symptoms**: Broken image URLs or 404 errors

**Solutions**:
- Check image URLs in database (should be Cloudinary URLs)
- Verify Cloudinary credentials are correct
- Check browser console for CORS errors
- Ensure URLs use HTTPS (not HTTP)

#### 5. Phone Validation Fails
**Symptoms**: `Phone must be 10 digits` error

**Solutions**:
- Updated validation to accept 10-15 digits
- Format: Numbers only, no spaces or special characters
- Example: `9876543210` or `919876543210`

---

## 📊 Health Check

### Endpoint: `GET /health`

**Healthy Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Unhealthy Response**:
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "connection timeout"
}
```

---

## 🔒 Security Checklist

- ✅ Trust proxy enabled for Render
- ✅ Helmet security headers configured
- ✅ CORS configured (set `CORS_ORIGIN` for production)
- ✅ Rate limiting enabled on all API routes
- ✅ Input validation on all routes
- ✅ SQL injection protection (parameterized queries)
- ✅ File upload validation (type, size limits)
- ✅ HTTPS enforced for image URLs
- ✅ JWT secret configured
- ✅ Environment variables used (no hardcoded secrets)

---

## 📝 API Response Format

All API endpoints return consistent JSON format:

**Success**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## 🧪 Testing Checklist

### Before Deployment
- [ ] Database connection works
- [ ] Cloudinary credentials are valid
- [ ] Image upload works
- [ ] Product CRUD operations work
- [ ] Order creation works
- [ ] Email notifications work (if enabled)
- [ ] Rate limiting is configured
- [ ] Error handling returns proper messages

### After Deployment
- [ ] Health check returns healthy status
- [ ] Frontend loads correctly
- [ ] Admin panel accessible
- [ ] Products display with images
- [ ] Cart functionality works
- [ ] Order placement works
- [ ] Payment methods display correctly

---

## 🆘 Support

### Log Analysis
Check Render logs for:
- `✅ Database Connected` - Database OK
- `✅ PostgreSQL client connected` - Connection pool OK
- `❌ CRITICAL: Cloudinary api_secret is missing!` - Fix Cloudinary config
- `🚀 Server running on port` - Server started successfully

### Quick Fixes
```bash
# Restart service (Render dashboard)
# Clear build cache (Render dashboard)
# Re-deploy (Render dashboard)
```

---

## 📚 Architecture Summary

**Tech Stack**:
- Backend: Node.js + Express.js
- Database: PostgreSQL (pure, no MySQL)
- Image Storage: Cloudinary
- Deployment: Render
- Frontend: Vanilla JavaScript

**Key Features**:
- Product management (buy/rent/both)
- Order processing with inventory tracking
- Image upload to Cloudinary
- Email/SMS notifications (optional)
- Payment gateway integration (optional)
- Rate limiting and security
- Admin panel

---

## ✨ Production Ready

All critical issues have been fixed. The system is now:
- ✅ Render-compatible (trust proxy enabled)
- ✅ Cloudinary-ready (proper configuration)
- ✅ PostgreSQL-only (no MySQL syntax)
- ✅ Error-handled (proper error messages)
- ✅ Secure (rate limiting, validation, sanitization)
- ✅ Stable (async error handling, connection pooling)

**Next Steps**: Set environment variables in Render and deploy!
