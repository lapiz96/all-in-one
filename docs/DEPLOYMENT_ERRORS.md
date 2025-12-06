# 🔧 Common Deployment Errors & Solutions

This guide covers the most common errors you might encounter during deployment and their solutions.

---

## 🚨 Pre-Deployment Errors

### Error 1: "node is not recognized as an internal or external command"

**Cause**: Node.js not installed or not in PATH

**Solution**:
1. Download Node.js from https://nodejs.org/
2. Install the LTS version
3. **Important**: Check "Add to PATH" during installation
4. Restart your terminal/PowerShell
5. Verify: `node --version`

---

### Error 2: "npm install" fails with permission errors

**Cause**: Insufficient permissions or corrupted npm cache

**Solution (Windows)**:
```bash
# Run PowerShell as Administrator
npm cache clean --force
npm install
```

**Solution (Alternative)**:
```bash
# Delete node_modules and try again
Remove-Item -Recurse -Force node_modules
npm install
```

---

### Error 3: "npm run dev" shows EADDRINUSE error

**Cause**: Port 3000 already in use

**Solution**:
```bash
# Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or use a different port
npx serve . -p 3001
```

---

## 🐙 GitHub Upload Errors

### Error 4: "git is not recognized as an internal or external command"

**Cause**: Git not installed

**Solution**:
1. Download Git from https://git-scm.com/downloads
2. Install with default settings
3. Restart terminal
4. Verify: `git --version`

---

### Error 5: "Permission denied (publickey)" when pushing to GitHub

**Cause**: Authentication failure

**Solution 1** (Use HTTPS instead):
```bash
# Remove SSH remote
git remote remove origin

# Add HTTPS remote
git remote add origin https://github.com/YOUR_USERNAME/ai-tools-platform.git

# Push
git push -u origin main
```

**Solution 2** (Use Personal Access Token):
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo` (all)
4. Copy token
5. When prompted for password, paste the token

---

### Error 6: "Updates were rejected because the remote contains work"

**Cause**: Remote repository has commits your local doesn't have

**Solution** (CAUTION - only for new repos):
```bash
# Force push (ONLY if you're sure)
git push -u origin main --force
```

**Better Solution**:
```bash
# Pull and merge first
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 🚀 Vercel Deployment Errors

### Error 7: Build fails with "Cannot find module"

**Cause**: Dependencies not properly installed

**Solution**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` locally
3. Commit the new `package-lock.json`:
   ```bash
   git add package-lock.json
   git commit -m "Updated dependencies"
   git push
   ```
4. Re-deploy on Vercel

---

### Error 8: "404 - File or Directory Not Found" on Vercel

**Cause**: `index.html` not in root directory or incorrect build settings

**Solution**:
1. Verify `index.html` is in root directory (not in a subfolder)
2. In Vercel:
   - Settings → General → Build & Development Settings
   - Output Directory: `./` or leave empty
   - Build Command: leave empty
3. Re-deploy

---

### Error 9: CSS/JS files return 404 on deployed site

**Cause**: Incorrect file paths

**Solution**:
Edit your HTML files to use relative paths:

**Wrong**:
```html
<link rel="stylesheet" href="/styles.css">
<script src="/app.js"></script>
```

**Correct**:
```html
<link rel="stylesheet" href="./styles.css">
<script src="./app.js"></script>
```

Push changes:
```bash
git add .
git commit -m "Fixed file paths"
git push
```

---

### Error 10: "SharedArrayBuffer is not defined" in production

**Cause**: Missing COOP/COEP headers (required for AI models)

**Solution**:
Ensure `vercel.json` has these headers:

```json
{
    "version": 2,
    "headers": [
        {
            "source": "/(.*)",
            "headers": [
                {
                    "key": "Cross-Origin-Opener-Policy",
                    "value": "same-origin"
                },
                {
                    "key": "Cross-Origin-Embedder-Policy",
                    "value": "require-corp"
                }
            ]
        }
    ]
}
```

Commit and push:
```bash
git add vercel.json
git commit -m "Added COOP/COEP headers"
git push
```

---

## 🧠 AI Model Errors

### Error 11: "Failed to load ONNX model" in production

**Cause**: Model files not accessible or CORS issues

**Solution**:
1. Ensure model files are committed to Git:
   ```bash
   git add models/
   git commit -m "Added AI model files"
   git push
   ```

2. Verify COOP/COEP headers are set (see Error 10)

3. Check browser console for specific error

---

### Error 12: "WebGPU is not supported" on deployed site

**Cause**: Browser doesn't support WebGPU or wrong backend

**Solution**:
1. Use Chrome or Edge (latest versions)
2. Add fallback to WebGL in your code:

```javascript
// In worker-onnx.js or similar
async function initializeBackend() {
    try {
        // Try WebGPU first
        await ort.env.webgpu.init();
        return 'webgpu';
    } catch (e) {
        console.warn('WebGPU not available, falling back to WebGL');
        return 'webgl';
    }
}
```

---

## 🎨 UI/UX Errors

### Error 13: Service Worker not updating after changes

**Cause**: Browser caching old service worker

**Solution**:
1. Update version number in `sw.js`:
   ```javascript
   const CACHE_VERSION = 'v2.0.1'; // Increment this
   ```

2. Clear cache in browser:
   - F12 → Application → Storage → Clear site data
   - Or hard reload: Ctrl+Shift+R

3. For users, service worker will update automatically within 24 hours

---

### Error 14: PWA install prompt not showing

**Cause**: Missing manifest or service worker not registered

**Solution**:
1. Verify `manifest.json` exists and is linked:
   ```html
   <link rel="manifest" href="./manifest.json">
   ```

2. Check service worker registration:
   ```javascript
   // In app.js
   if ('serviceWorker' in navigator) {
       navigator.serviceWorker.register('./sw.js');
   }
   ```

3. Verify in DevTools:
   - F12 → Application → Manifest
   - F12 → Application → Service Workers

---

## 📊 Analytics & SEO Errors

### Error 15: Google Analytics not tracking

**Cause**: Incorrect Measurement ID or ad blockers

**Solution**:
1. Verify Measurement ID (G-XXXXXXXXXX) is correct
2. Check if code is in `<head>` section
3. Test with ad blocker disabled
4. Wait 24-48 hours for data to appear
5. Use Real-Time reports in GA to verify immediate tracking

---

### Error 16: Sitemap not being indexed by Google

**Cause**: Incorrect sitemap format or not submitted

**Solution**:
1. Validate sitemap at: https://www.xml-sitemaps.com/validate-xml-sitemap.html
2. Ensure all URLs are absolute:
   ```xml
   <loc>https://ai-tools-platform.vercel.app/</loc>
   <!-- Not: <loc>/</loc> -->
   ```
3. Submit in Search Console:
   - Sitemaps → Add new sitemap
   - Enter: `https://your-domain.vercel.app/sitemap.xml`
4. Wait 1-7 days for indexing

---

## 💰 Monetization Errors

### Error 17: AdSense ads not showing

**Cause**: Account pending approval, policy violations, or ad blockers

**Solution**:
1. **Check approval status**:
   - Go to AdSense dashboard
   - Look for approval email (can take 7-30 days)

2. **Verify ad code placement**:
   - Should be in `<body>`, not `<head>`
   - Check for syntax errors

3. **Common reasons for rejection**:
   - Site too new (less than 6 months)
   - Insufficient content
   - Low traffic (need 1000+ daily visitors)
   - Policy violations

4. **Wait 24-48 hours** after adding code for ads to appear

---

### Error 18: Razorpay payment fails in production

**Cause**: Using test keys instead of live keys

**Solution**:
1. In Razorpay Dashboard:
   - Settings → API Keys
   - Switch to "Live Mode"
   - Generate live keys
2. Update in code:
   ```javascript
   key: "rzp_live_XXXXXXXXXX", // Not rzp_test_
   ```
3. Never commit keys to Git (use environment variables)

---

## 🔒 Security Errors

### Error 19: "Blocked by CORS policy"

**Cause**: Cross-origin resource sharing restrictions

**Solution**:
Update `vercel.json` to allow CORS:

```json
{
    "headers": [
        {
            "source": "/(.*)",
            "headers": [
                {
                    "key": "Access-Control-Allow-Origin",
                    "value": "*"
                }
            ]
        }
    ]
}
```

**Note**: Only use `"*"` if resources should be publicly accessible

---

### Error 20: "Mixed Content" warnings (HTTP resources on HTTPS site)

**Cause**: Loading HTTP resources from HTTPS site

**Solution**:
Change all HTTP links to HTTPS:

**Wrong**:
```html
<script src="http://example.com/script.js"></script>
```

**Correct**:
```html
<script src="https://example.com/script.js"></script>
```

Or use protocol-relative URLs:
```html
<script src="//example.com/script.js"></script>
```

---

## 🐞 General Debugging Tips

### Debugging Checklist

1. **Check browser console** (F12 → Console)
   - Red errors indicate problems
   - Yellow warnings may indicate issues

2. **Check Network tab** (F12 → Network)
   - Look for failed requests (red)
   - Check response codes (200 = OK, 404 = Not Found, 500 = Server Error)

3. **Check Vercel logs**:
   - Dashboard → Project → Deployments
   - Click latest deployment → View Function Logs

4. **Test in incognito mode**:
   - Eliminates cache/extension issues
   - Ctrl+Shift+N (Chrome/Edge)

5. **Test on different browsers**:
   - Chrome, Edge, Firefox, Safari
   - Desktop and mobile

6. **Clear all caches**:
   - Browser cache
   - Service worker cache
   - Vercel CDN cache (in dashboard)

---

## 📞 Still Stuck? Get Help

1. **Check documentation**:
   - `DEPLOYMENT.md` - Complete guide
   - `DEPLOYMENT_CHECKLIST.md` - Step-by-step

2. **Search existing issues**:
   - GitHub Issues in your repo
   - Stack Overflow: `[vercel] [your-error]`

3. **Ask for help**:
   - Vercel Discord: https://vercel.com/discord
   - Stack Overflow: Tag `vercel`, `webgpu`, `tensorflowjs`
   - Reddit: r/vercel, r/webdev

4. **Contact support**:
   - Vercel Support: https://vercel.com/support
   - Include: error message, deployment URL, browser console logs

---

## 💡 Prevention Tips

1. **Always test locally first** (`npm run dev`)
2. **Use version control** (commit frequently)
3. **Keep dependencies updated** (`npm update`)
4. **Check browser console** before deploying
5. **Read error messages carefully** (they usually tell you what's wrong!)

---

**Remember**: Most errors have simple solutions. Don't panic, read the error message, and check this guide!

**Last Updated**: December 2025
