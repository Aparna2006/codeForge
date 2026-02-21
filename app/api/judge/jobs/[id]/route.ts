import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';

const JUDGE_SERVICE_URL = process.env.JUDGE_SERVICE_URL || 'http://localhost:4100';
const JUDGE_SERVICE_API_TOKEN = process.env.JUDGE_SERVICE_API_TOKEN || '';

async function persistAsyncSubmission(job: any) {
  if (!hasSupabaseEnv) return;
  try {
    const jobId = String(job?.id || '');
    const meta = job?.data?.meta || {};
    const result = job?.returnvalue || {};
    const userEmail = String(meta?.userEmail || '');
    const problemId = String(meta?.problemId || '');
    const problemSlug = String(meta?.problemSlug || '');
    const language = String(job?.data?.language || '');
    if (!jobId || !userEmail || !problemId || !problemSlug || !language) return;

    const { data: existingSource } = await supabase
      .from('problem_submissions')
      .select('id')
      .eq('source_job_id', jobId)
      .maybeSingle();
    if (existingSource?.id) return;

    const { data: existing } = await supabase
      .from('problem_progress')
      .select('id,attempted_count,accepted_count')
      .eq('problem_id', problemId)
      .eq('user_email', userEmail)
      .maybeSingle();

    const verdict = String(result?.verdict || 'Compilation Error');
    const acceptedInc = verdict === 'Accepted' ? 1 : 0;

    await supabase.from('problem_submissions').insert({
      problem_id: problemId,
      problem_slug: problemSlug,
      user_email: userEmail,
      language,
      code: '--async-job--',
      verdict,
      runtime_ms: Number(result?.runtimeMs ?? 0),
      time_limit_ms: Number(result?.timeLimitMs ?? 0),
      memory_limit_mb: Number(result?.memoryLimitMb ?? 0),
      output: String(result?.output || ''),
      source_job_id: jobId,
      artifact_url: String(result?.reportUrl || ''),
      judge_report: result?.details ?? {},
    });

    if (!existing) {
      await supabase.from('problem_progress').insert({
        problem_id: problemId,
        user_email: userEmail,
        attempted_count: 1,
        accepted_count: acceptedInc,
        last_verdict: verdict,
        last_language: language,
        last_submitted_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from('problem_progress')
        .update({
          attempted_count: Number(existing.attempted_count ?? 0) + 1,
          accepted_count: Number(existing.accepted_count ?? 0) + acceptedInc,
          last_verdict: verdict,
          last_language: language,
          last_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }
  } catch (_err) {
    // best effort persistence for async jobs
  }
}

async function resolveJobId(
  request: NextRequest,
  params: { id: string } | Promise<{ id: string }> | undefined
) {
  const resolved = params ? await params : undefined;
  const fromParams = resolved?.id;
  if (fromParams) return fromParams;
  const chunks = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = chunks.findIndex((c) => c === 'jobs');
  return idx >= 0 && chunks[idx + 1] ? chunks[idx + 1] : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const jobId = await resolveJobId(request, params);
    if (!jobId) {
      return NextResponse.json({ success: false, message: 'Missing job id' }, { status: 400 });
    }

    const resp = await fetch(`${JUDGE_SERVICE_URL}/api/v1/judge/jobs/${encodeURIComponent(jobId)}`, {
      headers: {
        ...(JUDGE_SERVICE_API_TOKEN ? { 'x-judge-service-token': JUDGE_SERVICE_API_TOKEN } : {}),
      },
    });
    const json = await resp.json();
    if (resp.ok && json?.success && json?.job?.state === 'completed') {
      await persistAsyncSubmission(json.job);
    }
    if (json?.job?.data?.code) {
      delete json.job.data.code;
    }
    if (json?.job?.data?.testCases) {
      delete json.job.data.testCases;
    }
    return NextResponse.json(json, { status: resp.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
