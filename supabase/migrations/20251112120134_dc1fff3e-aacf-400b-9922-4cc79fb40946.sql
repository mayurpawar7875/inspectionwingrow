-- Fix PUBLIC_DATA_EXPOSURE: Remove overly permissive public access to employees table
-- The login flow already uses the secure get_employee_by_username() function
-- which bypasses RLS safely with SECURITY DEFINER

DROP POLICY IF EXISTS "Public can check username for login" ON public.employees;

-- The existing policies remain:
-- 1. "Admins can read all employees" - for admin access
-- 2. "Admins can update all employees" - for admin management
-- 3. "Users can read their own employee record" - for self-access

-- No new policy needed - username lookup is handled by get_employee_by_username() function