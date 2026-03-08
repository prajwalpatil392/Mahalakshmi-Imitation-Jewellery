# Quick Deploy Guide - TL;DR

## 5-Minute Deployment

### 1. Create MySQL Database (2 minutes)
- Go to https://railway.app
- Sign up → New Project → Provision MySQL
- Copy: Host, User, Password, Database name

### 2. Push to GitHub (1 minute)
```bash
git init
git add .
git commit -m "Deploy to Render"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 3. Deploy on Render (2 minutes)
- Go to https://render.com
- New → Web Service
- Connect GitHub repo
- Build: `npm install && npm run migrate`
- Start: `npm start`

### 4. Add Environment Variables
```
NODE_ENV=production
PORT=5000
DB_HOST=[from Railway]
DB_USER=[from Railway]
DB_PASSWORD=[from Railway]
DB_NAME=[from Railway]
DB_PORT=3306
JWT_SECRET=[auto-generate]
ENABLE_COD=true
ENABLE_CASH_AT_SHOP=true
ENABLE_UPI=true
UPI_ID=prajwal1111@slc
```

### 5. Deploy!
Click "Create Web Service" and wait ~3 minutes.

## Your URLs
- Frontend: `https://your-app.onrender.com/`
- Admin: `https://your-app.onrender.com/admin`
- API: `https://your-app.onrender.com/api/health`

## Done! 🎉

For detailed instructions, see `RENDER_DEPLOYMENT.md`
For database options, see `DATABASE_OPTIONS.md`
