-- Create session_summaries table
CREATE TABLE public.session_summaries (
  session_id uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  stalls_count int NOT NULL DEFAULT 0,
  media_count int NOT NULL DEFAULT 0,
  late_uploads_count int NOT NULL DEFAULT 0,
  first_activity_at timestamp with time zone,
  last_activity_at timestamp with time zone,
  finalized_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own session summaries"
  ON public.session_summaries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_summaries.session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own session summaries"
  ON public.session_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_summaries.session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all session summaries"
  ON public.session_summaries
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update sessions enum to include 'completed' status
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'completed';

-- Create function to finalize session on punch out
CREATE OR REPLACE FUNCTION public.finalize_session_on_punchout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_stalls_count int;
  v_media_count int;
  v_late_count int;
  v_first_activity timestamp with time zone;
  v_last_activity timestamp with time zone;
BEGIN
  -- Only finalize when punch_out_time is set and status changes to completed
  IF NEW.punch_out_time IS NOT NULL AND NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Count stalls
    SELECT COUNT(*) INTO v_stalls_count
    FROM public.stalls
    WHERE session_id = NEW.id;
    
    -- Count media and late uploads
    SELECT COUNT(*), COALESCE(SUM(CASE WHEN is_late THEN 1 ELSE 0 END), 0)
    INTO v_media_count, v_late_count
    FROM public.media
    WHERE session_id = NEW.id;
    
    -- Get first and last activity times
    SELECT 
      LEAST(
        COALESCE((SELECT MIN(created_at) FROM public.stalls WHERE session_id = NEW.id), NOW()),
        COALESCE((SELECT MIN(captured_at) FROM public.media WHERE session_id = NEW.id), NOW()),
        COALESCE((SELECT MIN(created_at) FROM public.stall_confirmations 
                  WHERE market_id = NEW.market_id 
                    AND market_date = COALESCE(NEW.market_date, NEW.session_date)
                    AND created_by = NEW.user_id), NOW())
      ),
      GREATEST(
        COALESCE((SELECT MAX(created_at) FROM public.stalls WHERE session_id = NEW.id), NEW.punch_in_time),
        COALESCE((SELECT MAX(captured_at) FROM public.media WHERE session_id = NEW.id), NEW.punch_in_time),
        COALESCE((SELECT MAX(created_at) FROM public.stall_confirmations 
                  WHERE market_id = NEW.market_id 
                    AND market_date = COALESCE(NEW.market_date, NEW.session_date)
                    AND created_by = NEW.user_id), NEW.punch_in_time)
      )
    INTO v_first_activity, v_last_activity;
    
    -- Upsert session summary
    INSERT INTO public.session_summaries (
      session_id,
      stalls_count,
      media_count,
      late_uploads_count,
      first_activity_at,
      last_activity_at,
      finalized_at
    ) VALUES (
      NEW.id,
      v_stalls_count,
      v_media_count,
      v_late_count,
      v_first_activity,
      v_last_activity,
      NOW()
    )
    ON CONFLICT (session_id) 
    DO UPDATE SET
      stalls_count = EXCLUDED.stalls_count,
      media_count = EXCLUDED.media_count,
      late_uploads_count = EXCLUDED.late_uploads_count,
      first_activity_at = EXCLUDED.first_activity_at,
      last_activity_at = EXCLUDED.last_activity_at,
      finalized_at = EXCLUDED.finalized_at;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-finalization
CREATE TRIGGER finalize_session_trigger
  AFTER UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.finalize_session_on_punchout();