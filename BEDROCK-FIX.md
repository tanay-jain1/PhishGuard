# Fix for Claude 3.5 Haiku Inference Profile Error

## The Problem

Claude 3.5 Haiku requires using an **inference profile** instead of the direct model ID. The error message says:
> "Invocation of model ID anthropic.claude-3-5-haiku-20241022-v1:0 with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile that contains this model."

## Solution Options

### Option 1: Use Claude 3 Haiku (Easiest - Works Immediately) ⭐

The older Claude 3 Haiku model works with direct model ID and doesn't require inference profiles.

**Update your `.env.local`:**
```env
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

This model:
- ✅ Works immediately (no inference profile needed)
- ✅ Still very capable for your use case
- ✅ Cheaper than 3.5
- ✅ Fast and reliable

### Option 2: Use Claude 3.5 Haiku with Inference Profile

To use Claude 3.5 Haiku, you need to find the inference profile ID:

1. **Go to Bedrock Console:**
   - https://console.aws.amazon.com/bedrock/
   - Click "Inference profiles" in left sidebar
   - Or go to: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/inference-profiles

2. **Find Claude 3.5 Haiku Profile:**
   - Look for a profile containing "Claude 3.5 Haiku"
   - The profile ID will look like: `us.anthropic.claude-3-5-haiku` or similar
   - Copy the **Profile ID** (not the model ID)

3. **Update your `.env.local`:**
   ```env
   BEDROCK_MODEL_ID=us.anthropic.claude-3-5-haiku
   ```
   (Use the actual profile ID you find)

### Option 3: Use Amazon Titan (No Approval Needed)

If you want to test immediately without waiting:

```env
BEDROCK_MODEL_ID=amazon.titan-text-lite-v1
```

## Recommended: Use Option 1

For a hackathon, **Claude 3 Haiku** is perfect:
- Works right away
- Still very good quality
- Fast and cost-effective
- No inference profile complexity

## Quick Fix

Just update your `.env.local` file:

```env
# Change this line:
BEDROCK_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0

# To this:
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

Then test again:
```bash
npm run test:bedrock
```

## After Updating

1. Restart your dev server if it's running
2. Test with: `npm run test:bedrock`
3. Should see ✅ SUCCESS!

