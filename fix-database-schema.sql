-- PhishGuard Database Schema Fix
-- Run this in Supabase SQL Editor to fix missing tables and columns
-- This script is idempotent (safe to run multiple times)

-- ============================================
-- 1. ADD MISSING COLUMNS TO profiles TABLE
-- ============================================

-- Add points column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'points'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN points INTEGER DEFAULT 0;
    RAISE NOTICE 'Added points column to profiles';
  ELSE
    RAISE NOTICE 'points column already exists';
  END IF;
END $$;

-- Add streak column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'streak'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN streak INTEGER DEFAULT 0;
    RAISE NOTICE 'Added streak column to profiles';
  ELSE
    RAISE NOTICE 'streak column already exists';
  END IF;
END $$;

-- Add badges column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'badges'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN badges JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added badges column to profiles';
  ELSE
    RAISE NOTICE 'badges column already exists';
  END IF;
END $$;

-- Update existing profiles to have default values
UPDATE public.profiles 
SET 
  points = COALESCE(points, 0),
  streak = COALESCE(streak, 0),
  badges = COALESCE(badges, '[]'::jsonb)
WHERE points IS NULL OR streak IS NULL OR badges IS NULL;

-- ============================================
-- 2. CREATE guesses TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id UUID NOT NULL,
  user_guess BOOLEAN NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate guesses for same user/email
  UNIQUE(user_id, email_id)
);

-- Create indexes for guesses table
CREATE INDEX IF NOT EXISTS idx_guesses_user_id ON public.guesses(user_id);
CREATE INDEX IF NOT EXISTS idx_guesses_email_id ON public.guesses(email_id);
CREATE INDEX IF NOT EXISTS idx_guesses_created_at ON public.guesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guesses_is_correct ON public.guesses(user_id, is_correct);

-- Enable RLS on guesses
ALTER TABLE public.guesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guesses
-- Users can view their own guesses
DROP POLICY IF EXISTS "guesses_select_own" ON public.guesses;
CREATE POLICY "guesses_select_own"
  ON public.guesses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own guesses
DROP POLICY IF EXISTS "guesses_insert_own" ON public.guesses;
CREATE POLICY "guesses_insert_own"
  ON public.guesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for seeding/admin)
DROP POLICY IF EXISTS "guesses_service_role" ON public.guesses;
CREATE POLICY "guesses_service_role"
  ON public.guesses FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 3. CREATE emails TABLE (if it doesn't exist)
-- ============================================

CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_phish BOOLEAN NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_email, subject)
);

-- Create indexes for emails table
CREATE INDEX IF NOT EXISTS idx_emails_is_phish ON public.emails(is_phish);
CREATE INDEX IF NOT EXISTS idx_emails_difficulty ON public.emails(difficulty);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at DESC);

-- Enable RLS on emails
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emails
-- All authenticated users can read emails (for the game)
DROP POLICY IF EXISTS "emails_select_all" ON public.emails;
CREATE POLICY "emails_select_all"
  ON public.emails FOR SELECT
  USING (true);

-- Only service role (server) can insert emails
DROP POLICY IF EXISTS "emails_insert_service_role" ON public.emails;
CREATE POLICY "emails_insert_service_role"
  ON public.emails FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Only service role (server) can update emails
DROP POLICY IF EXISTS "emails_update_service_role" ON public.emails;
CREATE POLICY "emails_update_service_role"
  ON public.emails FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Only service role (server) can delete emails
DROP POLICY IF EXISTS "emails_delete_service_role" ON public.emails;
CREATE POLICY "emails_delete_service_role"
  ON public.emails FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 4. ADD FOREIGN KEY FROM guesses TO emails
-- ============================================

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'guesses' 
    AND constraint_name = 'guesses_email_id_fkey'
  ) THEN
    ALTER TABLE public.guesses 
    ADD CONSTRAINT guesses_email_id_fkey 
    FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key from guesses to emails';
  ELSE
    RAISE NOTICE 'Foreign key from guesses to emails already exists';
  END IF;
END $$;

-- ============================================
-- 5. VERIFY SETUP
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database Schema Fix Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ profiles table: points, streak, badges columns added';
  RAISE NOTICE '✅ guesses table: created with RLS policies';
  RAISE NOTICE '✅ emails table: created with RLS policies';
  RAISE NOTICE '✅ Foreign keys: configured';
  RAISE NOTICE '========================================';
END $$;

