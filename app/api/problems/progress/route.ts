import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';

async function getUserEmailFromToken(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

export async function GET(request: NextRequest) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }

    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ success: true, progress: {}, solvedCount: 0, attemptedCount: 0 });
    }

    const { data, error } = await supabase
      .from('problem_progress')
      .select('problem_id,attempted_count,accepted_count,last_verdict')
      .eq('user_email', userEmail);

    if (error) {
      const lower = (error.message || '').toLowerCase();
      const missing =
        lower.includes('problem_progress') &&
        (lower.includes('not found') || lower.includes('does not exist') || lower.includes('schema cache'));
      if (missing) {
        return NextResponse.json({
          success: true,
          progress: {},
          solvedCount: 0,
          attemptedCount: 0,
          warning: "Table 'problem_progress' is missing. Run latest schema SQL.",
        });
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const progress = Object.fromEntries(
      rows.map((r) => [
        r.problem_id,
        {
          attemptedCount: Number(r.attempted_count ?? 0),
          acceptedCount: Number(r.accepted_count ?? 0),
          status: Number(r.accepted_count ?? 0) > 0 ? 'accepted' : 'attempted',
          lastVerdict: r.last_verdict ?? '',
        },
      ])
    );

    const solvedCount = rows.filter((r) => Number(r.accepted_count ?? 0) > 0).length;
    return NextResponse.json({
      success: true,
      progress,
      solvedCount,
      attemptedCount: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
