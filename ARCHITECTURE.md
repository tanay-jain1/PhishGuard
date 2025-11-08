# PhishGuard MVP Architecture Proposal

## 1. File/Folder Layout

```
src/
├── app/
│   ├── (auth)/
│   │   └── auth/
│   │       └── page.tsx              # Sign in/up form
│   ├── (game)/
│   │   ├── play/
│   │   │   └── page.tsx              # Main game page (orchestrator)
│   │   ├── leaderboard/
│   │   │   └── page.tsx              # Leaderboard display
│   │   └── resources/
│   │       └── page.tsx              # Educational content
│   ├── api/
│   │   ├── auth/
│   │   │   └── init/
│   │   │       └── route.ts          # POST /api/auth/init
│   │   ├── emails/
│   │   │   └── next/
│   │   │       └── route.ts          # GET /api/emails/next
│   │   ├── guess/
│   │   │   └── route.ts              # POST /api/guess
│   │   └── leaderboard/
│   │       └── route.ts              # GET /api/leaderboard
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   └── globals.css
├── components/
│   ├── EmailViewer.tsx               # Displays email content
│   ├── GuessButtons.tsx              # Phishing/Legitimate buttons
│   ├── VerdictModal.tsx              # Shows result + explanation
│   ├── Badge.tsx                     # Score/rank badge component
│   └── LeaderboardTable.tsx          # Table with rankings
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   └── server.ts                 # Server client
│   └── utils.ts                      # Helper functions
├── types/
│   ├── database.ts                   # Supabase types
│   └── game.ts                       # Game domain types
├── data/
│   └── emails.ts                     # Static email pool (MVP)
└── middleware.ts                     # Auth middleware
```

## 2. Data Model

### Tables

```sql
-- profiles: User profiles (1:1 with auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- emails: Email pool (static for MVP, can be dynamic later)
-- Stored in code (src/data/emails.ts) for MVP
-- Future: Move to DB with admin interface

-- guesses: Individual guess records
CREATE TABLE guesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,                    -- References email.id from data
  is_phishing BOOLEAN NOT NULL,              -- Actual answer
  user_guess BOOLEAN NOT NULL,               -- User's guess
  is_correct BOOLEAN GENERATED ALWAYS AS (is_phishing = user_guess) STORED,
  score INTEGER DEFAULT 0,                   -- Points earned (10 if correct, 0 if wrong)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- leaderboard: Aggregated stats (materialized view pattern)
CREATE TABLE leaderboard (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  high_score INTEGER DEFAULT 0,
  total_guesses INTEGER DEFAULT 0,
  correct_guesses INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_guesses > 0 
    THEN (correct_guesses::DECIMAL / total_guesses * 100)
    ELSE 0 END
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_guesses_user_id ON guesses(user_id);
CREATE INDEX idx_guesses_created_at ON guesses(created_at DESC);
CREATE INDEX idx_leaderboard_high_score ON leaderboard(high_score DESC);
```

### RLS Policies

```sql
-- profiles: Users can read/update own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- guesses: Users can read/insert own guesses
ALTER TABLE guesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guesses_select_own" ON guesses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "guesses_insert_own" ON guesses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- leaderboard: Public read, users update own
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaderboard_select_all" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "leaderboard_upsert_own" ON leaderboard FOR ALL USING (auth.uid() = user_id);
```

### Triggers

```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update leaderboard on new guess
CREATE OR REPLACE FUNCTION update_leaderboard_on_guess()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_new_score INTEGER;
BEGIN
  SELECT username INTO v_username FROM profiles WHERE id = NEW.user_id;
  
  -- Calculate new high score
  SELECT COALESCE(MAX(score), 0) INTO v_new_score
  FROM guesses
  WHERE user_id = NEW.user_id;
  
  INSERT INTO leaderboard (user_id, username, high_score, total_guesses, correct_guesses, updated_at)
  VALUES (
    NEW.user_id,
    v_username,
    v_new_score,
    (SELECT COUNT(*) FROM guesses WHERE user_id = NEW.user_id),
    (SELECT COUNT(*) FROM guesses WHERE user_id = NEW.user_id AND is_correct = true),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    high_score = EXCLUDED.high_score,
    total_guesses = EXCLUDED.total_guesses,
    correct_guesses = EXCLUDED.correct_guesses,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_guess_inserted
  AFTER INSERT ON guesses
  FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_guess();
```

## 3. API Contract

### POST /api/auth/init
**Purpose**: Initialize user session, create profile if needed

**Request**: None (uses auth token from cookie)

**Response**:
```typescript
{
  user: {
    id: string;
    email: string;
    username: string;
  }
}
```

**Errors**: `401 Unauthorized` if not authenticated

---

### GET /api/emails/next
**Purpose**: Get next email for current user (tracks progress)

**Request**: None (uses auth token)

**Response**:
```typescript
{
  email: {
    id: string;
    subject: string;
    from: string;
    to: string;
    body: string;
    isPhishing: boolean;
    explanation: string;
    redFlags: string[];
  } | null,  // null if all emails completed
  progress: {
    current: number;
    total: number;
  }
}
```

**Errors**: `401 Unauthorized`

---

### POST /api/guess
**Purpose**: Submit guess for current email

**Request Body**:
```typescript
{
  emailId: string;
  guess: boolean;  // true = phishing, false = legitimate
}
```

**Response**:
```typescript
{
  correct: boolean;
  score: number;        // Points earned (10 or 0)
  explanation: string;
  redFlags: string[];
  stats: {
    totalGuesses: number;
    correctGuesses: number;
    currentScore: number;
  }
}
```

**Errors**: 
- `400 Bad Request` - Invalid emailId or already guessed
- `401 Unauthorized`

---

### GET /api/leaderboard
**Purpose**: Get top players

**Query Params**:
- `limit?: number` (default: 100)
- `offset?: number` (default: 0)

**Response**:
```typescript
{
  entries: Array<{
    rank: number;
    userId: string;
    username: string;
    highScore: number;
    totalGuesses: number;
    accuracy: number;
  }>;
  userRank?: number;  // Current user's rank if authenticated
}
```

**Errors**: None (public endpoint)

## 4. Component Map

### EmailViewer
**File**: `src/components/EmailViewer.tsx`
**Props**: `{ email: Email }`
**Responsibility**: 
- Display email metadata (from, to, subject)
- Render email body with proper formatting
- Handle dark mode styling

### GuessButtons
**File**: `src/components/GuessButtons.tsx`
**Props**: `{ onGuess: (guess: boolean) => void; disabled?: boolean }`
**Responsibility**:
- Render "Legitimate" and "Phishing" buttons
- Handle disabled state
- Visual feedback (colors, icons)

### VerdictModal
**File**: `src/components/VerdictModal.tsx`
**Props**: `{ isOpen, isCorrect, explanation, redFlags, onClose, onNext }`
**Responsibility**:
- Modal overlay with verdict (✅/❌)
- Display explanation and red flags list
- Action buttons (Review/Next)

### Badge
**File**: `src/components/Badge.tsx`
**Props**: `{ label: string; value: string | number; variant?: 'default' | 'success' | 'warning' }`
**Responsibility**:
- Reusable badge component for score, rank, accuracy
- Consistent styling

### LeaderboardTable
**File**: `src/components/LeaderboardTable.tsx`
**Props**: `{ entries: LeaderboardEntry[]; userRank?: number }`
**Responsibility**:
- Render table with rankings
- Highlight current user's row
- Handle empty state

## 5. Definition of Done Checklist

### Authentication
- [ ] User can sign up with email/password
- [ ] User can sign in
- [ ] User can sign out
- [ ] Profile auto-created on signup
- [ ] Protected routes redirect to /auth if not authenticated
- [ ] Authenticated users redirected away from /auth

### Game Flow
- [ ] Play page loads and shows first email
- [ ] Email displays correctly (from, to, subject, body)
- [ ] User can click "Legitimate" or "Phishing"
- [ ] Guess is submitted to API
- [ ] Verdict modal shows immediately after guess
- [ ] Modal displays correct/incorrect status
- [ ] Modal shows explanation and red flags
- [ ] User can click "Next Email" to continue
- [ ] Progress indicator updates (email X of Y)
- [ ] Score updates in real-time
- [ ] Game completes after all emails
- [ ] User redirected to leaderboard on completion

### Data Persistence
- [ ] Each guess saved to `guesses` table
- [ ] Leaderboard auto-updates via trigger
- [ ] User's progress tracked (which emails seen)
- [ ] Score calculated correctly (10 points per correct guess)

### Leaderboard
- [ ] Leaderboard page displays top 100 users
- [ ] Shows username, high score, total guesses, accuracy
- [ ] Sorted by high score (descending)
- [ ] Current user's row highlighted
- [ ] Handles empty state gracefully

### Resources
- [ ] Resources page displays educational content
- [ ] Content includes: what is phishing, red flags, protection tips
- [ ] Links to external resources work

### UI/UX
- [ ] Responsive design (mobile + desktop)
- [ ] Dark mode support
- [ ] Loading states for async operations
- [ ] Error messages displayed clearly
- [ ] Navigation works between pages
- [ ] Consistent styling throughout

### API
- [ ] All 4 API endpoints implemented
- [ ] Proper error handling (400, 401, 500)
- [ ] RLS policies enforced
- [ ] Type-safe request/response types

### Deployment Readiness
- [ ] Environment variables documented
- [ ] Database schema SQL provided
- [ ] README with setup instructions
- [ ] No console errors in production build
- [ ] Build succeeds without errors
- [ ] TypeScript compiles without errors

---

## Architecture Decisions

1. **Emails in code (not DB)**: For MVP, emails stored in `src/data/emails.ts`. Faster iteration, no admin UI needed. Can migrate to DB later.

2. **Guesses table**: Each guess is a record. Enables analytics, replay, and accurate leaderboard calculation.

3. **Leaderboard as materialized table**: Updated via trigger for performance. Trade-off: slight delay, but fast reads.

4. **No game sessions**: Simplified to per-guess tracking. Can add sessions later if needed for "rounds" or "daily challenges".

5. **Client-side email selection**: `/api/emails/next` returns next email based on user's guess history. Simple sequential for MVP.

---

**Status**: ⏳ Awaiting approval to proceed with implementation

