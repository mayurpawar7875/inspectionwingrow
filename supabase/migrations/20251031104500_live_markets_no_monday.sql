-- Redefine live_markets_today to make Monday an off day (IST)
CREATE OR REPLACE VIEW public.live_markets_today AS
WITH now_ist AS (
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AS ts,
         (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AS d,
         EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'))::int AS dow
)
SELECT 
  m.id AS market_id,
  m.name AS market_name,
  m.city,
  COALESCE(COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active'), 0) AS active_sessions,
  COALESCE(COUNT(DISTINCT s.user_id) FILTER (WHERE s.status IN ('active','finalized')), 0) AS active_employees,
  COALESCE(COUNT(sc.id), 0) AS stall_confirmations_count,
  COALESCE(COUNT(media.id), 0) AS media_uploads_count,
  MAX(media.captured_at) AS last_upload_time,
  MAX(s.punch_in_time) AS last_punch_in,
  (SELECT d FROM now_ist) AS today_ist
FROM public.markets m
JOIN now_ist n ON true
LEFT JOIN public.sessions s 
  ON s.market_id = m.id 
  AND (s.session_date AT TIME ZONE 'Asia/Kolkata')::date = n.d
LEFT JOIN public.stall_confirmations sc 
  ON sc.market_id = m.id 
  AND sc.market_date = n.d
LEFT JOIN public.media 
  ON media.market_id = m.id 
  AND media.market_date = n.d
WHERE m.is_active = true
  AND m.day_of_week IS NOT NULL
  AND n.dow <> 1 -- Monday off day
  AND m.day_of_week = n.dow
GROUP BY m.id, m.name, m.city
ORDER BY last_upload_time DESC NULLS LAST, m.name;

GRANT SELECT ON public.live_markets_today TO authenticated;

