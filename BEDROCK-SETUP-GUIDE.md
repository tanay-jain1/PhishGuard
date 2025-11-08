# AWS Bedrock Setup - Step by Step

## Part 1: Get Model ID (No Building Required!)

### Option A: Use Claude 3 Haiku (Recommended - Stable & Reliable!) ⭐

**Why Claude 3 Haiku?**
- ✅ Works with direct model ID (no inference profile needed)
- ✅ Stable and proven to work long-term
- ✅ Fast, cost-effective, and reliable
- ✅ Perfect quality for phishing detection
- ✅ No complex setup required

1. **Go to Bedrock Model Catalog:**
   - Visit: https://console.aws.amazon.com/bedrock/
   - Click "Model catalog" in left sidebar

2. **Find Claude 3 Haiku:**
   - Search for "Claude 3 Haiku" or "anthropic"
   - Click on "Claude 3 Haiku" model
   - The **Model ID** is:
     ```
     anthropic.claude-3-haiku-20240307-v1:0
     ```
   - **Use this exact string** as your `BEDROCK_MODEL_ID`

3. **Get Approval (First Time Only):**
   - Submit the use case form in Bedrock console
   - Wait for approval (usually quick - minutes to hours)
   - Once approved, you can use the model ID
   - 💰 **Your $50 credit will cover plenty of usage!**

### Option B: Use Amazon Titan (No Approval Needed!)

1. **Go to Model Catalog:**
   - Same as above: https://console.aws.amazon.com/bedrock/

2. **Find Amazon Titan:**
   - Search for "Titan Text Lite"
   - Click on "Amazon Titan Text Lite"
   - Copy the Model ID:
     ```
     amazon.titan-text-lite-v1
     ```
   - **This works immediately - no approval needed!**

## Part 2: Get AWS Credentials (IAM User)

### Step 1: Create IAM User

1. **Go to IAM Console:**
   - Visit: https://console.aws.amazon.com/iam/
   - Click "Users" in left sidebar
   - Click "Create user" button

2. **Set User Name:**
   - Enter: `phishguard-bedrock`
   - Click "Next"

3. **Set Permissions:**
   - Select "Attach policies directly"
   - Search for: `AmazonBedrockFullAccess`
   - Check the box next to it
   - Click "Next"

4. **Review and Create:**
   - Review the settings
   - Click "Create user"

### Step 2: Create Access Keys

1. **Click on the user you just created:**
   - Click "phishguard-bedrock" user

2. **Go to Security Credentials tab:**
   - Click "Security credentials" tab
   - Scroll down to "Access keys" section

3. **Create Access Key:**
   - Click "Create access key"
   - Select "Application running outside AWS"
   - Click "Next"
   - (Optional) Add description: "PhishGuard Bedrock Access"
   - Click "Create access key"

4. **SAVE YOUR CREDENTIALS:**
   - **Access Key ID**: Copy this (starts with `AKIA...`)
   - **Secret Access Key**: Copy this (long string)
   - ⚠️ **IMPORTANT**: You can only see the secret key once!
   - Click "Download .csv file" to save them safely

## Part 3: Add to Your Project

### Add to `.env.local`:

```env
# Existing Supabase vars (keep these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# New Bedrock vars (add these)
USE_BEDROCK=1
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
# Recommended: Claude 3 Haiku (stable, works with direct model ID)
# Alternative: amazon.titan-text-lite-v1 (no approval needed)

AWS_ACCESS_KEY_ID=AKIA... (your access key from IAM)
AWS_SECRET_ACCESS_KEY=... (your secret key from IAM)
```

### Example `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://kfklclhecvemyyetlqpz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

USE_BEDROCK=1
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Part 4: Test It

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Play the game:**
   - Sign in
   - Make a guess
   - Check if "Model Assist" section appears in verdict modal

3. **Check for errors:**
   - Open browser console (F12)
   - Look for any error messages
   - Check terminal for server errors

## Troubleshooting

**"Model not found" error:**
- Verify model ID is correct (copy from Bedrock console)
- Check region matches (us-east-1)
- For Claude: Make sure approval is granted

**"Access denied" error:**
- Check IAM user has `AmazonBedrockFullAccess` policy
- Verify access keys are correct
- Check region is correct

**ML section not appearing:**
- Verify `USE_BEDROCK=1` is set
- Check all 5 environment variables are present
- Restart dev server after adding env vars

## Quick Reference

**Model IDs (Recommended):**
- Claude 3 Haiku: `anthropic.claude-3-haiku-20240307-v1:0` ⭐ **RECOMMENDED** (Stable, works with direct model ID)
- Claude 3 Sonnet: `anthropic.claude-3-sonnet-20240229-v1:0` (More powerful, more expensive)
- Titan Text Lite: `amazon.titan-text-lite-v1` (No approval needed, good fallback)

**Note:** Claude 3.5 Haiku requires inference profiles and is more complex to set up. Claude 3 Haiku is recommended for reliability.

**Regions:**
- `us-east-1` (N. Virginia) - recommended
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)

**IAM Policy:**
- `AmazonBedrockFullAccess` (easiest)
- Or custom policy with just `bedrock:InvokeModel` permission

