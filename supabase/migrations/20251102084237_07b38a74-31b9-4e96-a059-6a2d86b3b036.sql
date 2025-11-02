-- Create table for BDO market submissions (pending approval)
CREATE TABLE IF NOT EXISTS public.bdo_market_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  contact_person_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  opening_date DATE NOT NULL,
  photo_url TEXT,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bdo_market_submissions ENABLE ROW LEVEL SECURITY;

-- BDOs can insert their own submissions
CREATE POLICY "BDOs can create market submissions"
ON public.bdo_market_submissions
FOR INSERT
WITH CHECK (auth.uid() = submitted_by AND has_role(auth.uid(), 'bdo'::user_role));

-- BDOs can view their own submissions
CREATE POLICY "BDOs can view their own submissions"
ON public.bdo_market_submissions
FOR SELECT
USING (auth.uid() = submitted_by);

-- Admins can view all submissions
CREATE POLICY "Admins can view all market submissions"
ON public.bdo_market_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Admins can update submissions (for approval/rejection)
CREATE POLICY "Admins can update market submissions"
ON public.bdo_market_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create updated_at trigger
CREATE TRIGGER update_bdo_market_submissions_updated_at
BEFORE UPDATE ON public.bdo_market_submissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create table for BDO stall onboarding submissions
CREATE TABLE IF NOT EXISTS public.bdo_stall_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_name TEXT NOT NULL,
  stall_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  address TEXT NOT NULL,
  date_of_starting_markets DATE NOT NULL,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bdo_stall_submissions ENABLE ROW LEVEL SECURITY;

-- BDOs can insert their own submissions
CREATE POLICY "BDOs can create stall submissions"
ON public.bdo_stall_submissions
FOR INSERT
WITH CHECK (auth.uid() = submitted_by AND has_role(auth.uid(), 'bdo'::user_role));

-- BDOs can view their own submissions
CREATE POLICY "BDOs can view their own submissions"
ON public.bdo_stall_submissions
FOR SELECT
USING (auth.uid() = submitted_by);

-- Admins can view all submissions
CREATE POLICY "Admins can view all stall submissions"
ON public.bdo_stall_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Admins can update submissions
CREATE POLICY "Admins can update stall submissions"
ON public.bdo_stall_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create updated_at trigger
CREATE TRIGGER update_bdo_stall_submissions_updated_at
BEFORE UPDATE ON public.bdo_stall_submissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();