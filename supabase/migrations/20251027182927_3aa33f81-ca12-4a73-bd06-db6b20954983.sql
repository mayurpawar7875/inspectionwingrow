-- Create table for stall inspections
CREATE TABLE public.stall_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  market_id UUID NOT NULL,
  market_date DATE NOT NULL DEFAULT CURRENT_DATE,
  farmer_name TEXT NOT NULL,
  has_tent BOOLEAN NOT NULL DEFAULT false,
  has_table BOOLEAN NOT NULL DEFAULT false,
  has_rateboard BOOLEAN NOT NULL DEFAULT false,
  has_flex BOOLEAN NOT NULL DEFAULT false,
  has_light BOOLEAN NOT NULL DEFAULT false,
  has_green_net BOOLEAN NOT NULL DEFAULT false,
  has_mat BOOLEAN NOT NULL DEFAULT false,
  has_digital_weighing_machine BOOLEAN NOT NULL DEFAULT false,
  has_display BOOLEAN NOT NULL DEFAULT false,
  has_apron BOOLEAN NOT NULL DEFAULT false,
  has_cap BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stall_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own stall inspections"
  ON public.stall_inspections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stall inspections"
  ON public.stall_inspections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stall inspections"
  ON public.stall_inspections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stall inspections"
  ON public.stall_inspections
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all stall inspections"
  ON public.stall_inspections
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_stall_inspections_updated_at
  BEFORE UPDATE ON public.stall_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_stall_inspections_user_date ON public.stall_inspections(user_id, market_date);
CREATE INDEX idx_stall_inspections_market_date ON public.stall_inspections(market_id, market_date);
CREATE INDEX idx_stall_inspections_farmer ON public.stall_inspections(farmer_name, market_date);