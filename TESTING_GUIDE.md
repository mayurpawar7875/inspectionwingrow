# Testing Guide for Role-Based Authentication

## Prerequisites

1. Make sure your Supabase project is set up
2. Ensure you have an admin account to test with
3. Have access to Supabase dashboard

## Step 1: Run the Database Migration

### Option A: Using Supabase CLI (Recommended for local development)

```bash
# If you have Supabase CLI installed
supabase migration up

# Or apply the specific migration
supabase db push
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open and run the migration file: `supabase/migrations/20251101120000_role_based_auth.sql`
4. Click **Run** to execute the migration

### Verify Migration Success

Run this SQL query in Supabase SQL Editor to verify:

```sql
-- Check if new roles exist
SELECT enum_range(NULL::user_role);

-- Check if username column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name = 'username';

-- Check if username index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'employees' AND indexname LIKE '%username%';
```

## Step 2: Test the Application

### Start the Development Server

```bash
npm run dev
```

The app should start at `http://localhost:8080`

## Step 3: Create Test Users

### Method 1: Using Admin Dashboard (Recommended)

1. **Login as Admin** (use existing admin account or create one)
2. Navigate to **Admin → Users**
3. Click **"Add Employee"** button
4. Fill in the form:
   - **Full Name**: Test Employee
   - **Email**: employee@test.com
   - **Username**: `testemployee` (must be unique, lowercase)
   - **Phone**: (optional)
   - **Password**: (set a secure password)
   - **Status**: Active
5. Click **"Add Employee"**
6. Repeat for different roles:
   - Create user with username: `testmarketmanager`
   - Create user with username: `testbmsexec`
   - Create user with username: `testbdo`

### Method 2: Direct SQL (For Quick Testing)

```sql
-- Note: This creates auth user and employee record
-- You'll need to set password manually or use Supabase Auth API

-- Create test users via SQL (use Supabase Dashboard → SQL Editor)
-- Note: Passwords must be set via Supabase Auth API or dashboard
```

## Step 4: Assign Roles to Test Users

1. In **Admin → Users** page
2. For each test user, use the **"Assign Role"** dropdown
3. Select roles to assign:
   - **Employee**: Basic employee role
   - **Market Manager**: Market management role
   - **BMS Executive**: BMS executive role
   - **BDO**: BDO role
   - **Admin**: Administrator role

4. You can assign multiple roles to a user (toggle on/off)
5. Check that role badges appear with correct colors:
   - Admin: Red badge
   - BDO: Blue badge
   - BMS Executive: Purple badge
   - Market Manager: Green badge
   - Employee: Gray badge

## Step 5: Test Username-Based Login

### Test Login Flow

1. **Logout** if you're currently logged in
2. Go to `/auth` page
3. You should see **"Username"** field instead of "Email"
4. Test cases:

#### ✅ Valid Login
- Enter a valid username (e.g., `testemployee`)
- Enter correct password
- Should login successfully
- Should redirect based on role:
  - Admin → `/admin`
  - Other roles → `/dashboard`

#### ❌ Invalid Username
- Enter non-existent username (e.g., `nonexistent`)
- Enter any password
- Should show: **"Invalid username or password."**

#### ❌ Invalid Password
- Enter valid username
- Enter wrong password
- Should show: **"Invalid username or password."**

#### ❌ Inactive Account
1. Deactivate a user in Admin → Users
2. Try to login with that username
3. Should show: **"Account is inactive. Please contact administrator."**

## Step 6: Test Role-Based Routing

### Test Each Role

1. **Login as Employee**
   - Username: `testemployee` (with employee role)
   - Should redirect to `/dashboard`
   - Should see employee dashboard (not admin dashboard)

2. **Login as Market Manager**
   - Username: `testmarketmanager` (with market_manager role)
   - Should redirect to `/dashboard`
   - Should see employee dashboard (can customize later)

3. **Login as BMS Executive**
   - Username: `testbmsexec` (with bms_executive role)
   - Should redirect to `/dashboard`

4. **Login as BDO**
   - Username: `testbdo` (with bdo role)
   - Should redirect to `/dashboard`

5. **Login as Admin**
   - Username with admin role
   - Should redirect to `/admin`
   - Should see admin dashboard

## Step 7: Test Role Assignment

### As Admin:

1. **Login as admin**
2. Go to **Admin → Users**
3. For any user, use **"Assign Role"** dropdown
4. Test scenarios:

#### Assign Role
- Select a role from dropdown (e.g., "Market Manager")
- Role should be assigned immediately
- Badge should appear with correct color
- Checkmark (✓) should appear next to assigned role in dropdown

#### Remove Role
- Select an already assigned role (with ✓)
- Role should be removed
- Badge should disappear
- Checkmark should disappear

#### Multiple Roles
- Assign multiple roles to one user
- All role badges should appear
- User's `currentRole` will be determined by priority:
  - Priority order: Admin > BDO > BMS Executive > Market Manager > Employee

## Step 8: Test Username Validation

### Create New User (Test Username Validation)

1. **Login as admin**
2. Go to **Admin → Users**
3. Click **"Add Employee"**
4. Test username validation:

#### Valid Username
- Username: `validuser123`
- Should accept (lowercase, no spaces)

#### Duplicate Username
- Try to create user with existing username
- Should show: **"Username already exists. Please choose another."**

#### Username Format
- Username automatically converts to lowercase
- Spaces are automatically removed

## Step 9: Test Session History with Roles

1. **Login as employee** with assigned role
2. Navigate to **"My Sessions"** (from dashboard header)
3. Should see session history
4. Logout and **login as admin**
5. Should see admin dashboard
6. Verify role-specific features work correctly

## Step 10: Test Edge Cases

### Test Multiple Roles Priority

1. Assign user with both **Employee** and **Admin** roles
2. Login with that user
3. Should redirect to `/admin` (Admin has higher priority)
4. Check `currentRole` should be `admin`

### Test No Role Assigned

1. Create user but don't assign any role
2. Try to login
3. Should still work (will have `currentRole: null`)
4. Check behavior in dashboard

### Test Username Case Sensitivity

1. Create user with username: `TestUser`
2. Try login with: `testuser` (lowercase)
3. Should work (username is case-insensitive in practice)
4. Database stores username as entered (lowercase conversion in UI)

## Step 11: Verify in Database

Run these SQL queries to verify data:

```sql
-- Check all users with their usernames
SELECT id, email, username, full_name, status 
FROM employees 
ORDER BY created_at DESC;

-- Check user roles
SELECT 
  e.username,
  e.email,
  ur.role
FROM employees e
LEFT JOIN user_roles ur ON ur.user_id = e.id
ORDER BY e.username, ur.role;

-- Check a specific user's roles
SELECT 
  e.username,
  e.email,
  array_agg(ur.role) as roles
FROM employees e
LEFT JOIN user_roles ur ON ur.user_id = e.id
WHERE e.username = 'testemployee'
GROUP BY e.username, e.email;
```

## Step 12: Test Console Logs

Open browser DevTools (F12) and check:

1. **No errors** in console during login
2. **Role information** logged (if you add console.logs)
3. **Authentication flow** works smoothly

## Common Issues & Solutions

### Issue: "Invalid username or password"
- **Solution**: Check username exists in `employees` table
- **Solution**: Verify user's email matches in `auth.users` table
- **Solution**: Check password is correct

### Issue: Migration fails
- **Solution**: Check if enum values already exist
- **Solution**: Run migration parts separately
- **Solution**: Check Supabase connection

### Issue: Username not saving
- **Solution**: Check `handle_new_user` function is updated
- **Solution**: Verify migration ran successfully
- **Solution**: Check RLS policies allow username updates

### Issue: Role not showing
- **Solution**: Verify role assigned in `user_roles` table
- **Solution**: Refresh page after role assignment
- **Solution**: Check browser console for errors

### Issue: Redirect not working
- **Solution**: Check `currentRole` is set correctly
- **Solution**: Verify role exists in database
- **Solution**: Clear browser cache and cookies

## Quick Test Checklist

- [ ] Migration runs successfully
- [ ] Username field appears in login form
- [ ] Can create user with username
- [ ] Username uniqueness validation works
- [ ] Login with username works
- [ ] Invalid username shows error
- [ ] Invalid password shows error
- [ ] Inactive account shows error
- [ ] Role assignment works (assign/remove)
- [ ] Multiple roles can be assigned
- [ ] Role priority works (admin > bdo > bms > market_manager > employee)
- [ ] Admin redirects to /admin
- [ ] Other roles redirect to /dashboard
- [ ] Role badges display correctly
- [ ] Username appears in user list
- [ ] Session history accessible

## Automated Testing (Optional)

You can create a simple test script to verify authentication:

```javascript
// test-auth.js (Example - not included in project)
import { supabase } from './supabase/client.js';

async function testLogin() {
  // Test username lookup
  const { data } = await supabase
    .from('employees')
    .select('email, username')
    .eq('username', 'testemployee')
    .single();
  
  console.log('User found:', data);
}
```

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs
3. Verify migration ran successfully
4. Check database tables directly
5. Verify environment variables are set correctly

