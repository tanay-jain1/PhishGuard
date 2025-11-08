-- Add badges column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Update existing profiles to have empty badges array
UPDATE profiles 
SET badges = '[]'::jsonb 
WHERE badges IS NULL;

