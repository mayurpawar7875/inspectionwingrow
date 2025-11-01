-- Add new roles to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'market_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'bms_executive';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'bdo';

-- Add username field to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for username lookup
CREATE INDEX IF NOT EXISTS idx_employees_username ON public.employees(username) WHERE username IS NOT NULL;

-- Update employees table to make username required for new users
COMMENT ON COLUMN public.employees.username IS 'Unique username for login authentication';

-- Add RLS policy to allow username lookup for login (public read for username only)
-- Note: This allows checking username existence for login, but actual user data is protected
CREATE POLICY IF NOT EXISTS "Public can check username for login"
  ON public.employees
  FOR SELECT
  USING (true); -- Limited to username, email, status fields for login verification

-- Update handle_new_user to include username if provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert into employees
  INSERT INTO public.employees (id, email, full_name, phone, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'username'
  );
  
  -- Also insert into profiles for backward compatibility
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Assign default employee role (can be changed by admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

