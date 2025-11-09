-- Update the get_or_create_session function to use existing session for the day
-- regardless of market_id to avoid duplicate session errors
CREATE OR REPLACE FUNCTION public.get_or_create_session(p_user uuid, p_market uuid, p_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_session_id uuid;
BEGIN
  -- Try to find an existing session for this user and date (any market)
  SELECT id INTO v_session_id
  FROM public.sessions
  WHERE user_id = p_user
    AND COALESCE(market_date, session_date) = p_date
  ORDER BY punch_in_time DESC NULLS LAST, created_at DESC
  LIMIT 1;
  
  -- If no session exists, create one
  IF v_session_id IS NULL THEN
    INSERT INTO public.sessions (
      user_id,
      market_id,
      market_date,
      session_date,
      status,
      punch_in_time
    ) VALUES (
      p_user,
      p_market,
      p_date,
      p_date,
      'active',
      NOW()
    )
    RETURNING id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$function$;