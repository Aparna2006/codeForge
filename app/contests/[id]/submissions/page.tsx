'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

type SubmissionRow = {
  id: string;
  question_id: string;
  question_title: string | null;
  language: string;
  verdict: string;
  score: number;
  runtime_ms: number;
  passed_count: number;
  total_count: number;
  submitted_at: string;
};

type Summary = {
  totalAttempts: number;
  questionsAttempted: number;
  questionsSolved: number;
  totalScore: number;
  totalPossibleScore: number;
};

export default function ContestSubmissionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contestId = params.id as string;
  const mode = searchParams.get('mode') === 'virtual' ? 'virtual' : 'live';
  const ended = searchParams.get('ended') === '1';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalAttempts: 0,
    questionsAttempted: 0,
    questionsSolved: 0,
    totalScore: 0,
    totalPossibleScore: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Please sign in first.');
          return;
        }

        const res = await fetch(`/api/contests/${contestId}/my-submissions`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.message || 'Failed to load submissions.');
          return;
        }
        setSubmissions((json.submissions || []) as SubmissionRow[]);
        setSummary((json.summary || summary) as Summary);
        setWarning(json.warning || '');
      } catch (_e) {
        setError('Failed to load submissions.');
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-6 py-8 dark:from-black dark:to-gray-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Contest Submissions</h1>
          <div className="flex gap-3">
            {!ended ? <Link href={`/contests/${contestId}/exam?mode=${mode}`}><Button variant="outline">Back to Exam</Button></Link> : null}
            <Link href="/contests"><Button variant="outline">All Contests</Button></Link>
          </div>
        </div>
        {ended ? <p className="text-sm text-green-700">Exam ended. This contest attempt is now closed.</p> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Attempts</p><p className="text-2xl font-bold">{summary.totalAttempts}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Questions Attempted</p><p className="text-2xl font-bold">{summary.questionsAttempted}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Questions Solved</p><p className="text-2xl font-bold">{summary.questionsSolved}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Score</p><p className="text-2xl font-bold">{summary.totalScore}/{summary.totalPossibleScore}</p></CardContent></Card>
        </div>

        {warning ? <p className="text-sm text-amber-600">{warning}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
            <CardDescription>Latest first</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-gray-500">No contest submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {submissions.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 dark:border-white/10">
                    <div>
                      <p className="font-medium">{s.question_title || s.question_id}</p>
                      <p className="text-xs text-gray-500">{new Date(s.submitted_at).toLocaleString()}</p>
                    </div>
                    <div className="text-sm">
                      <span className="mr-4">Verdict: <strong>{s.verdict}</strong></span>
                      <span className="mr-4">Score: <strong>{s.score}</strong></span>
                      <span className="mr-4">Lang: <strong>{s.language}</strong></span>
                      <span>Tests: <strong>{s.passed_count}/{s.total_count}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
