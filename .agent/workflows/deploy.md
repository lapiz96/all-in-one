---
description: How to deploy the AI Tools Platform
---

# Quick Deployment Workflow

This is a simplified workflow. For complete details, see `DEPLOYMENT.md`.

## Prerequisites Check
```bash
node --version    # Should be v18+
npm --version     # Should be 9+
git --version     # Should be 2+
```

## Step 1: Local Testing
```bash
cd "c:\Users\onew2\Desktop\ult web"
npm install
npm run dev
```
Test all features at http://localhost:3000

## Step 2: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: AI Tools Platform v2.0"
git remote add origin https://github.com/YOUR_USERNAME/ai-tools-platform.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Dashboard (Easiest)
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Click "Deploy"
4. Done! Get your URL

### Option B: CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

## Step 4: Post-Deployment
1. Update `sitemap.xml` with your live URL
2. Add Google Analytics (optional)
3. Test live site thoroughly
4. Submit sitemap to Google Search Console

## Step 5: Future Updates
```bash
# Make changes locally
git add .
git commit -m "Your update message"
git push
```
Vercel auto-deploys in ~30 seconds!

---

**Full Guide**: See `DEPLOYMENT.md` for complete instructions, troubleshooting, monetization, SEO, and more.
