-- SQL function to atomically update points and streak
-- This ensures points accumulate correctly in the database
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION update_user_points(
  p_user_id UUID,
  p_points_delta INTEGER,
  p_new_streak INTEGER,
  p_badges JSONB
)
RETURNS TABLE(points INTEGER, streak INTEGER, badges JSONB) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_points INTEGER;
  v_new_points INTEGER;
BEGIN
  -- Get current points
  SELECT COALESCE(points, 0) INTO v_current_points
  FROM profiles
  WHERE id = p_user_id;
  
  -- Calculate new points (cumulative)
  v_new_points := v_current_points + p_points_delta;
  
  -- Update profile
  UPDATE profiles
  SET 
    points = v_new_points,
    streak = p_new_streak,
    badges = p_badges,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Return updated values
  RETURN QUERY
  SELECT v_new_points, p_new_streak, p_badges;
END;
$$;

