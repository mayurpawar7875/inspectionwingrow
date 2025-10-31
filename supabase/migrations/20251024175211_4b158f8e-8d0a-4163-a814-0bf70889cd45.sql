-- 1. RPC function to get or create a session
CREATE OR REPLACE FUNCTION public.get_or_create_session(
  p_user uuid,
  p_market uuid,
  p_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Try to find an existing session
  SELECT id INTO v_session_id
  FROM public.sessions
  WHERE user_id = p_user
    AND market_id = p_market
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
$$;

-- 2. Update media trigger to auto-create session
CREATE OR REPLACE FUNCTION public.set_media_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_data RECORD;
  v_user_id uuid;
  v_market_id uuid;
  v_market_date date;
  v_session_id uuid;
BEGIN
  -- Get user from auth or session
  v_user_id := COALESCE(NEW.user_id, auth.uid());
  
  -- If session_id is provided, get data from it
  IF NEW.session_id IS NOT NULL THEN
    SELECT user_id, market_id, COALESCE(market_date, session_date) as date, id
    INTO session_data
    FROM public.sessions
    WHERE id = NEW.session_id;
    
    v_user_id := COALESCE(v_user_id, session_data.user_id);
    v_market_id := COALESCE(NEW.market_id, session_data.market_id);
    v_market_date := COALESCE(NEW.market_date, session_data.date);
    v_session_id := NEW.session_id;
  ELSE
    -- No session_id provided, need to infer or create
    v_market_id := NEW.market_id;
    v_market_date := COALESCE(NEW.market_date, (NEW.captured_at AT TIME ZONE 'Asia/Kolkata')::date);
    
    -- Get or create session
    IF v_market_id IS NOT NULL AND v_user_id IS NOT NULL AND v_market_date IS NOT NULL THEN
      v_session_id := public.get_or_create_session(v_user_id, v_market_id, v_market_date);
    END IF;
  END IF;
  
  -- Set all metadata
  NEW.user_id := v_user_id;
  NEW.market_id := v_market_id;
  NEW.market_date := v_market_date;
  NEW.session_id := COALESCE(NEW.session_id, v_session_id);
  
  RETURN NEW;
END;
$$;

-- 3. Update stall_confirmations trigger to auto-create session
CREATE OR REPLACE FUNCTION public.set_stall_confirmation_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_market_id uuid;
  v_market_date date;
  v_session_id uuid;
BEGIN
  -- Get user from created_by or auth
  v_user_id := COALESCE(NEW.created_by, auth.uid());
  v_market_id := NEW.market_id;
  v_market_date := COALESCE(NEW.market_date, (NEW.created_at AT TIME ZONE 'Asia/Kolkata')::date);
  
  -- If market_id is missing, try to get from active session
  IF v_market_id IS NULL AND v_user_id IS NOT NULL THEN
    SELECT market_id, COALESCE(market_date, session_date) as date
    INTO v_market_id, v_market_date
    FROM public.sessions
    WHERE user_id = v_user_id
      AND status = 'active'
    ORDER BY punch_in_time DESC
    LIMIT 1;
  END IF;
  
  -- Get or create session if we have all required data
  IF v_user_id IS NOT NULL AND v_market_id IS NOT NULL AND v_market_date IS NOT NULL THEN
    v_session_id := public.get_or_create_session(v_user_id, v_market_id, v_market_date);
  END IF;
  
  -- Set metadata
  NEW.created_by := v_user_id;
  NEW.market_id := v_market_id;
  NEW.market_date := v_market_date;
  
  RETURN NEW;
END;
$$;

-- 4. Backfill existing media rows
UPDATE public.media m
SET 
  user_id = COALESCE(m.user_id, s.user_id),
  market_id = COALESCE(m.market_id, s.market_id),
  market_date = COALESCE(m.market_date, s.market_date, s.session_date)
FROM public.sessions s
WHERE m.session_id = s.id
  AND (m.user_id IS NULL OR m.market_id IS NULL OR m.market_date IS NULL);

-- 5. Backfill existing stall_confirmations rows
UPDATE public.stall_confirmations sc
SET 
  created_by = COALESCE(sc.created_by, s.user_id),
  market_id = COALESCE(sc.market_id, s.market_id),
  market_date = COALESCE(sc.market_date, s.market_date, s.session_date)
FROM public.sessions s
WHERE sc.market_date = COALESCE(s.market_date, s.session_date)
  AND (sc.created_by IS NULL OR sc.market_id IS NULL);

-- 6. Add admin RLS for sessions (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND policyname = 'Admins can manage all sessions'
  ) THEN
    CREATE POLICY "Admins can manage all sessions"
    ON public.sessions
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 7. Ensure stall_confirmations has admin SELECT policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stall_confirmations' 
    AND policyname = 'Admins can view all stall confirmations'
  ) THEN
    CREATE POLICY "Admins can view all stall confirmations"
    ON public.stall_confirmations
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;