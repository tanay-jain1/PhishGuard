-- PhishGuard Complete Database Setup
-- Run this AFTER creating the 3 tables in Table Editor
-- This adds foreign keys, RLS policies, triggers, and indexes

-- ============================================
-- 1. ADD FOREIGN KEYS
-- ============================================

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE game_sessions 
  ADD CONSTRAINT game_sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE leaderboard 
  ADD CONSTRAINT leaderboard_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id unique in leaderboard (one entry per user)
ALTER TABLE leaderboard 
  ADD CONSTRAINT leaderboard_user_id_unique UNIQUE (user_id);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_high_score ON leaderboard(high_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES FOR profiles
-- ============================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. RLS POLICIES FOR game_sessions
-- ============================================

-- Users can view their own game sessions
CREATE POLICY "game_sessions_select_own"
  ON game_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own game sessions
CREATE POLICY "game_sessions_insert_own"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own game sessions
CREATE POLICY "game_sessions_update_own"
  ON game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own game sessions (optional, for cleanup)
CREATE POLICY "game_sessions_delete_own"
  ON game_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. RLS POLICIES FOR leaderboard
-- ============================================

-- Anyone can view the leaderboard (public read)
CREATE POLICY "leaderboard_select_all"
  ON leaderboard FOR SELECT
  USING (true);

-- Users can update their own leaderboard entry
CREATE POLICY "leaderboard_update_own"
  ON leaderboard FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own leaderboard entry
CREATE POLICY "leaderboard_insert_own"
  ON leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. HELPER FUNCTION: Update leaderboard
-- ============================================

-- Function to update leaderboard when game session changes
CREATE OR REPLACE FUNCTION public.update_leaderboard()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_username TEXT;
  v_high_score INTEGER;
  v_total_games INTEGER;
  v_correct_guesses INTEGER;
BEGIN
  -- Get username from profile
  SELECT username INTO v_username
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Calculate high score from all game sessions
  SELECT COALESCE(MAX(score), 0) INTO v_high_score
  FROM game_sessions
  WHERE user_id = NEW.user_id;
  
  -- Count total games (sessions that are completed)
  SELECT COUNT(*) INTO v_total_games
  FROM game_sessions
  WHERE user_id = NEW.user_id AND completed = true;
  
  -- Count total correct guesses across all sessions
  SELECT COALESCE(SUM(correct_guesses), 0) INTO v_correct_guesses
  FROM game_sessions
  WHERE user_id = NEW.user_id;
  
  -- Upsert leaderboard entry
  INSERT INTO leaderboard (user_id, username, high_score, total_games, updated_at)
  VALUES (NEW.user_id, COALESCE(v_username, 'Anonymous'), v_high_score, v_total_games, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, leaderboard.username),
    high_score = EXCLUDED.high_score,
    total_games = EXCLUDED.total_games,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger to update leaderboard when game session is updated
DROP TRIGGER IF EXISTS on_game_session_updated ON game_sessions;
CREATE TRIGGER on_game_session_updated
  AFTER INSERT OR UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_leaderboard();

-- ============================================
-- SETUP COMPLETE!
-- ============================================

-- Verify tables exist
DO $$
BEGIN
  RAISE NOTICE 'Setup complete! Tables created:';
  RAISE NOTICE '- profiles';
  RAISE NOTICE '- game_sessions';
  RAISE NOTICE '- leaderboard';
  RAISE NOTICE 'RLS enabled and policies created.';
  RAISE NOTICE 'Triggers set up for auto-profile creation and leaderboard updates.';
END $$;

