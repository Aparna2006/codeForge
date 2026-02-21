'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Play, Send } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import SignOutButton from '@/components/signout-button';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { mockProblems } from '@/lib/mock-data';

const MonacoEditor: any = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type Language = 'python' | 'c' | 'cpp' | 'java';
type SubmitVerdict = 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';

type ProblemView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string;
  solved: number;
  submissions: number;
  timeLimitMs: number;
  memoryLimitMb: number;
};

type HistoryRow = {
  id: string;
  created_at: string;
  language: Language;
  verdict: string;
  runtime_ms: number | null;
  time_limit_ms: number | null;
  memory_limit_mb: number | null;
};

type SampleResult = {
  index: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
};

const defaultTemplates: Record<Language, string> = {
  python: `def solve():
    import sys
    data = sys.stdin.read().strip().split()
    # Write your logic
    print("")

if __name__ == "__main__":
    solve()`,
  c: `#include <stdio.h>

int main() {
  // Write your logic
  return 0;
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  // Write your logic
  return 0;
}`,
  java: `import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    // Write your logic
  }
}`,
};

function toMonacoLanguage(language: Language) {
  if (language === 'python') return 'python';
  if (language === 'c' || language === 'cpp') return 'cpp';
  return 'java';
}

function fromDb(row: any): ProblemView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category || 'General',
    difficulty: row.difficulty || 'Easy',
    examples: Array.isArray(row.examples) ? row.examples : [],
    constraints: row.constraints || 'No constraints provided.',
    solved: Number(row.accepted_count ?? 0),
    submissions: Number(row.submission_count ?? 0),
    timeLimitMs: Number(row.time_limit_ms ?? 1000),
    memoryLimitMb: Number(row.memory_limit_mb ?? 256),
  };
}

function fromMock(row: any): ProblemView {
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    description: row.description || 'No description available.',
    category: row.category || 'General',
    difficulty: 'Easy',
    examples: [],
    constraints: 'No constraints provided.',
    solved: Number(row.solved ?? 0),
    submissions: Number(row.submissions ?? 0),
    timeLimitMs: 1000,
    memoryLimitMb: 256,
  };
}

function draftKey(slug: string, language: Language) {
  return `problem-draft:${slug}:${language}`;
}

export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [problem, setProblem] = useState<ProblemView | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');

  const [language, setLanguage] = useState<Language>('python');
  const [codeByLanguage, setCodeByLanguage] = useState<Record<Language, string>>(defaultTemplates);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [verdict, setVerdict] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runtimeMs, setRuntimeMs] = useState<number>(0);
  const [timeLimitMs, setTimeLimitMs] = useState<number>(0);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(0);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [judgeJobId, setJudgeJobId] = useState('');
  const [sampleResults, setSampleResults] = useState<SampleResult[]>([]);
  const [runningSamples, setRunningSamples] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultDetails, setResultDetails] = useState<{
    testCaseIndex?: number;
    failedInput?: string;
    expectedOutput?: string;
    actualOutput?: string;
    errorMessage?: string;
  } | null>(null);
  const initializedSlugRef = useRef<string>('');

  const code = codeByLanguage[language];

  const setCurrentCode = (nextCode: string) => {
    setCodeByLanguage((prev) => ({ ...prev, [language]: nextCode }));
  };

  const loadProblemAndStarterCodes = async () => {
    try {
      if (!hasSupabaseEnv) throw new Error('Supabase not configured');

      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Problem not found');

      const mapped = fromDb(data);
      setProblem(mapped);
      setTimeLimitMs(mapped.timeLimitMs);
      setMemoryLimitMb(mapped.memoryLimitMb);

      const starterRes = await fetch(`/api/problems/${slug}/starter-code`, { cache: 'no-store' });
      const starterJson = await starterRes.json();
      const dbStarters: Partial<Record<Language, string>> = {};
      for (const row of starterJson?.starterCodes || []) {
        if (row.language in defaultTemplates) {
          dbStarters[row.language as Language] = row.starter_code as string;
        }
      }

      const nextCodeMap = { ...defaultTemplates };
      (Object.keys(nextCodeMap) as Language[]).forEach((lang) => {
        if (dbStarters[lang]) nextCodeMap[lang] = dbStarters[lang] as string;
      });
      (Object.keys(nextCodeMap) as Language[]).forEach((lang) => {
        const draft = typeof window !== 'undefined' ? localStorage.getItem(draftKey(slug, lang)) : null;
        if (draft && draft.trim().length > 0) nextCodeMap[lang] = draft;
      });
      setCodeByLanguage(nextCodeMap);
      return;
    } catch (_err) {
      setWarning('Using local mock problem data. Configure Supabase for full judge mode.');
      const fallback = mockProblems.find((p) => p.slug === slug);
      const mapped = fallback ? fromMock(fallback) : null;
      setProblem(mapped);
      if (mapped) {
        setTimeLimitMs(mapped.timeLimitMs);
        setMemoryLimitMb(mapped.memoryLimitMb);
      }
      const fallbackMap = { ...defaultTemplates };
      (Object.keys(fallbackMap) as Language[]).forEach((lang) => {
        const draft = typeof window !== 'undefined' ? localStorage.getItem(draftKey(slug, lang)) : null;
        if (draft && draft.trim().length > 0) fallbackMap[lang] = draft;
      });
      setCodeByLanguage(fallbackMap);
    }
  };

  const loadHistory = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/problems/my-submissions?problem_slug=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.submissions)) {
        setHistory(json.submissions as HistoryRow[]);
      }
    } catch (_err) {
      // non-blocking
    }
  };

  useEffect(() => {
    if (initializedSlugRef.current === slug) return;
    initializedSlugRef.current = slug;
    setLoading(true);
    void Promise.all([loadProblemAndStarterCodes(), loadHistory()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    localStorage.setItem(draftKey(slug, language), codeByLanguage[language] || '');
  }, [slug, language, codeByLanguage]);

  const acceptance = useMemo(() => {
    if (!problem || problem.submissions === 0) return '0.0';
    return ((problem.solved / problem.submissions) * 100).toFixed(1);
  }, [problem]);

  const isNumericToken = (token: string) => /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(token);
  const normalizeTokens = (text: string) =>
    text.replace(/[\[\],()]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const outputsMatch = (expected: string, actual: string) => {
    const exp = normalizeTokens(expected);
    const act = normalizeTokens(actual);
    if (exp.length !== act.length) return false;
    for (let i = 0; i < exp.length; i++) {
      const e = exp[i];
      const a = act[i];
      if (isNumericToken(e) && isNumericToken(a)) {
        if (Math.abs(Number(e) - Number(a)) > 0.0001) return false;
        continue;
      }
      if (e !== a) return false;
    }
    return true;
  };

  const runCode = async () => {
    setRunning(true);
    setVerdict('');
    setOutput('Running...');
    setResultMessage('');
    setResultDetails(null);
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, input }),
      });
      const json = await response.json();
      setOutput(json.output || json.message || 'No output');
      if (!json.success) setVerdict('Execution Error');
    } catch (_err) {
      setOutput('Failed to run code.');
      setVerdict('Execution Error');
    } finally {
      setRunning(false);
    }
  };

  const submitCode = async () => {
    if (!problem) return;
    setSubmitting(true);
    setVerdict('');
    setOutput('Submitting...');
    setResultMessage('');
    setResultDetails(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/judge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language,
          testInput: input,
        }),
      });
      const json = await response.json();
      if (response.status === 202 && json.async && json.jobId) {
        setJudgeJobId(String(json.jobId));
        setResultMessage('Queued for judging...');
        setOutput('Waiting for worker...');
        let attempts = 0;
        while (attempts < 120) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const statusResp = await fetch(`/api/judge/jobs/${encodeURIComponent(String(json.jobId))}`, { cache: 'no-store' });
          const statusJson = await statusResp.json();
          const state = statusJson?.job?.state;
          if (state === 'completed') {
            const result = statusJson.job.returnvalue || {};
            const finalVerdict = (result.verdict || 'Compilation Error') as SubmitVerdict;
            setVerdict(finalVerdict);
            setOutput(result.output || result.message || 'No output');
            setResultMessage(result.message || '');
            setResultDetails((result.details || null) as any);
            setRuntimeMs(Number(result.runtimeMs ?? 0));
            setTimeLimitMs(Number(result.timeLimitMs ?? problem.timeLimitMs));
            setMemoryLimitMb(Number(result.memoryLimitMb ?? problem.memoryLimitMb));
            await loadHistory();
            setJudgeJobId('');
            return;
          }
          if (state === 'failed') {
            setVerdict('Compilation Error');
            setOutput(statusJson?.job?.failedReason || 'Judge job failed.');
            setResultMessage('Judge worker failed');
            setJudgeJobId('');
            return;
          }
          attempts += 1;
        }
        setVerdict('Compilation Error');
        setOutput('Judging timed out. Please retry.');
        setResultMessage('Judge timeout');
        setJudgeJobId('');
        return;
      }
      const nextVerdict = (json.verdict || json.message || 'Compilation Error') as SubmitVerdict;
      setVerdict(nextVerdict);
      setOutput(json.output || json.message || 'No output');
      setResultMessage(json.message || '');
      setResultDetails((json.details || null) as any);
      setRuntimeMs(Number(json.runtimeMs ?? 0));
      setTimeLimitMs(Number(json.timeLimitMs ?? problem.timeLimitMs));
      setMemoryLimitMb(Number(json.memoryLimitMb ?? problem.memoryLimitMb));
      await loadHistory();
    } catch (_err) {
      setVerdict('Compilation Error');
      setOutput('Failed to submit solution.');
    } finally {
      setSubmitting(false);
    }
  };

  const runSampleTests = async () => {
    if (!problem || problem.examples.length === 0) return;
    setRunningSamples(true);
    setResultMessage('');
    setResultDetails(null);
    setSampleResults([]);
    try {
      const results: SampleResult[] = [];
      for (let i = 0; i < problem.examples.length; i++) {
        const sample = problem.examples[i];
        const response = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language, input: sample.input }),
        });
        const json = await response.json();
        if (!json.success) {
          results.push({
            index: i + 1,
            passed: false,
            input: sample.input,
            expected: sample.output,
            actual: json.output || json.message || '',
            error: json.message || 'Execution Error',
          });
          continue;
        }
        const actual = String(json.output ?? '').trim();
        results.push({
          index: i + 1,
          passed: outputsMatch(sample.output || '', actual),
          input: sample.input,
          expected: sample.output || '',
          actual,
        });
      }
      setSampleResults(results);
      const passedCount = results.filter((r) => r.passed).length;
      setResultMessage(`Sample tests: ${passedCount}/${results.length} passed`);
    } catch (_err) {
      setResultMessage('Failed to run sample tests.');
    } finally {
      setRunningSamples(false);
    }
  };

  const onMonacoMount = (editor: any, monaco: any) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (!running && !submitting) void runCode();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (!running && !submitting) void submitCode();
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-6 py-12 text-sm text-gray-500">Loading problem...</div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">Problem Not Found</h1>
          <Link href="/problems"><Button>Back to Problems</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/problems" className="flex items-center gap-2 text-purple-600 hover:text-purple-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Problems
          </Link>
          <div className="flex gap-3">
            <Link href="/problems/submissions"><Button variant="ghost">My Submissions</Button></Link>
            <Link href="/contests"><Button variant="ghost">Contests</Button></Link>
            <Link href="/dashboard"><Button variant="outline">Dashboard</Button></Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <PanelGroup direction="horizontal" className="min-h-[calc(100vh-150px)] rounded border border-gray-200 dark:border-white/10">
          <Panel defaultSize={45} minSize={30}>
            <div className="h-full overflow-auto p-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl">{problem.title}</CardTitle>
                        <CardDescription className="mt-1">{problem.category}</CardDescription>
                      </div>
                      <Badge variant="outline">{problem.difficulty}</Badge>
                    </div>
                    {warning ? <p className="text-xs text-amber-600">{warning}</p> : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-semibold">Description</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{problem.description}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold">Examples</p>
                      <div className="space-y-2">
                        {problem.examples.length === 0 ? (
                          <p className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500 dark:border-white/10 dark:bg-white/5">
                            No examples available.
                          </p>
                        ) : (
                          problem.examples.map((example, idx) => (
                            <div key={`${example.input}-${idx}`} className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                              <p className="text-xs font-semibold">Example {idx + 1}</p>
                              <p className="mt-1 text-xs font-mono">Input: {example.input}</p>
                              <p className="mt-1 text-xs font-mono">Output: {example.output}</p>
                              {example.explanation ? <p className="mt-1 text-xs text-gray-500">{example.explanation}</p> : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold">Constraints</p>
                      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{problem.constraints}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Solved</p><p className="text-2xl font-bold text-green-600">{problem.solved}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Acceptance</p><p className="text-2xl font-bold text-blue-600">{acceptance}%</p></CardContent></Card>
                </div>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-purple-300 dark:bg-white/10 dark:hover:bg-purple-700/50" />

          <Panel defaultSize={55} minSize={35}>
            <div className="h-full overflow-auto p-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>IDE</CardTitle>
                        <CardDescription>Languages: C, C++, Java, Python</CardDescription>
                      </div>
                      <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="c">C</SelectItem>
                          <SelectItem value="cpp">C++</SelectItem>
                          <SelectItem value="java">Java</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
              <div className="flex gap-2">
                      <Button variant="outline" onClick={runSampleTests} disabled={running || submitting || runningSamples} className="flex-1">
                        {runningSamples ? 'Running Samples...' : 'Run Samples'}
                      </Button>
                      <Button onClick={runCode} disabled={running || submitting} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
                        <Play className="mr-2 h-4 w-4" />
                        {running ? 'Running...' : 'Run'}
                      </Button>
                <Button onClick={submitCode} disabled={running || submitting} className="flex-1 bg-green-600 text-white hover:bg-green-700">
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? (judgeJobId ? `Queued (${judgeJobId})` : 'Submitting...') : 'Submit'}
                </Button>
              </div>
                    <div className="overflow-hidden rounded border border-gray-200 dark:border-white/10">
                      <MonacoEditor
                        height="360px"
                        language={toMonacoLanguage(language)}
                        value={code}
                        theme="vs-dark"
                        onChange={(value: string | undefined) => setCurrentCode(value ?? '')}
                        onMount={onMonacoMount}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2,
                        }}
                      />
                    </div>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="h-24 font-mono text-xs"
                      placeholder="Custom input for Run"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sample Test Results</CardTitle>
                    <CardDescription>Visible examples only</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sampleResults.length === 0 ? (
                      <p className="text-sm text-gray-500">No sample runs yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {sampleResults.map((r) => (
                          <div key={r.index} className="rounded border border-gray-200 p-2 text-xs dark:border-white/10">
                            <p>Sample #{r.index} | {r.passed ? 'PASS' : 'FAIL'}</p>
                            <p className="mt-1 text-gray-500">Input: {r.input}</p>
                            <p className="mt-1 text-gray-500">Expected: {r.expected}</p>
                            <p className="mt-1 text-gray-500">Actual: {r.actual}</p>
                            {r.error ? <p className="mt-1 text-red-500">Error: {r.error}</p> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
            <CardHeader>
              <CardTitle className="text-base">Result</CardTitle>
              <CardDescription>{verdict || 'Run or submit to see results'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {resultMessage ? <p className="text-xs text-gray-600 dark:text-gray-300">{resultMessage}</p> : null}
              <pre className="max-h-52 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                {output || 'No output yet.'}
              </pre>
              {resultDetails?.testCaseIndex !== undefined && resultDetails.testCaseIndex >= 0 ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                  <p>Failed Testcase: #{(resultDetails.testCaseIndex ?? 0) + 1}</p>
                  {resultDetails.failedInput ? <p className="mt-1">Input: {resultDetails.failedInput}</p> : null}
                  {resultDetails.expectedOutput ? <p className="mt-1">Expected: {resultDetails.expectedOutput}</p> : null}
                  {resultDetails.actualOutput ? <p className="mt-1">Actual: {resultDetails.actualOutput}</p> : null}
                  {resultDetails.errorMessage ? <p className="mt-1">Error: {resultDetails.errorMessage}</p> : null}
                </div>
              ) : null}
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Runtime: <strong>{runtimeMs}ms</strong> / Limit: <strong>{timeLimitMs}ms</strong> | Memory Limit: <strong>{memoryLimitMb}MB</strong>
              </p>
            </CardContent>
          </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Persistent Submission History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history.length === 0 ? (
                      <p className="text-sm text-gray-500">No saved submissions for this problem.</p>
                    ) : (
                      <div className="space-y-2">
                        {history.map((row) => (
                          <div key={row.id} className="rounded border border-gray-200 p-2 text-xs dark:border-white/10">
                            <p>{new Date(row.created_at).toLocaleString()} | {row.language.toUpperCase()} | {row.verdict}</p>
                            <p className="text-gray-500">
                              Runtime: {row.runtime_ms ?? 0}ms / {row.time_limit_ms ?? 0}ms | Memory Limit: {row.memory_limit_mb ?? 0}MB
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}
