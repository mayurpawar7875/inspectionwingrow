-- Add status to profiles for employee management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive'));

-- Extend media table with time window tracking
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS allowed_start time NOT NULL DEFAULT '00:00:00';
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS allowed_end time NOT NULL DEFAULT '23:59:59';

-- Create stall_confirmations table
CREATE TABLE IF NOT EXISTS public.stall_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  market_date date NOT NULL,
  farmer_name text NOT NULL,
  stall_name text NOT NULL,
  stall_no text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on stall_confirmations
ALTER TABLE public.stall_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS policies for stall_confirmations
CREATE POLICY "Users can create stall confirmations"
  ON public.stall_confirmations
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own confirmations"
  ON public.stall_confirmations
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all confirmations"
  ON public.stall_confirmations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage confirmations"
  ON public.stall_confirmations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  market_date date NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  mode text NOT NULL CHECK (mode IN ('cash', 'upi', 'card', 'other')),
  collected_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- RLS policies for collections
CREATE POLICY "Users can create collections"
  ON public.collections
  FOR INSERT
  WITH CHECK (auth.uid() = collected_by);

CREATE POLICY "Users can view their own collections"
  ON public.collections
  FOR SELECT
  USING (auth.uid() = collected_by);

CREATE POLICY "Admins can view all collections"
  ON public.collections
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage collections"
  ON public.collections
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Add city and schedule fields to markets
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS schedule_json jsonb;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stall_confirmations_market_date ON public.stall_confirmations(market_id, market_date);
CREATE INDEX IF NOT EXISTS idx_collections_market_date ON public.collections(market_id, market_date);
CREATE INDEX IF NOT EXISTS idx_media_session_type ON public.media(session_id, media_type);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.stall_confirmations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;

-- Add policy for admins to manage profiles status
CREATE POLICY "Admins can update profile status"
  ON public.profiles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));