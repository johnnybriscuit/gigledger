# 🚀 GigLedger Deployment Workflow

## ✅ Current Setup

Your app is deployed with **automatic continuous deployment**:

- **Live URL**: Your Vercel URL
- **GitHub Repo**: https://github.com/johnnybriscuit/gigledger
- **Auto-Deploy**: ✅ Enabled (push to main → auto-deploys)

---

## 🔄 How to Deploy Changes

### Method 1: Quick Deploy Script (Recommended)

```bash
# Make your changes, then:
./deploy.sh "Description of what you changed"

# Example:
./deploy.sh "fix: Fix dashboard chart colors"
./deploy.sh "feat: Add export to PDF feature"
```

### Method 2: Manual Git Commands

```bash
# 1. Make changes to your code

# 2. Stage changes
git add .

# 3. Commit with descriptive message
git commit -m "fix: Fix bug in expense calculation"

# 4. Push to GitHub
git push

# 5. Wait ~2-3 minutes for Vercel to deploy
```

### Method 3: Emergency Hotfix

```bash
# For critical bugs, push directly:
git add .
git commit -m "hotfix: Critical auth bug"
git push
```

---

## ⏱️ Deployment Timeline

```
Push to GitHub (instant)
         ↓
Vercel detects push (~5 seconds)
         ↓
Vercel starts build (~30 seconds)
         ↓
Build completes (~1-2 minutes)
         ↓
Deploy to production (~30 seconds)
         ↓
Live! ✅ (Total: 2-3 minutes)
```

---

## 📊 Monitoring Deployments

### Check Status:
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your `gigledger` project
3. See deployment status:
   - 🟡 **Building** - In progress
   - 🟢 **Ready** - Live!
   - 🔴 **Failed** - Check logs

### View Logs:
- Click any deployment
- Click "View Function Logs"
- See build output and errors

### Get Notifications:
- Vercel emails you on success/failure
- Add Slack/Discord in Project Settings

---

## 🧪 Testing Before Deploy

### Always Test Locally First:

```bash
# 1. Start dev server
npm start

# 2. Test in browser
# Press 'w' for web

# 3. Test all changes work

# 4. Then deploy
./deploy.sh "Your changes"
```

### Test Checklist:
- [ ] App loads without errors
- [ ] New feature works as expected
- [ ] Existing features still work
- [ ] No console errors
- [ ] Mobile view looks good (if applicable)

---

## 🔧 Environment Variables

### To Update Environment Variables:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Settings → Environment Variables
4. Add/Edit variables
5. **Important**: Redeploy after changing env vars

```bash
# Trigger redeploy:
git commit --allow-empty -m "chore: Trigger redeploy"
git push
```

### Current Env Vars:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_DEFAULT_MILEAGE_RATE`

---

## 🚨 Rollback (If Something Breaks)

### Quick Rollback:

1. Go to Vercel Dashboard
2. Click your project
3. Find previous working deployment
4. Click "..." → "Promote to Production"
5. Previous version is live instantly!

### Or Rollback via Git:

```bash
# See recent commits
git log --oneline -10

# Revert to previous commit
git revert HEAD
git push

# Or reset to specific commit (careful!)
git reset --hard COMMIT_HASH
git push --force
```

---

## 📝 Commit Message Best Practices

Use conventional commits:

```bash
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

Examples:
```bash
git commit -m "feat: Add PDF export to dashboard"
git commit -m "fix: Fix tax calculation rounding error"
git commit -m "docs: Update README with new features"
git commit -m "style: Improve mobile responsive layout"
```

---

## 🎯 Common Workflows

### Adding a New Feature:

```bash
# 1. Create feature branch (optional)
git checkout -b feature/new-chart

# 2. Make changes and test locally
npm start

# 3. Commit and push
git add .
git commit -m "feat: Add new expense trend chart"
git push

# 4. Merge to main (if using branches)
git checkout main
git merge feature/new-chart
git push
```

### Fixing a Bug:

```bash
# 1. Fix the bug
# 2. Test locally
npm start

# 3. Deploy fix
./deploy.sh "fix: Fix date range filter bug"
```

### Updating Dependencies:

```bash
# 1. Update packages
npm update

# 2. Test locally
npm start

# 3. Deploy
git add package.json package-lock.json
git commit -m "chore: Update dependencies"
git push
```

---

## 🔍 Troubleshooting Deployments

### Build Fails:

**Check Vercel logs:**
1. Go to failed deployment
2. Click "View Function Logs"
3. Look for error messages

**Common issues:**
- Missing environment variables
- TypeScript errors
- Missing dependencies
- Build command wrong

**Fix:**
```bash
# Test build locally
npx expo export --platform web

# If it works locally, check Vercel settings
```

### Deploy Succeeds but App Broken:

**Check browser console:**
- Open DevTools (F12)
- Look for errors
- Check Network tab for failed requests

**Common issues:**
- Environment variables not set
- Supabase auth URLs not updated
- API keys missing

### Changes Not Showing:

**Clear cache:**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try incognito mode

**Check deployment:**
- Verify deployment succeeded in Vercel
- Check deployment timestamp matches your push

---

## 📱 Mobile Updates (Expo Go)

If you also published to Expo:

```bash
# Publish updates
npx expo publish

# Users get updates automatically next time they open app
```

**Note**: For Expo Go, users need to close and reopen the app to get updates.

---

## 🎉 Quick Reference

### Daily Workflow:
```bash
# Make changes → Test → Deploy
npm start              # Test locally
./deploy.sh "message"  # Deploy to production
```

### Check Status:
- Vercel Dashboard: [vercel.com/dashboard](https://vercel.com/dashboard)
- Live Site: Your Vercel URL
- GitHub: [github.com/johnnybriscuit/gigledger](https://github.com/johnnybriscuit/gigledger)

### Emergency:
```bash
# Rollback in Vercel Dashboard
# Or revert commit:
git revert HEAD && git push
```

---

## 💡 Pro Tips

1. **Always test locally first** - Catch bugs before they go live
2. **Use descriptive commit messages** - Makes rollback easier
3. **Deploy small changes frequently** - Easier to debug
4. **Monitor Vercel dashboard** - Catch failures quickly
5. **Keep environment variables in sync** - Local and production

---

## 📞 Need Help?

**Build failing?**
- Check Vercel logs
- Test build locally: `npx expo export --platform web`
- Verify environment variables

**App broken after deploy?**
- Rollback in Vercel Dashboard
- Check browser console
- Verify Supabase connection

**Changes not showing?**
- Hard refresh browser
- Check deployment succeeded
- Clear cache

---

**Your deployment is now on autopilot!** 🚀  
Just push to GitHub and Vercel handles the rest.

