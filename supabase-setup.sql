-- PhishGuard Database Setup
-- Run this SQL in your Supabase SQL Editor
-- Make sure you're in the SQL Editor (not the Table Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant necessary permissions (run this first if you get permission errors)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '' UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure username is UNIQUE NOT NULL DEFAULT '' (alter if table already exists)
DO $$
BEGIN
  -- Add UNIQUE constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
  
  -- Set NOT NULL and DEFAULT if column is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'username'
    AND is_nullable = 'YES'
  ) THEN
    -- Set default for existing NULL values
    UPDATE public.profiles SET username = '' WHERE username IS NULL;
    -- Alter column to NOT NULL with DEFAULT
    ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN username SET DEFAULT '';
  END IF;
END $$;

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER DEFAULT 0,
  total_guesses INTEGER DEFAULT 0,
  correct_guesses INTEGER DEFAULT 0,
  current_email_index INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT NOT NULL,
  high_score INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table permissions
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Grant access to tables
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.game_sessions TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.leaderboard TO postgres, anon, authenticated, service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_high_score ON public.leaderboard(high_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON public.leaderboard(user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for game_sessions
CREATE POLICY "Users can view their own game sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions"
  ON public.game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for leaderboard
CREATE POLICY "Anyone can view leaderboard"
  ON public.leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own leaderboard entry"
  ON public.leaderboard FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leaderboard entry"
  ON public.leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically create profile on user signup
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
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- play_guess Function
-- ============================================
-- Ensure accuracy column exists in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'accuracy'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN accuracy NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Function to handle game guess logic with scoring, badges, and accuracy
CREATE OR REPLACE FUNCTION public.play_guess(
  user_id UUID,
  email_id UUID,
  guess_is_phish BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  email_row RECORD;
  correct BOOLEAN;
  base_points INTEGER;
  points_delta INTEGER;
  profile_row RECORD;
  corr_count INTEGER;
  tot_count INTEGER;
  unlocked_badges TEXT[] := ARRAY[]::TEXT[];
  current_badges TEXT[];
  new_badges TEXT[];
BEGIN
  -- 1. SELECT email row (is_phish, difficulty)
  SELECT is_phish, difficulty INTO email_row
  FROM public.emails
  WHERE id = email_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email not found' USING ERRCODE = 'P0001';
  END IF;
  
  -- 2. correct := (guess_is_phish = is_phish)
  correct := (guess_is_phish = email_row.is_phish);
  
  -- 3. base := CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  base_points := CASE email_row.difficulty
    WHEN 'easy' THEN 1
    WHEN 'medium' THEN 2
    ELSE 3
  END;
  
  -- 4. points_delta := CASE WHEN correct THEN base ELSE -1 END
  points_delta := CASE WHEN correct THEN base_points ELSE -1 END;
  
  -- 5. INSERT INTO guesses with ON CONFLICT handling
  BEGIN
    INSERT INTO public.guesses (
      user_id,
      email_id,
      user_guess,
      is_correct,
      points
    ) VALUES (
      user_id,
      email_id,
      guess_is_phish,
      correct,
      points_delta
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'already_guessed' USING ERRCODE = '23505';
  END;
  
  -- 6. UPDATE profiles: streak and points
  UPDATE public.profiles
  SET
    streak = CASE WHEN correct THEN streak + 1 ELSE 0 END,
    points = GREATEST(points + points_delta, 0),
    updated_at = NOW()
  WHERE id = user_id
  RETURNING points, streak, badges INTO profile_row;
  
  IF NOT FOUND THEN
    -- Create profile if it doesn't exist
    INSERT INTO public.profiles (id, email, points, streak, badges)
    VALUES (user_id, '', GREATEST(points_delta, 0), CASE WHEN correct THEN 1 ELSE 0 END, '[]'::JSONB)
    RETURNING points, streak, badges INTO profile_row;
  END IF;
  
  -- 7. Recompute accuracy
  SELECT
    COUNT(*) FILTER (WHERE is_correct = true),
    COUNT(*)
  INTO corr_count, tot_count
  FROM public.guesses
  WHERE public.guesses.user_id = play_guess.user_id;
  
  UPDATE public.profiles
  SET accuracy = CASE WHEN tot_count > 0 THEN (corr_count::NUMERIC / tot_count) ELSE 0 END
  WHERE id = user_id;
  
  -- 8. Badge unlocks
  -- Handle badges as JSONB array
  IF profile_row.badges IS NULL THEN
    current_badges := ARRAY[]::TEXT[];
  ELSIF jsonb_typeof(profile_row.badges) = 'array' THEN
    SELECT array_agg(value::TEXT) INTO current_badges
    FROM jsonb_array_elements_text(profile_row.badges);
  ELSE
    current_badges := ARRAY[]::TEXT[];
  END IF;
  
  -- Check for badge unlocks based on points
  IF profile_row.points >= 50 AND 'Analyst' != ALL(current_badges) THEN
    unlocked_badges := array_append(unlocked_badges, 'Analyst');
    new_badges := array_append(current_badges, 'Analyst');
  ELSIF profile_row.points >= 25 AND 'Apprentice' != ALL(current_badges) THEN
    unlocked_badges := array_append(unlocked_badges, 'Apprentice');
    new_badges := array_append(current_badges, 'Apprentice');
  ELSIF profile_row.points >= 10 AND 'Novice' != ALL(current_badges) THEN
    unlocked_badges := array_append(unlocked_badges, 'Novice');
    new_badges := array_append(current_badges, 'Novice');
  ELSE
    new_badges := current_badges;
  END IF;
  
  -- Update badges if any were unlocked
  IF array_length(unlocked_badges, 1) > 0 THEN
    UPDATE public.profiles
    SET badges = to_jsonb(new_badges)
    WHERE id = user_id;
  END IF;
  
  -- 9. RETURN JSON
  RETURN json_build_object(
    'correct', correct,
    'pointsDelta', points_delta,
    'profile', json_build_object(
      'points', profile_row.points,
      'streak', profile_row.streak,
      'accuracy', CASE WHEN tot_count > 0 THEN (corr_count::NUMERIC / tot_count) ELSE 0 END,
      'badges', COALESCE(new_badges, ARRAY[]::TEXT[])
    ),
    'difficulty', email_row.difficulty,
    'unlockedBadges', unlocked_badges
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.play_guess(UUID, UUID, BOOLEAN) TO authenticated, anon;
