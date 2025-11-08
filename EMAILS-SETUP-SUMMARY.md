# Emails Table Setup - Complete Guide

## Quick Start

1. **Run SQL in Supabase:**
   - Copy `emails-table-setup.sql`
   - Paste into Supabase SQL Editor
   - Click Run

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Add service role key to `.env.local`:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   Get it from: Supabase Dashboard → Settings → API → service_role key

4. **Seed the emails:**
   ```bash
   npm run seed:emails
   ```

## Files Created

1. **`emails-table-setup.sql`** - SQL to create the emails table and RLS policies
2. **`src/data/emails.seed.json`** - JSON file with 6 sample emails
3. **`scripts/seed-emails.ts`** - TypeScript script to seed emails into database
4. **`SEEDING-INSTRUCTIONS.md`** - Detailed instructions for seeding

## Table Schema

The `emails` table has these columns:

- `id` (UUID, Primary Key)
- `subject` (TEXT) - Email subject line
- `from_name` (TEXT) - Sender's display name
- `from_email` (TEXT) - Sender's email address
- `body_html` (TEXT) - Email body content
- `is_phish` (BOOLEAN) - Whether this is a phishing email
- `features` (JSONB) - Array of red flags/features
- `explanation` (TEXT) - Explanation of why it's phishing/legitimate
- `difficulty` (TEXT) - 'easy', 'medium', or 'hard'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Unique constraint:** `(from_email, subject)` - prevents duplicate emails

## RLS Policies

- ✅ **SELECT:** All authenticated users can read emails (for the game)
- 🔒 **INSERT/UPDATE/DELETE:** Only service_role can modify emails (prevents users from adding fake emails)

## Security Notes

- The service role key bypasses RLS automatically
- Never commit the service role key to git
- Only use it in server-side scripts (like the seed script)
- Regular users can only read emails, not modify them

## Next Steps

After seeding, you can:
1. Query emails from your Next.js app using the Supabase client
2. Update the game logic to fetch emails from the database instead of static data
3. Add more emails by editing `emails.seed.json` and re-running the seed script

