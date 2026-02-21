# Login Credentials

## Admin Account
**Email:** `suvi@duunijobs.com`  
**Password:** `admin123`  
**⚠️ IMPORTANT:** Change this password after first login!

## Test Student Account
**Email:** `testi.opiskelija@example.com`  
**Password:** `testi123`  
**Name:** Testi Opiskelija

## Setup Instructions

1. **Initialize Database:**
   ```bash
   npm run init-db
   ```

2. **Create Test Accounts:**
   ```bash
   npm run create-test-accounts
   ```
   This will create both admin and test student accounts.

3. **Or Create Admin Only:**
   ```bash
   npm run setup-admin
   ```

4. **Start Server:**
   ```bash
   npm start
   ```

5. **Access:**
   - Login page: `http://localhost:3000/login`
   - Admin dashboard: `http://localhost:3000/admin` (after login as admin)
   - Course feedback: `http://localhost:3000/course-feedback` (after login)

## What Was Changed

### ✅ Removed Share Buttons
- All "📋 Jaa Teams-chattiin" buttons removed from all modules
- Share functions removed (privacy-focused for Finnish users)

### ✅ Added Feedback System
- **"Mitä opit?"** question added to all modules
- **"Opitko jotain uutta?"** question added to all modules
- **End-of-course feedback page** with rating (1-5) and written feedback
- All feedback saved to database
- Admin can view and download all feedback

### ✅ Reflection Boxes Kept
- All reflection boxes remain on every page
- Reflections are saved to database (not localStorage)
- Private and secure

### ✅ Admin Dashboard Updates
- View all feedback
- Download feedback as CSV
- Filter and search feedback
- View feedback statistics

## Feedback Types

1. **what_learned** - "Mitä opit tässä moduulissa?"
2. **learned_new** - "Opitko jotain uutta?"
3. **course_feedback** - End-of-course feedback (rating + text)

## Files Modified

- All module HTML files - Share buttons removed, feedback questions added
- `/public/course-feedback.html` - New end-of-course feedback page
- `/public/js/feedback.js` - Feedback helper functions
- `/routes/feedback.js` - Feedback API routes
- `/routes/admin.js` - Admin feedback endpoints
- `/database/schema.sql` - Feedback table added
