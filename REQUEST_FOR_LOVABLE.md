# Request for Lovable Support: Database Migration

Please execute the following SQL migration to add username-based login support to our application. This migration adds a `username` column to the `employees` table and creates necessary functions and policies.

---

## Migration SQL to Execute:

```sql
-- ============================================
-- COMPLETE MIGRATION FOR USERNAME-BASED LOGIN
-- ============================================

-- Step 1: Add new roles to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'market_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'bms_executive';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'bdo';

-- Step 2: Add username field to employees table (if not exists)
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 3: Create unique constraint on username (if not exists)
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

-- Step 5: Create index for username lookup
CREATE INDEX IF NOT EXISTS idx_employees_username ON public.employees(username) WHERE username IS NOT NULL;

-- Step 6: Drop and recreate RLS policy for public username lookup
DROP POLICY IF EXISTS "Public can check username for login" ON public.employees;

CREATE POLICY "Public can check username for login"
  ON public.employees
  FOR SELECT
  USING (true);

-- Step 7: Update handle_new_user function to include username
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

-- Step 8: Create RPC function to lookup username (bypasses RLS)
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

-- Step 9: Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_employee_by_username(TEXT) TO anon, authenticated;

-- Step 10: Add comments
COMMENT ON COLUMN public.employees.username IS 'Unique username for login authentication';
COMMENT ON FUNCTION public.get_employee_by_username IS 'Get employee by username for login authentication. Bypasses RLS.';
```

---

## What This Migration Does:

1. **Adds new user roles**: `market_manager`, `bms_executive`, `bdo`
2. **Adds `username` column** to the `employees` table
3. **Populates existing employees** with usernames (using their email as default)
4. **Creates an RPC function** for secure username lookup during login
5. **Sets up RLS policies** to allow public username lookup for authentication
6. **Updates the trigger function** to handle usernames for new users

## Expected Result:

After executing this migration:
- The `employees` table will have a `username` column
- Existing employees will have their email as their username by default
- Users will be able to log in with either username or email
- New registrations will support custom usernames

## Important Notes:

- This migration is **idempotent** (safe to run multiple times)
- It uses `IF NOT EXISTS` and `ON CONFLICT` clauses to handle existing objects gracefully
- No data will be lost - existing employees will keep their data, just gain a username field

---

Please execute this migration and confirm when it's complete. Thank you!

