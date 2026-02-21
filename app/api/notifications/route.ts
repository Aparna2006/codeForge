import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { getUserEmailFromRequest } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }
    const userEmail = await getUserEmailFromRequest(request);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Please sign in.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id,type,title,body,payload,read,created_at')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

    return NextResponse.json({ success: true, notifications: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }
    const userEmail = await getUserEmailFromRequest(request);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Please sign in.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = body?.id ? String(body.id) : null;
    const markAll = Boolean(body?.mark_all);

    if (!id && !markAll) {
      return NextResponse.json({ success: false, message: 'Missing notification id.' }, { status: 400 });
    }

    const query = supabase.from('notifications').update({ read: true }).eq('user_email', userEmail);
    const { error } = id ? await query.eq('id', id) : await query.eq('read', false);
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

