# How to Check if Bedrock is Working

## 1. Check Environment Variables

### In Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Check for these variables:
   - `USE_BEDROCK` = `1` (required for ML classification)
   - `AWS_REGION` = `us-east-1` (or your region)
   - `BEDROCK_MODEL_ID` = `anthropic.claude-3-5-haiku-20241022-v1:0` (or your model)
   - `AWS_ACCESS_KEY_ID` = `...` (your AWS access key)
   - `AWS_SECRET_ACCESS_KEY` = `...` (your AWS secret key)

### Locally:
Check your `.env.local` file for the same variables.

## 2. Check Runtime Logs

### In Vercel:
1. Go to your project → Logs → Runtime Logs
2. Look for these log messages:

**For Email Generation:**
- `✅ Email generation completed: X emails generated` (if using Bedrock)
- `✅ Mock generator created X emails` (if using mock templates)
- `Bedrock generation failed, falling back to mock:` (if Bedrock fails)

**For ML Classification:**
- `ML classification check:` - Shows which env vars are set
- `ML provider loaded: BedrockProvider` (if Bedrock is working)
- `ML provider loaded: NoopProvider` (if Bedrock is NOT working)
- `ML provider returned:` - Shows the classification results

## 3. Test Email Generation

### Check the logs when generating emails:
When you click "Generate Emails & Retry" or emails auto-generate, check Vercel Runtime Logs for:
- `📧 Starting email generation for X emails...`
- `🔧 Bedrock configured: Yes` or `No`
- `✅ Email generation completed: X emails generated`

If you see "Mock generator created X emails", Bedrock is NOT being used for generation.

## 4. Test ML Classification

### Check the browser console:
1. Open DevTools (F12) → Console
2. Make a guess on an email
3. Look for these logs:
   - `Fetching ML classification for email: ...`
   - `ML response status: 200`
   - `ML result:` - Should show `prob_phish`, `reasons`, `topTokens`

### Check Vercel Runtime Logs:
Look for:
- `ML classification check:` - Shows env var status
- `ML provider loaded: BedrockProvider` (good) or `NoopProvider` (not working)
- `ML provider returned:` - Shows actual classification results

## 5. Quick Test Script

You can also test directly by calling the API endpoints:

### Test ML Classification:
```bash
curl -X POST https://phish-guard-smoky.vercel.app/api/ml/classify \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "URGENT: Verify Your Account",
    "body_html": "<p>Click here to verify: http://suspicious-site.com</p>",
    "from_email": "security@amazon-verify.com",
    "from_name": "Amazon Security"
  }'
```

Expected response if Bedrock is working:
```json
{
  "heuristics": {...},
  "ml": {
    "prob_phish": 0.85,
    "reasons": ["Suspicious domain", "HTTP link"],
    "topTokens": ["suspicious_link", "urgent_language"]
  }
}
```

If `ml` is missing or has `prob_phish: 0.5` with no reasons/tokens, Bedrock is NOT working.

## 6. Common Issues

### Issue: Mock generator is being used
**Symptom:** Logs show "Mock generator created X emails"
**Fix:** Ensure `AWS_REGION` and `AWS_ACCESS_KEY_ID` are set

### Issue: NoopProvider is being used
**Symptom:** Logs show "ML provider loaded: NoopProvider"
**Fix:** Ensure `USE_BEDROCK=1` and all AWS credentials are set

### Issue: Bedrock fails with errors
**Symptom:** Logs show "Bedrock generation failed" or "ML classification error"
**Fix:** 
- Check AWS credentials are correct
- Verify Bedrock model access in AWS Console
- Check IAM permissions for Bedrock

## 7. Verify in AWS Console

1. Go to AWS Console → Bedrock → Model access
2. Ensure Claude 3.5 Haiku is enabled
3. Check IAM user/role has `bedrock:InvokeModel` permission

