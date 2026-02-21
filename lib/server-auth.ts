import 'server-only';

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function getUserEmailFromRequest(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

