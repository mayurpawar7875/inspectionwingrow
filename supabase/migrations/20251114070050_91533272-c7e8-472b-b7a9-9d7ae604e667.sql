-- Fix the recalculate_attendance_on_task_change function to handle sessions table correctly
CREATE OR REPLACE FUNCTION public.recalculate_attendance_on_task_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_date DATE;
  v_role user_role;
BEGIN
  -- Determine user_id and date based on table
  IF TG_TABLE_NAME IN ('sessions', 'media', 'offers', 
                        'non_available_commodities', 'organiser_feedback', 'next_day_planning') THEN
    -- These tables use user_id
    v_user_id := NEW.user_id;
    v_date := COALESCE(NEW.market_date, NEW.session_date, DATE(NEW.created_at));
    
    -- Get user role
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_user_id AND role = 'employee' LIMIT 1;
    IF v_role IS NOT NULL THEN
      PERFORM public.calculate_attendance(v_user_id, v_date, v_role);
    END IF;
    
  ELSIF TG_TABLE_NAME = 'stall_confirmations' THEN
    -- This table uses created_by
    v_user_id := NEW.created_by;
    v_date := COALESCE(NEW.market_date, DATE(NEW.created_at));
    
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
$function$;