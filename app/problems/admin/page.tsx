'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { isClientAdminEmail } from '@/lib/admin-client';

const STARTER_TEMPLATE = {
  python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    # Write your logic\n    print("")\n\nif __name__ == "__main__":\n    solve()`,
  c: `#include <stdio.h>\n\nint main() {\n  // Write your logic\n  return 0;\n}`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  // Write your logic\n  return 0;\n}`,
  java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    // Write your logic\n  }\n}`,
};

export default function ProblemsAdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [category, setCategory] = useState('Arrays');
  const [constraints, setConstraints] = useState('');
  const [timeLimitMs, setTimeLimitMs] = useState(1000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);

  const [examplesJson, setExamplesJson] = useState(
    JSON.stringify([{ input: '1 2', output: '3', explanation: 'sample' }], null, 2)
  );
  const [testcasesJson, setTestcasesJson] = useState(
    JSON.stringify([{ input: '1 2', output: '3' }], null, 2)
  );
  const [starterJson, setStarterJson] = useState(JSON.stringify(STARTER_TEMPLATE, null, 2));

  useEffect(() => {
    const verify = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const allowed = isClientAdminEmail(user?.email ?? null);
      setIsAdmin(allowed);
      setAuthChecked(true);
      if (!allowed) router.replace('/problems');
    };
    void verify();
  }, [router]);

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const saveProblem = async () => {
    setLoading(true);
    setMessage('');
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setMessage('Please sign in as admin first.');
        return;
      }

      const examples = JSON.parse(examplesJson);
      const test_cases = JSON.parse(testcasesJson);
      const starter_codes = JSON.parse(starterJson);

      const res = await fetch('/api/problems', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          slug,
          description,
          difficulty,
          category,
          constraints,
          examples,
          test_cases,
          time_limit_ms: Number(timeLimitMs || 1000),
          memory_limit_mb: Number(memoryLimitMb || 256),
          starter_codes,
        }),
      });
      const json = await res.json();
      setMessage(json.success ? `Problem saved: ${json.problem.slug}` : `Error: ${json.message}`);
    } catch (_err) {
      setMessage('Invalid JSON or request failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-600">Checking admin access...</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-6 py-8 dark:from-black dark:to-gray-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Problems Admin</h1>
          <Link href="/problems"><Button variant="outline">Back to Problems</Button></Link>
        </div>

        <Card>
          <CardHeader><CardTitle>Create / Update Problem</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Problem title" />
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug (e.g., maximum-subarray)" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Problem description" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Difficulty: Easy / Medium / Hard" />
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
              <Input type="number" value={timeLimitMs} onChange={(e) => setTimeLimitMs(Number(e.target.value || 1000))} placeholder="Time limit ms" />
              <Input type="number" value={memoryLimitMb} onChange={(e) => setMemoryLimitMb(Number(e.target.value || 256))} placeholder="Memory limit MB" />
            </div>
            <Textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={3} placeholder="Constraints text" />
            <label className="text-sm font-medium">Examples JSON</label>
            <Textarea value={examplesJson} onChange={(e) => setExamplesJson(e.target.value)} rows={8} />
            <label className="text-sm font-medium">Test Cases JSON</label>
            <Textarea value={testcasesJson} onChange={(e) => setTestcasesJson(e.target.value)} rows={8} />
            <label className="text-sm font-medium">Starter Codes JSON (python/c/cpp/java)</label>
            <Textarea value={starterJson} onChange={(e) => setStarterJson(e.target.value)} rows={12} />
            <Button onClick={saveProblem} disabled={loading}>
              {loading ? 'Saving...' : 'Save Problem'}
            </Button>
          </CardContent>
        </Card>

        {message ? <p className="text-sm text-purple-600">{message}</p> : null}
      </div>
    </div>
  );
}
