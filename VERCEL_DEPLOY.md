# Vercel Deployment Guide

## Prerequisites
1. Vercel account (sign up at https://vercel.com)
2. GitHub repository connected to Vercel

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository: `SUVI95/Teko-ly-Teho-lyn-HSBridge-Oy`
3. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
4. Add Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: A random secret string (generate with: `openssl rand -hex 32`)
   - `OPENAI_API_KEY`: Your OpenAI API key (get from https://platform.openai.com/api-keys) — no extra spaces or quotes
   - `ANTHROPIC_API_KEY`: Optional; required only for `/api/ai/claude`
   - `NODE_ENV`: `production`
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add SESSION_SECRET
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add NODE_ENV

# Deploy to production
vercel --prod
```

## Environment Variables Required

Add these in Vercel Dashboard → Project Settings → Environment Variables:

- `DATABASE_URL`: Your Neon (or other) Postgres URL
- `SESSION_SECRET`: Random string (e.g. `openssl rand -hex 32`)
- `OPENAI_API_KEY`: From https://platform.openai.com/api-keys (used by `/api/ai/chat` and homework generators)
- `ANTHROPIC_API_KEY`: Optional; from Anthropic console for `/api/ai/claude`
- `NODE_ENV`: `production`

## Post-Deployment

1. Initialize database tables by running:
   ```bash
   npm run init-db
   ```
   Or manually run the SQL from `database/schema.sql` in your database.

2. Your app will be available at: `https://your-project.vercel.app`

## Troubleshooting

- If you see 404 errors, check that all environment variables are set
- Database connection issues: Verify DATABASE_URL is correct
- CORS errors: Check that VERCEL_URL is set correctly
