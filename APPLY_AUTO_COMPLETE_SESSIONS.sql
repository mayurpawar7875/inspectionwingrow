-- Auto-complete market manager sessions at midnight
-- Apply this migration to enable automatic completion of sessions

-- Create function to auto-complete old active sessions
CREATE OR REPLACE FUNCTION public.auto_complete_market_manager_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update all active sessions where session_date is before today
  -- This ensures sessions from previous days are automatically completed
  UPDATE public.market_manager_sessions
  SET 
    status = 'completed',
    updated_at = now()
  WHERE 
    status = 'active'
    AND session_date < CURRENT_DATE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auto_complete_market_manager_sessions() TO authenticated;

-- Enable pg_cron extension if not already enabled
-- Note: This requires superuser privileges
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at midnight IST
-- Note: IST is UTC+5:30, so midnight IST = 18:30 UTC (previous day)
-- For midnight IST, use: '30 18 * * *' (18:30 UTC = 00:00 IST)

-- Drop existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('auto-complete-market-manager-sessions');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Schedule for midnight IST (18:30 UTC)
SELECT cron.schedule(
  'auto-complete-market-manager-sessions',
  '30 18 * * *', -- Runs at 18:30 UTC = 00:00 IST (midnight IST)
  $$SELECT public.auto_complete_market_manager_sessions();$$
);

COMMENT ON FUNCTION public.auto_complete_market_manager_sessions() IS 
'Automatically completes market manager sessions from previous days. Scheduled to run daily at midnight IST (18:30 UTC).';

