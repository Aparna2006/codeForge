# codeForge - Competitive Coding Platform

A LeetCode-like competitive programming platform built with Next.js, TypeScript, and Supabase. Solve real-world coding problems, compete globally, and track your progress.

## Features

- **Problem Solving**: Solve coding challenges across multiple difficulty levels
- **Multi-Language Support**: Write code in Python, JavaScript, TypeScript, C, C++, Java, Go, and R
- **Real-time Judging**: Instant feedback on your solutions with detailed error messages
- **Activity Heatmap**: Visualize your coding activity over time
- **Global Leaderboard**: Compete with thousands of developers worldwide
- **User Profiles**: Track personal statistics and achievements
- **Submission History**: View all your past submissions and verdicts

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Code Execution**: Node.js child_process with sandboxing
- **Visualization**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ (pnpm recommended)
- Supabase account and project

### Quick Setup (3 Steps)

1. **Add Environment Variables**
   
   In your v0 project, go to **Vars** and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   Get these from Supabase → Project Settings → API

2. **Create Database Tables**
   
   Visit `http://localhost:3000/setup` and choose:
   - **Option 1**: Click "Initialize Database" (automatic)
   - **Option 2**: Copy SQL and paste in Supabase SQL Editor (manual)

3. **Start Coding!**
   
   ```bash
   pnpm dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) and start solving problems!

### Detailed Setup Guide

See **QUICK_START.md** or **SETUP_INSTRUCTIONS.md** for comprehensive setup instructions.

## Project Structure

```
/app
  /auth                    # Authentication pages
    /signin
    /signup
  /api                     # API routes
    /judge                 # Code judgment API
    /run                   # Code execution API
  /problems               # Problems pages
    /[slug]               # Individual problem page
  /dashboard              # User dashboard
  /leaderboard            # Global leaderboard
  page.tsx                # Home page

/components
  /ui                     # shadcn/ui components
  navigation.tsx          # Navigation bar
  code-editor.tsx         # Code editor component
  problems-grid.tsx       # Problems listing
  stats-dashboard.tsx     # Statistics dashboard

/lib
  supabase.ts             # Supabase client and types
  auth.ts                 # Authentication utilities
  utils.ts                # General utilities

/scripts
  01-init-schema.sql      # Database initialization
  seed.js                 # Seed sample data
  setup-db.js             # Database setup helper
```

## Key Features Explained

### Code Execution
- Supports 8 programming languages with proper compilation/execution
- Sandboxed execution with timeout and memory limits
- Real-time output and error messages

### Judging System
- Runs code against hidden test cases
- Floating-point output tolerance (±0.0001)
- Detailed verdict reporting (AC, WA, TLE, RE, CE)

### User Statistics
- Track accepted/total submissions
- Acceptance rate calculation
- Difficulty-based problem breakdown
- Global ranking system

### Activity Heatmap
- Visualize submission patterns over time
- Motivation and progress tracking
- Daily activity counters

## API Endpoints

### `/api/run` (POST)
Execute code without judging
```json
{
  "code": "string",
  "language": "python|javascript|typescript|c|cpp|java|go|r",
  "input": "string"
}
```

### `/api/judge` (POST)
Execute code against problem test cases
```json
{
  "problemId": "uuid",
  "code": "string",
  "language": "string",
  "testInput": "string"
}
```

## Database Schema

### Tables
- **users**: User profiles and basic information
- **problems**: Coding problems with test cases
- **submissions**: User code submissions and verdicts
- **activity**: Daily submission activity tracking
- **user_stats**: Aggregated user statistics and rankings

## Supported Languages

| Language   | Template | Compilation | Execution |
|-----------|----------|-------------|-----------|
| Python    | ✓        | No          | python3   |
| JavaScript| ✓        | No          | node      |
| TypeScript| ✓        | tsc         | node      |
| C         | ✓        | gcc         | ./binary  |
| C++       | ✓        | g++         | ./binary  |
| Java      | ✓        | javac       | java      |
| Go        | ✓        | go build    | ./binary  |
| R         | ✓        | No          | Rscript   |

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
vercel --prod
```

## Performance Considerations

- **Code Execution**: Runs locally on Next.js server (suitable for MVP; consider isolated sandbox for production)
- **Database**: Indexed queries for fast problem/user lookups
- **Caching**: Recharts memoization for dashboard charts

## Future Enhancements

- [ ] Real-time collaboration/pair programming
- [ ] Discussion forums and editorials
- [ ] AI-powered hints system
- [ ] Mobile app
- [ ] Problem difficulty rating system
- [ ] Social features (followers, messaging)
- [ ] Contests and tournaments
- [ ] Premium features and premium problems

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for learning and personal projects.

## Support

For issues, questions, or suggestions, please open an GitHub issue or contact the maintainers.

---

**Happy coding! 🚀**

Built with ❤️ using codeForge
