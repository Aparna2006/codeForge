# codeForge Quick Start

## The Problem
You see: **"Could not find the table 'public.problems'"**

## The Solution (Pick One)

### ✅ Quick Fix (2 minutes)

1. **Add Environment Variables**
   - In v0, click the **Vars** icon (left sidebar)
   - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Get these from Supabase → Project Settings → API

2. **Create Tables**
   - Go to `/setup` page in your app
   - Choose "Manual SQL Setup"
   - Copy the SQL
   - Paste in Supabase SQL Editor
   - Click Run

3. **Add Sample Data**
   - Back on `/setup` page
   - Click "Initialize Database" button
   - Done! 🎉

### 📋 What Tables Are Created

- `users` - User accounts
- `problems` - Coding challenges
- `submissions` - Code submissions
- `activity` - Daily tracking
- `user_stats` - User statistics

### 🚀 After Setup

Visit these pages:
- `/problems` - Browse challenges
- `/auth/signup` - Create account
- `/dashboard` - View your stats
- `/leaderboard` - See global rankings

### 🆘 Troubleshooting

**"Missing Supabase credentials"**
→ Add env vars in Vars section

**"Failed to initialize database"**
→ Use Manual SQL Setup option

**Still stuck?**
→ Check SETUP_INSTRUCTIONS.md for detailed guide
