'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Trophy, TrendingUp, Target, BarChart3 } from 'lucide-react';
import SignOutButton from '@/components/signout-button';

export default function DashboardPage() {
  const [currentStreak, setCurrentStreak] = useState(20);
  const [bestStreak, setBestStreak] = useState(25);

  useEffect(() => {
    const current = 20 + Math.floor(Math.random() * 21); // 20-40
    const best = Math.min(40, current + Math.floor(Math.random() * (41 - current)));
    setCurrentStreak(current);
    setBestStreak(best);
  }, []);
  // Generate 365 days of heatmap data (last year)
  const generateHeatmapData = () => {
    const data: Record<string, number> = {};
    const today = new Date();
    
    for (let i = 365; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      // Realistic pattern: mostly 0-3 attempts, occasional 4-6.
      const roll = Math.random();
      if (roll < 0.45) data[key] = 0;
      else if (roll < 0.78) data[key] = 1;
      else if (roll < 0.9) data[key] = 2;
      else if (roll < 0.96) data[key] = 3;
      else if (roll < 0.99) data[key] = 4;
      else data[key] = 5 + Math.floor(Math.random() * 2);
    }
    return data;
  };

  const heatmapData = generateHeatmapData();
  const dates = Object.entries(heatmapData).sort(([a], [b]) => a.localeCompare(b));

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (value <= 1) return 'bg-green-100 dark:bg-green-900/30';
    if (value <= 3) return 'bg-green-300 dark:bg-green-700/50';
    if (value <= 5) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-700 dark:bg-green-500';
  };

  // Calculate weeks for heatmap display
  const weeks: number[][][] = [];
  let currentWeek: number[][] = [];
  
  for (let i = 0; i < dates.length; i++) {
    const [date, count] = dates[i];
    const dayOfWeek = new Date(date).getDay();
    
    // Add padding at the beginning
    if (i === 0) {
      for (let j = 0; j < dayOfWeek; j++) {
        currentWeek.push([0, 0]);
      }
    }
    
    currentWeek.push([Number(count), i]);
    
    // If it's Sunday or last day, start new week
    if (dayOfWeek === 6 || i === dates.length - 1) {
      // Pad to 7 days
      while (currentWeek.length < 7) {
        currentWeek.push([0, -1]);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const stats = {
    totalSolved: 50,
    currentStreak: currentStreak,
    totalSubmissions: 0,
    acceptanceRate: 52.6,
    lastActivity: 'Yesterday',
    bestStreak: bestStreak,
  };

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
            <Link href="/teams">
              <Button variant="ghost">Teams</Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost">Notifications</Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline">Leaderboard</Button>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Your Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your coding progress and achievements</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-300 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Problems Solved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{stats.totalSolved}</div>
              <p className="text-sm text-green-600/80 mt-2">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-300 flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">{stats.currentStreak}</div>
              <p className="text-sm text-orange-600/80 mt-2">Days in a row</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Acceptance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600">{stats.acceptanceRate.toFixed(1)}%</div>
              <p className="text-sm text-purple-600/80 mt-2">Of submissions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-300">Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">{stats.totalSubmissions}</div>
              <p className="text-sm text-blue-600/80 mt-2">Total attempts</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200 dark:border-rose-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-rose-900 dark:text-rose-300">Best Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-rose-600">{stats.bestStreak}</div>
              <p className="text-sm text-rose-600/80 mt-2">Personal record</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20 border-cyan-200 dark:border-cyan-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-cyan-900 dark:text-cyan-300">Last Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-cyan-600">{stats.lastActivity}</div>
              <p className="text-sm text-cyan-600/80 mt-2">Keep the streak going!</p>
            </CardContent>
          </Card>
        </div>

        {/* Contribution Heatmap */}
        <Card className="border-gray-200 dark:border-white/10 mb-12">
          <CardHeader className="border-b border-gray-200 dark:border-white/10">
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Contribution Heatmap
            </CardTitle>
            <CardDescription>Your activity over the last year</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto pb-6">
            <div className="flex gap-1 pb-4">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => {
                    const [count, dateIdx] = day;
                    const date = dateIdx >= 0 ? dates[dateIdx][0] : '';
                    return (
                      <div
                        key={`${weekIdx}-${dayIdx}`}
                        className={`w-4 h-4 rounded ${getColor(count)} hover:ring-2 hover:ring-purple-500 cursor-pointer transition-all`}
                        title={date ? `${date}: ${count} submissions` : ''}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 justify-end text-sm text-gray-600 dark:text-gray-400">
              <span>Less</span>
              <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded"></div>
              <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded"></div>
              <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded"></div>
              <div className="w-3 h-3 bg-green-700 dark:bg-green-500 rounded"></div>
              <span>More</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-900/30">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Ready to Code?</CardTitle>
            <CardDescription>Continue your streak and improve your skills</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/problems" className="flex-1">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2">
                  <Target className="w-4 h-4" />
                  Solve Problems
                </Button>
              </Link>
              <Link href="/leaderboard" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Trophy className="w-4 h-4" />
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
