-- Create non_available_commodities table
CREATE TABLE public.non_available_commodities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  market_date DATE NOT NULL DEFAULT CURRENT_DATE,
  commodity_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.non_available_commodities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own non-available commodities"
  ON public.non_available_commodities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own non-available commodities"
  ON public.non_available_commodities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own non-available commodities"
  ON public.non_available_commodities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own non-available commodities"
  ON public.non_available_commodities FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all non-available commodities
CREATE POLICY "Admins can view all non-available commodities"
  ON public.non_available_commodities FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add indexes
CREATE INDEX idx_non_available_user_date ON public.non_available_commodities(user_id, market_date);
CREATE INDEX idx_non_available_market_date ON public.non_available_commodities(market_id, market_date);

-- Add updated_at trigger
CREATE TRIGGER update_non_available_commodities_updated_at
  BEFORE UPDATE ON public.non_available_commodities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();