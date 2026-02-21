import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { contestProblems } from '@/lib/mock-data';

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

async function getContestQuestionCount(contestId: string): Promise<number> {
  if (hasSupabaseEnv) {
    const { count } = await supabase
      .from('contest_questions')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', contestId);
    if (typeof count === 'number' && count > 0) return count;
  }

  const fallback = (contestProblems as Record<string, any[]>)[contestId] || [];
  return Array.isArray(fallback) && fallback.length > 0 ? fallback.length : 1;
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

    const totalQuestions = await getContestQuestionCount(contestId);
    const totalPossibleScore = totalQuestions * 5;

    const { data, error } = await supabase
      .from('contest_submissions')
      .select('id,question_id,question_title,language,verdict,score,runtime_ms,passed_count,total_count,submitted_at')
      .eq('contest_id', contestId)
      .eq('user_email', userEmail)
      .order('submitted_at', { ascending: false });

    if (error) {
      const msg = error.message || '';
      const lower = msg.toLowerCase();
      const missingTable =
        lower.includes('contest_submissions') &&
        (lower.includes('not found') || lower.includes('does not exist') || lower.includes('schema cache'));
      if (missingTable) {
        return NextResponse.json({
          success: true,
          submissions: [],
          summary: {
            totalAttempts: 0,
            questionsAttempted: 0,
            questionsSolved: 0,
            totalScore: 0,
            totalPossibleScore,
          },
          warning: "Table 'contest_submissions' is missing. Run contests schema SQL.",
        });
      }
      return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }

    const rows = data ?? [];
    const bestByQuestion = new Map<string, { score: number; solved: boolean }>();
    for (const row of rows) {
      const qid = row.question_id as string;
      const score = Number(row.score ?? 0);
      const solved = row.verdict === 'AC';
      const current = bestByQuestion.get(qid);
      if (!current || score > current.score || (score === current.score && solved && !current.solved)) {
        bestByQuestion.set(qid, { score, solved });
      }
    }

    const totalScore = Array.from(bestByQuestion.values()).reduce((sum, q) => sum + q.score, 0);
    const questionsSolved = Array.from(bestByQuestion.values()).filter((q) => q.solved).length;

    return NextResponse.json({
      success: true,
      submissions: rows,
      summary: {
        totalAttempts: rows.length,
        questionsAttempted: bestByQuestion.size,
        questionsSolved,
        totalScore,
        totalPossibleScore,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
