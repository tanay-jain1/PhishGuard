# Seeding Emails into Supabase

This guide explains how to seed the `emails` table with initial email data.

## Prerequisites

1. **Run the emails table SQL first:**
   - Go to Supabase SQL Editor
   - Run `emails-table-setup.sql`
   - This creates the table and RLS policies

2. **Get your Service Role Key:**
   - Go to Supabase Dashboard
   - Settings → API
   - Copy the **service_role** key (NOT the anon key)
   - ⚠️ **Keep this secret!** Never commit it to git.

## Setup

### 1. Install dependencies

```bash
npm install
```

This installs `tsx` which is needed to run TypeScript scripts.

### 2. Create `.env.seed` file with Service Role Key

Create a new file `.env.seed` in your project root and add:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important:** 
- The service role key bypasses RLS, so it's powerful
- Never commit `.env.seed` to git (add it to `.gitignore`)
- Only use it for server-side scripts like seeding
- Keeping it separate from `.env.local` is a good security practice

Your `.env.local` should have:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Your `.env.seed` should have:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Running the Seed Script

### Option 1: Using npm script (Recommended)

```bash
npm run seed:emails
```

### Option 2: Using tsx directly

```bash
npx tsx scripts/seed-emails.ts
```

### Option 3: Using ts-node (if you prefer)

```bash
npx ts-node scripts/seed-emails.ts
```

## What the Script Does

1. Reads `src/data/emails.seed.json`
2. Connects to Supabase using the service role key
3. Upserts each email into the `emails` table
4. Uses `from_email` + `subject` as unique identifier
5. If an email already exists, it updates it
6. Prints progress and results

## Expected Output

```
📧 Found 6 emails to seed...

✅ Seeded: "Urgent: Verify Your Account Immediately" (PHISHING)
✅ Seeded: "Your Order #12345 Has Shipped" (LEGITIMATE)
✅ Seeded: "You've Won $10,000! Claim Your Prize Now!" (PHISHING)
✅ Seeded: "Password Reset Request" (LEGITIMATE)
✅ Seeded: "Re: Your Invoice Payment Overdue" (PHISHING)
✅ Seeded: "Your Netflix Subscription Renewal" (LEGITIMATE)

✨ Seeding complete!
   ✅ Success: 6
   ❌ Errors: 0
   📊 Total: 6

🎉 All done!
```

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY environment variable is required"

- Make sure you created `.env.seed` file with `SUPABASE_SERVICE_ROLE_KEY`
- Check that the file is in the project root (same directory as `package.json`)
- Verify the file has the correct format: `SUPABASE_SERVICE_ROLE_KEY=your_key_here`
- Try running: `SUPABASE_SERVICE_ROLE_KEY=your_key npm run seed:emails`

### Error: "permission denied for table emails"

- Make sure you ran `emails-table-setup.sql` first
- Check that RLS policies were created correctly
- Verify you're using the service_role key, not the anon key

### Error: "Cannot find module 'tsx'"

- Run `npm install` to install dependencies
- Make sure `tsx` is in your `devDependencies`

## Re-seeding

The script uses `upsert`, so you can run it multiple times safely:
- If an email exists (same `from_email` + `subject`), it will be updated
- If it doesn't exist, it will be inserted
- No duplicates will be created

## Adding More Emails

1. Edit `src/data/emails.seed.json`
2. Add new email objects following the same structure
3. Run `npm run seed:emails` again

## Security Notes

- ⚠️ The service role key has full database access
- ⚠️ Never expose it in client-side code
- ⚠️ Never commit it to version control
- ✅ It's safe to use in server-side scripts like this seed script
- ✅ The seed script only runs locally, not in production

