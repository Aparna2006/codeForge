import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { getContestAccessDecision } from '@/lib/contest-access';

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

async function getUserEmailFromToken(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

function isMissingTableError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('contest_attempts') &&
    (lower.includes('not found') || lower.includes('does not exist') || lower.includes('schema cache'))
  );
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
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Please sign in to continue.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('contest_attempts')
      .select('status,started_at,completed_at')
      .eq('contest_id', contestId)
      .eq('user_email', userEmail)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error.message || '')) {
        return NextResponse.json(
          { success: false, message: "Table 'contest_attempts' is missing. Run contests schema SQL." },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const status = data?.status ?? 'not_started';
    return NextResponse.json({
      success: true,
      status,
      canAttempt: status !== 'completed',
      started_at: data?.started_at ?? null,
      completed_at: data?.completed_at ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }

    const contestId = await resolveContestId(request, params);
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Please sign in to continue.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action === 'end' ? 'end' : 'start';
    const accessCode = body?.access_code ?? null;

    const { data: existing, error: fetchError } = await supabase
      .from('contest_attempts')
      .select('id,status')
      .eq('contest_id', contestId)
      .eq('user_email', userEmail)
      .maybeSingle();

    if (fetchError) {
      if (isMissingTableError(fetchError.message || '')) {
        return NextResponse.json(
          { success: false, message: "Table 'contest_attempts' is missing. Run contests schema SQL." },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: false, message: fetchError.message }, { status: 500 });
    }

    if (action === 'start') {
      const access = await getContestAccessDecision(contestId, userEmail, accessCode);
      if (!access.allowed) {
        return NextResponse.json({ success: false, message: access.message }, { status: access.status });
      }

      if (existing?.status === 'completed') {
        return NextResponse.json(
          { success: false, message: 'You already attempted the exam.' },
          { status: 403 }
        );
      }

      if (!existing) {
        const { error: insertError } = await supabase.from('contest_attempts').insert({
          contest_id: contestId,
          user_email: userEmail,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        });
        if (insertError) {
          return NextResponse.json({ success: false, message: insertError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, status: 'in_progress' });
    }

    if (existing?.status === 'completed') {
      return NextResponse.json({ success: true, status: 'completed' });
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('contest_attempts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updateError) {
        return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from('contest_attempts').insert({
        contest_id: contestId,
        user_email: userEmail,
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      if (insertError) {
        return NextResponse.json({ success: false, message: insertError.message }, { status: 500 });
      }
    }

    // Notify user with final score summary when exam is ended.
    const { data: submissionRows } = await supabase
      .from('contest_submissions')
      .select('question_id,score')
      .eq('contest_id', contestId)
      .eq('user_email', userEmail);
    const bestByQuestion = new Map<string, number>();
    for (const row of submissionRows || []) {
      const qid = String((row as any).question_id || '');
      const score = Number((row as any).score ?? 0);
      bestByQuestion.set(qid, Math.max(bestByQuestion.get(qid) ?? 0, score));
    }
    const totalScore = Array.from(bestByQuestion.values()).reduce((sum, value) => sum + value, 0);
    await supabase.from('notifications').insert({
      user_email: userEmail,
      type: 'contest_completed',
      title: 'Contest attempt completed',
      body: `You completed ${contestId} with score ${totalScore}.`,
      payload: { contest_id: contestId, total_score: totalScore },
    });

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
