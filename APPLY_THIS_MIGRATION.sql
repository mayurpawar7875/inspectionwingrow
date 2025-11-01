-- ============================================
-- COMPLETE MIGRATION FOR USERNAME-BASED LOGIN
-- Apply this in Supabase Dashboard > SQL Editor
-- ============================================

-- Step 1: Add new roles to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'market_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'bms_executive';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'bdo';

-- Step 2: Add username field to employees table (if not exists)
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 3: Create unique constraint on username (if not exists)
-- First, drop the constraint if it exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_username_key'
  ) THEN
    ALTER TABLE public.employees ADD CONSTRAINT employees_username_key UNIQUE (username);
  END IF;
END $$;

-- Step 4: Populate username for existing employees (use email if username is null)
UPDATE public.employees 
SET username = email 
WHERE username IS NULL OR username = '';

-- Step 5: Make username NOT NULL after populating (if not already)
-- We'll make it nullable for now and update it via migration

-- Step 6: Create index for username lookup
CREATE INDEX IF NOT EXISTS idx_employees_username ON public.employees(username) WHERE username IS NOT NULL;

-- Step 7: Drop and recreate RLS policy for public username lookup
DROP POLICY IF EXISTS "Public can check username for login" ON public.employees;

CREATE POLICY "Public can check username for login"
  ON public.employees
  FOR SELECT
  USING (true);

-- Step 8: Update handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.employees (id, email, full_name, phone, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.employees.username, public.employees.email);
  
  -- Also insert into profiles for backward compatibility
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = EXCLUDED.phone;
  
  -- Assign default employee role (can be changed by admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 9: Create RPC function to lookup username (bypasses RLS)
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

-- Step 10: Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_employee_by_username(TEXT) TO anon, authenticated;

-- Step 11: Add comments
COMMENT ON COLUMN public.employees.username IS 'Unique username for login authentication';
COMMENT ON FUNCTION public.get_employee_by_username IS 'Get employee by username for login authentication. Bypasses RLS.';

-- Verification: Check if everything was created successfully
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Username column exists: %', EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'username'
  );
  RAISE NOTICE 'RPC function exists: %', EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_employee_by_username'
  );
END $$;

