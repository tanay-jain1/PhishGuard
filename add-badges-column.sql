-- Add badges column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'badges'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN badges jsonb DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added badges column to profiles';
  ELSE
    RAISE NOTICE 'badges column already exists';
  END IF;
END $$;

-- Backfill NULL badges to '[]'
UPDATE public.profiles 
SET badges = '[]'::jsonb
WHERE badges IS NULL;

-- Create function to get user stats for badge computation
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_points INTEGER,
  total_correct INTEGER,
  easy_correct INTEGER,
  medium_correct INTEGER,
  hard_correct INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT points FROM profiles WHERE id = p_user_id), 0)::INTEGER as total_points,
    COUNT(*) FILTER (WHERE g.is_correct = true)::INTEGER as total_correct,
    COUNT(*) FILTER (WHERE g.is_correct = true AND e.difficulty = 'easy')::INTEGER as easy_correct,
    COUNT(*) FILTER (WHERE g.is_correct = true AND e.difficulty = 'medium')::INTEGER as medium_correct,
    COUNT(*) FILTER (WHERE g.is_correct = true AND e.difficulty = 'hard')::INTEGER as hard_correct
  FROM guesses g
  JOIN emails e ON e.id = g.email_id
  WHERE g.user_id = p_user_id;
END;
$$;
