-- Add RLS policies for admins to manage user roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Grant admin access to the first user (vrunda borkar)
INSERT INTO public.user_roles (user_id, role)
VALUES ('0448348f-c11a-46ea-896d-447b15547753', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;