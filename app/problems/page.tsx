'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SignOutButton from '@/components/signout-button';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { mockProblems } from '@/lib/mock-data';
import { isClientAdminEmail } from '@/lib/admin-client';

type ProblemListItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  solved: number;
  submissions: number;
};

function mapFromDb(row: any): ProblemListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category || 'General',
    difficulty: row.difficulty || 'Easy',
    solved: Number(row.accepted_count ?? 0),
    submissions: Number(row.submission_count ?? 0),
  };
}

function mapFromMock(row: any): ProblemListItem {
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    category: row.category || 'General',
    difficulty: 'Easy',
    solved: Number(row.solved ?? 0),
    submissions: Number(row.submissions ?? 0),
  };
}

export default function ProblemsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');
  const [userSolvedCount, setUserSolvedCount] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [progressByProblemId, setProgressByProblemId] = useState<
    Record<string, { status: 'accepted' | 'attempted'; attemptedCount: number; acceptedCount: number }>
  >({});

  useEffect(() => {
    const load = async () => {
      try {
        if (!hasSupabaseEnv) throw new Error('Supabase is not configured');

        await fetch('/api/problems/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: false }),
        }).catch(() => null);

        const res = await fetch('/api/problems', { cache: 'no-store' });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Failed to load problems');

        setProblems((json.problems || []).map(mapFromDb));
      } catch (_err) {
        setProblems(mockProblems.map(mapFromMock));
        setWarning('Using local mock problems. Configure Supabase for persistent data.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const resolveAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setShowAdmin(isClientAdminEmail(user?.email ?? null));
    };
    void resolveAdmin();
  }, []);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        const res = await fetch('/api/problems/progress', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (!json.success) return;
        setProgressByProblemId(json.progress || {});
        setUserSolvedCount(Number(json.solvedCount ?? 0));
      } catch (_err) {
        // non-blocking
      }
    };
    void loadProgress();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(problems.map((p) => p.category));
    return ['All', ...Array.from(unique)];
  }, [problems]);

  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const filtered = useMemo(() => {
    return problems.filter((problem) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        problem.title.toLowerCase().includes(q) || problem.category.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'All' || problem.category === selectedCategory;
      const matchesDifficulty =
        selectedDifficulty === 'All' || problem.difficulty === selectedDifficulty;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [problems, searchTerm, selectedCategory, selectedDifficulty]);

  const totals = useMemo(() => {
    const totalProblems = problems.length;
    const totalSubmissions = problems.reduce((sum, p) => sum + p.submissions, 0);
    const totalSolved = problems.reduce((sum, p) => sum + p.solved, 0);
    const avgAcceptance =
      totalSubmissions > 0 ? ((totalSolved / totalSubmissions) * 100).toFixed(1) : '0.0';
    return { totalProblems, totalSubmissions, avgAcceptance };
  }, [problems]);

  const difficultyStyle: Record<string, string> = {
    Easy: 'text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-900/40 dark:bg-green-950/20',
    Medium: 'text-yellow-700 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-900/40 dark:bg-yellow-950/20',
    Hard: 'text-red-700 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900/40 dark:bg-red-950/20',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-purple-600">codeForge</Link>
          <div className="flex gap-3">
            <Link href="/contests"><Button variant="ghost">Contests</Button></Link>
            <Link href="/teams"><Button variant="ghost">Teams</Button></Link>
            <Link href="/notifications"><Button variant="ghost">Notifications</Button></Link>
            <Link href="/leaderboard"><Button variant="ghost">Leaderboard</Button></Link>
            {showAdmin ? <Link href="/problems/admin"><Button variant="ghost">Admin</Button></Link> : null}
            <Link href="/dashboard"><Button variant="outline">Dashboard</Button></Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Problems</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Solve in C, C++, Java, Python with built-in run and submit.
            </p>
            {warning ? <p className="mt-2 text-xs text-amber-600">{warning}</p> : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Problems</p><p className="text-xl font-bold">{totals.totalProblems}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Submissions</p><p className="text-xl font-bold">{totals.totalSubmissions}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">My Solved</p><p className="text-xl font-bold">{userSolvedCount}</p></CardContent></Card>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Platform Avg AC: {totals.avgAcceptance}%</p>
          <Link href="/problems/submissions">
            <Button variant="outline" size="sm">My Submissions</Button>
          </Link>
        </div>

        <Card className="border-gray-200 dark:border-white/10">
          <CardContent className="space-y-4 pt-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or category"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={selectedCategory === c ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(c)}
                  className={selectedCategory === c ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                >
                  {c}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {difficulties.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={selectedDifficulty === d ? 'default' : 'outline'}
                  onClick={() => setSelectedDifficulty(d)}
                  className={selectedDifficulty === d ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                >
                  {d}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-gray-200 dark:border-white/10">
          <CardHeader className="border-b border-gray-200 dark:border-white/10">
            <CardTitle>All Problems</CardTitle>
            <CardDescription>
              {loading ? 'Loading problems...' : `${filtered.length} problems`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-gray-500">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No problems match current filters.</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-white/10">
                {filtered.map((problem) => {
                  const acceptance =
                    problem.submissions > 0 ? ((problem.solved / problem.submissions) * 100).toFixed(1) : '0.0';
                  const progress = progressByProblemId[problem.id];
                  return (
                    <Link
                      key={problem.id}
                      href={`/problems/${problem.slug}`}
                      className="flex items-center justify-between gap-4 p-4 transition hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{problem.title}</p>
                        <p className="text-xs text-gray-500">{problem.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {progress ? (
                          <Badge variant="outline" className={progress.status === 'accepted' ? 'text-green-600 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-900/40 dark:bg-green-950/20' : 'text-yellow-700 border-yellow-300 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-900/40 dark:bg-yellow-950/20'}>
                            {progress.status === 'accepted' ? 'Accepted' : 'Attempted'}
                          </Badge>
                        ) : null}
                        <Badge className={difficultyStyle[problem.difficulty]}>{problem.difficulty}</Badge>
                        <div className="hidden text-right text-xs text-gray-500 sm:block">
                          <p>{problem.solved} / {problem.submissions}</p>
                          <p>{acceptance}% AC</p>
                        </div>
                        <Button size="sm" className="bg-purple-600 text-white hover:bg-purple-700">Solve</Button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

