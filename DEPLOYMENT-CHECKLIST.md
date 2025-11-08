# PhishGuard - Complete Deployment Checklist

## ✅ What You've Already Completed

### Core Application
- [x] **Next.js App Router** - Fully set up with TypeScript
- [x] **Authentication** - Supabase magic link auth working
- [x] **Database** - Tables created (profiles, emails, guesses, leaderboard)
- [x] **Email Seed Data** - 22 diverse emails (11 phishing, 11 legitimate)
- [x] **Game Flow** - Play page with guess submission
- [x] **Heuristic Analysis** - Rule-based phishing detection
- [x] **ML Integration** - Bedrock/Claude 3 Haiku working
- [x] **UI Components** - EmailViewer, GuessButtons, VerdictModal
- [x] **Pages** - Landing, Play, Leaderboard, Profile, Resources
- [x] **API Routes** - All endpoints implemented and working
- [x] **Scoring System** - Points, streaks, accuracy tracking

### Infrastructure
- [x] **Supabase** - Configured and connected
- [x] **AWS Bedrock** - Integrated and tested
- [x] **Environment Variables** - Local setup complete
- [x] **Dependencies** - All packages installed

## 🚀 What's Left for Deployment

### 1. Final Testing (30 minutes)

#### Test Locally
- [ ] **Start dev server:**
  ```bash
  npm run dev
  ```

- [ ] **Test Authentication:**
  - [ ] Go to http://localhost:3000
  - [ ] Enter email, click "Send magic link"
  - [ ] Check email and click link
  - [ ] Verify redirect to `/play`

- [ ] **Test Game Flow:**
  - [ ] Email displays correctly
  - [ ] Can make guesses (Phish/Real buttons work)
  - [ ] Verdict modal appears with results
  - [ ] "Model Assist" section appears (if Bedrock enabled)
  - [ ] Points and streak update correctly
  - [ ] Can click "Next" to get next email

- [ ] **Test All Pages:**
  - [ ] `/play` - Game works
  - [ ] `/leaderboard` - Shows top 10 users
  - [ ] `/profile` - Shows user stats
  - [ ] `/resources` - Shows educational links

- [ ] **Test Edge Cases:**
  - [ ] No emails left (should redirect to leaderboard)
  - [ ] ML fails gracefully (game still works)
  - [ ] Invalid guess handling
  - [ ] Logout works

- [ ] **Check Browser Console:**
  - [ ] No errors in console
  - [ ] No warnings (except minor ones)
  - [ ] Network requests succeed

#### Test Production Build
- [ ] **Build the app:**
  ```bash
  npm run build
  ```
- [ ] **Check for build errors:**
  - [ ] No TypeScript errors
  - [ ] No missing dependencies
  - [ ] All routes compile successfully

- [ ] **Test production build locally:**
  ```bash
  npm run start
  ```
  - [ ] App runs on http://localhost:3000
  - [ ] All pages load correctly

### 2. Environment Variables Setup (15 minutes)

#### For Vercel Deployment

You need to add these in Vercel Dashboard → Your Project → Settings → Environment Variables:

**Required:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://kfklclhecvemyyetlqpz.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)

**Optional (for ML):**
- [ ] `USE_BEDROCK` = `1`
- [ ] `AWS_REGION` = `us-east-1`
- [ ] `BEDROCK_MODEL_ID` = `anthropic.claude-3-haiku-20240307-v1:0`
- [ ] `AWS_ACCESS_KEY_ID` = (your access key)
- [ ] `AWS_SECRET_ACCESS_KEY` = (your secret key)

**For Email Seeding (if needed):**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (only if you need to seed more emails later)

### 3. Database Verification (10 minutes)

- [ ] **Check Supabase Tables:**
  - [ ] `profiles` table exists
  - [ ] `emails` table exists (with 22 emails)
  - [ ] `guesses` table exists
  - [ ] `leaderboard` table exists (if separate)

- [ ] **Verify RLS Policies:**
  - [ ] Users can read emails
  - [ ] Users can insert their own guesses
  - [ ] Users can read their own profile
  - [ ] Service role can insert/update emails

- [ ] **Test Database Queries:**
  - [ ] Run a test query in Supabase SQL Editor
  - [ ] Verify emails are seeded: `SELECT COUNT(*) FROM emails;`
  - [ ] Should return 22

### 4. Code Quality & Cleanup (20 minutes)

- [ ] **Remove unused files:**
  - [ ] Check for any test/temp files
  - [ ] Remove console.logs (except error logging)
  - [ ] Clean up commented code

- [ ] **Verify .gitignore:**
  - [ ] `.env.local` is ignored
  - [ ] `.env.seed` is ignored
  - [ ] `node_modules` is ignored
  - [ ] `.next` is ignored

- [ ] **Check for secrets:**
  - [ ] No API keys in code
  - [ ] No credentials committed
  - [ ] All secrets in `.env.local` only

- [ ] **Lint check:**
  ```bash
  npm run lint
  ```
  - [ ] Fix any linting errors
  - [ ] Fix any TypeScript errors

### 5. Documentation (15 minutes)

- [ ] **README.md** - Already comprehensive ✅
- [ ] **Update README with:**
  - [ ] Deployment instructions
  - [ ] Production URL (after deployment)
  - [ ] Known issues/limitations (if any)

- [ ] **Create DEPLOY.md** (optional):
  - [ ] Quick deployment guide
  - [ ] Environment variables reference
  - [ ] Troubleshooting common issues

### 6. Vercel Deployment (20 minutes)

#### Step 1: Push to GitHub
- [ ] **Commit all changes:**
  ```bash
  git add -A
  git commit -m "Ready for deployment"
  git push origin main
  ```

#### Step 2: Deploy to Vercel
- [ ] **Go to Vercel:**
  - Visit: https://vercel.com
  - Sign in with GitHub

- [ ] **Import Repository:**
  - Click "Add New Project"
  - Select your GitHub repository
  - Click "Import"

- [ ] **Configure Project:**
  - Framework Preset: **Next.js** (auto-detected)
  - Root Directory: `./` (default)
  - Build Command: `npm run build` (default)
  - Output Directory: `.next` (default)

- [ ] **Add Environment Variables:**
  - Click "Environment Variables"
  - Add all variables from section 2 above
  - Make sure to add for **Production**, **Preview**, and **Development**

- [ ] **Deploy:**
  - Click "Deploy"
  - Wait for build to complete (2-5 minutes)

#### Step 3: Verify Deployment
- [ ] **Check deployment:**
  - [ ] Build succeeds (green checkmark)
  - [ ] No build errors
  - [ ] Deployment URL works

- [ ] **Test Production:**
  - [ ] Visit production URL
  - [ ] Test authentication
  - [ ] Test game flow
  - [ ] Test all pages
  - [ ] Verify ML works (if enabled)

### 7. Post-Deployment (15 minutes)

- [ ] **Update README:**
  - [ ] Add production URL
  - [ ] Add deployment status badge (optional)

- [ ] **Test Production Features:**
  - [ ] Authentication works
  - [ ] Game works end-to-end
  - [ ] Leaderboard updates
  - [ ] ML assist appears (if enabled)
  - [ ] Mobile responsive (test on phone)

- [ ] **Monitor:**
  - [ ] Check Vercel logs for errors
  - [ ] Check Supabase logs
  - [ ] Check AWS CloudWatch (if using Bedrock)

- [ ] **Performance:**
  - [ ] Page load times acceptable
  - [ ] API responses fast
  - [ ] No memory leaks

## 📋 Quick Execution Guide

### Right Now (30 min)
1. **Test locally:**
   ```bash
   npm run dev
   ```
   - Test all features
   - Fix any bugs

2. **Build test:**
   ```bash
   npm run build
   ```
   - Fix any build errors

### Before Deployment (15 min)
1. **Commit everything:**
   ```bash
   git add -A
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Prepare environment variables list:**
   - Copy all from `.env.local`
   - Ready to paste into Vercel

### Deploy (20 min)
1. **Go to Vercel → Import project**
2. **Add environment variables**
3. **Deploy**
4. **Test production URL**

## 🎯 Priority Order

**Must Do:**
1. ✅ Test locally (all features work)
2. ✅ Build succeeds (`npm run build`)
3. ✅ Push to GitHub
4. ✅ Deploy to Vercel
5. ✅ Add environment variables
6. ✅ Test production

**Should Do:**
- Clean up code
- Fix linting errors
- Update documentation

**Nice to Have:**
- Performance optimization
- Analytics setup
- Error monitoring

## ⚠️ Common Issues & Fixes

**Build fails:**
- Check TypeScript errors: `npm run build`
- Fix missing imports
- Check environment variables

**Deployment fails:**
- Check Vercel build logs
- Verify all env vars are set
- Check Node.js version (should be 18+)

**App doesn't work in production:**
- Check environment variables in Vercel
- Verify Supabase RLS policies
- Check browser console for errors
- Check Vercel function logs

**ML not working:**
- Verify Bedrock env vars in Vercel
- Check AWS credentials are correct
- Verify model access is approved
- Check Vercel function logs for errors

## 🎉 Success Criteria

Your app is ready when:
- ✅ All pages load without errors
- ✅ Authentication works
- ✅ Game flow works end-to-end
- ✅ Leaderboard updates correctly
- ✅ ML assist appears (if enabled)
- ✅ Mobile responsive
- ✅ No console errors
- ✅ Production build succeeds

## 📝 Final Checklist Before Demo

- [ ] Production URL works
- [ ] Can sign in
- [ ] Can play game
- [ ] ML assist appears
- [ ] Leaderboard shows data
- [ ] Profile shows stats
- [ ] Resources page loads
- [ ] Mobile view works
- [ ] No errors in console
- [ ] Fast load times

---

**Estimated Total Time: 2-3 hours**

**You're 90% done!** Just need to test, deploy, and verify. 🚀

