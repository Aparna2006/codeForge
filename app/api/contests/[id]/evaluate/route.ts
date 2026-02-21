import { NextRequest, NextResponse } from 'next/server';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { contestProblems, mockContests } from '@/lib/mock-data';

const JUDGE_ASYNC_ENABLED = process.env.JUDGE_ASYNC_ENABLED === 'true';
const JUDGE_SERVICE_URL = process.env.JUDGE_SERVICE_URL || 'http://localhost:4100';
const JUDGE_SERVICE_API_TOKEN = process.env.JUDGE_SERVICE_API_TOKEN || '';

type Verdict = 'AC' | 'WA' | 'RE' | 'CE' | 'TLE';

type TestCase = {
  input: string;
  output: string;
  hidden?: boolean;
};

type JudgeCaseResult = {
  index: number;
  hidden: boolean;
  verdict: Verdict;
  expected?: string;
  actual?: string;
  error?: string;
  runtimeMs: number;
};

type JudgeServiceReturn = {
  verdict?: string;
  runtimeMs?: number;
  passedCount?: number;
  totalCount?: number;
  output?: string;
  message?: string;
  details?: {
    testCaseIndex?: number;
    expectedOutput?: string;
    actualOutput?: string;
    errorMessage?: string;
  };
};

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  go: 'go',
  r: 'r',
};

const COMPILE_COMMANDS: Record<string, (file: string) => string> = {
  typescript: (file) => `tsc ${file} --outFile ${file}.js`,
  c: (file) => `gcc -o ${file}.out ${file}`,
  cpp: (file) => `g++ -o ${file}.out ${file}`,
  java: (file) => `javac ${file}`,
  go: (file) => `go build -o ${file}.out ${file}`,
};

const RUN_COMMANDS: Record<string, (file: string) => string> = {
  python: (file) => `python "${file}"`,
  javascript: (file) => `node ${file}`,
  typescript: (file) => `node ${file}.js`,
  c: (file) => `${file}.out`,
  cpp: (file) => `${file}.out`,
  java: (file) => {
    const className = path.basename(file, '.java');
    return `java -cp ${path.dirname(file)} ${className}`;
  },
  go: (file) => `${file}.out`,
  r: (file) => `Rscript ${file}`,
};

const LANGUAGE_RUNTIME_DEPENDENCIES: Record<string, string[]> = {
  python: ['python', 'python3', 'py'],
  javascript: ['node'],
  typescript: ['tsc', 'node'],
  c: ['gcc'],
  cpp: ['g++'],
  java: ['javac', 'java'],
  go: ['go'],
  r: ['Rscript'],
};

function hasCommand(command: string): boolean {
  const lookup = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(lookup, [command], { stdio: 'ignore' });
  return result.status === 0;
}

function resolvePythonRunCommand(file: string): string | null {
  if (hasCommand('python')) return `python "${file}"`;
  if (hasCommand('python3')) return `python3 "${file}"`;
  if (hasCommand('py')) return `py -3 "${file}"`;
  return null;
}

function getRunCommand(language: keyof typeof LANGUAGE_EXTENSIONS, file: string): string | null {
  if (language === 'python') return resolvePythonRunCommand(file);
  return RUN_COMMANDS[language]?.(file) ?? null;
}

function isSupportedLanguage(language: string): language is keyof typeof LANGUAGE_EXTENSIONS {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_EXTENSIONS, language);
}

function isNumericToken(token: string): boolean {
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(token);
}

function outputsMatch(expected: string, actual: string, epsilon = 1e-4): boolean {
  const expectedTokens = expected.trim().split(/\s+/).filter(Boolean);
  const actualTokens = actual.trim().split(/\s+/).filter(Boolean);
  if (expectedTokens.length !== actualTokens.length) return false;

  for (let i = 0; i < expectedTokens.length; i++) {
    const exp = expectedTokens[i];
    const act = actualTokens[i];
    const bothNumeric = isNumericToken(exp) && isNumericToken(act);
    if (bothNumeric) {
      if (Math.abs(Number(exp) - Number(act)) > epsilon) return false;
      continue;
    }
    if (exp !== act) return false;
  }
  return true;
}

function classifyExecutionError(err: any): Verdict {
  const msg = `${err?.message ?? ''}`.toLowerCase();
  if (err?.killed || err?.signal === 'SIGTERM' || msg.includes('timed out') || msg.includes('etimedout')) {
    return 'TLE';
  }
  return 'RE';
}

function getErrorText(err: any): string {
  if (err?.stderr) return err.stderr.toString().trim();
  if (err?.stdout) return err.stdout.toString().trim();
  return `${err?.message ?? 'Execution failed'}`.trim();
}

function mapJudgeServiceVerdict(verdict: string): Verdict {
  const normalized = String(verdict || '').toLowerCase();
  if (normalized === 'accepted') return 'AC';
  if (normalized === 'wrong answer') return 'WA';
  if (normalized === 'runtime error') return 'RE';
  if (normalized === 'compilation error') return 'CE';
  if (normalized === 'time limit exceeded') return 'TLE';
  return 'RE';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runJudgeViaService(payload: {
  code: string;
  language: string;
  testCases: TestCase[];
  userEmail: string;
  contestId: string;
  questionId: string;
}) {
  const enqueueResp = await fetch(`${JUDGE_SERVICE_URL}/api/v1/judge/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(JUDGE_SERVICE_API_TOKEN ? { 'x-judge-service-token': JUDGE_SERVICE_API_TOKEN } : {}),
    },
    body: JSON.stringify({
      code: payload.code,
      language: payload.language,
      testCases: payload.testCases.map((tc) => ({ input: tc.input || '', output: tc.output || '' })),
      timeLimitMs: 3000,
      memoryLimitMb: 256,
      meta: {
        userEmail: payload.userEmail,
        contestId: payload.contestId,
        questionId: payload.questionId,
      },
    }),
  });
  const enqueueJson = await enqueueResp.json().catch(() => ({}));
  if (!enqueueResp.ok || !enqueueJson?.success || !enqueueJson?.jobId) {
    throw new Error(enqueueJson?.message || 'Failed to enqueue contest judge job');
  }

  const jobId = String(enqueueJson.jobId);
  const timeoutAt = Date.now() + 60_000;
  while (Date.now() < timeoutAt) {
    await sleep(400);
    const statusResp = await fetch(`${JUDGE_SERVICE_URL}/api/v1/judge/jobs/${encodeURIComponent(jobId)}`, {
      headers: {
        ...(JUDGE_SERVICE_API_TOKEN ? { 'x-judge-service-token': JUDGE_SERVICE_API_TOKEN } : {}),
      },
    });
    const statusJson = await statusResp.json().catch(() => ({}));
    if (!statusResp.ok || !statusJson?.success) {
      continue;
    }
    const state = String(statusJson?.job?.state || '');
    if (state === 'completed') {
      return statusJson.job.returnvalue as JudgeServiceReturn;
    }
    if (state === 'failed') {
      throw new Error(statusJson?.job?.failedReason || 'Judge job failed');
    }
  }
  throw new Error('Judge timeout. Please retry.');
}

async function resolveContestId(
  request: NextRequest,
  params: { id: string } | Promise<{ id: string }> | undefined
) {
  const resolved = params ? await params : undefined;
  const fromParams = resolved?.id;
  if (fromParams) return fromParams;

  const chunks = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = chunks.findIndex((c) => c === 'contests');
  return idx >= 0 && chunks[idx + 1] ? chunks[idx + 1] : '';
}

async function getUserEmailFromToken(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

type ContestWindow =
  | { ok: true; startTimeIso: string; endTimeIso: string; startTimeMs: number }
  | { ok: false; message: string };

const CONTEST1_LIVE_END_ISO = '2026-03-31T23:59:59.000Z';

async function getContestWindow(contestId: string): Promise<ContestWindow> {
  if (contestId === 'contest-1') {
    const end = new Date(CONTEST1_LIVE_END_ISO).getTime();
    const now = Date.now();
    if (now > end) {
      return { ok: false, message: 'Contest is over. Submissions are closed.' };
    }
    const start = new Date('2026-02-01T00:00:00.000Z').getTime();
    return {
      ok: true,
      startTimeIso: new Date(start).toISOString(),
      endTimeIso: new Date(end).toISOString(),
      startTimeMs: start,
    };
  }

  if (hasSupabaseEnv) {
    const { data } = await supabase
      .from('contests')
      .select('start_time,duration_minutes,status')
      .eq('id', contestId)
      .maybeSingle();

    if (data?.start_time && data?.duration_minutes) {
      const start = new Date(data.start_time).getTime();
      const end = start + Number(data.duration_minutes) * 60_000;
      const now = Date.now();
      if (data.status === 'finished' || now > end) {
        return { ok: false, message: 'Contest is over. Submissions are closed.' };
      }
      if (now < start) {
        return { ok: false, message: 'Contest has not started yet.' };
      }
      return {
        ok: true,
        startTimeIso: new Date(start).toISOString(),
        endTimeIso: new Date(end).toISOString(),
        startTimeMs: start,
      };
    }
  }

  const fallback = mockContests.find((c) => c.id === contestId);
  if (!fallback) {
    return { ok: false, message: 'Contest not found.' };
  }
  const start = fallback.startTime.getTime();
  const end = start + fallback.duration * 60_000;
  const now = Date.now();
  if (now > end) {
    return { ok: false, message: 'Contest is over. Submissions are closed.' };
  }
  if (now < start) {
    return { ok: false, message: 'Contest has not started yet.' };
  }
  return {
    ok: true,
    startTimeIso: new Date(start).toISOString(),
    endTimeIso: new Date(end).toISOString(),
    startTimeMs: start,
  };
}

async function getQuestionWithTests(contestId: string, questionId: string): Promise<{
  ok: boolean;
  message?: string;
  questionTitle?: string;
  testCases?: TestCase[];
}> {
  if (hasSupabaseEnv) {
    const { data: question, error: qErr } = await supabase
      .from('contest_questions')
      .select('id,title')
      .eq('contest_id', contestId)
      .eq('id', questionId)
      .maybeSingle();

    if (!qErr && question) {
      const { data: testcases, error: tcErr } = await supabase
        .from('contest_testcases')
        .select('input,output,hidden,position')
        .eq('question_id', question.id)
        .order('position', { ascending: true });

      if (tcErr) {
        return { ok: false, message: tcErr.message };
      }
      const mapped = (testcases ?? []).map((tc) => ({
        input: tc.input,
        output: tc.output,
        hidden: !!tc.hidden,
      }));
      return { ok: true, questionTitle: question.title, testCases: mapped };
    }
  }

  const fallback = (contestProblems as Record<string, any[]>)[contestId] || [];
  const q = fallback.find((item) => item.id === questionId);
  if (!q) return { ok: false, message: 'Question not found' };
  return {
    ok: true,
    questionTitle: q.title,
    testCases: (q.testCases || []) as TestCase[],
  };
}

async function getContestQuestionCount(contestId: string): Promise<number> {
  if (hasSupabaseEnv) {
    const { count } = await supabase
      .from('contest_questions')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', contestId);
    if (typeof count === 'number' && count > 0) return count;
  }
  const fallback = (contestProblems as Record<string, any[]>)[contestId] || [];
  return Array.isArray(fallback) && fallback.length > 0 ? fallback.length : 1;
}

async function computeScoreboard(contestId: string, userEmail: string) {
  const totalQuestions = await getContestQuestionCount(contestId);
  const totalPossibleScore = totalQuestions * 5;

  if (!hasSupabaseEnv) {
    return {
      totalScore: 0,
      totalPossibleScore,
      solvedCount: 0,
      rank: null as number | null,
      participants: 0,
    };
  }

  const { data, error } = await supabase
    .from('contest_submissions')
    .select('question_id,user_email,score,runtime_ms,submitted_at')
    .eq('contest_id', contestId);

  if (error || !data) {
    return {
      totalScore: 0,
      totalPossibleScore,
      solvedCount: 0,
      rank: null as number | null,
      participants: 0,
    };
  }

  const bestByUserQuestion = new Map<string, { score: number; runtimeMs: number; submittedAt: string }>();
  for (const row of data) {
    const key = `${row.user_email}::${row.question_id}`;
    const current = bestByUserQuestion.get(key);
    const candidate = {
      score: Number(row.score ?? 0),
      runtimeMs: Number(row.runtime_ms ?? 0),
      submittedAt: row.submitted_at ?? new Date(0).toISOString(),
    };
    if (
      !current ||
      candidate.score > current.score ||
      (candidate.score === current.score && candidate.runtimeMs < current.runtimeMs) ||
      (candidate.score === current.score &&
        candidate.runtimeMs === current.runtimeMs &&
        candidate.submittedAt < current.submittedAt)
    ) {
      bestByUserQuestion.set(key, candidate);
    }
  }

  const aggregate = new Map<string, { totalScore: number; solvedCount: number; runtimeMs: number; lastSubmitAt: string }>();
  for (const [key, best] of bestByUserQuestion.entries()) {
    const [email] = key.split('::');
    const existing = aggregate.get(email) ?? {
      totalScore: 0,
      solvedCount: 0,
      runtimeMs: 0,
      lastSubmitAt: new Date(0).toISOString(),
    };
    existing.totalScore += best.score;
    if (best.score > 0) existing.solvedCount += 1;
    existing.runtimeMs += best.runtimeMs;
    if (best.submittedAt > existing.lastSubmitAt) existing.lastSubmitAt = best.submittedAt;
    aggregate.set(email, existing);
  }

  const rows = Array.from(aggregate.entries()).map(([email, value]) => ({ email, ...value }));
  rows.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    if (a.runtimeMs !== b.runtimeMs) return a.runtimeMs - b.runtimeMs;
    return a.lastSubmitAt.localeCompare(b.lastSubmitAt);
  });

  const rank = rows.findIndex((r) => r.email === userEmail) + 1;
  const me = rows.find((r) => r.email === userEmail);
  return {
    totalScore: me?.totalScore ?? 0,
    totalPossibleScore,
    solvedCount: me?.solvedCount ?? 0,
    rank: rank > 0 ? rank : null,
    participants: rows.length,
  };
}

function isMissingAttemptsTableError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('contest_attempts') &&
    (lower.includes('not found') || lower.includes('does not exist') || lower.includes('schema cache'))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json(
        {
          success: false,
          message: 'Supabase not configured',
        },
        { status: 500 }
      );
    }

    const contestId = await resolveContestId(request, params);
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'Please sign in to continue.' }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, code, language, mode = 'run', contestMode = 'live' } = body || {};
    const window = await getContestWindow(contestId);
    const isVirtualMode = contestMode === 'virtual';

    const { data: attempt, error: attemptError } = await supabase
      .from('contest_attempts')
      .select('status')
      .eq('contest_id', contestId)
      .eq('user_email', userEmail)
      .maybeSingle();

    if (attemptError) {
      if (isMissingAttemptsTableError(attemptError.message || '')) {
        return NextResponse.json(
          { success: false, message: "Table 'contest_attempts' is missing. Run contests schema SQL." },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: false, message: attemptError.message }, { status: 500 });
    }

    if (attempt?.status === 'completed') {
      return NextResponse.json({ success: false, message: 'You already attempted the exam.' }, { status: 403 });
    }

    if (mode === 'submit' && !isVirtualMode && !window.ok) {
      return NextResponse.json({ success: false, message: window.message }, { status: 403 });
    }

    if (!questionId || !code || !language) {
      return NextResponse.json({ success: false, message: 'Missing questionId, code, or language.' }, { status: 400 });
    }

    if (!isSupportedLanguage(language)) {
      return NextResponse.json({ success: false, message: 'Unsupported language.' }, { status: 400 });
    }

    const questionResp = await getQuestionWithTests(contestId, questionId);
    if (!questionResp.ok || !questionResp.testCases || questionResp.testCases.length === 0) {
      return NextResponse.json({ success: false, message: questionResp.message || 'Question not found.' }, { status: 404 });
    }

    if (JUDGE_ASYNC_ENABLED) {
      const judged = await runJudgeViaService({
        code,
        language,
        testCases: questionResp.testCases,
        userEmail,
        contestId,
        questionId,
      });

      const finalVerdict = mapJudgeServiceVerdict(judged.verdict || '');
      const totalRuntime = Number(judged.runtimeMs ?? 0);
      const passedCount = Number(judged.passedCount ?? 0);
      const totalCount = Number(judged.totalCount ?? questionResp.testCases.length);
      const failedIndex = Number(judged?.details?.testCaseIndex ?? -1);
      const results: JudgeCaseResult[] = questionResp.testCases.map((tc, idx) => {
        const verdict: Verdict =
          finalVerdict === 'AC'
            ? 'AC'
            : idx < passedCount
              ? 'AC'
              : idx === failedIndex
                ? finalVerdict
                : finalVerdict;
        return {
          index: idx + 1,
          hidden: !!tc.hidden,
          verdict,
          expected: tc.hidden ? undefined : tc.output ?? '',
          actual:
            idx === failedIndex
              ? judged?.details?.actualOutput || judged?.output || ''
              : undefined,
          error:
            idx === failedIndex && (finalVerdict === 'RE' || finalVerdict === 'CE' || finalVerdict === 'TLE')
              ? judged?.details?.errorMessage || judged?.output || ''
              : undefined,
          runtimeMs: idx === failedIndex ? totalRuntime : 0,
        };
      });

      let score = 0;
      if (finalVerdict === 'AC') {
        score = 5;
      }

      let scoreSummary: {
        totalScore: number;
        totalPossibleScore: number;
        solvedCount: number;
        rank: number | null;
        participants: number;
      } | null = null;
      let persistenceWarning = '';

      if (mode === 'submit' && !isVirtualMode) {
        if (!attempt) {
          const { error: startError } = await supabase.from('contest_attempts').insert({
            contest_id: contestId,
            user_email: userEmail,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          });
          if (startError) {
            if (isMissingAttemptsTableError(startError.message || '')) {
              return NextResponse.json(
                { success: false, message: "Table 'contest_attempts' is missing. Run contests schema SQL." },
                { status: 500 }
              );
            }
            return NextResponse.json({ success: false, message: startError.message }, { status: 500 });
          }
        }

        const details = results.map((r) => ({
          index: r.index,
          hidden: r.hidden,
          verdict: r.verdict,
          runtimeMs: r.runtimeMs,
        }));
        const { error: insertError } = await supabase.from('contest_submissions').insert({
          contest_id: contestId,
          question_id: questionId,
          question_title: questionResp.questionTitle ?? null,
          user_email: userEmail,
          language,
          verdict: finalVerdict,
          score,
          runtime_ms: totalRuntime,
          passed_count: results.filter((r) => r.verdict === 'AC').length,
          total_count: results.length,
          details,
        });
        if (insertError) {
          const msg = insertError.message || '';
          const lower = msg.toLowerCase();
          const missingTable =
            lower.includes('contest_submissions') &&
            (lower.includes('not found') || lower.includes('does not exist') || lower.includes('schema cache'));
          if (!missingTable) {
            return NextResponse.json({ success: false, message: msg }, { status: 500 });
          }
          persistenceWarning =
            "Submission accepted, but contest score couldn't be saved because 'contest_submissions' table is missing.";
        } else {
          scoreSummary = await computeScoreboard(contestId, userEmail);
        }
      }

      return NextResponse.json({
        success: true,
        verdict: finalVerdict,
        passedAll: finalVerdict === 'AC',
        runtimeMs: totalRuntime,
        score,
        results,
        scoreSummary,
        persistenceWarning: persistenceWarning || undefined,
      });
    }

    const dependencies = LANGUAGE_RUNTIME_DEPENDENCIES[language] || [];
    const missingDependencies =
      language === 'python'
        ? dependencies.every((dep) => !hasCommand(dep))
          ? ['python/python3/py']
          : []
        : dependencies.filter((dep) => !hasCommand(dep));
    if (missingDependencies.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing runtime dependencies for ${language}: ${missingDependencies.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeforge-contest-'));
    const ext = LANGUAGE_EXTENSIONS[language];
    const javaClassMatch =
      language === 'java' && typeof code === 'string'
        ? code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/)
        : null;
    const javaClassName = javaClassMatch?.[1] ?? 'Main';
    const fileBaseName = language === 'java' ? javaClassName : 'solution';
    const filePath = path.join(tmpDir, `${fileBaseName}.${ext}`);

    try {
      fs.writeFileSync(filePath, code);

      const compileCmd = COMPILE_COMMANDS[language];
      if (compileCmd) {
        try {
          execSync(compileCmd(filePath), { cwd: tmpDir, timeout: 5000 });
        } catch (err: any) {
          const ceResults: JudgeCaseResult[] = questionResp.testCases.map((tc, idx) => ({
            index: idx + 1,
            hidden: !!tc.hidden,
            verdict: 'CE',
            error: getErrorText(err),
            runtimeMs: 0,
          }));
          return NextResponse.json({
            success: true,
            verdict: 'CE' as Verdict,
            passedAll: false,
            runtimeMs: 0,
            results: ceResults,
          });
        }
      }

      const runCmd = getRunCommand(language, filePath);
      if (!runCmd) {
        return NextResponse.json(
          { success: false, message: `Runtime not available for language: ${language}` },
          { status: 400 }
        );
      }

      let totalRuntime = 0;
      const results: JudgeCaseResult[] = [];
      let finalVerdict: Verdict = 'AC';
      const timeoutMs = 3000;

      for (let i = 0; i < questionResp.testCases.length; i++) {
        const tc = questionResp.testCases[i];
        const start = Date.now();
        try {
          const actualOutput = execSync(runCmd, {
            cwd: tmpDir,
            input: tc.input || '',
            encoding: 'utf-8',
            timeout: timeoutMs,
            maxBuffer: 1024 * 1024,
          }).trim();
          const runtimeMs = Date.now() - start;
          totalRuntime += runtimeMs;

          const isMatch = outputsMatch(tc.output || '', actualOutput);
          const caseVerdict: Verdict = isMatch ? 'AC' : 'WA';
          if (finalVerdict === 'AC' && caseVerdict !== 'AC') finalVerdict = caseVerdict;
          results.push({
            index: i + 1,
            hidden: !!tc.hidden,
            verdict: caseVerdict,
            expected: tc.hidden ? undefined : tc.output ?? '',
            actual: actualOutput,
            runtimeMs,
          });
        } catch (err: any) {
          const runtimeMs = Date.now() - start;
          totalRuntime += runtimeMs;
          const caseVerdict = classifyExecutionError(err);
          if (finalVerdict === 'AC') finalVerdict = caseVerdict;
          results.push({
            index: i + 1,
            hidden: !!tc.hidden,
            verdict: caseVerdict,
            error: getErrorText(err),
            runtimeMs,
          });
        }
      }

      let score = 0;
      if (finalVerdict === 'AC') {
        score = 5;
      }

      let scoreSummary: {
        totalScore: number;
        totalPossibleScore: number;
        solvedCount: number;
        rank: number | null;
        participants: number;
      } | null = null;
      let persistenceWarning = '';

      if (mode === 'submit' && !isVirtualMode) {
        if (!attempt) {
          const { error: startError } = await supabase.from('contest_attempts').insert({
            contest_id: contestId,
            user_email: userEmail,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          });
          if (startError) {
            if (isMissingAttemptsTableError(startError.message || '')) {
              return NextResponse.json(
                { success: false, message: "Table 'contest_attempts' is missing. Run contests schema SQL." },
                { status: 500 }
              );
            }
            return NextResponse.json({ success: false, message: startError.message }, { status: 500 });
          }
        }

        const details = results.map((r) => ({
          index: r.index,
          hidden: r.hidden,
          verdict: r.verdict,
          runtimeMs: r.runtimeMs,
        }));
        const { error: insertError } = await supabase.from('contest_submissions').insert({
          contest_id: contestId,
          question_id: questionId,
          question_title: questionResp.questionTitle ?? null,
          user_email: userEmail,
          language,
          verdict: finalVerdict,
          score,
          runtime_ms: totalRuntime,
          passed_count: results.filter((r) => r.verdict === 'AC').length,
          total_count: results.length,
          details,
        });
        if (insertError) {
          const msg = insertError.message || '';
          const lower = msg.toLowerCase();
          const missingTable =
            lower.includes('contest_submissions') &&
            (lower.includes('not found') || lower.includes('does not exist') || lower.includes('schema cache'));
          if (!missingTable) {
            return NextResponse.json({ success: false, message: msg }, { status: 500 });
          }
          persistenceWarning =
            "Submission accepted, but contest score couldn't be saved because 'contest_submissions' table is missing.";
        } else {
          scoreSummary = await computeScoreboard(contestId, userEmail);
        }
      }

      return NextResponse.json({
        success: true,
        verdict: finalVerdict,
        passedAll: finalVerdict === 'AC',
        runtimeMs: totalRuntime,
        score,
        results,
        scoreSummary,
        persistenceWarning: persistenceWarning || undefined,
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
