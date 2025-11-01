# Migration Guide for Lovable Cloud

Since you're using **Lovable Cloud**, here's how to apply the database migration for username-based login.

## Method 1: Through Lovable Dashboard (Recommended)

### Step 1: Access Supabase Settings in Lovable
1. Go to your **Lovable Cloud Dashboard** (usually at https://cloud.lovable.dev or your Lovable project URL)
2. Navigate to your project settings
3. Look for **"Database"** or **"Supabase"** settings
4. You should see a link to your **Supabase project** or direct database access

### Step 2: Access Supabase SQL Editor
1. If Lovable provides direct Supabase access, click the link to open your Supabase dashboard
2. Alternatively, you can access Supabase directly:
   - Go to https://supabase.com/dashboard
   - Find your project (it might be named differently in Supabase if Lovable created it)
   - Click on your project

### Step 3: Open SQL Editor
1. In the Supabase Dashboard, click **"SQL Editor"** in the left sidebar
2. You should see an empty SQL editor

### Step 4: Apply the Migration
1. Open the file `APPLY_THIS_MIGRATION.sql` from your project
2. Copy ALL the contents (Ctrl+A, Ctrl+C)
3. Paste into the Supabase SQL Editor
4. Click **"Run"** button (or Ctrl+Enter)
5. Wait for it to complete (should show success messages)

## Method 2: Through Lovable's Database Interface

If Lovable has its own database management interface:

1. Go to your Lovable project dashboard
2. Navigate to **"Database"** or **"Backend"** section
3. Look for **"SQL Editor"** or **"Migrations"** tab
4. Copy the contents of `APPLY_THIS_MIGRATION.sql`
5. Paste and run in Lovable's SQL editor

## Method 3: Via Supabase CLI (If you have direct access)

If you have access to your Supabase project URL and API keys:

1. Get your Supabase project URL and anon key from Lovable settings
2. Use Supabase CLI to apply migrations:
   ```bash
   # Install Supabase CLI if needed
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Apply the migration
   supabase db push
   ```

## Finding Your Supabase Project in Lovable

1. **Check Lovable Project Settings**:
   - Go to your Lovable project dashboard
   - Look for "Backend", "Database", or "Supabase" section
   - You should see your Supabase project URL or connection details

2. **Check Environment Variables**:
   - In Lovable, look for environment variables or settings
   - Look for `SUPABASE_URL` or similar
   - This will give you your Supabase project URL

3. **From Browser Console**:
   - Open your app (http://localhost:8080 or your deployed URL)
   - Open browser console (F12)
   - Check the network tab or console for Supabase URL
   - Your URL looks like: `https://dfaptemcrxwjkzncoasz.supabase.co`

## Alternative: Temporary Workaround

If you can't access the database directly right now, the code has been updated to work as a temporary solution:

1. **Try logging in with your email** (`vrinda@wingrowagritech.com`) - this should work now
2. The app will fall back to email-based login if the username column doesn't exist
3. You can still use the app while you figure out how to apply the migration

## Need Help?

If you're stuck:
1. Check Lovable's documentation for database migrations
2. Contact Lovable support for help with database migrations
3. Share what you see in your Lovable dashboard, and I can help guide you further

## Quick Check After Migration

After applying the migration, verify:
1. Go to Table Editor in Supabase
2. Check the `employees` table has a `username` column
3. Existing employees should have their email as username
4. Try logging in with your email - it should work immediately

