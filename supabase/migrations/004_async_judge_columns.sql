ALTER TABLE problem_submissions
  ADD COLUMN IF NOT EXISTS source_job_id TEXT,
  ADD COLUMN IF NOT EXISTS artifact_url TEXT,
  ADD COLUMN IF NOT EXISTS judge_report JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_problem_submissions_source_job_id
  ON problem_submissions(source_job_id)
  WHERE source_job_id IS NOT NULL;
