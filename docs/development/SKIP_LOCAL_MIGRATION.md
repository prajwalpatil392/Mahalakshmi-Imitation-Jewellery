# ⚠️ Skip Local Migration - Deploy Directly

## Why Skip Local Migration?

You're using Render's PostgreSQL database, not a local one. The migration needs to run on Render's database, not locally.

---

## ✅ Deployment Steps (Without Local Migration)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Cloudinary
1. Go to https://cloudinary.com
2. Create account and get credentials
3. Add to `.env` (for local testing only):
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 3: Test Server Locally (Optional)
```bash
npm start
```
The server will start but won't connect to database (that's OK for now).

### Step 4: Deploy to Render
```bash
git add .
git commit -m "feat: production-ready architecture"
git push origin main
```

### Step 5: Add Environment Variables on Render
Go to Render Dashboard → Your Service → Environment

Add these variables:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=production
LOG_LEVEL=info
```

### Step 6: Run Migration on Render

**Option A: Using Render Shell (Recommended)**
1. Go to Render Dashboard
2. Click on your service
3. Click "Shell" tab
4. Run:
```bash
node scripts/create-inventory-table.js
```

**Option B: Temporary Migration Endpoint**
1. Wait for deployment to complete
2. Visit this URL (replace with your domain):
```
https://mahalakshmi-imitation-jewellery.onrender.com/run-migration?secret=YOUR_SECRET_KEY
```

For this to work, add this to your `.env` on Render:
```
MIGRATION_SECRET=your_secret_key_here
```

And add this endpoint to `server.js` temporarily:
```javascript
// Temporary migration endpoint - REMOVE AFTER USE
app.get('/run-migration', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.MIGRATION_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const { exec } = require('child_process');
    exec('node scripts/create-inventory-table.js', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message, stderr });
      }
      res.json({ success: true, output: stdout });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**IMPORTANT: Remove this endpoint after migration!**

### Step 7: Verify Migration
Check Render logs to see if migration was successful. You should see:
```
✅ inventory_transactions table created
✅ product_stock view created
✅ Indexes created
✅ Migration completed successfully!
```

### Step 8: Test Production
1. Visit: https://mahalakshmi-imitation-jewellery.onrender.com/health
2. Should return: `{"status":"healthy","database":"connected"}`
3. Test products: https://mahalakshmi-imitation-jewellery.onrender.com/buy
4. Test admin: https://mahalakshmi-imitation-jewellery.onrender.com/admin

---

## 🎯 Quick Checklist

- [ ] Run `npm install`
- [ ] Create Cloudinary account
- [ ] Get Cloudinary credentials
- [ ] Commit and push to GitHub
- [ ] Add Cloudinary credentials to Render
- [ ] Wait for deployment
- [ ] Run migration on Render (using Shell or endpoint)
- [ ] Test health endpoint
- [ ] Test website
- [ ] Remove migration endpoint (if used)

---

## ✅ You're Ready!

Since you don't have local PostgreSQL, you can deploy directly to Render and run the migration there. This is actually safer because the migration runs on the actual production database.

**Next:** Just commit and push your changes, then run the migration on Render using the Shell.
