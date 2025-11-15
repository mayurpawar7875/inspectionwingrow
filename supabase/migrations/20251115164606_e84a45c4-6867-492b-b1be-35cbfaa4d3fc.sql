-- Grant admins authorization to view all employee profiles

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS
'Allows admins to view all employee, BDO, and market manager profile data for management and reporting purposes.';