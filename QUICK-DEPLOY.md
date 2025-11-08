# Quick Deployment Guide - Execute These Steps

## 🎯 Current Status: ~90% Complete

### ✅ Already Done
- All code implemented
- Database set up
- Bedrock integrated and tested
- 22 emails seeded
- All pages working

### ⏳ What's Left (2-3 hours)
1. Final testing (30 min)
2. Build verification (10 min)
3. Deploy to Vercel (20 min)
4. Production testing (15 min)

---

## 🚀 Step-by-Step Execution

### STEP 1: Test Locally (15 minutes)

```bash
# Start dev server
npm run dev
```

**Test Checklist:**
- [ ] Open http://localhost:3000
- [ ] Sign in with email (magic link)
- [ ] Play page loads with email
- [ ] Make a guess (Phish/Real)
- [ ] Verdict modal appears
- [ ] "Model Assist" section shows (if Bedrock enabled)
- [ ] Click "Next" → next email loads
- [ ] Check leaderboard page
- [ ] Check profile page
- [ ] Check resources page
- [ ] No errors in browser console (F12)

**If errors found:**
- Fix them before proceeding
- Test again until everything works

---

### STEP 2: Build Test (10 minutes)

```bash
# Test production build
npm run build
```

**Expected Output:**
- ✅ No TypeScript errors
- ✅ No missing dependencies
- ✅ Build completes successfully
- ✅ Shows "Route (app)" for all pages

**If build fails:**
- Read error messages
- Fix TypeScript errors
- Fix missing imports
- Run `npm run build` again

**Test production build locally:**
```bash
npm run start
```
- [ ] Visit http://localhost:3000
- [ ] All pages work
- [ ] No runtime errors

---

### STEP 3: Commit & Push (5 minutes)

```bash
# Stage all changes
git add -A

# Commit
git commit -m "Ready for production deployment - All features complete"

# Push to GitHub
git push origin main
```

**Verify:**
- [ ] All files committed
- [ ] Pushed to GitHub successfully
- [ ] No sensitive files in commit (check .gitignore)

---

### STEP 4: Deploy to Vercel (20 minutes)

#### 4a. Create Vercel Project

1. **Go to Vercel:**
   - Visit: https://vercel.com
   - Sign in with GitHub

2. **Import Repository:**
   - Click "Add New Project"
   - Select your repository: `PhishGuard`
   - Click "Import"

3. **Configure (Auto-detected):**
   - Framework: Next.js ✅
   - Root Directory: `./` ✅
   - Build Command: `npm run build` ✅
   - Output Directory: `.next` ✅
   - **Don't click Deploy yet!**

#### 4b. Add Environment Variables

**Click "Environment Variables" and add these:**

**Required (Supabase):**
```
NEXT_PUBLIC_SUPABASE_URL
Value: https://kfklclhecvemyyetlqpz.supabase.co
Environment: Production, Preview, Development

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: (your anon key from .env.local)
Environment: Production, Preview, Development
```

**Optional (Bedrock - if you want ML):**
```
USE_BEDROCK
Value: 1
Environment: Production, Preview, Development

AWS_REGION
Value: us-east-1
Environment: Production, Preview, Development

BEDROCK_MODEL_ID
Value: anthropic.claude-3-haiku-20240307-v1:0
Environment: Production, Preview, Development

AWS_ACCESS_KEY_ID
Value: AKIAUUL4YKKCPT4OCSY4
Environment: Production, Preview, Development

AWS_SECRET_ACCESS_KEY
Value: (your secret key from .env.local)
Environment: Production, Preview, Development
```

**Important:**
- Add each variable separately
- Select all 3 environments (Production, Preview, Development)
- Click "Save" after each variable

#### 4c. Deploy

1. **Click "Deploy"**
2. **Wait for build** (2-5 minutes)
3. **Watch build logs:**
   - Should see "Building..." 
   - Then "Compiling..."
   - Finally "Deployed" ✅

**If build fails:**
- Check build logs
- Look for error messages
- Common issues:
  - Missing env vars → Add them
  - TypeScript errors → Fix locally, push again
  - Build timeout → Check for infinite loops

---

### STEP 5: Test Production (15 minutes)

1. **Get Production URL:**
   - Vercel will show: `https://phishguard-xxx.vercel.app`
   - Copy this URL

2. **Test Everything:**
   - [ ] Visit production URL
   - [ ] Landing page loads
   - [ ] Sign in works (magic link)
   - [ ] Play page works
   - [ ] Can make guesses
   - [ ] Verdict modal appears
   - [ ] ML assist shows (if enabled)
   - [ ] Leaderboard works
   - [ ] Profile works
   - [ ] Resources page works
   - [ ] Mobile view works (test on phone)
   - [ ] No console errors

3. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Check for any errors
   - Should see successful API calls

---

## 🎉 You're Done!

### Final Checklist:
- [ ] Production URL works
- [ ] All features work in production
- [ ] No errors in console
- [ ] Mobile responsive
- [ ] ML assist appears (if enabled)
- [ ] Fast load times

### Share Your App:
- Production URL: `https://phishguard-xxx.vercel.app`
- Add to README.md
- Share with judges/demo!

---

## 🆘 Troubleshooting

**Build fails:**
```bash
# Fix locally first
npm run build
# Fix any errors
git add -A && git commit -m "Fix build errors" && git push
# Vercel will auto-redeploy
```

**App doesn't work:**
- Check environment variables in Vercel
- Check Vercel function logs
- Check browser console
- Verify Supabase connection

**ML not working:**
- Check Bedrock env vars in Vercel
- Check Vercel function logs for AWS errors
- Verify model access is approved

**Need help?**
- Check `DEPLOYMENT-CHECKLIST.md` for detailed steps
- Check Vercel docs: https://vercel.com/docs
- Check build logs in Vercel dashboard

---

## ⏱️ Time Estimate

- **Testing:** 15 min
- **Build:** 10 min  
- **Commit:** 5 min
- **Deploy:** 20 min
- **Production Test:** 15 min

**Total: ~1 hour** 🚀

---

## 📝 Quick Command Reference

```bash
# Test locally
npm run dev

# Test build
npm run build
npm run start

# Commit & push
git add -A
git commit -m "Ready for deployment"
git push origin main

# Test Bedrock (optional)
npm run test:bedrock
```

---

**You're almost there! Just follow these steps and you'll be live! 🎉**

