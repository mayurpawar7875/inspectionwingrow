-- Daily Market Schedule controlled by Admins
CREATE TABLE IF NOT EXISTS public.market_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (market_id, schedule_date)
);

-- RLS
ALTER TABLE public.market_schedule ENABLE ROW LEVEL SECURITY;

-- Policies: allow admins full access, authenticated read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'market_schedule' 
      AND policyname = 'Admins can manage market schedule'
  ) THEN
    CREATE POLICY "Admins can manage market schedule"
      ON public.market_schedule
      FOR ALL
      USING (has_role(auth.uid(), 'admin'::user_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'market_schedule' 
      AND policyname = 'Authenticated can view market schedule'
  ) THEN
    CREATE POLICY "Authenticated can view market schedule"
      ON public.market_schedule
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_market_schedule_date ON public.market_schedule(schedule_date);
CREATE INDEX IF NOT EXISTS idx_market_schedule_market ON public.market_schedule(market_id);

-- Redefine live_markets_today to be based on admin schedule (IST day)
CREATE OR REPLACE VIEW public.live_markets_today AS
WITH today AS (
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AS d
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
  (SELECT d FROM today) AS today_ist
FROM public.market_schedule ms
JOIN today t ON true
JOIN public.markets m ON m.id = ms.market_id
LEFT JOIN public.sessions s 
  ON s.market_id = m.id 
  AND (s.session_date AT TIME ZONE 'Asia/Kolkata')::date = t.d
LEFT JOIN public.stall_confirmations sc 
  ON sc.market_id = m.id 
  AND sc.market_date = t.d
LEFT JOIN public.media 
  ON media.market_id = m.id 
  AND media.market_date = t.d
WHERE ms.schedule_date = t.d
GROUP BY m.id, m.name, m.city
ORDER BY last_upload_time DESC NULLS LAST, m.name;

GRANT SELECT ON public.live_markets_today TO authenticated;

