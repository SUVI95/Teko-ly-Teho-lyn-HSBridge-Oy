# Setup Instructions for Authentication & Admin Dashboard

## What Was Implemented

### 1. Database Schema Updates
- Added `is_admin` column to `users` table
- Created `reflections` table to store user reflections/feedback
- Created `closing_actions` table for Module 10 closing actions
- Added indexes for performance

### 2. Authentication System
- ✅ Login page (`/login`) - matches platform design
- ✅ Registration page (`/register`) - matches platform design  
- ✅ Password reset functionality
- ✅ Session management with cookies
- ✅ Protected routes (index page requires login)

### 3. Reflection System
- ✅ API endpoints for saving/loading reflections (`/api/reflections`)
- ✅ Shared JavaScript helper (`/public/js/reflections.js`)
- ✅ All modules updated to use API instead of localStorage
- ✅ Module 10 closing actions saved to database

### 4. Admin Dashboard
- ✅ Admin dashboard at `/admin` (admin-only access)
- ✅ View all reflections with search/filter
- ✅ View all closing actions
- ✅ Download reflections as CSV
- ✅ Download closing actions as CSV
- ✅ Dashboard statistics

### 5. Admin User Setup
- ✅ Script to create admin user: `npm run setup-admin`
- ✅ Admin email: `suvi@duunijobs.com`
- ✅ Default password: `admin123` (change after first login!)

## Setup Steps

### 1. Initialize Database
```bash
npm run init-db
```
This will create all necessary tables including the new `reflections` and `closing_actions` tables.

### 2. Create Admin User
```bash
npm run setup-admin
```
Or set `ADMIN_PASSWORD` environment variable:
```bash
ADMIN_PASSWORD=your-secure-password npm run setup-admin
```

### 3. Start Server
```bash
npm start
# or for development
npm run dev
```

### 4. Access Admin Dashboard
1. Login at `/login` with `suvi@duunijobs.com` and your admin password
2. Navigate to `/admin` to access the dashboard
3. Or click "Hallintapaneeli" link in the navigation (visible to admins)

## Features

### For Students
- Must register and login to access the platform
- Reflections are automatically saved to database
- Can continue where they left off (reflections loaded on page load)

### For Admin
- View all student reflections
- Filter reflections by module
- Search reflections by text, email, or name
- Download data as CSV for analysis
- View dashboard statistics

## API Endpoints

### Reflections
- `POST /api/reflections/save` - Save reflection (authenticated)
- `GET /api/reflections/module/:moduleId` - Get user's reflection for module (authenticated)
- `POST /api/reflections/closing-action` - Save closing action (authenticated)

### Admin (admin-only)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/reflections` - All reflections
- `GET /api/admin/closing-actions` - All closing actions
- `GET /api/admin/users` - All users
- `GET /api/admin/download/reflections` - Download reflections CSV
- `GET /api/admin/download/closing-actions` - Download closing actions CSV

## Security Notes

1. **Change Admin Password**: The default admin password is `admin123`. Change it immediately after first login!

2. **Environment Variables**: Make sure your `.env` file has:
   ```
   DATABASE_URL=your-database-url
   ADMIN_PASSWORD=your-secure-password (optional, defaults to admin123)
   ```

3. **Session Security**: Sessions are stored in database and expire after 30 days. Cookies are httpOnly and secure in production.

## Troubleshooting

### Database Connection Issues
If you get SSL errors, check your `DATABASE_URL` in `.env`. Some databases require SSL, others don't.

### Admin Dashboard Not Accessible
1. Make sure you ran `npm run setup-admin`
2. Check that your user has `is_admin = TRUE` in database
3. Make sure you're logged in

### Reflections Not Saving
1. Check browser console for errors
2. Make sure user is logged in (check `/api/auth/me`)
3. Check server logs for API errors

## Next Steps

1. ✅ Database schema updated
2. ✅ Authentication implemented
3. ✅ Admin dashboard created
4. ✅ All modules updated
5. ⏳ Run `npm run init-db` to create tables
6. ⏳ Run `npm run setup-admin` to create admin user
7. ⏳ Test login/registration flow
8. ⏳ Test reflection saving
9. ⏳ Test admin dashboard

## Files Modified/Created

### Created
- `/public/admin-dashboard.html` - Admin dashboard
- `/public/js/reflections.js` - Shared reflection helper
- `/routes/reflections.js` - Reflection API routes
- `/routes/admin.js` - Admin API routes
- `/scripts/setup-admin.js` - Admin user setup script
- `/scripts/update-reflections.js` - Module update script

### Modified
- `/database/schema.sql` - Added reflections tables and admin column
- `/server.js` - Added new routes
- `/public/index.html` - Requires authentication
- `/public/login.html` - Added redirect handling
- `/public/register.html` - Updated to match login design
- All module HTML files - Updated to use reflection API
