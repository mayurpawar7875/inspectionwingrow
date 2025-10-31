-- Create table for next day market planning
CREATE TABLE public.next_day_planning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  current_market_date DATE NOT NULL,
  next_day_market_name TEXT NOT NULL,
  stall_list TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.next_day_planning ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own next day planning"
  ON public.next_day_planning FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own next day planning"
  ON public.next_day_planning FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own next day planning"
  ON public.next_day_planning FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own next day planning"
  ON public.next_day_planning FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all next day planning"
  ON public.next_day_planning FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_next_day_planning_updated_at
  BEFORE UPDATE ON public.next_day_planning
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create index
CREATE INDEX idx_next_day_planning_user_date ON public.next_day_planning(user_id, current_market_date);