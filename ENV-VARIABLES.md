# Environment Variables Guide

## Quick Deployment Steps

### 1. Deploy to Vercel (Choose One Method)

**Option A: Vercel Dashboard (Easiest)**
1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click "Add New Project" → Import your `PhishGuard` repository
3. Before deploying, add environment variables (see below)
4. Click "Deploy"

**Option B: Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel
# Follow prompts, then add env vars:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... (add each one)
vercel --prod
```

---

## Environment Variables

### Required Variables

These are **REQUIRED** for the app to work:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API → anon/public key |

**Example:**
```
NEXT_PUBLIC_SUPABASE_URL=https://kfklclhecvemyyetlqpz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Optional: ML Features (Bedrock)

These enable the AI model assist feature:

| Variable | Description | Default/Example |
|----------|-------------|-----------------|
| `USE_BEDROCK` | Enable ML classification | `1` (to enable) or leave empty to disable |
| `AWS_REGION` | AWS region for Bedrock | `us-east-1` |
| `BEDROCK_MODEL_ID` | Claude model ID | `anthropic.claude-3-haiku-20240307-v1:0` |
| `AWS_ACCESS_KEY_ID` | AWS access key | Your AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Your AWS IAM secret key |

**Example:**
```
USE_BEDROCK=1
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx...
```

**Note:** If you don't set these, the app will work but without ML model assist features.

---

### Optional: Admin Features

For email generation and admin panel:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | Supabase Dashboard → Settings → API → service_role key |
| `ADMIN_EMAILS` | Comma-separated admin emails | `admin@example.com,user@example.com` |
| `ADMIN_ALLOWLIST` | Admin allowlist | Same as ADMIN_EMAILS |

**Note:** Only needed if you want to use the admin email generation features.

---

## Complete Environment Variables List

### For Vercel Dashboard

Copy and paste these into Vercel → Settings → Environment Variables:

**Required (Production, Preview, Development):**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Optional - ML Features (Production, Preview, Development):**
```
USE_BEDROCK=1
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

**Optional - Admin (Production only):**
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_EMAILS=your@email.com
ADMIN_ALLOWLIST=your@email.com
```

---

## How to Get Your Values

### Supabase Variables

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (optional)

### AWS Variables (for ML)

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Create IAM user with Bedrock access:
   - IAM → Users → Create user
   - Attach policy: `AmazonBedrockFullAccess` (or custom policy)
   - Create access key → Copy `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
3. Enable Bedrock model access:
   - AWS Bedrock → Model access → Request access for Claude models
4. Set region (usually `us-east-1`)

---

## Step-by-Step: Add to Vercel

### Method 1: Vercel Dashboard

1. **Go to your project in Vercel**
2. **Click "Settings" → "Environment Variables"**
3. **For each variable:**
   - Click "Add New"
   - Enter variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter value
   - Select environments: **Production**, **Preview**, **Development**
   - Click "Save"
4. **Repeat for all variables**

### Method 2: Vercel CLI

```bash
# Add each variable (will prompt for value)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add USE_BEDROCK production
vercel env add AWS_REGION production
vercel env add BEDROCK_MODEL_ID production
vercel env add AWS_ACCESS_KEY_ID production
vercel env add AWS_SECRET_ACCESS_KEY production

# Or add to all environments at once
vercel env add NEXT_PUBLIC_SUPABASE_URL
# When prompted, select: Production, Preview, Development
```

---

## After Deployment: Supabase Configuration

### 1. Add Redirect URLs

After deploying, add your Vercel URL to Supabase:

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Add to "Redirect URLs":**
   - `http://localhost:3000/auth/callback` (for local dev)
   - `https://your-app.vercel.app/auth/callback` (for production)
3. **Save**

### 2. Verify RLS Policies

Make sure these policies exist:
- ✅ Users can read emails
- ✅ Users can insert their own guesses
- ✅ Users can read/update their own profile
- ✅ Service role can insert/update emails (if using admin features)

---

## Testing Your Deployment

### 1. Check Build
- ✅ Vercel build succeeds
- ✅ No errors in build logs

### 2. Test Authentication
- Visit your production URL
- Go to `/auth`
- Try signing in with email/password
- Try signing up

### 3. Test Game Flow
- Sign in successfully
- Go to `/play`
- Email should display
- Make a guess
- Verdict modal should appear
- Points/streak should update

### 4. Check Console
- Open browser DevTools → Console
- No errors should appear
- Network requests should succeed

---

## Troubleshooting

### Build Fails
- Check all required env vars are set
- Verify values are correct (no extra spaces)
- Check Vercel build logs for specific errors

### Authentication Doesn't Work
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase redirect URLs are configured
- Verify RLS policies allow user access

### ML Features Don't Work
- Verify `USE_BEDROCK=1` is set
- Check AWS credentials are correct
- Verify Bedrock model access is approved in AWS
- Check Vercel function logs for errors

### App Works But No Data
- Check Supabase tables exist
- Verify emails are seeded in database
- Check RLS policies allow reads

---

## Quick Checklist

Before deploying:
- [ ] All required env vars documented
- [ ] Supabase URL and keys ready
- [ ] AWS keys ready (if using ML)
- [ ] Code pushed to GitHub

After deploying:
- [ ] All env vars added to Vercel
- [ ] Build succeeds
- [ ] Supabase redirect URLs configured
- [ ] Authentication works
- [ ] Game flow works
- [ ] No console errors

---

## Example .env.local (for reference)

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Optional - ML
USE_BEDROCK=1
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx...

# Optional - Admin
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ADMIN_EMAILS=admin@example.com
```

**Note:** Never commit `.env.local` to git! It's already in `.gitignore`.

