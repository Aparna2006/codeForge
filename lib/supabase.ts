import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

// Prevent import-time crashes in environments where env vars are not configured yet.
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key'
);

export type User = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type Problem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string | null;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }> | null;
  test_cases: Array<{
    input: string;
    output: string;
  }> | null;
  constraints: string | null;
  time_limit_ms: number;
  memory_limit_mb: number;
  accepted_count: number;
  submission_count: number;
  created_at: string;
  updated_at: string;
};

export type Submission = {
  id: string;
  user_id: string;
  problem_id: string;
  code: string;
  language: 'python' | 'javascript' | 'typescript' | 'c' | 'cpp' | 'java' | 'go' | 'r';
  status: 'pending' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error' | 'compilation_error';
  runtime_ms: number | null;
  memory_mb: number | null;
  verdict_details: {
    test_case_index?: number;
    expected_output?: string;
    actual_output?: string;
    error_message?: string;
  } | null;
  created_at: string;
};

export type Activity = {
  id: string;
  user_id: string;
  submission_date: string;
  submission_count: number;
  accepted_count: number;
  created_at: string;
};

export type UserStats = {
  id: string;
  user_id: string;
  total_submissions: number;
  total_accepted: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  acceptance_rate: number;
  ranking: number | null;
  created_at: string;
  updated_at: string;
};
