-- Create users table
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

-- Create problems table
CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  category VARCHAR(100),
  examples JSONB, -- Array of {input, output, explanation}
  test_cases JSONB, -- Array of {input, output}
  constraints TEXT,
  time_limit_ms INTEGER DEFAULT 1000,
  memory_limit_mb INTEGER DEFAULT 256,
  accepted_count INTEGER DEFAULT 0,
  submission_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language VARCHAR(20) CHECK (language IN ('python', 'javascript', 'typescript', 'c', 'cpp', 'java', 'go', 'r')),
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compilation_error')),
  runtime_ms INTEGER,
  memory_mb INTEGER,
  verdict_details JSONB, -- {test_case_index, expected_output, actual_output, error_message}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create activity table
CREATE TABLE IF NOT EXISTS activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_date DATE NOT NULL,
  submission_count INTEGER DEFAULT 0,
  accepted_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user stats table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_submission_date ON activity(submission_date);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug);

-- Persistent normal-problem submissions and progress
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
  source_job_id TEXT,
  artifact_url TEXT,
  judge_report JSONB,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_problem_submissions_source_job_id ON problem_submissions(source_job_id) WHERE source_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_problem_progress_user_email ON problem_progress(user_email);
CREATE INDEX IF NOT EXISTS idx_problem_progress_problem_id ON problem_progress(problem_id);

-- Contests schema
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

-- Teams, private contests, notifications
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_email)
);

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by_email TEXT NOT NULL,
  invite_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS private_access_code TEXT,
  ADD COLUMN IF NOT EXISTS owner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS contest_team_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id TEXT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contest_id, team_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_owner_email ON teams(owner_email);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(user_email);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_contest_team_access_contest ON contest_team_access(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_team_access_team ON contest_team_access(team_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable Row Level Security (policies will be created in application)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create sample problems
INSERT INTO problems (title, slug, description, difficulty, category, examples, constraints, time_limit_ms, memory_limit_mb)
VALUES 
(
  'Two Sum',
  'two-sum',
  'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume each input has exactly one solution, and you cannot use the same element twice. You can return the answer in any order.',
  'Easy',
  'Array',
  '[{"input": "[2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] == 9, so we return [0, 1]."}]',
  '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9, Only one valid answer exists.',
  1000,
  256
),
(
  'Reverse String',
  'reverse-string',
  'Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.',
  'Easy',
  'String',
  '[{"input": "[\"h\",\"e\",\"l\",\"l\",\"o\"]", "output": "[\"o\",\"l\",\"l\",\"e\",\"h\"]", "explanation": "The string \"hello\" becomes \"olleh\"."}]',
  '1 <= s.length <= 10^5, s[i] is a printable ascii character.',
  1000,
  256
),
(
  'Longest Substring Without Repeating Characters',
  'longest-substring-without-repeating-characters',
  'Given a string s, find the length of the longest substring without repeating characters.',
  'Medium',
  'String',
  '[{"input": "\"abcabcbb\"", "output": "3", "explanation": "The answer is \"abc\", with the length of 3."}]',
  '0 <= s.length <= 5 * 10^4, s consists of English letters, digits, symbols and spaces.',
  2000,
  256
);
