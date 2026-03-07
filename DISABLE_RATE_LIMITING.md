# 🔧 Disable Rate Limiting for Testing

## Problem
You're hitting rate limits (429 errors) because you're testing too much.

## Quick Solution

### Option 1: Wait 15 Minutes
The rate limit will reset automatically after 15 minutes.

### Option 2: Temporarily Disable Rate Limiting

Edit `server.js` and comment out this line:

```javascript
// Comment this line:
// app.use('/api/', apiLimiter);
```

**Full change in server.js:**
```javascript
// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting on API routes
// TEMPORARILY DISABLED FOR TESTING:
// app.use('/api/', apiLimiter);

// Health check
app.get('/health', async (req, res) => {
```

### Option 3: Increase Rate Limits

Edit `middleware/rateLimiter.js`:

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increase from 100 to 1000
  // ...
});
```

## ⚠️ IMPORTANT

**Remember to re-enable rate limiting before deploying to production!**

Rate limiting protects your API from:
- Abuse
- DDoS attacks
- Excessive usage
- Bot attacks

## 🚀 For Production

Keep rate limiting enabled with reasonable limits:
- API: 100-200 requests per 15 minutes
- Orders: 50 orders per hour
- Auth: 5 attempts per 15 minutes

## 📝 Current Rate Limits

- **API General**: 100 requests / 15 minutes
- **Orders**: 50 orders / hour
- **Auth**: 5 attempts / 15 minutes
- **Upload**: 20 uploads / hour
- **Enquiry**: 5 enquiries / hour

These are reasonable for production use.
