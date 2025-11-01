# Quick Steps to Apply Migration in Lovable Cloud

## You're Already in the Right Place!

You're viewing the Database section. Here's what to do next:

## Option 1: Run SQL Query (Recommended)

1. **Look for a SQL Editor or Query Button**:
   - In the Database view you're seeing, look for:
     - A "SQL Editor" button/tab
     - A "Query" button
     - An "SQL" tab
     - Or a button that says "New Query" or "Run SQL"
   
2. **If you see a SQL Editor**:
   - Open `APPLY_THIS_MIGRATION.sql` from your project folder
   - Copy all the contents (Ctrl+A, Ctrl+C)
   - Paste into the SQL editor
   - Click "Run" or "Execute"

## Option 2: Click on Employees Table

1. **Click on the `employees` table** (it shows 6 rows)
2. This should open the table editor
3. Look for:
   - A "SQL" tab or button
   - An "Actions" menu with SQL options
   - Or a way to run custom queries

## Option 3: Check Top Navigation

1. Look at the top of the page or sidebar
2. Search for:
   - "SQL Editor"
   - "Query Editor"
   - "Database Tools"
   - Or any button that lets you run SQL

## If You Can't Find SQL Editor

1. **Click on `employees` table** to see its structure
2. Check if the `username` column already exists:
   - If it exists → The migration might have been partially applied
   - If it doesn't exist → We need to apply the migration

3. **Look for Settings or Database Settings**:
   - There might be a settings icon or menu
   - Look for "Database Settings" or "Migrations"

## What to Look For

The SQL Editor might be:
- A separate tab at the top
- A button in the toolbar
- An option in a dropdown menu
- Or accessible by clicking on a specific table

## After Finding SQL Editor

1. Copy the entire contents of `APPLY_THIS_MIGRATION.sql`
2. Paste into the SQL editor
3. Run it
4. Verify by checking the `employees` table - it should now have a `username` column

