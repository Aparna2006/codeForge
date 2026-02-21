import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { getUserEmailFromRequest } from '@/lib/server-auth';

async function resolveTeamId(
  request: NextRequest,
  params: { id: string } | Promise<{ id: string }> | undefined
) {
  const resolved = params ? await params : undefined;
  const fromParams = resolved?.id;
  if (fromParams) return fromParams;

  const chunks = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = chunks.findIndex((c) => c === 'teams');
  return idx >= 0 && chunks[idx + 1] ? chunks[idx + 1] : '';
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }

    const userEmail = await getUserEmailFromRequest(request);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Please sign in.' }, { status: 401 });
    }

    const teamId = await resolveTeamId(request, params);
    const body = await request.json().catch(() => ({}));
    const invitedEmail = String(body?.invited_email || '').trim().toLowerCase();
    if (!teamId || !invitedEmail) {
      return NextResponse.json({ success: false, message: 'Missing team or invite email.' }, { status: 400 });
    }

    const teamQuery = supabase.from('teams').select('id,owner_email,name,slug');
    const teamLookup = looksLikeUuid(teamId) ? teamQuery.eq('id', teamId) : teamQuery.eq('slug', teamId);
    const { data: team, error: teamError } = await teamLookup.maybeSingle();
    if (teamError) return NextResponse.json({ success: false, message: teamError.message }, { status: 500 });
    if (!team) return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    if (invitedEmail === userEmail.toLowerCase()) {
      return NextResponse.json({ success: false, message: 'You cannot invite your own email.' }, { status: 400 });
    }

    let authorized = String((team as any).owner_email || '').toLowerCase() === userEmail.toLowerCase();
    if (!authorized) {
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', (team as any).id)
        .eq('user_email', userEmail)
        .maybeSingle();
      if (memberError) return NextResponse.json({ success: false, message: memberError.message }, { status: 500 });
      authorized = ['owner', 'admin'].includes(String((member as any)?.role || '').toLowerCase());
    }
    if (!authorized) {
      return NextResponse.json({ success: false, message: 'Only team owner/admin can invite.' }, { status: 403 });
    }

    const inviteToken = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .insert({
        team_id: (team as any).id,
        invited_email: invitedEmail,
        invited_by_email: userEmail,
        invite_token: inviteToken,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id,invite_token,invited_email,status,expires_at,created_at')
      .single();
    if (inviteError) return NextResponse.json({ success: false, message: inviteError.message }, { status: 500 });

    await supabase.from('notifications').insert({
      user_email: invitedEmail,
      type: 'team_invite',
      title: `Team invite: ${(team as any).name}`,
      body: `${userEmail} invited you to join ${(team as any).name}.`,
      payload: { team_id: (team as any).id, team_slug: (team as any).slug, invite_token: inviteToken },
    });

    return NextResponse.json({ success: true, invite });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
