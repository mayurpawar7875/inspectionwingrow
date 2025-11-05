-- Auto-complete market manager sessions at midnight
-- This function will mark all active sessions from previous days as 'completed'

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

-- Grant execute permission to authenticated users (though it runs as SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.auto_complete_market_manager_sessions() TO authenticated;

-- Enable pg_cron extension if not already enabled
-- Note: This requires superuser privileges and may need to be enabled by database admin
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at midnight UTC
-- Note: pg_cron runs in UTC
-- For midnight IST (UTC+5:30), use: '0 18 * * *' (18:30 UTC = 00:00 IST next day)
-- For midnight UTC (5:30 AM IST), use: '0 0 * * *'

-- Drop existing job if it exists to avoid duplicates
DO $$
BEGIN
  -- Unschedule if exists
  PERFORM cron.unschedule('auto-complete-market-manager-sessions');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

-- Schedule the job
-- For midnight IST (00:00 IST), we use 18:30 UTC (previous day)
-- IST is UTC+5:30, so 00:00 IST = 18:30 UTC previous day
SELECT cron.schedule(
  'auto-complete-market-manager-sessions',
  '30 18 * * *', -- Runs at 18:30 UTC = 00:00 IST (midnight IST)
  $$SELECT public.auto_complete_market_manager_sessions();$$
);

COMMENT ON FUNCTION public.auto_complete_market_manager_sessions() IS 
'Automatically completes market manager sessions from previous days. Scheduled to run daily at midnight IST (18:30 UTC).';

