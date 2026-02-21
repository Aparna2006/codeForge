import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function getAdminEmails(): string[] {
  return parseEmails(
    process.env.ADMIN_EMAILS ??
      process.env.ADMIN_EMAIL ??
      process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
      process.env.NEXT_PUBLIC_ADMIN_EMAIL
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.toLowerCase());
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ ok: true; email: string } | { ok: false; response: NextResponse }> {
  const admins = getAdminEmails();
  if (admins.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          message: 'Admin emails are not configured. Set ADMIN_EMAILS or NEXT_PUBLIC_ADMIN_EMAILS.',
        },
        { status: 500 }
      ),
    };
  }

  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Missing auth token' }, { status: 401 }),
    };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Invalid auth token' }, { status: 401 }),
    };
  }

  if (!isAdminEmail(data.user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 }),
    };
  }

  return { ok: true, email: data.user.email };
}
