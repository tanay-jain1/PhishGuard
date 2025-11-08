# Database Table Setup Guide

This guide walks you through creating all required database tables in Supabase using the Table Editor (no SQL needed for table creation).

## Overview

You'll create 5 tables:
1. `profiles` - User profiles
2. `game_sessions` - Game session tracking
3. `leaderboard` - Leaderboard entries
4. `emails` - Email pool (created via SQL)
5. `guesses` - Individual guess records (created via SQL)

## Step 1: Create Tables via Table Editor

### Table 1: `profiles`

1. Go to **Table Editor** → Click **New Table**
2. Name: `profiles`
3. Add columns:

| Name | Type | Default | Primary Key | Not Null | Foreign Key |
|------|------|---------|-------------|----------|-------------|
| `id` | `uuid` | (empty) | ✓ | ✓ | `auth.users(id)` CASCADE |
| `email` | `text` | (empty) | - | ✓ | - |
| `username` | `text` | (empty) | - | - | - |
| `points` | `int4` | `0` | - | - | - |
| `streak` | `int4` | `0` | - | - | - |
| `created_at` | `timestamptz` | `now()` | - | - | - |
| `updated_at` | `timestamptz` | `now()` | - | - | - |

4. Click **Save**

### Table 2: `game_sessions`

1. Click **New Table** → Name: `game_sessions`
2. Add columns:

| Name | Type | Default | Primary Key | Not Null |
|------|------|---------|-------------|----------|
| `id` | `uuid` | `gen_random_uuid()` | ✓ | ✓ |
| `user_id` | `uuid` | (empty) | - | ✓ |
| `score` | `int4` | `0` | - | - |
| `total_guesses` | `int4` | `0` | - | - |
| `correct_guesses` | `int4` | `0` | - | - |
| `current_email_index` | `int4` | `0` | - | - |
| `completed` | `bool` | `false` | - | - |
| `created_at` | `timestamptz` | `now()` | - | - |
| `updated_at` | `timestamptz` | `now()` | - | - |

3. Add Foreign Key to `user_id`:
   - Reference table: `auth.users`
   - Reference column: `id`
   - On delete: `CASCADE`
4. Click **Save**

### Table 3: `leaderboard`

1. Click **New Table** → Name: `leaderboard`
2. Add columns:

| Name | Type | Default | Primary Key | Not Null | Unique |
|------|------|---------|-------------|----------|--------|
| `id` | `uuid` | `gen_random_uuid()` | ✓ | ✓ | - |
| `user_id` | `uuid` | (empty) | - | ✓ | ✓ |
| `username` | `text` | (empty) | - | ✓ | - |
| `high_score` | `int4` | `0` | - | - | - |
| `total_games` | `int4` | `0` | - | - | - |
| `updated_at` | `timestamptz` | `now()` | - | - | - |

3. Add Foreign Key to `user_id`:
   - Reference table: `auth.users`
   - Reference column: `id`
   - On delete: `CASCADE`
4. Click **Save**

## Step 2: Run SQL Setup Scripts

After creating the 3 tables above, go to **SQL Editor** and run:

### 1. Complete Setup (`complete-setup.sql`)

This adds:
- Foreign key constraints
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for auto-profile creation and leaderboard updates

Copy the entire contents of `complete-setup.sql` and run it.

### 2. Emails Table Setup (`emails-table-setup.sql`)

This creates the `emails` table and `guesses` table with proper RLS policies.

Copy the entire contents of `emails-table-setup.sql` and run it.

## Step 3: Seed Emails

After the emails table is created, seed it with initial data:

```bash
npm run seed:emails
```

This requires `.env.seed` with your service role key.

## Verification

After setup, verify in Supabase Table Editor that you have:
- ✅ `profiles` table
- ✅ `game_sessions` table
- ✅ `leaderboard` table
- ✅ `emails` table
- ✅ `guesses` table

All tables should show a lock icon (🔒) indicating RLS is enabled.

## Troubleshooting

**Can't add foreign key in Table Editor:**
- Create the table first without foreign keys
- Add foreign keys via SQL: `ALTER TABLE profiles ADD CONSTRAINT ...`

**Permission errors:**
- Use Table Editor instead of SQL Editor for table creation
- Run the SQL scripts after tables are created

**RLS not working:**
- Verify you ran `complete-setup.sql` completely
- Check that policies exist in Settings → Authentication → Policies

## Next Steps

Once tables are set up:
1. Seed emails: `npm run seed:emails`
2. Start the app: `npm run dev`
3. Sign up and start playing!

