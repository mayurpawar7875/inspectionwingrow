-- Create offers table for daily commodity offers
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  market_date DATE NOT NULL DEFAULT CURRENT_DATE,
  commodity_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('antic', 'leafy_vegetable', 'vegetable', 'exotic', 'onion_potato', 'fruit', 'seasonal')),
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own offers"
  ON public.offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own offers"
  ON public.offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offers"
  ON public.offers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offers"
  ON public.offers FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all offers
CREATE POLICY "Admins can view all offers"
  ON public.offers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add index for common queries
CREATE INDEX idx_offers_user_date ON public.offers(user_id, market_date);
CREATE INDEX idx_offers_market_date ON public.offers(market_id, market_date);

-- Add updated_at trigger
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();