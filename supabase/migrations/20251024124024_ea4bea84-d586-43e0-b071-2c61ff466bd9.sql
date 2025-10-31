-- Create ENUM types for task tracking
CREATE TYPE task_type AS ENUM (
  'punch',
  'stall_confirm',
  'outside_rates',
  'selfie_gps',
  'rate_board',
  'market_video',
  'cleaning_video',
  'collection'
);

CREATE TYPE task_status_enum AS ENUM (
  'pending',
  'in_progress',
  'submitted',
  'locked'
);

-- Create task_events table for tracking all task submissions
CREATE TABLE public.task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  task_type task_type NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_late BOOLEAN NOT NULL DEFAULT false,
  file_url TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC
);

-- Create task_status table for current status of each task per session
CREATE TABLE public.task_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  task_type task_type NOT NULL,
  status task_status_enum NOT NULL DEFAULT 'pending',
  latest_event_id UUID REFERENCES public.task_events(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, task_type)
);

-- Add indexes for performance
CREATE INDEX idx_task_events_session_id ON public.task_events(session_id);
CREATE INDEX idx_task_events_created_at ON public.task_events(created_at DESC);
CREATE INDEX idx_task_events_task_type ON public.task_events(task_type);
CREATE INDEX idx_task_status_session_id ON public.task_status(session_id);

-- Enable Row Level Security
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_events
CREATE POLICY "Users can view their own task events"
  ON public.task_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = task_events.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own task events"
  ON public.task_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = task_events.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all task events"
  ON public.task_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for task_status
CREATE POLICY "Users can view their own task status"
  ON public.task_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = task_status.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own task status"
  ON public.task_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = task_status.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all task status"
  ON public.task_status FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_status;

-- Add market_date column to sessions if not exists (for easier queries)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS market_date DATE;

-- Update existing sessions to have market_date from session_date
UPDATE public.sessions SET market_date = session_date WHERE market_date IS NULL;