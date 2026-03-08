# Quick Fix Reference Card

## 🚨 Critical Fixes Applied

### 1. Trust Proxy Error
```
Error: ValidationError: The 'X-Forwarded-For' header is set but trust proxy is false
```
**Fix**: Added `app.set('trust proxy', 1);` in `server.js` line 13
**File**: `server.js`

---

### 2. Cloudinary API Secret Missing
```
Error: Must supply api_secret
```
**Fix**: Updated `config/cloudinary.js` to use environment variables
**Required Env Var**: `CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name`
**File**: `config/cloudinary.js`

---

### 3. Image Upload Not Working
```
Error: Cannot upload buffer to Cloudinary
```
**Fix**: Updated `uploadProductImage()` to handle Buffer uploads via `upload_stream`
**File**: `services/imageService.js` lines 11-48

---

### 4. Malformed Image URLs
```
URL: https://domain.comhttp//domain.com/uploads/file.jpeg
```
**Fix**: Added URL sanitization in products route
**File**: `routes/products.js` lines 53-67

---

### 5. MySQL Syntax in PostgreSQL
```
Error: syntax error at or near "?"
```
**Fix**: Converted `?` to `$1, $2, $3` in seed script
**File**: `scripts/seedProducts.js` line 44

---

### 6. Generic Error Messages
```
Frontend: Error: [object Object]
```
**Fix**: Enhanced error extraction in API client
**File**: `public/config.js` lines 71-93

---

### 7. Phone Validation Too Strict
```
Error: Phone must be 10 digits
```
**Fix**: Changed regex to `/^[0-9]{10,15}$/` (accepts 10-15 digits)
**File**: `middleware/validation.js` lines 68, 88, 108

---

## 🔧 Environment Variables Checklist

### Required (CRITICAL)
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
CLOUDINARY_URL=cloudinary://key:secret@cloud
JWT_SECRET=your_secret_here
```

### Recommended
```bash
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

### Optional
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
TWILIO_ACCOUNT_SID=your_sid
RAZORPAY_KEY_ID=your_key
```

---

## 🧪 Quick Tests

### 1. Health Check
```bash
curl https://your-app.onrender.com/health
# Expected: {"status":"healthy","database":"connected"}
```

### 2. Products API
```bash
curl https://your-app.onrender.com/api/products
# Expected: {"success":true,"data":[...]}
```

### 3. Image Upload
```bash
curl -X POST https://your-app.onrender.com/api/upload/product \
  -F "image=@test.jpg"
# Expected: {"success":true,"imageUrl":"https://res.cloudinary.com/..."}
```

---

## 🐛 Common Issues & Solutions

### Issue: Database Connection Failed
**Solution**: Check `DATABASE_URL` format and PostgreSQL service status

### Issue: Cloudinary Upload Fails
**Solution**: Verify `CLOUDINARY_URL` is set correctly in Render env vars

### Issue: Rate Limit Errors (429)
**Solution**: Temporarily disable in `server.js` line 45 for testing

### Issue: Images Not Loading
**Solution**: Check Cloudinary credentials and ensure URLs use HTTPS

### Issue: Phone Validation Fails
**Solution**: Use 10-15 digits, numbers only (e.g., 9876543210)

---

## 📊 File Changes Summary

| File | Changes | Status |
|------|---------|--------|
| `server.js` | Added trust proxy | ✅ |
| `config/cloudinary.js` | Environment variables | ✅ |
| `services/imageService.js` | Buffer upload support | ✅ |
| `routes/products.js` | URL sanitization | ✅ |
| `scripts/seedProducts.js` | PostgreSQL syntax | ✅ |
| `public/config.js` | Error handling | ✅ |
| `middleware/validation.js` | Phone validation | ✅ |

---

## 🚀 Deployment Command

```bash
# 1. Commit changes
git add .
git commit -m "Production-ready: All critical fixes applied"
git push origin main

# 2. Deploy on Render
# - Set environment variables
# - Deploy from dashboard
# - Monitor logs

# 3. Verify deployment
curl https://your-app.onrender.com/health
```

---

## 📝 Logs to Monitor

```bash
# Success indicators:
✅ Database Connected
✅ PostgreSQL client connected
🚀 Server running on port 5000

# Error indicators:
❌ Database connection failed
❌ CRITICAL: Cloudinary api_secret is missing!
⚠️ Slow query (>1000ms)
```

---

## 🎯 Production Checklist

- [x] Trust proxy enabled
- [x] Cloudinary configured
- [x] Image upload working
- [x] URL sanitization active
- [x] PostgreSQL syntax only
- [x] Error messages clear
- [x] Phone validation flexible
- [x] Rate limiting enabled
- [x] Security headers set
- [x] Environment variables used

---

**Status**: PRODUCTION READY ✅
**Last Updated**: March 7, 2026
