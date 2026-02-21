import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';

async function resolveContestId(
  request: NextRequest,
  params: { id: string } | Promise<{ id: string }> | undefined
) {
  const resolved = params ? await params : undefined;
  const fromParams = resolved?.id;
  if (fromParams) return fromParams;

  const chunks = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = chunks.findIndex((c) => c === 'contests');
  return idx >= 0 && chunks[idx + 1] ? chunks[idx + 1] : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }

    const contestId = await resolveContestId(request, params);
    const { data, error } = await supabase
      .from('contest_submissions')
      .select('question_id,user_email,score,runtime_ms,submitted_at')
      .eq('contest_id', contestId);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const bestByUserQuestion = new Map<string, { score: number; runtimeMs: number; submittedAt: string }>();
    for (const row of data ?? []) {
      const key = `${row.user_email}::${row.question_id}`;
      const current = bestByUserQuestion.get(key);
      const candidate = {
        score: Number(row.score ?? 0),
        runtimeMs: Number(row.runtime_ms ?? 0),
        submittedAt: row.submitted_at ?? new Date(0).toISOString(),
      };
      if (
        !current ||
        candidate.score > current.score ||
        (candidate.score === current.score && candidate.runtimeMs < current.runtimeMs) ||
        (candidate.score === current.score &&
          candidate.runtimeMs === current.runtimeMs &&
          candidate.submittedAt < current.submittedAt)
      ) {
        bestByUserQuestion.set(key, candidate);
      }
    }

    const aggregate = new Map<string, { totalScore: number; solvedCount: number; runtimeMs: number; lastSubmitAt: string }>();
    for (const [key, best] of bestByUserQuestion.entries()) {
      const [email] = key.split('::');
      const existing = aggregate.get(email) ?? {
        totalScore: 0,
        solvedCount: 0,
        runtimeMs: 0,
        lastSubmitAt: new Date(0).toISOString(),
      };
      existing.totalScore += best.score;
      if (best.score > 0) existing.solvedCount += 1;
      existing.runtimeMs += best.runtimeMs;
      if (best.submittedAt > existing.lastSubmitAt) existing.lastSubmitAt = best.submittedAt;
      aggregate.set(email, existing);
    }

    const leaderboard = Array.from(aggregate.entries())
      .map(([email, value]) => ({ email, ...value }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        if (a.runtimeMs !== b.runtimeMs) return a.runtimeMs - b.runtimeMs;
        return a.lastSubmitAt.localeCompare(b.lastSubmitAt);
      })
      .map((row, idx) => ({
        rank: idx + 1,
        email: row.email,
        totalScore: row.totalScore,
        solvedCount: row.solvedCount,
        runtimeMs: row.runtimeMs,
        lastSubmitAt: row.lastSubmitAt,
      }));

    return NextResponse.json({ success: true, leaderboard });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
