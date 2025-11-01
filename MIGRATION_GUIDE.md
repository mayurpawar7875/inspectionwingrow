# Step-by-Step Guide: Applying Username Migration to Supabase

This guide will help you apply the database migration to enable username-based login in your Supabase project.

## Prerequisites
- Access to your Supabase Dashboard
- Your Supabase project URL (you can see it in your browser URL: `https://dfaptemcrxwjkzncoasz.supabase.co`)

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your Supabase account
3. Select your project (inspectionwingrow or the project you're using)

### Step 2: Navigate to SQL Editor
1. In the left sidebar, click on **"SQL Editor"** (it has a database icon)
2. You should see an empty SQL editor window

### Step 3: Open the Migration File
1. In your project folder, open the file: `APPLY_THIS_MIGRATION.sql`
2. Select all the contents (Ctrl+A or Cmd+A)
3. Copy the entire content (Ctrl+C or Cmd+C)

### Step 4: Paste and Run the SQL
1. In the Supabase SQL Editor, paste the copied SQL (Ctrl+V or Cmd+V)
2. Review the SQL to make sure it looks correct (it should have multiple steps)
3. Click the **"Run"** button at the bottom right of the editor (or press Ctrl+Enter / Cmd+Enter)
4. Wait for the execution to complete (should take a few seconds)

### Step 5: Verify the Migration
After running the SQL, you should see:
- A success message or "Migration completed successfully!" in the output
- No error messages

To verify manually:
1. Go to **"Table Editor"** in the left sidebar
2. Select the **"employees"** table
3. Check if there's a **"username"** column
4. Verify that existing employees have usernames populated (should match their email if not manually set)

### Step 6: Test the Application
1. Go back to your application (http://localhost:8080)
2. Try logging in with your email: `vrinda@wingrowagritech.com`
3. After the migration, you should also be able to:
   - Register new users with a username
   - Log in with either username or email

## Troubleshooting

### If you see an error:
- **"column already exists"**: The username column might already exist. The migration handles this with `IF NOT EXISTS`, but if you see this, you can continue - it's safe.
- **"function already exists"**: The RPC function might already exist. This is also handled in the migration.
- **"policy already exists"**: This is fine - the migration will drop and recreate it.

### If the migration partially fails:
1. Check the error message carefully
2. The migration is designed to be idempotent (safe to run multiple times)
3. You can try running it again - it should skip existing objects

### If you still can't log in after migration:
1. Check the browser console (F12) for any errors
2. Verify the migration completed successfully
3. Try logging in with your email address first
4. Check if your user has a username in the employees table

## What the Migration Does

1. **Adds new roles**: `market_manager`, `bms_executive`, `bdo`
2. **Adds username column**: To the `employees` table
3. **Populates usernames**: Sets existing employees' usernames to their email if not already set
4. **Creates RPC function**: `get_employee_by_username` for secure username lookup
5. **Sets up RLS policies**: Allows public username lookup for login
6. **Updates trigger function**: `handle_new_user` to include username

## After Migration

- **Existing users**: Will have their email as their username by default
- **New users**: Can register with a custom username
- **Login**: Can use either username or email to log in
- **Admin**: Can change usernames in the Users admin page

## Need Help?

If you encounter any issues:
1. Take a screenshot of the error
2. Check the browser console for errors
3. Verify your Supabase project is active and accessible

