-- Create trigger function to auto-populate stall_confirmations metadata from active session
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
  IF NEW.market_id IS NULL OR NEW.market_date IS NULL THEN
    SELECT market_id, COALESCE(market_date, session_date) as date
    INTO session_data
    FROM public.sessions
    WHERE user_id = NEW.created_by
      AND status = 'active'
    ORDER BY punch_in_time DESC
    LIMIT 1;
    
    NEW.market_id := COALESCE(NEW.market_id, session_data.market_id);
    NEW.market_date := COALESCE(NEW.market_date, session_data.date);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on stall_confirmations
DROP TRIGGER IF EXISTS set_stall_confirmation_metadata_trigger ON public.stall_confirmations;
CREATE TRIGGER set_stall_confirmation_metadata_trigger
  BEFORE INSERT ON public.stall_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stall_confirmation_metadata();

-- Backfill existing stall_confirmations with missing metadata
UPDATE public.stall_confirmations sc
SET 
  market_id = COALESCE(sc.market_id, s.market_id),
  market_date = COALESCE(sc.market_date, COALESCE(s.market_date, s.session_date))
FROM public.sessions s
WHERE sc.created_by = s.user_id
  AND (sc.market_id IS NULL OR sc.market_date IS NULL)
  AND s.status = 'active';