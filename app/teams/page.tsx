'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import SignOutButton from '@/components/signout-button';

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  myRole: string;
  created_at: string;
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const loadTeams = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = await getToken();
      if (!token) {
        setMessage('Please sign in first.');
        return;
      }
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.message || 'Unable to load teams.');
        return;
      }
      setTeams(json.teams || []);
      const rows = (json.teams || []) as TeamRow[];
      if (!inviteTeamId && rows.length > 0) {
        setInviteTeamId(rows[0].slug || rows[0].id);
      }
    } catch (_e) {
      setMessage('Failed to load teams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  const createTeam = async () => {
    setMessage('');
    try {
      const token = await getToken();
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, slug: slug || undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.message || 'Team creation failed.');
        return;
      }
      setName('');
      setSlug('');
      setMessage('Team created.');
      await loadTeams();
    } catch (_e) {
      setMessage('Team creation failed.');
    }
  };

  const sendInvite = async () => {
    setMessage('');
    try {
      if (!inviteTeamId.trim() || !inviteEmail.trim()) {
        setMessage('Please select team and enter invite email.');
        return;
      }
      const token = await getToken();
      const res = await fetch(`/api/teams/${inviteTeamId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invited_email: inviteEmail }),
      });
      const raw = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(raw);
      } catch (_e) {
        setMessage(`Invite failed (${res.status}). ${raw.slice(0, 180)}`);
        return;
      }
      if (!json.success) {
        setMessage(json.message || `Invite failed (${res.status}).`);
        return;
      }
      setMessage(`Invite created. Token: ${json.invite?.invite_token}`);
    } catch (_e) {
      setMessage('Invite failed.');
    }
  };

  const acceptInvite = async () => {
    setMessage('');
    try {
      const token = await getToken();
      const res = await fetch('/api/teams/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: inviteToken }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.message || 'Accept failed.');
        return;
      }
      setInviteToken('');
      setMessage('Invite accepted.');
      await loadTeams();
    } catch (_e) {
      setMessage('Accept failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-purple-600">codeForge</Link>
          <div className="flex gap-3">
            <Link href="/dashboard"><Button variant="ghost">Dashboard</Button></Link>
            <Link href="/contests"><Button variant="ghost">Contests</Button></Link>
            <Link href="/notifications"><Button variant="ghost">Notifications</Button></Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Teams</h1>

        <Card>
          <CardHeader>
            <CardTitle>Create Team</CardTitle>
            <CardDescription>Use team contests and team leaderboard features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" />
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Team slug (optional)" />
            <Button onClick={createTeam}>Create Team</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My Teams</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p className="text-sm text-gray-500">Loading...</p> : null}
            {!loading && teams.length === 0 ? <p className="text-sm text-gray-500">No teams yet.</p> : null}
            {teams.map((team) => (
              <div key={team.id} className="rounded border border-gray-200 p-3 dark:border-white/10">
                <p className="font-medium">{team.name}</p>
                <p className="text-xs text-gray-500">{team.slug} | Role: {team.myRole}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Send Invite</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              value={inviteTeamId}
              onChange={(e) => setInviteTeamId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.slug || team.id}>
                  {team.name} ({team.slug || team.id})
                </option>
              ))}
            </select>
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Invite email" />
            <Button onClick={sendInvite}>Send Invite</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Accept Invite</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} placeholder="Invite token" />
            <Button onClick={acceptInvite}>Accept</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contest Team Leaderboard</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View team rankings from each contest page.
            </p>
            <Link href="/contests">
              <Button variant="outline" className="mt-3">Go to Contests</Button>
            </Link>
          </CardContent>
        </Card>

        {message ? <p className="text-sm text-purple-600">{message}</p> : null}
      </main>
    </div>
  );
}
