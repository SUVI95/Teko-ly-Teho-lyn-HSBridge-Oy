# Production Setup - One-Time Setup

## Step 1: Set Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these (replace with your real values — never commit secrets):

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/db?sslmode=require

SESSION_SECRET=generate-with-openssl-rand-hex-32

OPENAI_API_KEY=sk-proj-...from-OpenAI-dashboard

ANTHROPIC_API_KEY=sk-ant-api03-...optional-for-Claude-endpoint

NODE_ENV=production

SETUP_TOKEN=your-secret-setup-token-here-change-this

ADMIN_PASSWORD=use-a-strong-password
```

**Important:** Generate a secure SETUP_TOKEN:
```bash
openssl rand -hex 32
```

## Step 2: Initialize Database

After Vercel deploys, call this endpoint ONCE:

### Option A: Using curl (from terminal)

```bash
curl -X POST https://your-project.vercel.app/api/setup/init-db \
  -H "Content-Type: application/json" \
  -H "x-setup-token: your-secret-setup-token-here" \
  -d '{"token": "your-secret-setup-token-here"}'
```

### Option B: Using browser (temporary)

1. Go to: `https://your-project.vercel.app/api/setup/init-db`
2. Use browser console or Postman to POST with header:
   - Header: `x-setup-token: your-secret-setup-token-here`
   - Body: `{"token": "your-secret-setup-token-here"}`

### Option C: Using Vercel CLI

```bash
vercel env pull .env.production
# Edit .env.production to add SETUP_TOKEN
# Then run:
curl -X POST https://your-project.vercel.app/api/setup/init-db \
  -H "x-setup-token: $(grep SETUP_TOKEN .env.production | cut -d '=' -f2)"
```

## Step 3: Create Admin Account

After database is initialized, create admin account:

```bash
curl -X POST https://your-project.vercel.app/api/setup/create-admin \
  -H "Content-Type: application/json" \
  -H "x-setup-token: your-secret-setup-token-here" \
  -d '{"token": "your-secret-setup-token-here"}'
```

This will create/update admin account:
- Email: `suvi@duunijobs.com`
- Password: `admin123` (or whatever you set in ADMIN_PASSWORD)

## Step 4: Test

1. Go to your Vercel URL: `https://your-project.vercel.app`
2. Login as admin: `suvi@duunijobs.com` / `admin123`
3. You should see "📊 Hallintapaneeli" button in navigation
4. Click it to access admin dashboard

## Security Note

**After setup is complete, you can remove or change SETUP_TOKEN** to prevent unauthorized access to setup endpoints.

## Quick Setup Script

Save this as `setup-production.sh`:

```bash
#!/bin/bash

# Set these variables
VERCEL_URL="https://your-project.vercel.app"
SETUP_TOKEN="your-secret-setup-token-here"

echo "Initializing database..."
curl -X POST "$VERCEL_URL/api/setup/init-db" \
  -H "Content-Type: application/json" \
  -H "x-setup-token: $SETUP_TOKEN" \
  -d "{\"token\": \"$SETUP_TOKEN\"}"

echo ""
echo "Creating admin account..."
curl -X POST "$VERCEL_URL/api/setup/create-admin" \
  -H "Content-Type: application/json" \
  -H "x-setup-token: $SETUP_TOKEN" \
  -d "{\"token\": \"$SETUP_TOKEN\"}"

echo ""
echo "✅ Setup complete!"
echo "Login at: $VERCEL_URL/login"
echo "Email: suvi@duunijobs.com"
echo "Password: admin123"
```

Make it executable and run:
```bash
chmod +x setup-production.sh
./setup-production.sh
```
