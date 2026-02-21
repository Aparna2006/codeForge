CREATE TABLE IF NOT EXISTS problem_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  problem_slug VARCHAR(255) NOT NULL,
  user_email TEXT NOT NULL,
  language VARCHAR(20) NOT NULL CHECK (language IN ('python', 'c', 'cpp', 'java')),
  code TEXT NOT NULL,
  verdict VARCHAR(40) NOT NULL,
  runtime_ms INTEGER,
  time_limit_ms INTEGER,
  memory_limit_mb INTEGER,
  output TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS problem_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  attempted_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  last_verdict VARCHAR(40),
  last_language VARCHAR(20),
  last_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(problem_id, user_email)
);

CREATE TABLE IF NOT EXISTS problem_starter_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  language VARCHAR(20) NOT NULL CHECK (language IN ('python', 'c', 'cpp', 'java')),
  starter_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(problem_id, language)
);

CREATE INDEX IF NOT EXISTS idx_problem_submissions_user_email ON problem_submissions(user_email);
CREATE INDEX IF NOT EXISTS idx_problem_submissions_problem_id ON problem_submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_submissions_created_at ON problem_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_problem_progress_user_email ON problem_progress(user_email);
CREATE INDEX IF NOT EXISTS idx_problem_progress_problem_id ON problem_progress(problem_id);
