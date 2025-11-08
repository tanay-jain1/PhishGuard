# Simple Table Setup - Exact Values to Enter

## Table 1: `profiles`

Click **New Table** → Enter name: `profiles`

Add these 5 columns one by one:

### Column 1:
- **Name:** `id`
- **Type:** `uuid`
- **Default value:** (leave empty)
- **Primary key:** ✓ (check the box)

### Column 2:
- **Name:** `email`
- **Type:** `text`
- **Default value:** (leave empty)
- **Primary key:** (leave unchecked)

### Column 3:
- **Name:** `username`
- **Type:** `text`
- **Default value:** (leave empty)
- **Primary key:** (leave unchecked)

### Column 4:
- **Name:** `created_at`
- **Type:** `timestamptz`
- **Default value:** `now()`
- **Primary key:** (leave unchecked)

### Column 5:
- **Name:** `updated_at`
- **Type:** `timestamptz`
- **Default value:** `now()`
- **Primary key:** (leave unchecked)

Click **Save**

---

## Table 2: `game_sessions`

Click **New Table** → Enter name: `game_sessions`

Add these 9 columns one by one:

### Column 1:
- **Name:** `id`
- **Type:** `uuid`
- **Default value:** `gen_random_uuid()`
- **Primary key:** ✓ (check the box)

### Column 2:
- **Name:** `user_id`
- **Type:** `uuid`
- **Default value:** (leave empty)
- **Primary key:** (leave unchecked)

### Column 3:
- **Name:** `score`
- **Type:** `int4`
- **Default value:** `0`
- **Primary key:** (leave unchecked)

### Column 4:
- **Name:** `total_guesses`
- **Type:** `int4`
- **Default value:** `0`
- **Primary key:** (leave unchecked)

### Column 5:
- **Name:** `correct_guesses`
- **Type:** `int4`
- **Default value:** `0`
- **Primary key:** (leave unchecked)

### Column 6:
- **Name:** `current_email_index`
- **Type:** `int4`
- **Default value:** `0`
- **Primary key:** (leave unchecked)

### Column 7:
- **Name:** `completed`
- **Type:** `bool`
- **Default value:** `false`
- **Primary key:** (leave unchecked)

### Column 8:
- **Name:** `created_at`
- **Type:** `timestamptz`
- **Default value:** `now()`
- **Primary key:** (leave unchecked)

### Column 9:
- **Name:** `updated_at`
- **Type:** `timestamptz`
- **Default value:** `now()`
- **Primary key:** (leave unchecked)

Click **Save**

---

## Table 3: `leaderboard`

Click **New Table** → Enter name: `leaderboard`

Add these 6 columns one by one:

### Column 1:
- **Name:** `id`
- **Type:** `uuid`
- **Default value:** `gen_random_uuid()`
- **Primary key:** ✓ (check the box)

### Column 2:
- **Name:** `user_id`
- **Type:** `uuid`
- **Default value:** (leave empty)
- **Primary key:** (leave unchecked)

### Column 3:
- **Name:** `username`
- **Type:** `text`
- **Default value:** (leave empty)
- **Primary key:** (leave unchecked)

### Column 4:
- **Name:** `high_score`
- **Type:** `int4`
- **Default value:** `0`
- **Primary key:** (leave unchecked)

### Column 5:
- **Name:** `total_games`
- **Type:** `int4`
- **Default value:** `0`
- **Primary key:** (leave unchecked)

### Column 6:
- **Name:** `updated_at`
- **Type:** `timestamptz`
- **Default value:** `now()`
- **Primary key:** (leave unchecked)

Click **Save**

---

## After Creating All 3 Tables

Go to **SQL Editor** and run the SQL from `setup-without-fk.sql` to add foreign keys and set up security policies.

