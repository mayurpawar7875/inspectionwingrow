-- Ensure admins can view sessions and stall_confirmations
-- Sessions already has "Admins can view all sessions" policy, but let's verify stall_confirmations

-- Drop and recreate stall_confirmations policies to ensure admin access
DROP POLICY IF EXISTS "Admins can view all confirmations" ON public.stall_confirmations;
DROP POLICY IF EXISTS "Admins can manage confirmations" ON public.stall_confirmations;

-- Create comprehensive admin policies
CREATE POLICY "Admins can view all confirmations" 
ON public.stall_confirmations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage confirmations" 
ON public.stall_confirmations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Backfill stall_confirmations with missing metadata from sessions
UPDATE public.stall_confirmations sc
SET 
  market_id = COALESCE(sc.market_id, s.market_id),
  market_date = COALESCE(sc.market_date, COALESCE(s.market_date, s.session_date)),
  created_by = COALESCE(sc.created_by, s.user_id)
FROM public.sessions s
WHERE sc.created_by = s.user_id
  AND s.status = 'active'
  AND (sc.market_id IS NULL OR sc.market_date IS NULL);

-- Update the trigger function to also handle created_by if missing
CREATE OR REPLACE FUNCTION public.set_stall_confirmation_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_data RECORD;
BEGIN
  -- Get session data if not already provided
  IF NEW.market_id IS NULL OR NEW.market_date IS NULL OR NEW.created_by IS NULL THEN
    SELECT market_id, COALESCE(market_date, session_date) as date, user_id
    INTO session_data
    FROM public.sessions
    WHERE user_id = COALESCE(NEW.created_by, auth.uid())
      AND status = 'active'
    ORDER BY punch_in_time DESC
    LIMIT 1;
    
    NEW.market_id := COALESCE(NEW.market_id, session_data.market_id);
    NEW.market_date := COALESCE(NEW.market_date, session_data.date);
    NEW.created_by := COALESCE(NEW.created_by, session_data.user_id);
  END IF;
  
  RETURN NEW;
END;
$function$;