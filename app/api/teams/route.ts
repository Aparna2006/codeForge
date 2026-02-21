import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { getUserEmailFromRequest } from '@/lib/server-auth';

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export async function GET(request: NextRequest) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }

    const userEmail = await getUserEmailFromRequest(request);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Please sign in.' }, { status: 401 });
    }

    const [ownedResp, memberResp] = await Promise.all([
      supabase.from('teams').select('id,name,slug,owner_email,created_at').eq('owner_email', userEmail),
      supabase.from('team_members').select('team_id,role').eq('user_email', userEmail),
    ]);
    if (ownedResp.error) return NextResponse.json({ success: false, message: ownedResp.error.message }, { status: 500 });
    if (memberResp.error) return NextResponse.json({ success: false, message: memberResp.error.message }, { status: 500 });

    const memberTeamIds = (memberResp.data || []).map((row: any) => row.team_id).filter(Boolean);
    const memberTeamsResp =
      memberTeamIds.length > 0
        ? await supabase.from('teams').select('id,name,slug,owner_email,created_at').in('id', memberTeamIds)
        : { data: [], error: null } as any;
    if (memberTeamsResp.error) {
      return NextResponse.json({ success: false, message: memberTeamsResp.error.message }, { status: 500 });
    }

    const roleByTeamId: Record<string, string> = {};
    for (const row of memberResp.data || []) roleByTeamId[(row as any).team_id] = (row as any).role || 'member';

    const map = new Map<string, any>();
    for (const row of ownedResp.data || []) {
      map.set((row as any).id, { ...(row as any), myRole: 'owner' });
    }
    for (const row of memberTeamsResp.data || []) {
      const id = (row as any).id;
      if (!map.has(id)) map.set(id, { ...(row as any), myRole: roleByTeamId[id] || 'member' });
    }

    const teams = Array.from(map.values()).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return NextResponse.json({ success: true, teams });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }

    const userEmail = await getUserEmailFromRequest(request);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Please sign in.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const organizationId = body?.organization_id ? String(body.organization_id) : null;
    const providedSlug = String(body?.slug || '').trim();
    const slug = toSlug(providedSlug || name);

    if (!name || !slug) {
      return NextResponse.json({ success: false, message: 'Team name is required.' }, { status: 400 });
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        slug,
        organization_id: organizationId,
        owner_email: userEmail,
      })
      .select('id,name,slug,owner_email,created_at')
      .single();
    if (teamError) {
      return NextResponse.json({ success: false, message: teamError.message }, { status: 500 });
    }

    await supabase.from('team_members').upsert(
      {
        team_id: (team as any).id,
        user_email: userEmail,
        role: 'owner',
      },
      { onConflict: 'team_id,user_email' }
    );

    return NextResponse.json({ success: true, team: { ...team, myRole: 'owner' } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

