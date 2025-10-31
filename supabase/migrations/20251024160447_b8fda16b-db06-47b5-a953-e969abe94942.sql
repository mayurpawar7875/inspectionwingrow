-- Fix search_path security warnings by setting search_path on functions

-- Fix backfill_media_metadata function
CREATE OR REPLACE FUNCTION backfill_media_metadata()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.media m
  SET 
    user_id = s.user_id,
    market_id = s.market_id,
    market_date = COALESCE(s.market_date, s.session_date)
  FROM public.sessions s
  WHERE m.session_id = s.id
    AND (m.user_id IS NULL OR m.market_id IS NULL OR m.market_date IS NULL);
END;
$$;

-- Fix set_media_metadata trigger function
CREATE OR REPLACE FUNCTION set_media_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_data RECORD;
BEGIN
  -- Get session data if not already provided
  IF NEW.user_id IS NULL OR NEW.market_id IS NULL OR NEW.market_date IS NULL THEN
    SELECT user_id, market_id, COALESCE(market_date, session_date) as date
    INTO session_data
    FROM public.sessions
    WHERE id = NEW.session_id;
    
    NEW.user_id := COALESCE(NEW.user_id, session_data.user_id);
    NEW.market_id := COALESCE(NEW.market_id, session_data.market_id);
    NEW.market_date := COALESCE(NEW.market_date, session_data.date);
  END IF;
  
  RETURN NEW;
END;
$$;