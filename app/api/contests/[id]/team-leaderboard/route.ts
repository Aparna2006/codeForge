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
    if (!contestId) {
      return NextResponse.json({ success: false, message: 'Missing contest id' }, { status: 400 });
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from('contest_submissions')
      .select('question_id,user_email,score,runtime_ms,submitted_at')
      .eq('contest_id', contestId);
    if (submissionsError) {
      return NextResponse.json({ success: false, message: submissionsError.message }, { status: 500 });
    }

    const bestByUserQuestion = new Map<string, { score: number; runtimeMs: number; submittedAt: string }>();
    for (const row of submissions || []) {
      const key = `${(row as any).user_email}::${(row as any).question_id}`;
      const candidate = {
        score: Number((row as any).score ?? 0),
        runtimeMs: Number((row as any).runtime_ms ?? 0),
        submittedAt: String((row as any).submitted_at ?? new Date(0).toISOString()),
      };
      const current = bestByUserQuestion.get(key);
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

    const userStats = new Map<
      string,
      { totalScore: number; solvedCount: number; runtimeMs: number; lastSubmitAt: string }
    >();
    for (const [key, best] of bestByUserQuestion.entries()) {
      const [email] = key.split('::');
      const existing = userStats.get(email) ?? {
        totalScore: 0,
        solvedCount: 0,
        runtimeMs: 0,
        lastSubmitAt: new Date(0).toISOString(),
      };
      existing.totalScore += best.score;
      if (best.score > 0) existing.solvedCount += 1;
      existing.runtimeMs += best.runtimeMs;
      if (best.submittedAt > existing.lastSubmitAt) existing.lastSubmitAt = best.submittedAt;
      userStats.set(email, existing);
    }

    const participantEmails = Array.from(userStats.keys());
    if (participantEmails.length === 0) {
      return NextResponse.json({ success: true, leaderboard: [] });
    }

    const [membersResp, ownerTeamsResp] = await Promise.all([
      supabase.from('team_members').select('team_id,user_email').in('user_email', participantEmails),
      supabase.from('teams').select('id,name,slug,owner_email').in('owner_email', participantEmails),
    ]);
    if (membersResp.error) {
      return NextResponse.json({ success: false, message: membersResp.error.message }, { status: 500 });
    }
    if (ownerTeamsResp.error) {
      return NextResponse.json({ success: false, message: ownerTeamsResp.error.message }, { status: 500 });
    }

    const teamMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const row of ownerTeamsResp.data || []) {
      teamMap.set((row as any).id, {
        id: (row as any).id,
        name: (row as any).name || 'Team',
        slug: (row as any).slug || '',
      });
    }

    const memberships = new Map<string, Set<string>>();
    for (const row of membersResp.data || []) {
      const email = (row as any).user_email as string;
      const teamId = (row as any).team_id as string;
      if (!memberships.has(email)) memberships.set(email, new Set());
      memberships.get(email)!.add(teamId);
    }
    for (const row of ownerTeamsResp.data || []) {
      const email = (row as any).owner_email as string;
      const teamId = (row as any).id as string;
      if (!memberships.has(email)) memberships.set(email, new Set());
      memberships.get(email)!.add(teamId);
    }

    const teamAgg = new Map<
      string,
      { totalScore: number; solvedCount: number; runtimeMs: number; participants: number; lastSubmitAt: string }
    >();
    for (const [email, stats] of userStats.entries()) {
      const teams = memberships.get(email);
      if (!teams || teams.size === 0) continue;
      for (const teamId of teams) {
        const current = teamAgg.get(teamId) ?? {
          totalScore: 0,
          solvedCount: 0,
          runtimeMs: 0,
          participants: 0,
          lastSubmitAt: new Date(0).toISOString(),
        };
        current.totalScore += stats.totalScore;
        current.solvedCount += stats.solvedCount;
        current.runtimeMs += stats.runtimeMs;
        current.participants += 1;
        if (stats.lastSubmitAt > current.lastSubmitAt) current.lastSubmitAt = stats.lastSubmitAt;
        teamAgg.set(teamId, current);
      }
    }

    const leaderboard = Array.from(teamAgg.entries())
      .map(([teamId, value]) => ({
        teamId,
        teamName: teamMap.get(teamId)?.name ?? 'Team',
        teamSlug: teamMap.get(teamId)?.slug ?? '',
        ...value,
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        if (a.runtimeMs !== b.runtimeMs) return a.runtimeMs - b.runtimeMs;
        return a.lastSubmitAt.localeCompare(b.lastSubmitAt);
      })
      .map((row, idx) => ({ rank: idx + 1, ...row }));

    return NextResponse.json({ success: true, leaderboard });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

