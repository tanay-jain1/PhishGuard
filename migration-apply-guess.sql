-- Migration: apply_guess function
-- Creates a SECURITY DEFINER function to handle guess logic with transactions, badges, and streak bonuses

CREATE OR REPLACE FUNCTION public.apply_guess(
  p_user UUID,
  p_email UUID,
  p_guess BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_phish BOOLEAN;
  v_correct BOOLEAN;
  v_base_points INTEGER;
  v_points_delta INTEGER;
  v_streak_bonus INTEGER := 0;
  v_new_streak INTEGER;
  v_old_streak INTEGER;
  v_old_points INTEGER;
  v_new_points INTEGER;
  v_difficulty TEXT;
  v_unlocked_badges TEXT[] := ARRAY[]::TEXT[];
  v_current_badges TEXT[];
  v_new_badges TEXT[];
  v_correct_count INTEGER;
  v_total_count INTEGER;
  v_easy_correct INTEGER;
  v_medium_correct INTEGER;
  v_hard_correct INTEGER;
  v_badges_jsonb JSONB;
  v_response_badges TEXT[] := ARRAY[]::TEXT[];
  v_final_accuracy NUMERIC;
BEGIN
  -- Start transaction (implicit in function)
  
  -- 1. Load email and compute correct
  SELECT is_phish, difficulty INTO v_is_phish, v_difficulty
  FROM public.emails
  WHERE id = p_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email not found' USING ERRCODE = 'P0001';
  END IF;
  
  v_correct := (p_guess = v_is_phish);
  
  -- 2. Determine base points: Easy=1, Medium=2, Hard=3
  v_base_points := CASE v_difficulty
    WHEN 'easy' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'hard' THEN 3
    ELSE 1
  END;
  
  -- 3. Calculate points delta: if incorrect, delta = -1; if correct, delta = base_points
  IF v_correct THEN
    v_points_delta := v_base_points;
  ELSE
    v_points_delta := -1;
  END IF;
  
  -- 4. Get current profile state
  SELECT COALESCE(points, 0), COALESCE(streak, 0), COALESCE(badges, '[]'::JSONB)
  INTO v_old_points, v_old_streak, v_badges_jsonb
  FROM public.profiles
  WHERE id = p_user;
  
  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, points, streak, badges, accuracy)
    VALUES (p_user, '', 0, 0, '[]'::JSONB, 0)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT COALESCE(points, 0), COALESCE(streak, 0), COALESCE(badges, '[]'::JSONB)
    INTO v_old_points, v_old_streak, v_badges_jsonb
    FROM public.profiles
    WHERE id = p_user;
  END IF;
  
  -- Convert badges JSONB to text array immediately
  IF v_badges_jsonb IS NULL OR jsonb_typeof(v_badges_jsonb) != 'array' THEN
    v_current_badges := ARRAY[]::TEXT[];
  ELSIF jsonb_array_length(v_badges_jsonb) = 0 THEN
    v_current_badges := ARRAY[]::TEXT[];
  ELSE
    SELECT COALESCE(array_agg(value::TEXT), ARRAY[]::TEXT[]) INTO v_current_badges
    FROM jsonb_array_elements_text(v_badges_jsonb);
  END IF;
  
  -- 5. Calculate new streak and check for streak bonus
  IF v_correct THEN
    v_new_streak := v_old_streak + 1;
    -- If streak after correct is a multiple of 5, add +1 bonus
    IF v_new_streak > 0 AND v_new_streak % 5 = 0 THEN
      v_streak_bonus := 1;
    END IF;
  ELSE
    v_new_streak := 0;
  END IF;
  
  -- Add streak bonus to points delta
  v_points_delta := v_points_delta + v_streak_bonus;
  
  -- 6. Check if already guessed
  IF EXISTS (
    SELECT 1 FROM public.guesses
    WHERE user_id = p_user AND email_id = p_email
  ) THEN
    RAISE EXCEPTION 'already_guessed' USING ERRCODE = '23505';
  END IF;
  
  -- Insert into guesses
  INSERT INTO public.guesses (
    user_id,
    email_id,
    user_guess,
    is_correct,
    points
  )
  VALUES (
    p_user,
    p_email,
    p_guess,
    v_correct,
    v_points_delta
  );
  
  -- 7. Update profiles: points and streak
  v_new_points := GREATEST(0, v_old_points + v_points_delta);
  
  -- Ensure points and streak are never NULL
  UPDATE public.profiles
  SET
    points = COALESCE(v_new_points, 0),
    streak = COALESCE(v_new_streak, 0),
    updated_at = NOW()
  WHERE id = p_user;
  
  -- Verify the update worked
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update profile' USING ERRCODE = 'P0002';
  END IF;
  
  -- 8. Recompute accuracy = avg(correct) over guesses
  SELECT
    COUNT(*) FILTER (WHERE is_correct = true),
    COUNT(*)
  INTO v_correct_count, v_total_count
  FROM public.guesses
  WHERE user_id = p_user;
  
  UPDATE public.profiles
  SET accuracy = CASE 
    WHEN v_total_count > 0 THEN (v_correct_count::NUMERIC / v_total_count)
    ELSE 0
  END
  WHERE id = p_user;
  
  -- 9. Award badges based on thresholds
  -- Count correct guesses by difficulty
  SELECT
    COUNT(*) FILTER (WHERE g.is_correct = true AND e.difficulty = 'easy'),
    COUNT(*) FILTER (WHERE g.is_correct = true AND e.difficulty = 'medium'),
    COUNT(*) FILTER (WHERE g.is_correct = true AND e.difficulty = 'hard')
  INTO v_easy_correct, v_medium_correct, v_hard_correct
  FROM public.guesses g
  JOIN public.emails e ON e.id = g.email_id
  WHERE g.user_id = p_user;
  
  -- v_current_badges is already converted above, no need to convert again
  
  v_new_badges := v_current_badges;
  
  -- Easy Eagle: 10 easy correct
  IF v_easy_correct >= 10 AND 'Easy Eagle' != ALL(v_current_badges) THEN
    v_unlocked_badges := array_append(v_unlocked_badges, 'Easy Eagle');
    v_new_badges := array_append(v_new_badges, 'Easy Eagle');
  END IF;
  
  -- Medium Maverick: 8 medium correct
  IF v_medium_correct >= 8 AND 'Medium Maverick' != ALL(v_current_badges) THEN
    v_unlocked_badges := array_append(v_unlocked_badges, 'Medium Maverick');
    v_new_badges := array_append(v_new_badges, 'Medium Maverick');
  END IF;
  
  -- Hard Hawk: 6 hard correct
  IF v_hard_correct >= 6 AND 'Hard Hawk' != ALL(v_current_badges) THEN
    v_unlocked_badges := array_append(v_unlocked_badges, 'Hard Hawk');
    v_new_badges := array_append(v_new_badges, 'Hard Hawk');
  END IF;
  
  -- Update badges if any were unlocked
  IF array_length(v_unlocked_badges, 1) > 0 THEN
    UPDATE public.profiles
    SET badges = to_jsonb(v_new_badges)
    WHERE id = p_user;
  END IF;
  
  -- 10. Get final profile state to return (after all updates)
  SELECT COALESCE(points, 0), COALESCE(streak, 0), COALESCE(accuracy, 0), badges
  INTO v_new_points, v_new_streak, v_final_accuracy, v_badges_jsonb
  FROM public.profiles
  WHERE id = p_user;
  
  -- Convert badges for response
  IF v_badges_jsonb IS NOT NULL AND jsonb_typeof(v_badges_jsonb) = 'array' AND jsonb_array_length(v_badges_jsonb) > 0 THEN
    SELECT COALESCE(array_agg(value::TEXT), ARRAY[]::TEXT[]) INTO v_response_badges
    FROM jsonb_array_elements_text(v_badges_jsonb);
  ELSE
    v_response_badges := ARRAY[]::TEXT[];
  END IF;
  
  -- 11. Return JSON with updated profile data
  RETURN jsonb_build_object(
    'correct', v_correct,
    'pointsDelta', v_points_delta,
    'difficulty', v_difficulty,
    'unlockedBadges', v_unlocked_badges,
    'profile', jsonb_build_object(
      'points', v_new_points,
      'streak', v_new_streak,
      'accuracy', COALESCE(v_final_accuracy, 0),
      'badges', to_jsonb(v_response_badges)
    )
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'already_guessed' USING ERRCODE = '23505';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.apply_guess(UUID, UUID, BOOLEAN) TO authenticated, anon;

