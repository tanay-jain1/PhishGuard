# PhishGuard - Final Setup Checklist

## ✅ What's Already Done

- [x] Core game functionality (play, guess, verdict)
- [x] Authentication (Supabase magic link)
- [x] Database setup (profiles, emails, guesses)
- [x] Heuristic analysis system
- [x] ML abstraction layer (Bedrock provider)
- [x] Email seed data (22 emails)
- [x] UI components (EmailViewer, GuessButtons, VerdictModal)
- [x] Leaderboard and profile pages
- [x] AWS SDK dependency installed

## 🚀 What's Left to Finish Tonight

### 1. **AWS Bedrock Setup** (30-45 minutes)

#### Step 1: AWS Account Setup
- [ ] If you don't have AWS account: Sign up at https://aws.amazon.com
- [ ] Navigate to AWS Bedrock Console: https://console.aws.amazon.com/bedrock/
- [ ] Enable Bedrock in your region (us-east-1 recommended)

#### Step 2: Request Model Access
- [ ] Go to "Model access" in Bedrock console
- [ ] Request access to: `anthropic.claude-3-haiku-20240307-v1:0`
  - This is the cheapest/fastest option for hackathon
  - Usually approved within minutes
- [ ] Alternative: Request `amazon.titan-text-lite-v1` (if Claude not available)

#### Step 3: Create IAM User for Bedrock
- [ ] Go to IAM Console: https://console.aws.amazon.com/iam/
- [ ] Create new user: "phishguard-bedrock"
- [ ] Attach policy: `AmazonBedrockFullAccess` (or create custom policy with just `bedrock:InvokeModel`)
- [ ] Create Access Key (save the keys!)

#### Step 4: Get Your Credentials
You'll need:
- `AWS_REGION` (e.g., `us-east-1`)
- `BEDROCK_MODEL_ID` (e.g., `anthropic.claude-3-haiku-20240307-v1:0`)
- `AWS_ACCESS_KEY_ID` (from IAM user)
- `AWS_SECRET_ACCESS_KEY` (from IAM user)

### 2. **Local Testing** (15 minutes)

- [ ] Add to `.env.local`:
  ```env
  USE_BEDROCK=1
  AWS_REGION=us-east-1
  BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
  AWS_ACCESS_KEY_ID=your_access_key_here
  AWS_SECRET_ACCESS_KEY=your_secret_key_here
  ```

- [ ] Test locally:
  ```bash
  npm run dev
  ```
- [ ] Play a game, submit a guess
- [ ] Verify "Model Assist" section appears in verdict modal
- [ ] Check browser console for any errors

### 3. **Deploy to Vercel** (20 minutes)

- [ ] Push latest code to GitHub
- [ ] Go to Vercel Dashboard: https://vercel.com
- [ ] Import your repository
- [ ] Add environment variables in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `USE_BEDROCK=1`
  - `AWS_REGION=us-east-1`
  - `BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0`
  - `AWS_ACCESS_KEY_ID` (your key)
  - `AWS_SECRET_ACCESS_KEY` (your secret)
- [ ] Deploy and test production URL

### 4. **Final Testing** (15 minutes)

- [ ] Test landing page → sign in flow
- [ ] Test play page → guess flow
- [ ] Verify ML assist appears in verdict modal
- [ ] Test leaderboard page
- [ ] Test profile page
- [ ] Test resources page
- [ ] Check mobile responsiveness
- [ ] Verify no console errors

### 5. **Optional: Without Bedrock** (if AWS setup takes too long)

If you can't get Bedrock working tonight, the game still works perfectly:
- [ ] Just don't set `USE_BEDROCK=1`
- [ ] Game will use heuristics only (still fully functional!)
- [ ] ML section won't appear (that's fine for demo)
- [ ] You can add Bedrock later

## 🎯 Quick Start Commands

### Install dependencies
```bash
npm install
```

### Seed emails (if not done)
```bash
npm run seed:emails
```

### Run locally
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

## 🔧 Troubleshooting

**ML not appearing?**
- Check `.env.local` has all 5 Bedrock variables
- Check browser console for errors
- Verify model access is approved in AWS Bedrock console
- Try without Bedrock first (remove `USE_BEDROCK=1`)

**Build errors?**
- Clear `.next`: `rm -rf .next`
- Reinstall: `rm -rf node_modules && npm install`

**Database issues?**
- Check Supabase tables exist
- Run `npm run seed:emails` again
- Verify `.env.local` has correct Supabase keys

## 📝 What You Have

✅ **Fully functional game** - Works without ML
✅ **22 diverse emails** - Mix of phishing and legitimate
✅ **Heuristic analysis** - Rule-based detection (always works)
✅ **ML integration ready** - Just needs AWS credentials
✅ **Clean UI** - Modern, responsive design
✅ **Complete features** - Auth, play, leaderboard, profile, resources

## ⏰ Time Estimate

- **With Bedrock**: 1-1.5 hours total
- **Without Bedrock**: 15 minutes (just test everything)

The game is **production-ready** right now. Bedrock is just a nice-to-have enhancement!

