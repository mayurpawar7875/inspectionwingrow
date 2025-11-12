-- Create asset inventory table
CREATE TABLE IF NOT EXISTS public.asset_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_name TEXT NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  issued_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset requests table
CREATE TABLE IF NOT EXISTS public.asset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  requester_role TEXT NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.asset_inventory(id),
  quantity INTEGER NOT NULL,
  market_id UUID REFERENCES public.markets(id),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approval_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  rejection_reason TEXT,
  expected_return_date DATE,
  actual_return_date DATE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset payments table
CREATE TABLE IF NOT EXISTS public.asset_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.asset_requests(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.asset_inventory(id),
  payment_mode TEXT NOT NULL,
  amount_received NUMERIC NOT NULL,
  payment_proof_url TEXT,
  payment_date DATE NOT NULL,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_inventory
CREATE POLICY "Anyone can view asset inventory"
  ON public.asset_inventory FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage asset inventory"
  ON public.asset_inventory FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for asset_requests
CREATE POLICY "Users can view their own requests"
  ON public.asset_requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Users can create their own requests"
  ON public.asset_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own pending requests"
  ON public.asset_requests FOR UPDATE
  USING (auth.uid() = requester_id AND status = 'pending');

CREATE POLICY "Admins can view all requests"
  ON public.asset_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage all requests"
  ON public.asset_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for asset_payments
CREATE POLICY "Users can view their own payments"
  ON public.asset_payments FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Users can create their own payments"
  ON public.asset_payments FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Admins can view all payments"
  ON public.asset_payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage all payments"
  ON public.asset_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Function to update inventory on approval
CREATE OR REPLACE FUNCTION public.update_inventory_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.asset_inventory
    SET 
      available_quantity = available_quantity - NEW.quantity,
      issued_quantity = issued_quantity + NEW.quantity,
      updated_at = NOW()
    WHERE id = NEW.asset_id;
  END IF;
  
  IF NEW.status = 'returned' AND OLD.status = 'approved' THEN
    UPDATE public.asset_inventory
    SET 
      available_quantity = available_quantity + NEW.quantity,
      issued_quantity = issued_quantity - NEW.quantity,
      updated_at = NOW()
    WHERE id = NEW.asset_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update inventory
CREATE TRIGGER update_inventory_trigger
  AFTER UPDATE ON public.asset_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_on_approval();

-- Trigger for updated_at
CREATE TRIGGER update_asset_inventory_updated_at
  BEFORE UPDATE ON public.asset_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_asset_requests_updated_at
  BEFORE UPDATE ON public.asset_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_asset_payments_updated_at
  BEFORE UPDATE ON public.asset_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();