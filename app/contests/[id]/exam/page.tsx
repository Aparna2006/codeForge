'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, LogOut, Play, Send } from 'lucide-react';
import { contestProblems, mockContests } from '@/lib/mock-data';
import { supabase } from '@/lib/supabase';

type ContestLanguage = 'c' | 'cpp' | 'java' | 'python';
type Verdict = 'AC' | 'WA' | 'RE' | 'CE' | 'TLE';

type ContestQuestion = {
  id: string;
  title: string;
  category: string;
  description: string;
  constraints: string;
  examples: Array<{ input: string; output: string }>;
  testCaseCount?: number;
};

type ResultRow = {
  index: number;
  hidden: boolean;
  verdict: Verdict;
  expected?: string;
  actual?: string;
  error?: string;
  runtimeMs: number;
};

type MySubmissionRow = {
  id: string;
  question_id: string;
  question_title: string | null;
  language: string;
  verdict: string;
  score: number;
  passed_count: number;
  total_count: number;
  submitted_at: string;
};

function template(questionId: string, language: ContestLanguage) {
  const basePython = `def solve():
    import sys
    data = sys.stdin.read().strip().split()
    # Read input and print output

if __name__ == "__main__":
    solve()`;

  const pythonByQuestion: Record<string, string> = {
    'c1-q1': `def solve():
    import sys
    data = list(map(int, sys.stdin.read().strip().split()))
    n = data[0]
    arr = data[1:1+n]
    print(sum(arr))

if __name__ == "__main__":
    solve()`,
    'c1-q2': `def solve():
    import sys
    s = sys.stdin.read().strip()
    print(s[::-1])

if __name__ == "__main__":
    solve()`,
    'c1-q3': `def solve():
    import sys
    data = list(map(int, sys.stdin.read().strip().split()))
    n = data[0]
    arr = data[1:1+n]
    print(sum(1 for x in arr if x % 2 == 0))

if __name__ == "__main__":
    solve()`,
    'c1-q4': `def solve():
    import sys
    data = list(map(int, sys.stdin.read().strip().split()))
    n = data[0]
    arr = data[1:1+n]
    ans = 0
    for i in range(1, len(arr)):
        ans = max(ans, abs(arr[i] - arr[i - 1]))
    print(ans)

if __name__ == "__main__":
    solve()`,
  };

  if (language === 'python') return pythonByQuestion[questionId] ?? basePython;
  if (language === 'c') return `#include <stdio.h>\n\nint main() {\n  // Read input and print output\n  return 0;\n}`;
  if (language === 'cpp') return `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  // Read input and print output\n  return 0;\n}`;
  return `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    // Read input and print output\n  }\n}`;
}

export default function ContestExamPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contestId = params.id as string;
  const contestMode = searchParams.get('mode') === 'virtual' ? 'virtual' : 'live';
  const contest = mockContests.find((c) => c.id === contestId) || mockContests[0];
  const submissionsHref = `/contests/${contestId}/submissions?mode=${contestMode}`;

  const [questions, setQuestions] = useState<ContestQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [language, setLanguage] = useState<ContestLanguage>('python');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [runPassed, setRunPassed] = useState(false);
  const [runExecuted, setRunExecuted] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [statusText, setStatusText] = useState('Run your code against all testcases.');
  const [scoreSummary, setScoreSummary] = useState<{
    totalScore: number;
    totalPossibleScore: number;
    solvedCount: number;
    rank: number | null;
    participants: number;
  } | null>(null);
  const [showAcceptedPopup, setShowAcceptedPopup] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [contestCompleted, setContestCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState((contest.duration || 90) * 60);
  const [attemptLockedMessage, setAttemptLockedMessage] = useState('');
  const [mySubmissions, setMySubmissions] = useState<MySubmissionRow[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [endingExam, setEndingExam] = useState(false);

  const question = questions[questionIndex];

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const res = await fetch(`/api/contests/${contestId}/questions`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success && Array.isArray(json.questions) && json.questions.length > 0) {
          setQuestions(json.questions as ContestQuestion[]);
          return;
        }
      } catch (_e) {
        // fallback below
      }

      const fallbackRaw = ((contestProblems as Record<string, any[]>)[contestId] ||
        (contestProblems as Record<string, any[]>)['contest-1'] ||
        []) as any[];
      const fallback: ContestQuestion[] = fallbackRaw.map((q) => ({
        id: q.id,
        title: q.title,
        category: q.category,
        description: q.description,
        constraints: q.constraints,
        examples: q.examples || [],
        testCaseCount: Array.isArray(q.testCases) ? q.testCases.length : 0,
      }));
      setQuestions(fallback);
    };
    void loadQuestions();
  }, [contestId]);

  useEffect(() => {
    const initAttempt = async () => {
      const started = await markAttemptStart();
      if (!started) return;
      await loadMySubmissions();
    };
    void initAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  useEffect(() => {
    if (!question) return;
    setCode(template(question.id, language));
    setResults([]);
    setRunPassed(false);
    setRunExecuted(false);
    setStatusText('Run your code against all testcases.');
    setShowAcceptedPopup(false);
  }, [language, question?.id]);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const timerText = useMemo(() => {
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [timeLeft]);

  if (!question) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Card className="border-white/10 bg-black/70">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">Loading contest questions...</p>
            <Link href="/contests"><Button>Back to Contests</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  async function loadMySubmissions() {
    setLoadingSubmissions(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const response = await fetch(`/api/contests/${contestId}/my-submissions`, {
        method: 'GET',
        headers: { Authorization: headers.Authorization },
        cache: 'no-store',
      });
      const json = await response.json();
      if (json.success && Array.isArray(json.submissions)) {
        setMySubmissions(json.submissions as MySubmissionRow[]);
      }
    } finally {
      setLoadingSubmissions(false);
    }
  }

  async function markAttemptStart() {
    const headers = await getAuthHeaders();
    if (!headers) return false;
    const response = await fetch(`/api/contests/${contestId}/attempt`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'start' }),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      const msg = json.message || 'Unable to start attempt.';
      setAttemptLockedMessage(msg);
      return false;
    }
    return true;
  }

  async function endExamAttempt() {
    setEndingExam(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        router.push('/auth/signin');
        return;
      }
      const response = await fetch(`/api/contests/${contestId}/attempt`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'end' }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setStatusText(json.message || 'Failed to end exam.');
        return;
      }
      router.push(`${submissionsHref}&ended=1`);
    } finally {
      setEndingExam(false);
    }
  }

  const evaluateQuestion = async (mode: 'run' | 'submit') => {
    const headers = await getAuthHeaders();
    if (!headers) {
      setStatusText('Please sign in first.');
      router.push('/auth/signin');
      return null;
    }

    const response = await fetch(`/api/contests/${contestId}/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        questionId: question.id,
        code,
        language,
        mode,
        contestMode,
      }),
    });
    return response.json();
  };

  const handleRun = async () => {
    setRunning(true);
    setStatusText('Running all testcases...');
    try {
      const result = await evaluateQuestion('run');
      if (!result) return;
      if (!result.success) {
        setStatusText(result.message || 'Run failed.');
        return;
      }

      const rows = (result.results || []) as ResultRow[];
      setResults(rows);
      setRunExecuted(true);
      setRunPassed(Boolean(result.passedAll));

      const verdict = result.verdict as Verdict;
      if (verdict === 'AC') {
        setStatusText('Accepted: All testcases passed. You can submit now.');
      } else if (verdict === 'WA') {
        setStatusText('Wrong Answer: Some testcases failed.');
      } else if (verdict === 'TLE') {
        setStatusText('Time Limit Exceeded on one or more testcases.');
      } else if (verdict === 'CE') {
        setStatusText('Compilation Error: check testcase details.');
      } else {
        setStatusText('Runtime Error on one or more testcases.');
      }
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await evaluateQuestion('submit');
      if (!result) return;
      if (!result.success) {
        setStatusText(result.message || 'Submission failed.');
        return;
      }

      setSubmissionCount((v) => v + 1);
      await loadMySubmissions();
      if (result.scoreSummary) setScoreSummary(result.scoreSummary);

      if (result.verdict === 'AC') {
        const summaryText = result.scoreSummary
          ? ` | Total Score: ${result.scoreSummary.totalScore}/${result.scoreSummary.totalPossibleScore} | Rank: ${result.scoreSummary.rank ?? '-'} / ${result.scoreSummary.participants}`
          : '';
        const warningText = result.persistenceWarning ? ` | ${result.persistenceWarning}` : '';
        setStatusText(`Submission #${submissionCount + 1}: Accepted${summaryText}${warningText}`);
        setShowAcceptedPopup(true);
      } else {
        setStatusText(`Submission #${submissionCount + 1}: ${result.verdict}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onEditorKeyDown = (e: { key: string; preventDefault: () => void; currentTarget: HTMLTextAreaElement }) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setCode(`${code.slice(0, start)}  ${code.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    });
  };

  const goToNextQuestion = () => {
    setShowAcceptedPopup(false);
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      return;
    }
    setContestCompleted(true);
  };

  const finishContest = () => {
    setShowAcceptedPopup(false);
    void endExamAttempt();
  };

  if (attemptLockedMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <Card className="w-full max-w-xl border-white/10 bg-black/70">
          <CardContent className="space-y-4 pt-6 text-center">
            <p className="text-2xl font-semibold">Contest Access Restricted</p>
            <p className="text-sm text-red-300">{attemptLockedMessage}</p>
            <div className="flex items-center justify-center gap-3">
              <Link href={submissionsHref}>
                <Button variant="outline">View My Submissions</Button>
              </Link>
              <Link href="/contests">
                <Button>Back to Contests</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (contestCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <Card className="w-full max-w-xl border-white/10 bg-black/70">
          <CardContent className="space-y-4 pt-6 text-center">
            <p className="text-2xl font-semibold">Contest Completed</p>
            <p className="text-sm text-gray-300">You have finished all questions.</p>
            {scoreSummary ? (
              <p className="text-sm text-gray-200">
                Final Score: {scoreSummary.totalScore}/{scoreSummary.totalPossibleScore} | Solved: {scoreSummary.solvedCount} | Rank: {scoreSummary.rank ?? '-'} / {scoreSummary.participants}
              </p>
            ) : null}
            <div className="flex items-center justify-center gap-3">
              <Button onClick={finishContest} disabled={endingExam} className="bg-purple-600 text-white hover:bg-purple-700">
                View My Submissions
              </Button>
              <Button variant="outline" onClick={() => router.push('/contests')}>
                Back to Contests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {showAcceptedPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950 text-white">
            <CardContent className="space-y-4 pt-6 text-center">
              <p className="text-2xl font-semibold">Accepted 🎉</p>
              <p className="text-sm text-gray-300">Great work. Your answer passed all testcases.</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => setShowAcceptedPopup(false)}>Stay Here</Button>
                <Button onClick={goToNextQuestion} className="bg-green-600 text-white hover:bg-green-700">
                  {questionIndex < questions.length - 1 ? 'Next Question' : 'Finish Contest'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showExitDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <Card className="w-full max-w-2xl border-white/10 bg-zinc-950 text-white">
            <CardContent className="space-y-4 pt-6">
              <p className="text-2xl font-semibold">Exit Contest</p>
              <p className="text-sm text-gray-300">
                Review your submissions. You can continue the exam, or end exam to close this attempt.
              </p>
              <div className="max-h-64 space-y-2 overflow-auto rounded border border-white/10 bg-black/40 p-3">
                {loadingSubmissions ? (
                  <p className="text-sm text-gray-400">Loading submissions...</p>
                ) : mySubmissions.length === 0 ? (
                  <p className="text-sm text-gray-400">No submissions yet.</p>
                ) : (
                  mySubmissions.map((s) => (
                    <div key={s.id} className="rounded border border-white/10 bg-black/40 p-2 text-sm">
                      <p className="font-medium">{s.question_title || s.question_id}</p>
                      <p className="text-xs text-gray-400">
                        {s.verdict} | Score: {s.score} | {s.passed_count}/{s.total_count} tests | {new Date(s.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                  Continue Exam
                </Button>
                <Button onClick={finishContest} disabled={endingExam} className="bg-red-600 text-white hover:bg-red-700">
                  {endingExam ? 'Ending...' : 'End Exam'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-3">
          <div>
            <p className="text-lg font-semibold">{contest.title} - Exam</p>
            <p className="text-xs text-gray-400">
              Question {questionIndex + 1} of {questions.length} | Mode: {contestMode === 'virtual' ? 'Virtual' : 'Live'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={submissionsHref}>
              <Button variant="outline">My Submissions</Button>
            </Link>
            <div className={`font-mono text-lg ${timeLeft < 600 ? 'text-red-400' : 'text-yellow-300'}`}>
              <Clock className="mr-2 inline h-4 w-4" />
              {timerText}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowExitDialog(true);
                void loadMySubmissions();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Exit
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] p-4">
        <PanelGroup direction="horizontal" className="min-h-[calc(100vh-120px)] rounded border border-white/10">
          <Panel defaultSize={45} minSize={25}>
            <div className="h-full overflow-auto bg-zinc-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{question.title}</h2>
                <Badge variant="outline">{question.category}</Badge>
              </div>
              <p className="text-sm text-gray-300">{question.description}</p>
              <div className="mt-4">
                <p className="mb-1 text-sm font-semibold">Constraints</p>
                <p className="text-sm text-gray-400">{question.constraints}</p>
              </div>
              <div className="mt-4">
                <p className="mb-1 text-sm font-semibold">Visible Example</p>
                <div className="rounded border border-white/10 bg-black/50 p-3 text-sm">
                  <p className="font-mono text-gray-300">Input:</p>
                  <pre className="whitespace-pre-wrap break-words font-mono text-gray-300">{question.examples?.[0]?.input}</pre>
                  <p className="mt-2 font-mono text-gray-300">Output:</p>
                  <pre className="whitespace-pre-wrap break-words font-mono text-gray-300">{question.examples?.[0]?.output}</pre>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {questions.map((q, idx) => (
                  <Button key={q.id} variant={questionIndex === idx ? 'default' : 'outline'} onClick={() => setQuestionIndex(idx)}>
                    Q{idx + 1}
                  </Button>
                ))}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-white/10 hover:bg-purple-500/40" />

          <Panel defaultSize={55} minSize={30}>
            <div className="h-full overflow-auto bg-zinc-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Code</h2>
                <Select value={language} onValueChange={(v) => setLanguage(v as ContestLanguage)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="c">C</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-3 flex gap-2">
                <Button onClick={handleRun} disabled={running || submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Play className="mr-2 h-4 w-4" />{running ? 'Running...' : 'Run'}
                </Button>
                <Button onClick={handleSubmit} disabled={running || submitting} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Send className="mr-2 h-4 w-4" />{submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>

              <div className="rounded border border-white/10 bg-black p-3">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={onEditorKeyDown}
                  rows={20}
                  spellCheck={false}
                  className="w-full resize-none bg-transparent font-mono text-sm text-white outline-none"
                />
              </div>

              <div className="mt-3 rounded border border-white/10 bg-black/50 p-3">
                <p className={`text-sm ${runPassed ? 'text-green-400' : 'text-gray-300'}`}>{statusText}</p>
                <p className="mt-1 text-xs text-gray-400">Submissions: {submissionCount}</p>
                {scoreSummary ? (
                  <p className="mt-1 text-xs text-gray-300">
                    Score: {scoreSummary.totalScore}/{scoreSummary.totalPossibleScore} | Solved: {scoreSummary.solvedCount} | Rank: {scoreSummary.rank ?? '-'} / {scoreSummary.participants}
                  </p>
                ) : null}
              </div>

              {questionIndex === questions.length - 1 ? (
                <div className="mt-3 rounded border border-white/10 bg-black/50 p-3">
                  <p className="mb-2 text-sm font-semibold">My Submissions Before Finishing</p>
                  {loadingSubmissions ? (
                    <p className="text-sm text-gray-400">Loading submissions...</p>
                  ) : mySubmissions.length === 0 ? (
                    <p className="text-sm text-gray-400">No submissions yet.</p>
                  ) : (
                    <div className="max-h-52 space-y-2 overflow-auto">
                      {mySubmissions.map((s) => (
                        <div key={s.id} className="rounded border border-white/10 bg-black/40 p-2 text-xs">
                          <p>{s.question_title || s.question_id}</p>
                          <p className="text-gray-400">
                            {s.verdict} | Score: {s.score} | Tests: {s.passed_count}/{s.total_count}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-3 rounded border border-white/10 bg-black/50 p-3">
                <p className="mb-2 text-sm font-semibold">Test Result ({question.testCaseCount ?? 0} total)</p>
                {results.length === 0 ? (
                  <p className="text-sm text-gray-400">Run to evaluate all testcases.</p>
                ) : (
                  <div className="space-y-2">
                    {results.map((r) => (
                      <div key={r.index} className="rounded border border-white/10 bg-black/40 p-2 text-sm">
                        <p>Test {r.index} ({r.hidden ? 'Hidden' : 'Visible'}): {r.verdict}</p>
                        {r.verdict !== 'AC' ? (
                          <p className="text-xs text-gray-400">
                            Expected: {r.expected ?? '-'} | Output: {r.actual ?? '-'}{r.error ? ` | Error: ${r.error}` : ''} | Runtime: {r.runtimeMs}ms
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">Runtime: {r.runtimeMs}ms</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
