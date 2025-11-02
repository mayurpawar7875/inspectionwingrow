-- Create table for BDO market location submissions
-- This is separate from employee reporting and tracks BDO's market scouting activities
CREATE TABLE IF NOT EXISTS public.bdo_market_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bdo_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Market details
  market_name TEXT NOT NULL,
  market_opening_date DATE,
  google_map_location TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('society', 'residential_colony')),
  flats_occupancy TEXT,
  customer_reach TEXT,
  rent TEXT,
  
  -- Video/media
  video_url TEXT,
  video_file_name TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'market_created')),
  market_id UUID REFERENCES public.markets(id) ON DELETE SET NULL,
  
  -- Metadata
  submission_metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_bdo_submissions_bdo_user_id ON public.bdo_market_submissions(bdo_user_id);
CREATE INDEX idx_bdo_submissions_submission_date ON public.bdo_market_submissions(submission_date DESC);
CREATE INDEX idx_bdo_submissions_status ON public.bdo_market_submissions(status);
CREATE INDEX idx_bdo_submissions_market_id ON public.bdo_market_submissions(market_id);

-- Enable RLS
ALTER TABLE public.bdo_market_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- BDOs can view their own submissions
CREATE POLICY "BDOs can view their own submissions"
  ON public.bdo_market_submissions
  FOR SELECT
  USING (
    auth.uid() = bdo_user_id OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'bdo')
  );

-- BDOs can create their own submissions
CREATE POLICY "BDOs can create submissions"
  ON public.bdo_market_submissions
  FOR INSERT
  WITH CHECK (
    auth.uid() = bdo_user_id AND
    (public.has_role(auth.uid(), 'bdo') OR public.has_role(auth.uid(), 'admin'))
  );

-- BDOs can update their own pending submissions
CREATE POLICY "BDOs can update their own pending submissions"
  ON public.bdo_market_submissions
  FOR UPDATE
  USING (
    auth.uid() = bdo_user_id AND
    status = 'pending_review' AND
    (public.has_role(auth.uid(), 'bdo') OR public.has_role(auth.uid(), 'admin'))
  );

-- Admins can manage all submissions
CREATE POLICY "Admins can manage all submissions"
  ON public.bdo_market_submissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_bdo_market_submissions_updated_at
  BEFORE UPDATE ON public.bdo_market_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bdo_market_submissions;

