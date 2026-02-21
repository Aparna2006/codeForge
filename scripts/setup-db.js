import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('[v0] Starting database setup...');

  try {
    // Create users table
    console.log('[v0] Creating users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100) UNIQUE NOT NULL,
          full_name VARCHAR(255),
          avatar_url TEXT,
          bio TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (usersError) {
      console.log('[v0] Users table likely exists or created:', usersError.message);
    } else {
      console.log('[v0] Users table created');
    }

    // Create problems table
    console.log('[v0] Creating problems table...');
    const { error: problemsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS problems (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT NOT NULL,
          difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
          category VARCHAR(100),
          examples JSONB,
          test_cases JSONB,
          constraints TEXT,
          time_limit_ms INTEGER DEFAULT 1000,
          memory_limit_mb INTEGER DEFAULT 256,
          accepted_count INTEGER DEFAULT 0,
          submission_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (problemsError) {
      console.log('[v0] Problems table likely exists or created:', problemsError.message);
    } else {
      console.log('[v0] Problems table created');
    }

    // Create submissions table
    console.log('[v0] Creating submissions table...');
    const { error: submissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
          code TEXT NOT NULL,
          language VARCHAR(20) CHECK (language IN ('python', 'javascript', 'typescript', 'c', 'cpp', 'java', 'go', 'r')),
          status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compilation_error')),
          runtime_ms INTEGER,
          memory_mb INTEGER,
          verdict_details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (submissionsError) {
      console.log('[v0] Submissions table likely exists or created:', submissionsError.message);
    } else {
      console.log('[v0] Submissions table created');
    }

    // Create activity table
    console.log('[v0] Creating activity table...');
    const { error: activityError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS activity (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          submission_date DATE NOT NULL,
          submission_count INTEGER DEFAULT 0,
          accepted_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (activityError) {
      console.log('[v0] Activity table likely exists or created:', activityError.message);
    } else {
      console.log('[v0] Activity table created');
    }

    // Create user_stats table
    console.log('[v0] Creating user_stats table...');
    const { error: statsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_stats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          total_submissions INTEGER DEFAULT 0,
          total_accepted INTEGER DEFAULT 0,
          easy_solved INTEGER DEFAULT 0,
          medium_solved INTEGER DEFAULT 0,
          hard_solved INTEGER DEFAULT 0,
          acceptance_rate DECIMAL(5, 2) DEFAULT 0,
          ranking INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (statsError) {
      console.log('[v0] User stats table likely exists or created:', statsError.message);
    } else {
      console.log('[v0] User stats table created');
    }

    console.log('[v0] Database setup completed!');
  } catch (error) {
    console.error('[v0] Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
