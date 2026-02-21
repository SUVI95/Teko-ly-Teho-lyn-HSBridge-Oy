# Quick Production Setup

## What I've Created

✅ API endpoints to initialize database and create admin account
✅ Setup script that can be run automatically

## To Run Setup Automatically

I need your **Vercel production URL**. Once you provide it, I can run the setup.

### Option 1: Provide Your Vercel URL

Tell me your Vercel URL (something like `https://your-project.vercel.app`) and I'll run the setup.

### Option 2: Run It Yourself (Quick)

1. **Get your Vercel URL:**
   - Go to https://vercel.com/dashboard
   - Click your project
   - Copy the URL (e.g., `https://teko-ly-teho-lyn-hsbridge-oy.vercel.app`)

2. **Set SETUP_TOKEN in Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add: `SETUP_TOKEN` = `your-secret-token-here`
   - Generate token: `openssl rand -hex 32`

3. **Run setup:**
   ```bash
   npm run setup-production https://your-project.vercel.app your-secret-token-here
   ```

### Option 3: I'll Do It For You

Just tell me:
1. Your Vercel project URL
2. Or I can try to find it from your GitHub/Vercel connection

Then I'll run:
```bash
npm run setup-production <your-url> <setup-token>
```

This will:
- ✅ Initialize all database tables
- ✅ Create admin account (`suvi@duunijobs.com` / `admin123`)
- ✅ Make admin dashboard accessible

## After Setup

Once setup is complete:
1. Go to your Vercel URL
2. Login: `suvi@duunijobs.com` / `admin123`
3. See "📊 Hallintapaneeli" button in navigation
4. Click to access admin dashboard

---

**What's your Vercel URL?** I can run the setup right now!
