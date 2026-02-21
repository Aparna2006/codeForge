import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { getUserEmailFromRequest } from '@/lib/server-auth';
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

export async function POST(request: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
  }

  const contestId = await resolveContestId(request, params);
  const body = await request.json().catch(() => ({}));
  const accessCode = body?.access_code ?? null;
  const fromToken = await getUserEmailFromRequest(request);
  const userEmail = fromToken || body?.user_email;
  if (!contestId || !userEmail) {
    return NextResponse.json({ success: false, message: 'Missing contest or user email.' }, { status: 400 });
  }

  const access = await getContestAccessDecision(contestId, userEmail, accessCode);
  if (!access.allowed) {
    return NextResponse.json({ success: false, message: access.message }, { status: access.status });
  }

  const { data: attempt } = await supabase
    .from('contest_attempts')
    .select('status')
    .eq('contest_id', contestId)
    .eq('user_email', userEmail)
    .maybeSingle();
  if (attempt?.status === 'completed') {
    return NextResponse.json({ success: false, message: 'You already attempted the exam.' }, { status: 403 });
  }

  const { error } = await supabase.from('contest_registrations').upsert(
    { contest_id: contestId, user_email: userEmail },
    { onConflict: 'contest_id,user_email' }
  );

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
