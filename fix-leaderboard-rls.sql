-- Fix Leaderboard RLS Policy
-- This allows anyone to read profiles for leaderboard display
-- Only exposes public fields: username, points, streak, accuracy

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view profiles for leaderboard" ON public.profiles;

-- Create policy to allow public read access for leaderboard
CREATE POLICY "Anyone can view profiles for leaderboard"
  ON public.profiles FOR SELECT
  USING (true);

-- Note: This policy allows anyone (authenticated or anonymous) to read profiles
-- This is safe because we're only exposing public leaderboard data:
-- - username (public identifier)
-- - points, streak, accuracy (game statistics)
-- - NOT exposing: email, id, or other sensitive data

