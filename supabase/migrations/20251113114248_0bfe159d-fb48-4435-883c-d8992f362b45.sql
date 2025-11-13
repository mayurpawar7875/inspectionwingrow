-- Create attendance status enum
CREATE TYPE attendance_status AS ENUM ('full_day', 'half_day', 'absent', 'weekly_off');

-- Create attendance_rules table to define required tasks per role
CREATE TABLE public.attendance_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  task_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, task_type)
);

-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  role user_role NOT NULL,
  market_id UUID REFERENCES public.markets(id),
  city TEXT,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  status attendance_status NOT NULL DEFAULT 'absent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, attendance_date, role)
);

-- Enable RLS
ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_rules
CREATE POLICY "Admins can manage attendance rules"
  ON public.attendance_rules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view attendance rules"
  ON public.attendance_rules
  FOR SELECT
  USING (true);

-- RLS Policies for attendance_records
CREATE POLICY "Admins can view all attendance records"
  ON public.attendance_records
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own attendance records"
  ON public.attendance_records
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage attendance records"
  ON public.attendance_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default attendance rules for each role
INSERT INTO public.attendance_rules (role, task_type, is_required) VALUES
  -- Employee tasks
  ('employee', 'punch_in', true),
  ('employee', 'stall_confirmations', true),
  ('employee', 'media_uploads', true),
  ('employee', 'offers', false),
  ('employee', 'non_available_commodities', false),
  ('employee', 'organiser_feedback', false),
  ('employee', 'next_day_planning', false),
  
  -- Market Manager tasks
  ('market_manager', 'punch_in', true),
  ('market_manager', 'employee_allocations', true),
  ('market_manager', 'land_search', false),
  ('market_manager', 'stall_searching', false),
  ('market_manager', 'assets_recovery', false),
  ('market_manager', 'assets_usage', false),
  ('market_manager', 'stall_feedbacks', false),
  ('market_manager', 'inspection_updates', false),
  ('market_manager', 'punch_out', true),
  
  -- BDO tasks
  ('bdo', 'market_submissions', true),
  ('bdo', 'stall_submissions', true);

-- Function to calculate attendance for a user on a specific date and role
CREATE OR REPLACE FUNCTION public.calculate_attendance(
  p_user_id UUID,
  p_date DATE,
  p_role user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_market_id UUID;
  v_city TEXT;
  v_total_tasks INTEGER := 0;
  v_completed_tasks INTEGER := 0;
  v_status attendance_status;
  v_session_id UUID;
BEGIN
  -- Check if it's Monday (1 = Monday in PostgreSQL)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  IF v_day_of_week = 1 THEN
    -- Monday is weekly off
    INSERT INTO public.attendance_records (user_id, attendance_date, role, status, total_tasks, completed_tasks)
    VALUES (p_user_id, p_date, p_role, 'weekly_off', 0, 0)
    ON CONFLICT (user_id, attendance_date, role) 
    DO UPDATE SET 
      status = 'weekly_off',
      total_tasks = 0,
      completed_tasks = 0,
      updated_at = now();
    RETURN;
  END IF;
  
  -- Get required tasks for this role
  SELECT COUNT(*) INTO v_total_tasks
  FROM public.attendance_rules
  WHERE role = p_role AND is_required = true;
  
  -- Calculate completed tasks based on role
  IF p_role = 'employee' THEN
    -- Get session info
    SELECT id, market_id INTO v_session_id, v_market_id
    FROM public.sessions
    WHERE user_id = p_user_id 
      AND COALESCE(market_date, session_date) = p_date
    ORDER BY punch_in_time DESC NULLS LAST
    LIMIT 1;
    
    IF v_session_id IS NOT NULL THEN
      -- Get city from market
      SELECT city INTO v_city FROM public.markets WHERE id = v_market_id;
      
      -- Check punch_in
      IF EXISTS (SELECT 1 FROM public.attendance_rules WHERE role = p_role AND task_type = 'punch_in' AND is_required) THEN
        IF (SELECT punch_in_time FROM public.sessions WHERE id = v_session_id) IS NOT NULL THEN
          v_completed_tasks := v_completed_tasks + 1;
        END IF;
      END IF;
      
      -- Check stall_confirmations
      IF EXISTS (SELECT 1 FROM public.attendance_rules WHERE role = p_role AND task_type = 'stall_confirmations' AND is_required) THEN
        IF EXISTS (SELECT 1 FROM public.stall_confirmations WHERE created_by = p_user_id AND market_date = p_date) THEN
          v_completed_tasks := v_completed_tasks + 1;
        END IF;
      END IF;
      
      -- Check media_uploads
      IF EXISTS (SELECT 1 FROM public.attendance_rules WHERE role = p_role AND task_type = 'media_uploads' AND is_required) THEN
        IF EXISTS (SELECT 1 FROM public.media WHERE user_id = p_user_id AND market_date = p_date) THEN
          v_completed_tasks := v_completed_tasks + 1;
        END IF;
      END IF;
    END IF;
    
  ELSIF p_role = 'market_manager' THEN
    -- Get market manager session
    SELECT id INTO v_session_id
    FROM public.market_manager_sessions
    WHERE user_id = p_user_id AND session_date = p_date
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_session_id IS NOT NULL THEN
      -- Check punch_in
      IF EXISTS (SELECT 1 FROM public.attendance_rules WHERE role = p_role AND task_type = 'punch_in' AND is_required) THEN
        IF EXISTS (SELECT 1 FROM public.market_manager_punchin WHERE session_id = v_session_id) THEN
          v_completed_tasks := v_completed_tasks + 1;
        END IF;
      END IF;
      
      -- Check employee_allocations
      IF EXISTS (SELECT 1 FROM public.attendance_rules WHERE role = p_role AND task_type = 'employee_allocations' AND is_required) THEN
        IF EXISTS (SELECT 1 FROM public.employee_allocations WHERE session_id = v_session_id) THEN
          v_completed_tasks := v_completed_tasks + 1;
        END IF;
      END IF;
      
      -- Check punch_out
      IF EXISTS (SELECT 1 FROM public.attendance_rules WHERE role = p_role AND task_type = 'punch_out' AND is_required) THEN
        IF EXISTS (SELECT 1 FROM public.market_manager_punchout WHERE session_id = v_session_id) THEN
          v_completed_tasks := v_completed_tasks + 1;
        END IF;
      END IF;
    END IF;
    
  ELSIF p_role = 'bdo' THEN
    -- Check BDO submissions
    IF EXISTS (SELECT 1 FROM public.attendance_rules WHERE role = p_role AND task_type = 'market_submissions' AND is_required) THEN
      IF EXISTS (SELECT 1 FROM public.bdo_market_submissions WHERE submitted_by = p_user_id AND DATE(submitted_at) = p_date) THEN
        v_completed_tasks := v_completed_tasks + 1;
      END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.attendance_rules WHERE role = p_role AND task_type = 'stall_submissions' AND is_required) THEN
      IF EXISTS (SELECT 1 FROM public.bdo_stall_submissions WHERE submitted_by = p_user_id AND DATE(submitted_at) = p_date) THEN
        v_completed_tasks := v_completed_tasks + 1;
      END IF;
    END IF;
  END IF;
  
  -- Determine status
  IF v_completed_tasks = 0 THEN
    v_status := 'absent';
  ELSIF v_completed_tasks >= v_total_tasks THEN
    v_status := 'full_day';
  ELSE
    v_status := 'half_day';
  END IF;
  
  -- Insert or update attendance record
  INSERT INTO public.attendance_records (
    user_id, attendance_date, role, market_id, city,
    total_tasks, completed_tasks, status
  )
  VALUES (
    p_user_id, p_date, p_role, v_market_id, v_city,
    v_total_tasks, v_completed_tasks, v_status
  )
  ON CONFLICT (user_id, attendance_date, role)
  DO UPDATE SET
    market_id = EXCLUDED.market_id,
    city = EXCLUDED.city,
    total_tasks = EXCLUDED.total_tasks,
    completed_tasks = EXCLUDED.completed_tasks,
    status = EXCLUDED.status,
    updated_at = now();
END;
$$;

-- Function to recalculate attendance on task changes
CREATE OR REPLACE FUNCTION public.recalculate_attendance_on_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
  v_role user_role;
BEGIN
  -- Determine user_id and date based on table
  IF TG_TABLE_NAME IN ('sessions', 'stall_confirmations', 'media', 'offers', 
                        'non_available_commodities', 'organiser_feedback', 'next_day_planning') THEN
    v_user_id := COALESCE(NEW.user_id, NEW.created_by);
    v_date := COALESCE(NEW.market_date, NEW.session_date, DATE(NEW.created_at));
    
    -- Get user role
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_user_id AND role = 'employee' LIMIT 1;
    IF v_role IS NOT NULL THEN
      PERFORM public.calculate_attendance(v_user_id, v_date, v_role);
    END IF;
    
  ELSIF TG_TABLE_NAME IN ('market_manager_sessions', 'market_manager_punchin', 
                           'market_manager_punchout', 'employee_allocations', 
                           'market_land_search', 'stall_searching_updates',
                           'assets_money_recovery', 'assets_usage', 
                           'bms_stall_feedbacks', 'market_inspection_updates') THEN
    IF TG_TABLE_NAME = 'market_manager_sessions' THEN
      v_user_id := NEW.user_id;
      v_date := NEW.session_date;
    ELSE
      -- Get user from session
      SELECT user_id, session_date INTO v_user_id, v_date
      FROM public.market_manager_sessions
      WHERE id = NEW.session_id;
    END IF;
    
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_user_id AND role = 'market_manager' LIMIT 1;
    IF v_role IS NOT NULL THEN
      PERFORM public.calculate_attendance(v_user_id, v_date, v_role);
    END IF;
    
  ELSIF TG_TABLE_NAME IN ('bdo_market_submissions', 'bdo_stall_submissions') THEN
    v_user_id := NEW.submitted_by;
    v_date := DATE(NEW.submitted_at);
    
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_user_id AND role = 'bdo' LIMIT 1;
    IF v_role IS NOT NULL THEN
      PERFORM public.calculate_attendance(v_user_id, v_date, v_role);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers on all relevant tables
CREATE TRIGGER recalc_attendance_sessions
  AFTER INSERT OR UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

CREATE TRIGGER recalc_attendance_stall_confirmations
  AFTER INSERT OR UPDATE ON public.stall_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

CREATE TRIGGER recalc_attendance_media
  AFTER INSERT OR UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

CREATE TRIGGER recalc_attendance_mm_sessions
  AFTER INSERT OR UPDATE ON public.market_manager_sessions
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

CREATE TRIGGER recalc_attendance_mm_punchin
  AFTER INSERT OR UPDATE ON public.market_manager_punchin
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

CREATE TRIGGER recalc_attendance_mm_punchout
  AFTER INSERT OR UPDATE ON public.market_manager_punchout
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

CREATE TRIGGER recalc_attendance_employee_allocations
  AFTER INSERT OR UPDATE ON public.employee_allocations
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

CREATE TRIGGER recalc_attendance_bdo_markets
  AFTER INSERT OR UPDATE ON public.bdo_market_submissions
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

CREATE TRIGGER recalc_attendance_bdo_stalls
  AFTER INSERT OR UPDATE ON public.bdo_stall_submissions
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_attendance_on_task_change();

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at_attendance_rules
  BEFORE UPDATE ON public.attendance_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_attendance_records
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();