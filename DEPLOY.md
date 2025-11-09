# PhishGuard Deployment Guide

## Quick Start (20 minutes)

### Prerequisites
- ✅ Code is committed to GitHub
- ✅ Production build succeeds (`npm run build`)
- ✅ All environment variables documented

---

## Step 1: Final Pre-Deployment Checks (5 min)

```bash
# 1. Test production build
npm run build

# 2. Verify no errors
npm run lint

# 3. Commit all changes
git add -A
git commit -m "Ready for production deployment"
git push origin main
```

---

## Step 2: Deploy to Vercel (15 min)

### Option A: Vercel CLI (Recommended for Hackathons)

```bash
# 1. Install Vercel CLI globally
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy (from project root)
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N (first time) or Y (if redeploying)
# - Project name? phishguard (or your choice)
# - Directory? ./
# - Override settings? N

# 4. Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add USE_BEDROCK
vercel env add AWS_REGION
vercel env add BEDROCK_MODEL_ID
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
# (Add each variable, paste value when prompted)

# 5. Deploy to production
vercel --prod
```

### Option B: Vercel Dashboard (Easier for first-time)

1. **Go to [vercel.com](https://vercel.com)**
   - Sign in with GitHub

2. **Import Repository**
   - Click "Add New Project"
   - Select your `phishguard` repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Add Environment Variables**
   - Click "Environment Variables" before deploying
   - Add each variable below for **Production**, **Preview**, and **Development**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://kfklclhecvemyyetlqpz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   USE_BEDROCK=1
   AWS_REGION=us-east-1
   BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   ```

   **Optional (for email seeding):**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes for build
   - Get your production URL (e.g., `phishguard.vercel.app`)

---

## Step 3: Verify Deployment (5 min)

### Check Build
- ✅ Build succeeded (green checkmark)
- ✅ No build errors in logs

### Test Production URL
1. **Visit your production URL**
2. **Test Authentication:**
   - Go to `/auth`
   - Enter email, click "Send Magic Link"
   - Check email and click link
   - Should redirect to `/play`

3. **Test Game Flow:**
   - Email displays correctly
   - Can make guesses
   - Verdict modal appears
   - Points/streak update
   - ML assist appears (if enabled)

4. **Test All Pages:**
   - `/play` - Game works
   - `/leaderboard` - Shows data
   - `/profile` - Shows stats
   - `/resources` - Loads correctly

5. **Check Browser Console:**
   - No errors
   - Network requests succeed

---

## Step 4: Post-Deployment (5 min)

### Update README
Add production URL to your README:

```markdown
## Live Demo
🌐 **Production:** https://phishguard.vercel.app
```

### Test Mobile
- Open production URL on phone
- Verify responsive design works
- Test game flow on mobile

### Monitor
- Check Vercel logs for errors
- Check Supabase dashboard for queries
- Verify AWS Bedrock usage (if enabled)

---

## Environment Variables Reference

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGc...` |

### Optional (ML Features)
| Variable | Description | Example |
|----------|-------------|---------|
| `USE_BEDROCK` | Enable ML classification | `1` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `BEDROCK_MODEL_ID` | Claude model ID | `anthropic.claude-3-haiku-20240307-v1:0` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `xxx...` |

### Optional (Admin)
| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | `eyJhbGc...` |

---

## Troubleshooting

### Build Fails
```bash
# Check build locally first
npm run build

# Common fixes:
# - Fix TypeScript errors
# - Check missing dependencies
# - Verify environment variables
```

### App Doesn't Work in Production
1. **Check Environment Variables:**
   - Vercel Dashboard → Settings → Environment Variables
   - Ensure all are set for "Production"

2. **Check Vercel Logs:**
   - Vercel Dashboard → Your Project → Logs
   - Look for runtime errors

3. **Check Browser Console:**
   - Open DevTools → Console
   - Look for client-side errors

4. **Verify Supabase:**
   - Check RLS policies are correct
   - Verify tables exist
   - Check API keys are correct

### ML Not Working
1. **Verify AWS credentials are correct**
2. **Check AWS Bedrock access is approved**
3. **Check Vercel function logs for errors**
4. **Verify model ID is correct**

### Authentication Issues
1. **Check Supabase URL redirects:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL to "Redirect URLs"

2. **Verify magic link email settings:**
   - Check email templates in Supabase
   - Verify email service is configured

---

## Quick Commands

```bash
# Deploy to production (CLI)
vercel --prod

# View deployment logs
vercel logs

# List environment variables
vercel env ls

# Add environment variable
vercel env add VARIABLE_NAME

# Remove environment variable
vercel env rm VARIABLE_NAME production
```

---

## Success Checklist

- [ ] Production build succeeds
- [ ] Production URL works
- [ ] Authentication works
- [ ] Game flow works end-to-end
- [ ] ML assist appears (if enabled)
- [ ] Leaderboard updates
- [ ] Profile shows stats
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Fast load times

---

## Next Steps

1. **Custom Domain (Optional):**
   - Vercel Dashboard → Settings → Domains
   - Add your domain

2. **Analytics (Optional):**
   - Enable Vercel Analytics
   - Add Google Analytics

3. **Monitoring (Optional):**
   - Set up Sentry for error tracking
   - Configure uptime monitoring

---

**🎉 You're deployed!** Share your production URL with judges/users.

