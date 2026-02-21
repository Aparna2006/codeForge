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
      return NextResponse.json({ success: false, message: 'Please sign in to continue.' }, { status: 401 });
    }

    const problemSlug = request.nextUrl.searchParams.get('problem_slug');
    let query = supabase
      .from('problem_submissions')
      .select('id,problem_id,problem_slug,user_email,language,verdict,runtime_ms,time_limit_ms,memory_limit_mb,artifact_url,source_job_id,created_at')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(200);
    if (problemSlug) query = query.eq('problem_slug', problemSlug);

    const { data, error } = await query;
    if (error) {
      const lower = (error.message || '').toLowerCase();
      const missing =
        lower.includes('problem_submissions') &&
        (lower.includes('not found') || lower.includes('does not exist') || lower.includes('schema cache'));
      if (missing) {
        return NextResponse.json({
          success: true,
          submissions: [],
          summary: { total: 0, accepted: 0, attemptedProblems: 0 },
          warning: "Table 'problem_submissions' is missing. Run latest schema SQL.",
        });
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const accepted = rows.filter((r) => r.verdict === 'Accepted').length;
    const attemptedProblems = new Set(rows.map((r) => r.problem_slug)).size;
    return NextResponse.json({
      success: true,
      submissions: rows,
      summary: { total: rows.length, accepted, attemptedProblems },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
