# Table Setup Instructions for Supabase Table Editor

## Table 1: `profiles`

Click **New Table** → Name: `profiles`

### Columns:

1. **id**
   - Name: `id`
   - Type: `uuid`
   - Default value: (leave empty)
   - Primary key: ✓ (check the box)
   - Foreign Key: Click "Add Foreign Key" → Reference table: `auth.users` → Reference column: `id` → On delete: `CASCADE`

2. **email**
   - Name: `email`
   - Type: `text`
   - Default value: (leave empty)
   - Primary key: (unchecked)
   - Not Null: ✓ (check this)

3. **username**
   - Name: `username`
   - Type: `text`
   - Default value: (leave empty)
   - Primary key: (unchecked)
   - Not Null: (unchecked - allow null)

4. **created_at**
   - Name: `created_at`
   - Type: `timestamptz`
   - Default value: `now()`
   - Primary key: (unchecked)

5. **updated_at**
   - Name: `updated_at`
   - Type: `timestamptz`
   - Default value: `now()`
   - Primary key: (unchecked)

Click **Save**

---

## Table 2: `game_sessions`

Click **New Table** → Name: `game_sessions`

### Columns:

1. **id**
   - Name: `id`
   - Type: `uuid`
   - Default value: `gen_random_uuid()`
   - Primary key: ✓ (check the box)

2. **user_id**
   - Name: `user_id`
   - Type: `uuid`
   - Default value: (leave empty)
   - Primary key: (unchecked)
   - Not Null: ✓ (check this)
   - Foreign Key: Click "Add Foreign Key" → Reference table: `auth.users` → Reference column: `id` → On delete: `CASCADE`

3. **score**
   - Name: `score`
   - Type: `int4` (or `integer`)
   - Default value: `0`
   - Primary key: (unchecked)

4. **total_guesses**
   - Name: `total_guesses`
   - Type: `int4` (or `integer`)
   - Default value: `0`
   - Primary key: (unchecked)

5. **correct_guesses**
   - Name: `correct_guesses`
   - Type: `int4` (or `integer`)
   - Default value: `0`
   - Primary key: (unchecked)

6. **current_email_index**
   - Name: `current_email_index`
   - Type: `int4` (or `integer`)
   - Default value: `0`
   - Primary key: (unchecked)

7. **completed**
   - Name: `completed`
   - Type: `bool` (or `boolean`)
   - Default value: `false`
   - Primary key: (unchecked)

8. **created_at**
   - Name: `created_at`
   - Type: `timestamptz`
   - Default value: `now()`
   - Primary key: (unchecked)

9. **updated_at**
   - Name: `updated_at`
   - Type: `timestamptz`
   - Default value: `now()`
   - Primary key: (unchecked)

Click **Save**

---

## Table 3: `leaderboard`

Click **New Table** → Name: `leaderboard`

### Columns:

1. **id**
   - Name: `id`
   - Type: `uuid`
   - Default value: `gen_random_uuid()`
   - Primary key: ✓ (check the box)

2. **user_id**
   - Name: `user_id`
   - Type: `uuid`
   - Default value: (leave empty)
   - Primary key: (unchecked)
   - Not Null: ✓ (check this)
   - Unique: ✓ (check the unique box if available, or add unique constraint)
   - Foreign Key: Click "Add Foreign Key" → Reference table: `auth.users` → Reference column: `id` → On delete: `CASCADE`

3. **username**
   - Name: `username`
   - Type: `text`
   - Default value: (leave empty)
   - Primary key: (unchecked)
   - Not Null: ✓ (check this)

4. **high_score**
   - Name: `high_score`
   - Type: `int4` (or `integer`)
   - Default value: `0`
   - Primary key: (unchecked)

5. **total_games**
   - Name: `total_games`
   - Type: `int4` (or `integer`)
   - Default value: `0`
   - Primary key: (unchecked)

6. **updated_at**
   - Name: `updated_at`
   - Type: `timestamptz`
   - Default value: `now()`
   - Primary key: (unchecked)

Click **Save**

---

## After Creating Tables - Run This SQL

Go to **SQL Editor** and run this to set up RLS and policies:

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

-- Function to automatically create profile on user signup
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

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Notes:

- **int4** = integer (4 bytes) - if you don't see `int4`, use `integer`
- **timestamptz** = timestamp with timezone
- **bool** = boolean
- For Foreign Keys: Make sure to select `auth.users` from the dropdown, not `public.users`
- If you don't see a "Unique" checkbox for `user_id` in leaderboard, that's okay - we can add it via SQL later

