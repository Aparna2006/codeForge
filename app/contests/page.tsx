'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Trophy, Users } from 'lucide-react';
import { contestProblems, mockContests } from '@/lib/mock-data';
import { supabase } from '@/lib/supabase';
import { isClientAdminEmail } from '@/lib/admin-client';
import SignOutButton from '@/components/signout-button';

type ContestRow = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  prize_pool_coins: number;
  status: string;
  start_time: string;
  visibility?: string;
};

const CONTEST1_LIVE_END_ISO = '2026-03-31T23:59:59.000Z';

export default function ContestsPage() {
  const router = useRouter();
  const [contests, setContests] = useState<ContestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/contests', { cache: 'no-store' });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Failed to load contests');
        setContests(json.contests || []);
      } catch (_e) {
        const fallback = mockContests.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          duration_minutes: c.duration,
          prize_pool_coins: c.prizePoolCoins ?? 2000,
          status: c.status,
          start_time: c.startTime.toISOString(),
        }));
        setContests(fallback);
        setError('Using local contest data. Run contests schema SQL to enable DB mode.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const resolveAdminAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setShowAdmin(isClientAdminEmail(user?.email ?? null));
    };
    void resolveAdminAccess();
  }, []);

  const primaryContest = useMemo(() => contests[0], [contests]);
  const liveEndDateLabel = useMemo(() => {
    if (!primaryContest) return '';
    if (primaryContest.id === 'contest-1') return 'Mar 31, 2026';
    return new Date(primaryContest.start_time).toLocaleDateString();
  }, [primaryContest]);

  const isLiveContestOpen = useMemo(() => {
    if (!primaryContest) return false;
    const startMs = new Date(primaryContest.start_time).getTime();
    const endMs =
      primaryContest.id === 'contest-1'
        ? new Date(CONTEST1_LIVE_END_ISO).getTime()
        : startMs + primaryContest.duration_minutes * 60_000;
    const now = Date.now();
    if (primaryContest.status === 'finished') return false;
    return now >= startMs && now <= endMs;
  }, [primaryContest]);
  const questionCount = useMemo(() => {
    if (!primaryContest) return 0;
    const local = (contestProblems as Record<string, any[]>)[primaryContest.id];
    return Array.isArray(local) ? local.length : 4;
  }, [primaryContest]);

  const handleStart = async (mode: 'live' | 'virtual') => {
    if (!primaryContest) return;
    if (mode === 'virtual' && isLiveContestOpen) {
      setNoticeMessage('Contest virtual is available after March 31st. Join live contest, all the best champs.');
      setShowNotice(true);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const email = session?.user?.email;
    const token = session?.access_token;
    if (!email || !token) {
      router.push('/auth/signin');
      return;
    }

    const visibility = String(primaryContest.visibility || 'public').toLowerCase();
    let accessCode = '';
    if (visibility === 'private_code' || visibility === 'private') {
      accessCode = window.prompt('Enter contest access code')?.trim() || '';
      if (!accessCode) {
        setNoticeMessage('Access code is required for this contest.');
        setShowNotice(true);
        return;
      }
    }

    if (mode === 'live') {
      await fetch(`/api/contests/${primaryContest.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_email: email, access_code: accessCode || null }),
      });
    }

    const attemptRes = await fetch(`/api/contests/${primaryContest.id}/attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'start', access_code: accessCode || null }),
    });
    const attemptJson = await attemptRes.json();
    if (!attemptRes.ok || !attemptJson.success) {
      setNoticeMessage(attemptJson.message || 'Unable to start contest.');
      setShowNotice(true);
      return;
    }

    router.push(`/contests/${primaryContest.id}/exam?mode=${mode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      {showNotice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <Card className="w-full max-w-md border-gray-200 dark:border-white/10">
            <CardHeader>
              <CardTitle>Notice</CardTitle>
              <CardDescription>{noticeMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowNotice(false)} className="w-full bg-purple-600 text-white hover:bg-purple-700">
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-purple-600">
            codeForge
          </Link>
          <div className="flex gap-3">
            <Link href="/problems">
              <Button variant="ghost">Problems</Button>
            </Link>
            <Link href="/teams">
              <Button variant="ghost">Teams</Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost">Notifications</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            {showAdmin ? (
              <Link href="/contests/admin">
                <Button variant="ghost">Admin</Button>
              </Link>
            ) : null}
            <Link href="/leaderboard">
              <Button variant="outline">Leaderboard</Button>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">Contests</h1>
          <p className="text-gray-600 dark:text-gray-400">Admin-created exam contests with auto judging.</p>
          {error ? <p className="mt-2 text-sm text-amber-600">{error}</p> : null}
        </div>

        {loading ? (
          <Card><CardContent className="pt-6">Loading contests...</CardContent></Card>
        ) : !primaryContest ? (
          <Card><CardContent className="pt-6">No contests found.</CardContent></Card>
        ) : (
          <Card className="border-gray-200 dark:border-white/10">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-3xl text-gray-900 dark:text-white">{primaryContest.title}</CardTitle>
                  <CardDescription>{primaryContest.description}</CardDescription>
                </div>
                <div className="text-right">
                  <Badge className="bg-purple-600 text-white">{isLiveContestOpen ? 'Live' : 'Live Closed'}</Badge>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Live till {liveEndDateLabel}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Access: {String(primaryContest.visibility || 'public')}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-950/30">
                  <p className="text-sm text-blue-800 dark:text-blue-300">Questions</p>
                  <p className="text-2xl font-bold text-blue-600">{questionCount}</p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-950/30">
                  <p className="text-sm text-orange-800 dark:text-orange-300">Duration</p>
                  <p className="text-2xl font-bold text-orange-600">{primaryContest.duration_minutes} min</p>
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/30 dark:bg-purple-950/30">
                  <p className="text-sm text-purple-800 dark:text-purple-300">Prize Pool</p>
                  <p className="text-2xl font-bold text-purple-600">{primaryContest.prize_pool_coins} coins</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-950/30">
                  <p className="text-sm text-green-800 dark:text-green-300">Participants</p>
                  <p className="text-2xl font-bold text-green-600">{mockContests[0].registered}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-gray-200 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      Prize Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {mockContests[0].prizes.map((p) => (
                      <div key={p.rank} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 dark:bg-white/5">
                        <span>{p.rank}</span>
                        <span className="font-semibold text-purple-600">{p.coins} coins</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg">Contest Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> Single timed exam session</p>
                    <p className="flex items-center gap-2"><Users className="h-4 w-4" /> For a small registered group</p>
                    <p>Languages: C, C++, Java, Python</p>
                    <p>1 visible testcase + 4 hidden testcases per question.</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Button
                  onClick={() => handleStart('live')}
                  disabled={!isLiveContestOpen}
                  className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start Live Contest
                </Button>
                <Button
                  onClick={() => handleStart('virtual')}
                  variant="outline"
                  className="w-full"
                >
                  Start Virtual Contest
                </Button>
              </div>
              <Link href={`/contests/${primaryContest.id}/submissions?mode=live`}>
                <Button variant="outline" className="w-full">My Submissions</Button>
              </Link>
              <Link href={`/contests/${primaryContest.id}/team-leaderboard`}>
                <Button variant="outline" className="w-full">Team Leaderboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
