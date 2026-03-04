# Pre-Deployment Checklist

Before deploying to Render, verify these items:

## ✅ Code Readiness

- [ ] All code is committed to Git
- [ ] `.env` file is NOT committed (check `.gitignore`)
- [ ] `package.json` has all dependencies listed
- [ ] `render.yaml` is configured correctly

## ✅ Environment Variables

Create a `.env` file locally for testing (don't commit it):

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mahalakshmi
JWT_SECRET=your_secret_key_here

# Payment Settings
ENABLE_COD=true
ENABLE_CASH_AT_SHOP=true
ENABLE_UPI=true
UPI_ID=prajwal1111@slc
ENABLE_ONLINE_PAYMENT=false

# Optional: Razorpay
# RAZORPAY_KEY_ID=
# RAZORPAY_KEY_SECRET=

# Optional: Email
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=
# EMAIL_PASSWORD=

# Optional: Twilio SMS
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_PHONE_NUMBER=
```

## ✅ Local Testing

Run these commands to verify everything works:

```bash
# Install dependencies
npm install

# Run database migration
npm run migrate

# Start the server
npm start
```

Then test:
- http://localhost:5000/api/health (should return {"status":"ok"})
- http://localhost:5000/ (should show client page)
- http://localhost:5000/admin (should show admin page)

## ✅ Database Schema

Ensure your database has these tables:
- products
- orders
- order_items
- customers
- enquiries
- rentals
- invoices
- admins

The migration script should create these automatically.

## ✅ File Structure

Verify these files exist:
- `server.js` - Main server file
- `package.json` - Dependencies
- `render.yaml` - Render configuration
- `.env.example` - Example environment variables
- `config/database.js` - Database configuration
- `scripts/migrate.js` - Migration script
- All route files in `routes/`
- All service files in `services/`

## ✅ GitHub Repository

1. Create a new repository on GitHub
2. Push your code:

```bash
git init
git add .
git commit -m "Initial commit - Ready for Render"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## ✅ Render Account

1. Sign up at https://render.com
2. Connect your GitHub account
3. Have your environment variables ready

## 🚀 Ready to Deploy!

Once all items are checked, follow the steps in `RENDER_DEPLOYMENT.md`
