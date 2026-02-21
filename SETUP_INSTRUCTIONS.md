# codeForge Database Setup Guide

## Quick Start (3 Steps)

### Step 1: Add Environment Variables
In your v0 project, go to **Vars** section and add:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Step 2: Create Database Tables
Copy the SQL from `/supabase/migrations/001_init_schema.sql` and run it in your **Supabase SQL Editor**:
1. Go to Supabase → Your Project → SQL Editor
2. Click "New Query"
3. Paste the SQL file content
4. Click "Run"

### Step 3: Insert Sample Problems
Visit `/setup` page and click "Initialize Database" to insert sample problems

---

## Environment Variables

Get these from your Supabase project → Project Settings → API:

| Variable | Where to Find |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

---

## Error: "Could not find the table 'public.problems'"

This means tables aren't created yet. **Solution:**

1. Copy SQL from `/supabase/migrations/001_init_schema.sql`
2. Paste in Supabase SQL Editor
3. Click Run
4. Refresh the page

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User profiles |
| `problems` | Coding challenges |
| `submissions` | Code submissions & verdicts |
| `activity` | Daily submission tracking |
| `user_stats` | User statistics |

---

## After Setup ✅

Your codeForge platform will have:
- Multi-language code editor (Python, JS, TS, C, C++, Java, Go, R)
- Real-time code judging system
- User authentication & profiles
- Global leaderboard
- Activity heatmap
- Problem statistics dashboard
