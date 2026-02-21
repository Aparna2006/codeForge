# Database Status & Resolution

## Current Issue

The application is showing this error:
```
Error: Could not find the table 'public.problems' in the schema cache (PGRST205)
```

This happens because **the database tables have not been created yet**.

## Root Cause

When you first set up codeForge, the database is empty. The SQL migration script (`scripts/01-init-schema.sql`) contains the table definitions, but it needs to be executed to actually create the tables in your Supabase database.

## Solution: Quick Start (2 Steps)

### ✅ Step 1: Visit the Setup Page
Go to: **http://localhost:3000/setup**

You'll see a setup interface with an "Initialize Database" button.

### ✅ Step 2: Click "Initialize Database"
The system will:
- Create all 5 tables (users, problems, submissions, activity, user_stats)
- Create 7 database indexes
- Insert 3 sample problems

**That's it!** You'll see a success message and be redirected to the home page.

## What Was Fixed

### 1. **Setup Page** (`app/setup/page.tsx`)
- User-friendly interface for database initialization
- Shows status: loading, success, or error
- Auto-redirects after successful setup

### 2. **Setup API** (`app/api/setup/route.ts`)
- POST endpoint that creates all tables
- Inserts sample problems automatically
- Handles errors gracefully

### 3. **Better Error Messages**
Updated components now detect table-not-found errors and show:
- Clear error message
- Direct link to `/setup` page
- No cryptic database errors

Updated files:
- `components/problems-grid.tsx`
- `components/stats-dashboard.tsx`
- `app/problems/page.tsx`
- `app/page.tsx` (home page with setup banner)

### 4. **Documentation**
- `SETUP_INSTRUCTIONS.md` - Complete setup guide
- `DATABASE_STATUS.md` - This file

## How It Works

```
User visits app
    ↓
Components try to fetch from database
    ↓
Tables don't exist → Error PGRST205
    ↓
Components show error message with link to /setup
    ↓
User clicks link → Goes to /setup
    ↓
User clicks "Initialize Database" button
    ↓
API creates all tables + inserts sample data
    ↓
Success! Page redirects to home
    ↓
User can now use the platform normally
```

## Verification

After running setup, you should be able to:

1. ✅ See problems at `/problems`
2. ✅ View stats dashboard at `/`
3. ✅ Click into a problem at `/problems/two-sum`
4. ✅ See the leaderboard at `/leaderboard`
5. ✅ Access your dashboard at `/dashboard`

## If Something Goes Wrong

### Error: "Missing Supabase credentials"
**Solution:** Check your environment variables in the Vercel dashboard or `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (needed for setup)

### Error: "Failed to initialize database"
**Solutions:**
1. Try clicking "Initialize Database" again (it's safe to retry)
2. Check browser DevTools console (F12) for detailed error
3. Verify Supabase credentials are correct
4. Check if tables already exist in Supabase dashboard

### Tables Already Exist
If you see this error but tables are already set up:
- This is normal! The setup is idempotent
- Simply proceed to use the platform
- Go to `/` (home page) to start

## Database Schema

### Tables Created:

| Table | Purpose |
|-------|---------|
| `users` | User profiles (name, email, avatar, bio) |
| `problems` | Coding problems (title, description, test cases) |
| `submissions` | Code submissions (user, problem, code, verdict) |
| `activity` | Daily submission tracking for heatmap |
| `user_stats` | Aggregated stats (problems solved, acceptance rate) |

### Relationships:

```
users (1) ──→ (many) submissions
problems (1) ──→ (many) submissions
users (1) ──→ (one) user_stats
users (1) ──→ (many) activity
```

## Technical Details

### Setup API Flow:

1. **Validates Credentials**: Checks for Supabase URL and service role key
2. **Creates Tables**: Uses SQL CREATE TABLE IF NOT EXISTS statements
3. **Creates Indexes**: Adds 7 indexes for query performance
4. **Inserts Sample Data**: Adds 3 example problems
5. **Returns Success**: Confirms tables are ready

### Why Service Role Key?

The setup needs `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) because:
- Creating tables requires elevated permissions
- Anon key is limited to RLS policy access
- Service role bypasses RLS for setup operations

This is a one-time setup operation - afterward, normal queries use the safer anon key.

## Next Steps

1. **Visit `/setup`** to initialize your database
2. **Create account** at `/auth/signup`
3. **Browse problems** at `/problems`
4. **Start solving** and competing!

---

**Status**: Ready for deployment after database initialization ✅
