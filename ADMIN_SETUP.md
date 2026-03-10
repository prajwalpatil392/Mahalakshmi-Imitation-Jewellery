# Admin Login Setup Guide

## Production-Ready Admin Authentication

The admin login system has been updated for real-world use with secure authentication.

## Initial Setup

1. **Create Admin User**
   ```bash
   npm run setup-admin
   ```
   This creates an admin user with:
   - Username: `admin`
   - Password: `admin123`

2. **First Login**
   - Go to `/admin` or click "Admin Panel" link
   - Login with the default credentials
   - **IMPORTANT**: Change the password immediately after first login

## Security Features

✅ **Secure Authentication**
- Passwords are hashed with bcrypt
- JWT tokens for session management
- No hardcoded credentials in production code

✅ **Password Management**
- Change password functionality in admin panel
- Password validation (minimum 6 characters)
- Current password verification required

✅ **Session Security**
- 7-day token expiration
- Secure token storage
- Proper logout functionality

## How to Change Password

1. Login to admin panel
2. Click "Change Password" button (blue button above Sign Out)
3. Enter current password
4. Enter new password (minimum 6 characters)
5. Confirm new password
6. Click "Update Password"

## Production Deployment

### Environment Variables Required:
```env
JWT_SECRET=your_secure_jwt_secret_here_change_in_production
```

### Database Setup:
The admin user table is created automatically during migration:
```bash
npm run migrate:postgres
```

### Security Recommendations:

1. **Change Default Password**: Always change from `admin123` after first login
2. **Strong JWT Secret**: Use a long, random string for JWT_SECRET
3. **HTTPS Only**: Always use HTTPS in production
4. **Regular Updates**: Update passwords regularly
5. **Monitor Access**: Check admin access logs regularly

## Troubleshooting

**Can't Login?**
- Ensure database is running
- Check if admin user exists: `npm run setup-admin`
- Verify JWT_SECRET is set in environment

**Forgot Password?**
- Run `npm run setup-admin` to reset to default password
- Then login and change to a new secure password

**Database Issues?**
- Run migrations: `npm run migrate:postgres`
- Check database connection in logs

## API Endpoints

- `POST /api/auth/login` - Admin login
- `POST /api/auth/update-password` - Change password
- `POST /api/auth/register` - Create new admin (first time only)

## Security Notes

- Passwords are never stored in plain text
- JWT tokens expire after 7 days
- All authentication endpoints use proper error handling
- No sensitive information in client-side code