# Tekoälykurssi - Learning Platform

A student learning platform with progress tracking, authentication, and PostgreSQL database integration.

## Features

- 🔐 User authentication (register/login)
- 📊 Progress tracking per module and section
- ✅ Checklist completion tracking
- 💾 Persistent progress storage in PostgreSQL
- 🎯 Resume where you left off

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://neondb_owner:npg_SGLOZcV8g9IW@ep-icy-river-ag1c7fpx-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-secret-key-change-this-in-production
```

### 3. Initialize Database

```bash
npm run init-db
```

This will create all necessary tables in your PostgreSQL database.

### 4. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will run on `http://localhost:3000`

## Usage

1. **Register/Login**: Visit `http://localhost:3000/login` or `http://localhost:3000/register`
2. **Access Modules**: After login, you'll be redirected to the dashboard
3. **Track Progress**: Your progress is automatically saved as you go through modules
4. **Resume Learning**: Come back anytime and continue where you left off

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Progress
- `GET /api/progress/module/:moduleId` - Get progress for a module
- `POST /api/progress/module/:moduleId/section/:sectionId` - Update section progress
- `POST /api/progress/module/:moduleId/checklist/:itemId` - Update checklist item
- `GET /api/progress/summary` - Get all progress summary

## Database Schema

- `users` - User accounts
- `student_progress` - Section-level progress tracking
- `checklist_items` - Checklist item completion
- `sessions` - Authentication sessions

## Project Structure

```
├── database/
│   ├── schema.sql          # Database schema
│   ├── init.js             # Database initialization script
│   └── db.js               # Database connection
├── middleware/
│   └── auth.js             # Authentication middleware
├── routes/
│   ├── auth.js             # Authentication routes
│   └── progress.js         # Progress tracking routes
├── public/
│   ├── index.html          # Dashboard
│   ├── login.html          # Login page
│   └── register.html       # Registration page
├── server.js               # Main server file
└── package.json            # Dependencies
```

## Notes

- Sessions are stored in the database and expire after 30 days
- Passwords are hashed using bcrypt
- Progress is tracked automatically as users navigate through modules
- All API endpoints require authentication except `/api/auth/*`
