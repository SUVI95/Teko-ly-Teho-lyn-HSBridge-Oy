# Setup Production Database - Do This Now

## Step 1: Add SETUP_TOKEN to Vercel (2 minutes)

1. Go to: https://vercel.com/dashboard
2. Click project: `Teko-ly-Teho-lyn-HSBridge-Oy`
3. **Settings** → **Environment Variables**
4. Click **Add New**
5. Add:
   - **Key:** `SETUP_TOKEN`
   - **Value:** `b4f0c6e7422f648fb245dfc52306625f2033744d6d55f6a463d30aa189490a26`
   - Select: Production, Preview, Development
   - Click **Save**

## Step 2: Disable Deployment Protection (1 minute)

1. Still in Vercel Dashboard → Your Project
2. **Settings** → **Deployment Protection**
3. **Disable** or set to **"No Protection"**
4. Click **Save**

## Step 3: Tell Me When Done

Once you've done Steps 1 & 2, tell me "done" and I'll run the setup automatically!

Or run this yourself:

```bash
curl -X POST https://teko-ly-teho-lyn-hs-bridge-7p1pdkxtq-gis-projects-631ab3c9.vercel.app/api/setup/init-db \
  -H "Content-Type: application/json" \
  -H "x-setup-token: b4f0c6e7422f648fb245dfc52306625f2033744d6d55f6a463d30aa189490a26" \
  -d '{"token": "b4f0c6e7422f648fb245dfc52306625f2033744d6d55f6a463d30aa189490a26"}'

curl -X POST https://teko-ly-teho-lyn-hs-bridge-7p1pdkxtq-gis-projects-631ab3c9.vercel.app/api/setup/create-admin \
  -H "Content-Type: application/json" \
  -H "x-setup-token: b4f0c6e7422f648fb245dfc52306625f2033744d6d55f6a463d30aa189490a26" \
  -d '{"token": "b4f0c6e7422f648fb245dfc52306625f2033744d6d55f6a463d30aa189490a26"}'
```

## After Setup:

✅ Database initialized
✅ Admin account created: `suvi@duunijobs.com` / `admin123`
✅ You can login and see admin dashboard button!
