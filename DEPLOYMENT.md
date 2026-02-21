# Deployment Guide for Clients

## Your Production URL

Once deployed, your clients will access the platform at:
**`https://your-project-name.vercel.app`**

(Replace `your-project-name` with your actual Vercel project name)

## Step 1: Set Up Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `Teko-ly-Teho-lyn-HSBridge-Oy`
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

### Required Environment Variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_SGLOZcV8g9IW@ep-icy-river-ag1c7fpx-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

```
SESSION_SECRET=fa9fd10339fba621a8354f947ad4531990eded7653c2fa059a345d07daeecb51
```

```
OPENAI_API_KEY=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
```

```
NODE_ENV=production
```

5. Make sure to select **Production**, **Preview**, and **Development** for each variable
6. Click **Save**

## Step 2: Initialize Database on Production

After deployment, you need to initialize the database. You can do this by:

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Run database initialization
vercel env pull .env.production
# Then run: npm run init-db
```

### Option B: Using a One-Time Script

Create a temporary script that runs on deployment:

1. Add this to your `package.json` scripts:
```json
"postinstall": "node -e \"if(process.env.VERCEL){require('./database/init.js')}\""
```

**OR** manually run database setup after first deployment.

## Step 3: Create Admin Account on Production

After the database is initialized, create the admin account:

```bash
# Set environment variables locally
export DATABASE_URL="your-production-database-url"
export ADMIN_PASSWORD="your-secure-admin-password"

# Run setup script
npm run setup-admin
```

Or manually create via SQL if you have database access.

## Step 4: Deploy

Your project should auto-deploy when you push to GitHub. Or manually deploy:

```bash
vercel --prod
```

## Step 5: Get Your Production URL

1. Go to Vercel Dashboard
2. Click on your project
3. You'll see the production URL: `https://your-project-name.vercel.app`
4. **This is the URL you give to your clients!**

## Step 6: Test Production Deployment

1. Visit your production URL
2. Try registering a new account
3. Login as admin (if you created the account)
4. Test the admin dashboard

## Important Notes

- **Database**: Make sure your Neon database allows connections from Vercel IPs
- **Admin Account**: You need to create the admin account (`suvi@duunijobs.com`) on production separately
- **HTTPS**: Vercel automatically provides HTTPS
- **Custom Domain**: You can add a custom domain in Vercel Settings → Domains

## Troubleshooting

### If clients see "Log in to Vercel"
- This means they're accessing a protected/preview deployment
- Make sure you're giving them the **Production** URL, not a preview URL
- Check Vercel project settings → ensure it's public

### If login doesn't work
- Check environment variables are set correctly
- Verify database is accessible from Vercel
- Check Vercel function logs for errors

### If database errors occur
- Make sure `DATABASE_URL` is set in Vercel
- Verify database allows connections from Vercel
- Check database initialization ran successfully

## Quick Deploy Checklist

- [ ] Environment variables set in Vercel
- [ ] Database initialized
- [ ] Admin account created
- [ ] Production URL tested
- [ ] Share production URL with clients
