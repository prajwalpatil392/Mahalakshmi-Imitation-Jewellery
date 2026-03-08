# Render Deployment Guide for Mahalakshmi Jewellery

## Important: MySQL Database Required

Render only provides PostgreSQL databases. Since your app uses MySQL, you need an external MySQL database.

**Recommended:** Use Railway for free MySQL hosting (see `DATABASE_OPTIONS.md` for details)

## Prerequisites
- GitHub account
- Render account (sign up at https://render.com)
- External MySQL database (Railway, PlanetScale, or Aiven - see DATABASE_OPTIONS.md)
- Your code pushed to a GitHub repository

## Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Ready for Render deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Step 2: Set Up MySQL Database

Before deploying to Render, create a MySQL database:

### Option 1: Railway (Recommended)
1. Go to https://railway.app
2. Sign up and create new project
3. Click "Provision MySQL"
4. Copy connection details (see DATABASE_OPTIONS.md)

### Option 2: PlanetScale
1. Go to https://planetscale.com
2. Create free account and database
3. Copy connection details

See `DATABASE_OPTIONS.md` for detailed instructions on all options.

## Step 3: Deploy on Render

### Option A: Using render.yaml (Blueprint Deploy)

1. Go to https://render.com/dashboard
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create your web service
5. **Important:** You'll need to manually add database environment variables (see Step 4)

### Option B: Manual Setup (Recommended for first-time)

1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `mahalakshmi-backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run migrate`
   - Start Command: `npm start`
   - Plan: Free (or your preferred plan)
4. Click "Create Web Service"

## Step 4: Configure Environment Variables

In your Render web service dashboard, add these environment variables:

### Required Variables
```
NODE_ENV=production
PORT=5000
```

### Database (From Railway/PlanetScale/Aiven)
```
DB_HOST=[your MySQL host from Railway/PlanetScale]
DB_USER=[your MySQL username]
DB_PASSWORD=[your MySQL password]
DB_NAME=[your MySQL database name]
DB_PORT=3306
```

### JWT Secret
```
JWT_SECRET=[generate a random string - Render can auto-generate]
```

### Payment Configuration
```
ENABLE_COD=true
ENABLE_CASH_AT_SHOP=true
ENABLE_UPI=true
UPI_ID=prajwal1111@slc
ENABLE_ONLINE_PAYMENT=false
```

### Optional: Razorpay (if you want online payments)
```
RAZORPAY_KEY_ID=your_key_here
RAZORPAY_KEY_SECRET=your_secret_here
```

### Optional: Email Service
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Optional: SMS Service (Twilio)
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

## Step 5: Deploy

1. After adding all environment variables, click "Save Changes"
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Run migrations (`npm run migrate`)
   - Start your server (`npm start`)
3. Monitor the deployment in the "Logs" tab

## Step 6: Access Your Application

Once deployed, you'll get a URL like:
```
https://mahalakshmi-backend.onrender.com
```

### Frontend Pages:
- Home: `https://mahalakshmi-backend.onrender.com/`
- Admin: `https://mahalakshmi-backend.onrender.com/admin`
- Buy: `https://mahalakshmi-backend.onrender.com/buy`
- Rental: `https://mahalakshmi-backend.onrender.com/rental`

### API Endpoints:
- Health Check: `https://mahalakshmi-backend.onrender.com/api/health`
- Products: `https://mahalakshmi-backend.onrender.com/api/products`
- Orders: `https://mahalakshmi-backend.onrender.com/api/orders`

## Step 7: Update Frontend API URLs (if needed)

If you're using a separate frontend deployment, update API URLs in your HTML files to point to your Render backend URL.

## Important Notes

### Free Tier Limitations
- Database: 1GB storage, expires after 90 days
- Web Service: Spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds

### Database Migration
The migration runs automatically on deployment via `npm run migrate` in the build command.

### File Uploads
Render's free tier has ephemeral storage. Uploaded files will be lost on service restart. For production:
- Use Cloudinary for images
- Use AWS S3 for file storage

### Custom Domain (Optional)
1. Go to your web service settings
2. Click "Custom Domain"
3. Add your domain and follow DNS instructions

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify `npm install` works locally

### Database Connection Issues
- Verify environment variables are set correctly
- Check database is running in Render dashboard
- Ensure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME are correct

### Application Errors
- Check logs in Render dashboard
- Verify migrations ran successfully
- Test API endpoints with `/api/health`

### Service Won't Start
- Check start command is `npm start`
- Verify PORT environment variable is set
- Check server.js listens on `process.env.PORT`

## Monitoring

- View logs: Render Dashboard → Your Service → Logs
- View metrics: Render Dashboard → Your Service → Metrics
- Set up alerts: Render Dashboard → Your Service → Notifications

## Updating Your Application

Push changes to GitHub:
```bash
git add .
git commit -m "Your update message"
git push
```

Render will automatically:
1. Detect the push
2. Rebuild your application
3. Run migrations
4. Deploy the new version

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Your app logs: Check Render dashboard for detailed error messages
