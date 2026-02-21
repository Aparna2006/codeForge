import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';

const JUDGE_ASYNC_ENABLED = process.env.JUDGE_ASYNC_ENABLED === 'true';
const JUDGE_SERVICE_URL = process.env.JUDGE_SERVICE_URL || 'http://localhost:4100';
const JUDGE_SERVICE_API_TOKEN = process.env.JUDGE_SERVICE_API_TOKEN || '';

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
  if (language === 'python') {
    return resolvePythonRunCommand(file);
  }
  return RUN_COMMANDS[language]?.(file) ?? null;
}

function isSupportedLanguage(language: string): language is keyof typeof LANGUAGE_EXTENSIONS {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_EXTENSIONS, language);
}

async function getUserEmailFromToken(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

async function persistProblemSubmission(payload: {
  userEmail: string;
  problem: any;
  language: string;
  code: string;
  verdict: string;
  runtimeMs: number;
  output: string;
}) {
  const { userEmail, problem, language, code, verdict, runtimeMs, output } = payload;

  await supabase.from('problem_submissions').insert({
    problem_id: problem.id,
    problem_slug: problem.slug,
    user_email: userEmail,
    language,
    code,
    verdict,
    runtime_ms: runtimeMs,
    time_limit_ms: Number(problem.time_limit_ms ?? 0),
    memory_limit_mb: Number(problem.memory_limit_mb ?? 0),
    output,
  });

  const { data: existing } = await supabase
    .from('problem_progress')
    .select('id,attempted_count,accepted_count')
    .eq('problem_id', problem.id)
    .eq('user_email', userEmail)
    .maybeSingle();

  const acceptedInc = verdict === 'Accepted' ? 1 : 0;
  if (!existing) {
    await supabase.from('problem_progress').insert({
      problem_id: problem.id,
      user_email: userEmail,
      attempted_count: 1,
      accepted_count: acceptedInc,
      last_verdict: verdict,
      last_language: language,
      last_submitted_at: new Date().toISOString(),
    });
    return;
  }

  await supabase
    .from('problem_progress')
    .update({
      attempted_count: Number(existing.attempted_count ?? 0) + 1,
      accepted_count: Number(existing.accepted_count ?? 0) + acceptedInc,
      last_verdict: verdict,
      last_language: language,
      last_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);
}

function isNumericToken(token: string): boolean {
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(token);
}

function normalizeTokens(text: string): string[] {
  return text
    .replace(/[\[\],()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function compareOutputs(expected: string, actual: string): boolean {
  const expTokens = normalizeTokens(expected);
  const actTokens = normalizeTokens(actual);
  if (expTokens.length !== actTokens.length) return false;

  for (let i = 0; i < expTokens.length; i++) {
    const e = expTokens[i];
    const a = actTokens[i];
    if (isNumericToken(e) && isNumericToken(a)) {
      if (Math.abs(Number(e) - Number(a)) > 0.0001) return false;
      continue;
    }
    if (e !== a) return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { problemId, code, language, testInput } = await request.json();
    const userEmail = await getUserEmailFromToken(request);
    const identity = userEmail || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const limiter = checkRateLimit(`judge:${identity}`, 40, 60_000);
    if (!limiter.allowed) {
      return NextResponse.json({ success: false, message: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    if (!problemId || !code || !language) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isSupportedLanguage(language)) {
      return NextResponse.json(
        { success: false, message: 'Unsupported language' },
        { status: 400 }
      );
    }

    if (typeof code !== 'string' || code.length > 200_000) {
      return NextResponse.json(
        { success: false, message: 'Code is too large. Maximum size is 200KB.' },
        { status: 400 }
      );
    }

    if (typeof testInput === 'string' && testInput.length > 50_000) {
      return NextResponse.json(
        { success: false, message: 'Test input is too large. Maximum size is 50KB.' },
        { status: 400 }
      );
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

    if (!hasSupabaseEnv) {
      return NextResponse.json(
        {
          success: false,
          message: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        },
        { status: 500 }
      );
    }

    // Fetch problem details
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('*')
      .eq('id', problemId)
      .single();

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, message: 'Problem not found' },
        { status: 404 }
      );
    }

    if (JUDGE_ASYNC_ENABLED) {
      const enqueueResp = await fetch(`${JUDGE_SERVICE_URL}/api/v1/judge/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(JUDGE_SERVICE_API_TOKEN ? { 'x-judge-service-token': JUDGE_SERVICE_API_TOKEN } : {}),
        },
        body: JSON.stringify({
          code,
          language,
          testCases: Array.isArray(problem.test_cases) ? problem.test_cases : [],
          timeLimitMs: Number(problem.time_limit_ms ?? 1000),
          memoryLimitMb: Number(problem.memory_limit_mb ?? 256),
          meta: {
            userEmail: userEmail || '',
            problemId: problem.id,
            problemSlug: problem.slug,
          },
        }),
      });
      const enqueueJson = await enqueueResp.json();
      if (!enqueueResp.ok || !enqueueJson.success) {
        return NextResponse.json(
          { success: false, message: enqueueJson.message || 'Failed to enqueue judge job' },
          { status: enqueueResp.status || 500 }
        );
      }
      return NextResponse.json({
        success: true,
        async: true,
        jobId: enqueueJson.jobId,
        status: 'queued',
        message: 'Submission queued for judging.',
      }, { status: 202 });
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeforge-judge-'));
    const ext = LANGUAGE_EXTENSIONS[language];
    const filePath = path.join(tmpDir, `solution.${ext}`);

    let verdict = 'Accepted';
    let failedTestIndex = -1;
    let expectedOutput = '';
    let actualOutput = '';
    let errorMessage = '';
    let runtime = 0;
    let passedCount = 0;

    try {
      // Write code to file
      fs.writeFileSync(filePath, code);

      // Compile if needed
      const compileCmd = COMPILE_COMMANDS[language];
      if (compileCmd) {
        console.log('[v0] Compiling for judge');
        execSync(compileCmd(filePath), { cwd: tmpDir, timeout: 5000 });
      }

      // Run against test cases
      const testCases = problem.test_cases || [];
      const runCmd = getRunCommand(language, filePath);
      if (!runCmd) {
        return NextResponse.json(
          { success: false, message: `Runtime not available for language: ${language}` },
          { status: 400 }
        );
      }

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const startTime = Date.now();

        try {
          const output = execSync(runCmd, {
            cwd: tmpDir,
            input: testCase.input || '',
            encoding: 'utf-8',
            timeout: problem.time_limit_ms || 5000,
            maxBuffer: 1024 * 1024,
          });

          runtime = Math.max(runtime, Date.now() - startTime);

          if (!compareOutputs(testCase.output, output)) {
            verdict = 'Wrong Answer';
            failedTestIndex = i;
            expectedOutput = testCase.output;
            actualOutput = output;
            break;
          }
          passedCount += 1;
        } catch (err: any) {
          runtime = Date.now() - startTime;

          if (err.signal === 'SIGTERM') {
            verdict = 'Time Limit Exceeded';
          } else if (err.killed) {
            verdict = 'Time Limit Exceeded';
          } else {
            verdict = 'Runtime Error';
            errorMessage = err.stderr ? err.stderr.toString() : err.message;
          }

          failedTestIndex = i;
          break;
        }
      }

      console.log('[v0] Verdict:', verdict);

      const finalOutput =
        verdict === 'Accepted'
          ? 'All tests passed!'
          : verdict === 'Wrong Answer'
            ? (actualOutput?.toString().trim() || 'No output')
            : (errorMessage?.toString().trim() || actualOutput?.toString().trim() || `${verdict} during execution`);
      const totalCount = Array.isArray(problem.test_cases) ? problem.test_cases.length : 0;

      if (userEmail) {
        try {
          await persistProblemSubmission({
            userEmail,
            problem,
            language,
            code,
            verdict,
            runtimeMs: runtime,
            output: finalOutput,
          });
        } catch (_persistErr) {
          // do not block judging if persistence tables are not ready
        }
      }

      return NextResponse.json({
        success: true,
        verdict,
        runtime,
        runtimeMs: runtime,
        passedCount,
        totalCount,
        timeLimitMs: Number(problem.time_limit_ms ?? 0),
        memoryLimitMb: Number(problem.memory_limit_mb ?? 0),
        output: finalOutput,
        message:
          verdict === 'Accepted'
            ? `Accepted (${passedCount}/${totalCount} test cases passed)`
            : `${verdict} at test case ${failedTestIndex + 1} (${passedCount}/${totalCount} passed)`,
        details: {
          testCaseIndex: failedTestIndex,
          failedInput: failedTestIndex >= 0 && Array.isArray(problem.test_cases) ? problem.test_cases[failedTestIndex]?.input ?? '' : '',
          expectedOutput,
          actualOutput,
          errorMessage,
        },
      });
    } catch (err: any) {
      console.error('[v0] Judge error:', err);
      if (userEmail) {
        try {
          await persistProblemSubmission({
            userEmail,
            problem,
            language,
            code,
            verdict: 'Compilation Error',
            runtimeMs: 0,
            output: err.stderr ? err.stderr.toString() : err.message,
          });
        } catch (_persistErr) {
          // do not block judging if persistence tables are not ready
        }
      }
      return NextResponse.json({
        success: false,
        message: 'Compilation Error',
        output: err.stderr ? err.stderr.toString() : err.message,
        runtimeMs: 0,
        timeLimitMs: Number(problem.time_limit_ms ?? 0),
        memoryLimitMb: Number(problem.memory_limit_mb ?? 0),
      });
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('[v0] API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
