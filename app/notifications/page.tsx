'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import SignOutButton from '@/components/signout-button';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  payload?: {
    team_id?: string;
    team_slug?: string;
    invite_token?: string;
  } | null;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = await getToken();
      if (!token) {
        setMessage('Please sign in first.');
        return;
      }
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.message || 'Failed to load notifications.');
        return;
      }
      setItems(json.notifications || []);
    } catch (_e) {
      setMessage('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markRead = async (id: string) => {
    try {
      const token = await getToken();
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch (_e) {
      // no-op
    }
  };

  const markAllRead = async () => {
    try {
      const token = await getToken();
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mark_all: true }),
      });
      await load();
    } catch (_e) {
      // no-op
    }
  };

  const acceptInviteFromNotification = async (notification: NotificationRow) => {
    const token = notification.payload?.invite_token;
    if (!token) {
      setMessage('Invite token is missing in this notification.');
      return;
    }
    try {
      const authToken = await getToken();
      const res = await fetch('/api/teams/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.message || 'Unable to accept invite.');
        return;
      }
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ id: notification.id }),
      });
      setMessage('Invite accepted. Team membership updated.');
      await load();
    } catch (_e) {
      setMessage('Unable to accept invite.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-purple-600">codeForge</Link>
          <div className="flex gap-3">
            <Link href="/dashboard"><Button variant="ghost">Dashboard</Button></Link>
            <Link href="/teams"><Button variant="ghost">Teams</Button></Link>
            <Link href="/contests"><Button variant="ghost">Contests</Button></Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <Button variant="outline" onClick={markAllRead}>Mark all read</Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Inbox</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-gray-500">Loading...</p> : null}
            {!loading && items.length === 0 ? <p className="text-sm text-gray-500">No notifications.</p> : null}
            {items.map((n) => (
              <div key={n.id} className="rounded border border-gray-200 p-3 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{n.body}</p>
                    {n.type === 'team_invite' && n.payload?.invite_token ? (
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        Invite Token: {n.payload.invite_token}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {n.type === 'team_invite' && n.payload?.invite_token ? (
                      <Button size="sm" onClick={() => acceptInviteFromNotification(n)}>
                        Accept Invite
                      </Button>
                    ) : null}
                    {!n.read ? <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Mark read</Button> : null}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {message ? <p className="text-sm text-purple-600">{message}</p> : null}
      </main>
    </div>
  );
}
