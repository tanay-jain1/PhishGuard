# Supabase Setup Guide - Permission Error Fix

If you're getting permission errors in the SQL Editor, use the **Table Editor** in the Supabase Dashboard instead.

## Method 1: Use Table Editor (Easiest - No SQL needed)

### Step 1: Create `profiles` table
1. Go to **Table Editor** in Supabase Dashboard
2. Click **New Table**
3. Name: `profiles`
4. Add columns:
   - `id` - Type: `uuid` - Primary Key ✓ - Foreign Key: `auth.users(id)`
   - `email` - Type: `text` - Not Null ✓
   - `username` - Type: `text` - Nullable
   - `created_at` - Type: `timestamptz` - Default: `now()`
   - `updated_at` - Type: `timestamptz` - Default: `now()`
5. Click **Save**

### Step 2: Create `game_sessions` table
1. Click **New Table**
2. Name: `game_sessions`
3. Add columns:
   - `id` - Type: `uuid` - Primary Key ✓ - Default: `gen_random_uuid()`
   - `user_id` - Type: `uuid` - Not Null ✓ - Foreign Key: `auth.users(id)`
   - `score` - Type: `int4` - Default: `0`
   - `total_guesses` - Type: `int4` - Default: `0`
   - `correct_guesses` - Type: `int4` - Default: `0`
   - `current_email_index` - Type: `int4` - Default: `0`
   - `completed` - Type: `bool` - Default: `false`
   - `created_at` - Type: `timestamptz` - Default: `now()`
   - `updated_at` - Type: `timestamptz` - Default: `now()`
4. Click **Save**

### Step 3: Create `leaderboard` table
1. Click **New Table**
2. Name: `leaderboard`
3. Add columns:
   - `id` - Type: `uuid` - Primary Key ✓ - Default: `gen_random_uuid()`
   - `user_id` - Type: `uuid` - Unique ✓ - Not Null ✓ - Foreign Key: `auth.users(id)`
   - `username` - Type: `text` - Not Null ✓
   - `high_score` - Type: `int4` - Default: `0`
   - `total_games` - Type: `int4` - Default: `0`
   - `updated_at` - Type: `timestamptz` - Default: `now()`
4. Click **Save**

### Step 4: Enable RLS and Add Policies
Go to **SQL Editor** and run this (this part should work):

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for game_sessions
CREATE POLICY "Users can view their own game sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions"
  ON game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for leaderboard
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own leaderboard entry"
  ON leaderboard FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leaderboard entry"
  ON leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function and trigger for auto-creating profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Method 2: Fix SQL Editor Permissions

If you want to use SQL Editor, try this:

1. Go to **Project Settings** → **Database**
2. Check if there are any permission restrictions
3. Try running the SQL in **Database** → **SQL Editor** (not the main SQL Editor)

Or contact Supabase support if the issue persists.

## Verify Setup

After setup, verify tables exist:
1. Go to **Table Editor**
2. You should see: `profiles`, `game_sessions`, `leaderboard`
3. Check that RLS is enabled (lock icon next to table name)

