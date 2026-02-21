import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-server';

export async function GET() {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
  }

  const { data: contests, error } = await supabase
    .from('contests')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contests: contests ?? [] });
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const body = await request.json();
  const {
    id,
    title,
    description,
    duration_minutes = 90,
    prize_pool_coins = 2000,
    status = 'upcoming',
    start_time,
    visibility = 'public',
    private_access_code = null,
    owner_team_id = null,
    team_access_ids = [],
    prizes = [],
  } = body || {};

  if (!id || !title || !description) {
    return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
  }

  const { error: contestError } = await supabase.from('contests').upsert(
    {
      id,
      title,
      description,
      duration_minutes,
      prize_pool_coins,
      status,
      start_time: start_time ?? new Date().toISOString(),
      visibility,
      private_access_code,
      owner_team_id,
    },
    { onConflict: 'id' }
  );

  if (contestError) {
    return NextResponse.json({ success: false, message: contestError.message }, { status: 500 });
  }

  if (Array.isArray(prizes) && prizes.length > 0) {
    await supabase.from('contest_prizes').delete().eq('contest_id', id);
    const { error: prizeError } = await supabase.from('contest_prizes').insert(
      prizes.map((p: { rank_label: string; coins: number }) => ({
        contest_id: id,
        rank_label: p.rank_label,
        coins: p.coins,
      }))
    );
    if (prizeError) {
      return NextResponse.json({ success: false, message: prizeError.message }, { status: 500 });
    }
  }

  if (Array.isArray(team_access_ids)) {
    await supabase.from('contest_team_access').delete().eq('contest_id', id);
    const cleaned = team_access_ids.map((v: any) => String(v).trim()).filter(Boolean);
    if (cleaned.length > 0) {
      const { error: accessError } = await supabase.from('contest_team_access').insert(
        cleaned.map((teamId: string) => ({ contest_id: id, team_id: teamId }))
      );
      if (accessError) {
        return NextResponse.json({ success: false, message: accessError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true });
}
