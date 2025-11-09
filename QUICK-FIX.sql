-- QUICK FIX for Internal Server Errors
-- Run this in Supabase SQL Editor to fix the issues

-- 1. Add missing accuracy column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'accuracy'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN accuracy NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added accuracy column to profiles';
  END IF;
END $$;

-- 2. Update existing profiles
UPDATE public.profiles 
SET accuracy = COALESCE(accuracy, 0)
WHERE accuracy IS NULL;

-- 3. Re-run the apply_guess function with the fixed badges handling
-- (The function is already updated in migration-apply-guess.sql, just need to run it)

