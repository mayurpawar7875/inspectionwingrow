-- Update RLS policies to allow BDO and Market Manager to view employee reporting data

-- attendance_records: Allow BDO and Market Manager to view all records
DROP POLICY IF EXISTS "Admins can view all attendance records" ON public.attendance_records;
CREATE POLICY "Admins, BDO, and Market Managers can view all attendance records"
ON public.attendance_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager')
);

-- sessions: Allow BDO and Market Manager to view all sessions
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sessions;
CREATE POLICY "Admins, BDO, and Market Managers can view all sessions"
ON public.sessions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = user_id
);

-- task_events: Allow BDO and Market Manager to view all task events
DROP POLICY IF EXISTS "Admins can view all task events" ON public.task_events;
CREATE POLICY "Admins, BDO, and Market Managers can view all task events"
ON public.task_events
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = task_events.session_id 
    AND sessions.user_id = auth.uid()
  )
);

-- media: Allow BDO and Market Manager to view all media
DROP POLICY IF EXISTS "Admins can view all media" ON public.media;
CREATE POLICY "Admins, BDO, and Market Managers can view all media"
ON public.media
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = media.session_id 
    AND sessions.user_id = auth.uid()
  )
);

-- stalls: Allow BDO and Market Manager to view all stalls
DROP POLICY IF EXISTS "Admins can view all stalls" ON public.stalls;
CREATE POLICY "Admins, BDO, and Market Managers can view all stalls"
ON public.stalls
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = stalls.session_id 
    AND sessions.user_id = auth.uid()
  )
);

-- stall_confirmations: Allow BDO and Market Manager to view all confirmations
DROP POLICY IF EXISTS "Admins can view all stall confirmations" ON public.stall_confirmations;
DROP POLICY IF EXISTS "Admins can view all confirmations" ON public.stall_confirmations;
CREATE POLICY "Admins, BDO, and Market Managers can view all confirmations"
ON public.stall_confirmations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = created_by
);

-- offers: Allow BDO and Market Manager to view all offers
DROP POLICY IF EXISTS "Admins can view all offers" ON public.offers;
CREATE POLICY "Admins, BDO, and Market Managers can view all offers"
ON public.offers
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = user_id
);

-- non_available_commodities: Allow BDO and Market Manager to view all
DROP POLICY IF EXISTS "Admins can view all non-available commodities" ON public.non_available_commodities;
CREATE POLICY "Admins, BDO, and Market Managers can view all non-available commodities"
ON public.non_available_commodities
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = user_id
);

-- organiser_feedback: Allow BDO and Market Manager to view all feedback
DROP POLICY IF EXISTS "Admins can view all organiser feedback" ON public.organiser_feedback;
CREATE POLICY "Admins, BDO, and Market Managers can view all organiser feedback"
ON public.organiser_feedback
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = user_id
);

-- stall_inspections: Allow BDO and Market Manager to view all inspections
DROP POLICY IF EXISTS "Admins can view all stall inspections" ON public.stall_inspections;
CREATE POLICY "Admins, BDO, and Market Managers can view all stall inspections"
ON public.stall_inspections
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = user_id
);

-- next_day_planning: Allow BDO and Market Manager to view all planning
DROP POLICY IF EXISTS "Admins can view all next day planning" ON public.next_day_planning;
CREATE POLICY "Admins, BDO, and Market Managers can view all next day planning"
ON public.next_day_planning
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = user_id
);

-- comments: Allow BDO and Market Manager to view all comments
DROP POLICY IF EXISTS "Admins can manage comments" ON public.comments;
CREATE POLICY "Admins, BDO, and Market Managers can view all comments"
ON public.comments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = comments.session_id 
    AND sessions.user_id = auth.uid()
  )
);

-- employees: Allow BDO and Market Manager to read all employees
DROP POLICY IF EXISTS "Admins can read all employees" ON public.employees;
CREATE POLICY "Admins, BDO, and Market Managers can read all employees"
ON public.employees
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = id
);

-- profiles: Allow BDO and Market Manager to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins, BDO, and Market Managers can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'bdo') OR 
  has_role(auth.uid(), 'market_manager') OR
  auth.uid() = id
);