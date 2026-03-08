# 🚀 Deploy Now - Simple Steps

## ⚠️ You Don't Have Local PostgreSQL

That's OK! You'll run the migration on Render instead.

---

## 📋 Simple Deployment Steps

### Step 1: Install Dependencies (2 minutes)
```bash
npm install
```

### Step 2: Get Cloudinary Credentials (5 minutes)
1. Go to https://cloudinary.com
2. Sign up for free account
3. Go to Dashboard
4. Copy these 3 values:
   - Cloud Name
   - API Key
   - API Secret

### Step 3: Use Migration Endpoint (Easiest Way)

Replace your `server.js` with the migration-enabled version:

```bash
# Windows
copy server-with-migration-endpoint.js server.js

# Or manually copy the content
```

### Step 4: Commit and Push
```bash
git add .
git commit -m "feat: production-ready architecture with migration endpoint"
git push origin main
```

### Step 5: Add Environment Variables on Render

Go to Render Dashboard → Your Service → Environment

Add these:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
MIGRATION_SECRET=choose_a_random_secret_like_abc123xyz
NODE_ENV=production
LOG_LEVEL=info
```

### Step 6: Wait for Deployment (5 minutes)

Render will automatically deploy. Wait until you see "Live" status.

### Step 7: Run Migration

Visit this URL in your browser (replace YOUR_SECRET with the secret you set):
```
https://mahalakshmi-imitation-jewellery.onrender.com/run-migration?secret=YOUR_SECRET
```

You should see:
```json
{
  "success": true,
  "message": "Migration completed successfully!",
  "note": "IMPORTANT: Remove this endpoint from server.js now!"
}
```

### Step 8: Remove Migration Endpoint

After migration succeeds, replace `server.js` back to the original:

```bash
# Use git to restore original
git checkout HEAD -- server.js

# Or manually remove the /run-migration endpoint
```

Then commit and push:
```bash
git add server.js
git commit -m "chore: remove migration endpoint"
git push origin main
```

### Step 9: Test Everything

1. **Health Check:**
   ```
   https://mahalakshmi-imitation-jewellery.onrender.com/health
   ```
   Should return: `{"status":"healthy","database":"connected"}`

2. **Products Page:**
   ```
   https://mahalakshmi-imitation-jewellery.onrender.com/buy
   ```

3. **Admin Panel:**
   ```
   https://mahalakshmi-imitation-jewellery.onrender.com/admin
   ```

4. **Test Image Upload:**
   - Go to admin panel
   - Create/edit a product
   - Upload an image
   - Verify it loads

5. **Test Order Creation:**
   - Add products to cart
   - Place an order
   - Check admin panel

---

## ✅ Quick Checklist

- [ ] Run `npm install`
- [ ] Get Cloudinary credentials
- [ ] Copy `server-with-migration-endpoint.js` to `server.js`
- [ ] Commit and push
- [ ] Add environment variables on Render
- [ ] Wait for deployment
- [ ] Visit `/run-migration?secret=YOUR_SECRET`
- [ ] Restore original `server.js`
- [ ] Commit and push again
- [ ] Test everything

---

## 🎯 Expected Timeline

- Install dependencies: 2 minutes
- Get Cloudinary account: 5 minutes
- Commit and push: 1 minute
- Render deployment: 5 minutes
- Run migration: 1 minute
- Remove endpoint: 2 minutes
- Testing: 5 minutes

**Total: ~20 minutes**

---

## 🆘 Troubleshooting

### Migration endpoint returns 403
→ Check that `MIGRATION_SECRET` is set in Render environment variables
→ Make sure the secret in URL matches the one in environment

### Migration fails with database error
→ Check Render logs for detailed error
→ Verify DATABASE_URL is set correctly

### Images not uploading
→ Check Cloudinary credentials in Render environment
→ Verify all 3 values are correct (Cloud Name, API Key, API Secret)

### Health check returns "unhealthy"
→ Check DATABASE_URL in Render environment
→ Check Render logs for connection errors

---

## 💡 Alternative: Use Render Shell

If you prefer, you can use Render Shell instead:

1. Go to Render Dashboard
2. Click your service
3. Click "Shell" tab
4. Run: `node scripts/create-inventory-table.js`

This requires the database to be accessible, which it should be on Render.

---

## 🎉 You're Almost There!

Just follow the 9 steps above and you'll be live in 20 minutes!

**Start with Step 1:** `npm install`
