import 'server-only';

import { supabase } from '@/lib/supabase';

type ContestAccessDecision =
  | { allowed: true }
  | { allowed: false; status: number; message: string };

function normalizeVisibility(value: string | null | undefined): 'public' | 'private_code' | 'team' {
  const v = (value || 'public').toLowerCase();
  if (v === 'private_code' || v === 'private') return 'private_code';
  if (v === 'team' || v === 'team_only') return 'team';
  return 'public';
}

export async function getContestAccessDecision(
  contestId: string,
  userEmail: string,
  accessCode?: string | null
): Promise<ContestAccessDecision> {
  const { data: contest, error: contestError } = await supabase
    .from('contests')
    .select('id,visibility,private_access_code,owner_team_id')
    .eq('id', contestId)
    .maybeSingle();

  if (contestError) return { allowed: false, status: 500, message: contestError.message };
  if (!contest) return { allowed: false, status: 404, message: 'Contest not found' };

  const visibility = normalizeVisibility((contest as any).visibility);
  if (visibility === 'public') return { allowed: true };

  if (visibility === 'private_code') {
    const expected = String((contest as any).private_access_code || '').trim();
    const provided = String(accessCode || '').trim();
    if (!expected || expected === provided) return { allowed: true };
    return { allowed: false, status: 403, message: 'Invalid contest access code.' };
  }

  const teamIds = new Set<string>();
  const { data: memberRows, error: membersError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_email', userEmail);
  if (membersError) return { allowed: false, status: 500, message: membersError.message };
  for (const row of memberRows || []) {
    if ((row as any).team_id) teamIds.add((row as any).team_id);
  }

  const ownerTeamId = (contest as any).owner_team_id as string | null;
  if (ownerTeamId) {
    const { data: ownerTeam, error: ownerTeamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', ownerTeamId)
      .eq('owner_email', userEmail)
      .maybeSingle();
    if (ownerTeamError) return { allowed: false, status: 500, message: ownerTeamError.message };
    if (ownerTeam?.id) teamIds.add(ownerTeam.id as string);
  }

  if (teamIds.size === 0) {
    return { allowed: false, status: 403, message: 'This contest is restricted to selected teams.' };
  }

  const ids = Array.from(teamIds);
  const { data: accessRows, error: accessError } = await supabase
    .from('contest_team_access')
    .select('id')
    .eq('contest_id', contestId)
    .in('team_id', ids)
    .limit(1);
  if (accessError) return { allowed: false, status: 500, message: accessError.message };
  if (!accessRows || accessRows.length === 0) {
    return { allowed: false, status: 403, message: 'Your team does not have access to this contest.' };
  }

  return { allowed: true };
}

