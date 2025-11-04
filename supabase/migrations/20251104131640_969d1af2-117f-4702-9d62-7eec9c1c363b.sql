-- Add market_manager role if not exists
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'market_manager';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Market Manager Sessions table
CREATE TABLE IF NOT EXISTS public.market_manager_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee Allocations (Task 1)
CREATE TABLE IF NOT EXISTS public.employee_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id),
  employee_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Market Manager Punch-in (Task 2)
CREATE TABLE IF NOT EXISTS public.market_manager_punchin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  selfie_url TEXT NOT NULL,
  gps_lat NUMERIC NOT NULL,
  gps_lng NUMERIC NOT NULL,
  punched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Market Land Search (Task 3)
CREATE TABLE IF NOT EXISTS public.market_land_search (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  opening_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stall Searching Updates (Task 4)
CREATE TABLE IF NOT EXISTS public.stall_searching_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  stall_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  is_interested BOOLEAN NOT NULL DEFAULT false,
  joining_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assets Money Recovery (Task 5)
CREATE TABLE IF NOT EXISTS public.assets_money_recovery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  stall_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  received_amount NUMERIC NOT NULL DEFAULT 0,
  pending_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assets Usage (Task 6)
CREATE TABLE IF NOT EXISTS public.assets_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  market_id UUID NOT NULL REFERENCES public.markets(id),
  asset_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  return_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BMS Stall Feedbacks (Task 7)
CREATE TABLE IF NOT EXISTS public.bms_stall_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  feedback_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Market Inspection Updates (Task 8)
CREATE TABLE IF NOT EXISTS public.market_inspection_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id),
  update_notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Market Manager Punch-out (Task 9)
CREATE TABLE IF NOT EXISTS public.market_manager_punchout (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  gps_lat NUMERIC NOT NULL,
  gps_lng NUMERIC NOT NULL,
  punched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.market_manager_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_manager_punchin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_land_search ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stall_searching_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_money_recovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bms_stall_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_inspection_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_manager_punchout ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market_manager_sessions
CREATE POLICY "Market managers can create their sessions" ON public.market_manager_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'market_manager'));

CREATE POLICY "Market managers can view their sessions" ON public.market_manager_sessions
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Market managers can update their sessions" ON public.market_manager_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for employee_allocations
CREATE POLICY "Market managers can manage allocations" ON public.employee_allocations
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = employee_allocations.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- RLS Policies for market_manager_punchin
CREATE POLICY "Market managers can manage punch-in" ON public.market_manager_punchin
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = market_manager_punchin.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- RLS Policies for market_land_search
CREATE POLICY "Market managers can manage land search" ON public.market_land_search
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = market_land_search.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- RLS Policies for stall_searching_updates
CREATE POLICY "Market managers can manage stall search" ON public.stall_searching_updates
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = stall_searching_updates.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- RLS Policies for assets_money_recovery
CREATE POLICY "Market managers can manage money recovery" ON public.assets_money_recovery
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = assets_money_recovery.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- RLS Policies for assets_usage
CREATE POLICY "Market managers can manage assets usage" ON public.assets_usage
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = assets_usage.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- RLS Policies for bms_stall_feedbacks
CREATE POLICY "Market managers can manage feedbacks" ON public.bms_stall_feedbacks
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = bms_stall_feedbacks.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- RLS Policies for market_inspection_updates
CREATE POLICY "Market managers can manage inspections" ON public.market_inspection_updates
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = market_inspection_updates.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- RLS Policies for market_manager_punchout
CREATE POLICY "Market managers can manage punch-out" ON public.market_manager_punchout
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.market_manager_sessions 
    WHERE id = market_manager_punchout.session_id 
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- Create indexes for better performance
CREATE INDEX idx_mm_sessions_user_date ON public.market_manager_sessions(user_id, session_date);
CREATE INDEX idx_employee_allocations_session ON public.employee_allocations(session_id);
CREATE INDEX idx_mm_punchin_session ON public.market_manager_punchin(session_id);
CREATE INDEX idx_land_search_session ON public.market_land_search(session_id);
CREATE INDEX idx_stall_search_session ON public.stall_searching_updates(session_id);
CREATE INDEX idx_money_recovery_session ON public.assets_money_recovery(session_id);
CREATE INDEX idx_assets_usage_session ON public.assets_usage(session_id);
CREATE INDEX idx_feedbacks_session ON public.bms_stall_feedbacks(session_id);
CREATE INDEX idx_inspections_session ON public.market_inspection_updates(session_id);
CREATE INDEX idx_mm_punchout_session ON public.market_manager_punchout(session_id);