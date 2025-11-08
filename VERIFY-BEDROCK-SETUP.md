# How IAM and Bedrock Model Access Work Together

## Understanding the Connection

**Important:** IAM permissions and model access are **separate but both required**:

1. **Model Access (Account Level):**
   - This is what you requested approval for in the Bedrock console
   - Grants your **AWS account** permission to use Claude 3.5 Haiku
   - This is account-wide, not per-user

2. **IAM Permissions (User Level):**
   - Your IAM user (`phishguard-bedrock`) needs `bedrock:InvokeModel` permission
   - This allows the **IAM user** to actually call Bedrock APIs
   - The `AmazonBedrockFullAccess` policy gives this permission

## How They Work Together

```
Your Code → IAM User Credentials → AWS Bedrock API → Model Access Check → Claude 3.5 Haiku
```

1. Your code uses IAM credentials to authenticate
2. AWS checks if the IAM user has Bedrock permissions ✅
3. AWS checks if your account has model access ✅
4. If both pass, the request goes through!

## Verifying Everything is Connected

### Step 1: Verify Model Access (Account Level)

1. Go to: https://console.aws.amazon.com/bedrock/
2. Click "Model catalog" in left sidebar
3. Search for "Claude 3.5 Haiku"
4. Click on the model
5. Check the status:
   - ✅ **"Available"** = You have access!
   - ⏳ **"Request access"** = Still pending approval
   - ❌ **"Not available"** = Need to request access

### Step 2: Verify IAM User Permissions

1. Go to: https://console.aws.amazon.com/iam/
2. Click "Users" → Click "phishguard-bedrock"
3. Click "Permissions" tab
4. Verify you see: `AmazonBedrockFullAccess` policy
5. ✅ If yes, you're good!

### Step 3: Test the Connection

Run this test script to verify everything works:

```bash
npm run test:bedrock
```

Or test manually by running the app and making a guess.

## What You've Already Done ✅

- [x] Code is integrated (already done!)
- [x] IAM user created with Bedrock permissions
- [x] Credentials added to `.env.local`
- [x] Model ID configured

## What's Left (If Anything)

- [ ] **Model access approval** (if still pending)
- [ ] **Test it** (run the app and verify ML appears)

## Testing Checklist

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Play the game:**
   - Sign in
   - Make a guess on an email
   - Check verdict modal

3. **Look for "Model Assist" section:**
   - If it appears → ✅ Everything works!
   - If it doesn't → Check browser console for errors

4. **Common errors:**
   - "Model not found" → Model access not approved yet
   - "Access denied" → IAM permissions issue
   - No ML section → Check console for errors

## Quick Test Script

I'll create a test script you can run to verify the connection works.

