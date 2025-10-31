-- Create a view for live markets today (IST timezone)
CREATE OR REPLACE VIEW live_markets_today AS
SELECT 
  m.id as market_id,
  m.name as market_name,
  m.city,
  COUNT(DISTINCT s.id) as active_sessions,
  COUNT(DISTINCT s.user_id) as active_employees,
  COUNT(sc.id) as stall_confirmations_count,
  COUNT(media.id) as media_uploads_count,
  MAX(media.captured_at) as last_upload_time,
  MAX(s.punch_in_time) as last_punch_in,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date as today_ist
FROM markets m
LEFT JOIN sessions s ON s.market_id = m.id 
  AND (s.session_date AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  AND s.status = 'active'
LEFT JOIN stall_confirmations sc ON sc.market_id = m.id 
  AND sc.market_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
LEFT JOIN media ON media.market_id = m.id 
  AND media.market_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
WHERE s.id IS NOT NULL -- Only include markets with active sessions today
GROUP BY m.id, m.name, m.city
ORDER BY last_upload_time DESC NULLS LAST;

-- Grant access to authenticated users
GRANT SELECT ON live_markets_today TO authenticated;