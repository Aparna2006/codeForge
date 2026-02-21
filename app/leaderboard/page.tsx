'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Flame, TrendingUp } from 'lucide-react';
import { mockUsers } from '@/lib/mock-data';
import SignOutButton from '@/components/signout-button';

export default function LeaderboardPage() {
  const [sortBy, setSortBy] = useState<'solved' | 'acceptance' | 'streak'>('solved');

  const usersWithRankSolved = useMemo(() => {
    const bySolved = [...mockUsers].sort((a, b) => b.solved - a.solved);
    let lastSolved = 61;

    return bySolved.map((user, index) => {
      const base = 60 - Math.floor((index / Math.max(bySolved.length - 1, 1)) * 30);
      const jitter = Math.floor(Math.random() * 3); // 0..2
      const candidate = Math.min(base - jitter, lastSolved - 1);
      const solved = Math.max(30, candidate);
      lastSolved = solved;

      return {
        ...user,
        solved,
      };
    });
  }, []);

  const sortedUsers = useMemo(() => {
    const users = [...usersWithRankSolved];
    if (sortBy === 'solved') {
      return users.sort((a, b) => b.solved - a.solved);
    } else if (sortBy === 'acceptance') {
      return users.sort((a, b) => b.acceptance - a.acceptance);
    } else {
      return users.sort((a, b) => b.streak - a.streak);
    }
  }, [sortBy, usersWithRankSolved]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const topThree = sortedUsers.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-purple-600">
            codeForge
          </Link>
          <div className="flex gap-4">
            <Link href="/contests">
              <Button variant="ghost">Contests</Button>
            </Link>
            <Link href="/problems">
              <Button variant="ghost">Problems</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Global Leaderboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Compete with the best coders worldwide</p>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {topThree.map((user, idx) => {
            const medals = ['🥇', '🥈', '🥉'];
            const heights = ['h-80', 'h-72', 'h-64'];
            return (
              <div key={user.id} className="flex flex-col items-center">
                <Card className={`w-full ${heights[idx]} bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-900/30 flex flex-col justify-end overflow-hidden relative`}>
                  <div className="absolute top-4 left-4 text-4xl">{medals[idx]}</div>
                  <CardContent className="pb-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{user.username}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{user.email}</p>
                    <div className="space-y-2 text-sm">
                      <div className="text-green-600 dark:text-green-400 font-semibold">{user.solved} Problems Solved</div>
                      <div className="text-gray-600 dark:text-gray-400">{user.acceptance.toFixed(1)}% Acceptance</div>
                    </div>
                  </CardContent>
                </Card>
                <div className="text-center mt-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">#{idx + 1}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-300">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">{mockUsers.length}</div>
              <p className="text-sm text-blue-600/80 mt-1">Active competitors</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-300">Avg Problems</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {Math.round(usersWithRankSolved.reduce((sum, u) => sum + u.solved, 0) / usersWithRankSolved.length)}
              </div>
              <p className="text-sm text-green-600/80 mt-1">Per user</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-300">Max Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">{Math.max(...usersWithRankSolved.map(u => u.streak))}</div>
              <p className="text-sm text-orange-600/80 mt-1">Current record</p>
            </CardContent>
          </Card>
        </div>

        {/* Sort Options */}
        <Card className="mb-8 border-gray-200 dark:border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'By Problems Solved', value: 'solved' as const, icon: TrendingUp },
                { label: 'By Acceptance Rate', value: 'acceptance' as const, icon: Trophy },
                { label: 'By Streak', value: 'streak' as const, icon: Flame },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    sortBy === option.value
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Table */}
        <Card className="border-gray-200 dark:border-white/10 overflow-hidden">
          <CardHeader className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
            <CardTitle className="text-gray-900 dark:text-white">Rankings</CardTitle>
            <CardDescription>Sorted by {sortBy === 'solved' ? 'problems solved' : sortBy === 'acceptance' ? 'acceptance rate' : 'current streak'}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">User</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Solved</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Submissions</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Acceptance</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {sortedUsers.map((user, index) => {
                    const badge = getRankBadge(index + 1);
                    const isTopThree = index < 3;
                    return (
                      <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${isTopThree ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 font-semibold">
                            {badge ? (
                              <span className="text-2xl">{badge}</span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">#{index + 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">{user.solved}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-600 dark:text-gray-400">{user.submissions}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-600 dark:text-gray-400">{user.acceptance.toFixed(1)}%</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 font-semibold">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-900 dark:text-white">{user.streak}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
