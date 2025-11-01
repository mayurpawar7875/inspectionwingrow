-- Ensure username column exists and has values
UPDATE public.employees 
SET username = email 
WHERE username IS NULL OR username = '';

-- Create a function to lookup username for login (bypasses RLS)
-- This function is necessary because we need to check username before authentication
CREATE OR REPLACE FUNCTION public.get_employee_by_username(_username TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  status TEXT,
  username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.email,
    e.status,
    e.username
  FROM public.employees e
  WHERE e.username = _username
  LIMIT 1;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_employee_by_username(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.get_employee_by_username IS 'Get employee by username for login authentication. Bypasses RLS.';

-- Also ensure the RLS policy for public username lookup is properly set
DROP POLICY IF EXISTS "Public can check username for login" ON public.employees;

CREATE POLICY "Public can check username for login"
  ON public.employees
  FOR SELECT
  USING (true);

