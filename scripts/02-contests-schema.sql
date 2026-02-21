CREATE TABLE IF NOT EXISTS contests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  prize_pool_coins INTEGER NOT NULL DEFAULT 2000,
  status TEXT NOT NULL DEFAULT 'upcoming',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contest_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  rank_label TEXT NOT NULL,
  coins INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contest_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contest_testcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES contest_questions(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contest_id, user_email)
);

CREATE TABLE IF NOT EXISTS contest_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contest_id, user_email)
);

CREATE TABLE IF NOT EXISTS contest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_title TEXT,
  user_email TEXT NOT NULL,
  language TEXT NOT NULL,
  verdict TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  runtime_ms INTEGER NOT NULL DEFAULT 0,
  passed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  details JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contest_questions_contest_id ON contest_questions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_testcases_question_id ON contest_testcases(question_id);
CREATE INDEX IF NOT EXISTS idx_contest_registrations_contest_id ON contest_registrations(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_attempts_contest_user ON contest_attempts(contest_id, user_email);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest_user ON contest_submissions(contest_id, user_email);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest_question ON contest_submissions(contest_id, question_id);
