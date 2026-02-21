import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { getUserEmailFromRequest } from '@/lib/server-auth';

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
    const token = String(body?.token || '').trim();
    if (!token) {
      return NextResponse.json({ success: false, message: 'Invite token is required.' }, { status: 400 });
    }

    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('id,team_id,invited_email,status,expires_at')
      .eq('invite_token', token)
      .maybeSingle();
    if (inviteError) return NextResponse.json({ success: false, message: inviteError.message }, { status: 500 });
    if (!invite) return NextResponse.json({ success: false, message: 'Invite not found.' }, { status: 404 });

    if (String((invite as any).invited_email || '').toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json({ success: false, message: 'This invite is not for your account.' }, { status: 403 });
    }
    if ((invite as any).status !== 'pending') {
      return NextResponse.json({ success: false, message: 'Invite is already used.' }, { status: 400 });
    }
    const expiresAt = (invite as any).expires_at ? new Date((invite as any).expires_at).getTime() : null;
    if (expiresAt && expiresAt < Date.now()) {
      return NextResponse.json({ success: false, message: 'Invite expired.' }, { status: 400 });
    }

    const teamId = (invite as any).team_id as string;
    const { error: memberError } = await supabase.from('team_members').upsert(
      {
        team_id: teamId,
        user_email: userEmail,
        role: 'member',
      },
      { onConflict: 'team_id,user_email' }
    );
    if (memberError) return NextResponse.json({ success: false, message: memberError.message }, { status: 500 });

    const { error: updateError } = await supabase
      .from('team_invites')
      .update({ status: 'accepted' })
      .eq('id', (invite as any).id);
    if (updateError) return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

