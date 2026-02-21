'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

type Row = {
  id: string;
  problem_slug: string;
  language: string;
  verdict: string;
  runtime_ms: number | null;
  time_limit_ms: number | null;
  memory_limit_mb: number | null;
  artifact_url?: string | null;
  source_job_id?: string | null;
  created_at: string;
};

export default function ProblemSubmissionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState({ total: 0, accepted: 0, attemptedProblems: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setError('Please sign in first.');
          return;
        }

        const res = await fetch('/api/problems/my-submissions', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.message || 'Failed to load submissions.');
          return;
        }
        setRows((json.submissions || []) as Row[]);
        setSummary(json.summary || { total: 0, accepted: 0, attemptedProblems: 0 });
        setWarning(json.warning || '');
      } catch (_e) {
        setError('Failed to load submissions.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const acceptance = useMemo(() => {
    if (summary.total === 0) return '0.0';
    return ((summary.accepted / summary.total) * 100).toFixed(1);
  }, [summary]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-6 py-8 dark:from-black dark:to-gray-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Problem Submissions</h1>
          <div className="flex gap-3">
            <Link href="/problems"><Button variant="outline">All Problems</Button></Link>
            <Link href="/contests"><Button variant="outline">Contests</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{summary.total}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Accepted</p><p className="text-2xl font-bold">{summary.accepted}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Attempted Problems</p><p className="text-2xl font-bold">{summary.attemptedProblems}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Acceptance</p><p className="text-2xl font-bold">{acceptance}%</p></CardContent></Card>
        </div>

        {warning ? <p className="text-sm text-amber-600">{warning}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-500">No problem submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 dark:border-white/10">
                    <div>
                      <p className="font-medium">{r.problem_slug}</p>
                      <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-sm">
                      <span className="mr-4">Verdict: <strong>{r.verdict}</strong></span>
                      <span className="mr-4">Lang: <strong>{r.language}</strong></span>
                      <span className="mr-4">Runtime: <strong>{r.runtime_ms ?? 0}ms / {r.time_limit_ms ?? 0}ms</strong></span>
                      <span>Memory Limit: <strong>{r.memory_limit_mb ?? 0}MB</strong></span>
                      {r.source_job_id ? (
                        <a
                          href={`/api/judge/jobs/${encodeURIComponent(r.source_job_id)}/report`}
                          className="ml-4 text-blue-600 underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download Report
                        </a>
                      ) : null}
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
