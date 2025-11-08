-- Emails Table Setup for PhishGuard
-- Run this in Supabase SQL Editor
-- Creates the emails table with RLS policies

-- ============================================
-- 1. CREATE emails TABLE
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

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_emails_is_phish ON public.emails(is_phish);
CREATE INDEX IF NOT EXISTS idx_emails_difficulty ON public.emails(difficulty);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at DESC);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES FOR emails
-- ============================================

-- All authenticated users can read emails (for the game)
CREATE POLICY "emails_select_all"
  ON public.emails FOR SELECT
  USING (true);

-- Only service role (server) can insert emails
-- This prevents regular users from inserting
CREATE POLICY "emails_insert_service_role"
  ON public.emails FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Only service role (server) can update emails
CREATE POLICY "emails_update_service_role"
  ON public.emails FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Only service role (server) can delete emails
CREATE POLICY "emails_delete_service_role"
  ON public.emails FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- SETUP COMPLETE!
-- ============================================

-- Verify table was created
DO $$
BEGIN
  RAISE NOTICE 'Emails table created successfully!';
  RAISE NOTICE 'RLS enabled: All users can read, only service_role can insert/update/delete';
END $$;

