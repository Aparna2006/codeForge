'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TeamLeaderboardRow = {
  rank: number;
  teamId: string;
  teamName: string;
  totalScore: number;
  solvedCount: number;
  participants: number;
  runtimeMs: number;
};

export default function ContestTeamLeaderboardPage() {
  const params = useParams<{ id: string }>();
  const contestId = params?.id || '';
  const [rows, setRows] = useState<TeamLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!contestId) return;
      setLoading(true);
      setMessage('');
      try {
        const res = await fetch(`/api/contests/${contestId}/team-leaderboard`, { cache: 'no-store' });
        const json = await res.json();
        if (!json.success) {
          setMessage(json.message || 'Failed to load team leaderboard.');
          return;
        }
        setRows(json.leaderboard || []);
      } catch (_e) {
        setMessage('Failed to load team leaderboard.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [contestId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-6 py-10 dark:from-black dark:to-gray-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Team Leaderboard</h1>
          <Link href="/contests"><Button variant="outline">Back to Contests</Button></Link>
        </div>

        <Card>
          <CardHeader><CardTitle>Contest: {contestId}</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-gray-500">Loading...</p> : null}
            {!loading && rows.length === 0 ? <p className="text-sm text-gray-500">No team results yet.</p> : null}
            {rows.length > 0 ? (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.teamId} className="grid grid-cols-5 gap-2 rounded border border-gray-200 p-3 text-sm dark:border-white/10">
                    <p>#{row.rank}</p>
                    <p className="font-medium">{row.teamName}</p>
                    <p>Score: {row.totalScore}</p>
                    <p>Solved: {row.solvedCount}</p>
                    <p>Members: {row.participants}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {message ? <p className="mt-3 text-sm text-purple-600">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

