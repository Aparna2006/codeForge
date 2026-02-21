const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('./config');

const LANGUAGE_EXTENSIONS = {
  python: 'py',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
};

const COMPILE_COMMANDS = {
  c: (file) => `gcc -o ${file}.out ${file}`,
  cpp: (file) => `g++ -o ${file}.out ${file}`,
  java: (file) => `javac ${file}`,
};

const RUN_COMMANDS = {
  python: (file) => `python "${file}"`,
  c: (file) => `${file}.out`,
  cpp: (file) => `${file}.out`,
  java: (file) => {
    const className = path.basename(file, '.java');
    return `java -cp ${path.dirname(file)} ${className}`;
  },
};

function hasCommand(command) {
  const lookup = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(lookup, [command], { stdio: 'ignore' });
  return result.status === 0;
}

function resolvePythonRunCommand(file) {
  if (hasCommand('python')) return `python "${file}"`;
  if (hasCommand('python3')) return `python3 "${file}"`;
  if (hasCommand('py')) return `py -3 "${file}"`;
  return null;
}

function getRunCommand(language, file) {
  if (language === 'python') return resolvePythonRunCommand(file);
  return RUN_COMMANDS[language] || null ? RUN_COMMANDS[language](file) : null;
}

function getDockerImage(language) {
  if (language === 'python') return 'python:3.11-alpine';
  if (language === 'c' || language === 'cpp') return 'gcc:13';
  if (language === 'java') return 'eclipse-temurin:21-jdk';
  return '';
}

function runInDocker({ language, workdir, command, timeoutMs, memoryLimitMb }) {
  const image = getDockerImage(language);
  if (!image) throw new Error(`No docker image configured for ${language}`);
  const baseArgs = [
    'run',
    '--rm',
    '--network=none',
    '--cpus=1',
    `--memory=${Math.max(128, memoryLimitMb || 256)}m`,
    '--pids-limit=128',
    '--security-opt=no-new-privileges',
  ];
  if (config.runnerSeccompProfile) {
    baseArgs.push(`--security-opt=seccomp=${config.runnerSeccompProfile}`);
  }
  baseArgs.push('-v', `${workdir}:/workspace`, '-w', '/workspace', image, 'sh', '-lc', command);
  return execSync(`docker ${baseArgs.map((a) => `"${a}"`).join(' ')}`, {
    timeout: timeoutMs,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
  });
}

function runCommand({ language, workdir, command, timeoutMs, memoryLimitMb, input }) {
  if (config.runnerMode === 'docker') {
    if (typeof input === 'string' && input.length > 0) {
      const tempInput = path.join(workdir, 'stdin.txt');
      fs.writeFileSync(tempInput, input);
      return runInDocker({
        language,
        workdir,
        command: `${command} < stdin.txt`,
        timeoutMs,
        memoryLimitMb,
      });
    }
    return runInDocker({ language, workdir, command, timeoutMs, memoryLimitMb });
  }

  return execSync(command, {
    cwd: workdir,
    input: input || '',
    encoding: 'utf-8',
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });
}

function normalizeTokens(text) {
  return String(text || '')
    .replace(/[\[\],()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function isNumericToken(token) {
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(token);
}

function outputsMatch(expected, actual) {
  const e = normalizeTokens(expected);
  const a = normalizeTokens(actual);
  if (e.length !== a.length) return false;
  for (let i = 0; i < e.length; i++) {
    if (isNumericToken(e[i]) && isNumericToken(a[i])) {
      if (Math.abs(Number(e[i]) - Number(a[i])) > 0.0001) return false;
      continue;
    }
    if (e[i] !== a[i]) return false;
  }
  return true;
}

function runJudgeJob(data) {
  const { code, language, testCases = [], timeLimitMs = 1000, memoryLimitMb = 256 } = data;
  if (!LANGUAGE_EXTENSIONS[language]) {
    return { verdict: 'Unsupported Language', runtimeMs: 0, passedCount: 0, totalCount: testCases.length, details: {} };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-job-'));
  const ext = LANGUAGE_EXTENSIONS[language];
  const javaClassMatch =
    language === 'java' && typeof code === 'string'
      ? code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/)
      : null;
  const javaClassName = javaClassMatch?.[1] || 'Main';
  const fileName = language === 'java' ? `${javaClassName}.${ext}` : `solution.${ext}`;
  const filePath = path.join(tmpDir, fileName);

  let runtimeMs = 0;
  let passedCount = 0;
  let failedIndex = -1;
  let verdict = 'Accepted';
  let actualOutput = '';
  let expectedOutput = '';
  let errorMessage = '';

  try {
    fs.writeFileSync(filePath, code);
    const compileCmd = COMPILE_COMMANDS[language];
    if (compileCmd) {
      try {
        runCommand({
          language,
          workdir: tmpDir,
          command: compileCmd(filePath),
          timeoutMs: 5000,
          memoryLimitMb,
        });
      } catch (err) {
        return {
          verdict: 'Compilation Error',
          runtimeMs: 0,
          passedCount: 0,
          totalCount: testCases.length,
          details: { errorMessage: err?.stderr?.toString?.() || err?.message || 'Compilation failed' },
          output: err?.stderr?.toString?.() || err?.message || 'Compilation failed',
          timeLimitMs,
          memoryLimitMb,
        };
      }
    }

    const runCmd = getRunCommand(language, filePath);
    if (!runCmd) {
      return {
        verdict: 'Runtime Error',
        runtimeMs: 0,
        passedCount: 0,
        totalCount: testCases.length,
        details: { errorMessage: 'Runtime not available' },
        output: 'Runtime not available',
        timeLimitMs,
        memoryLimitMb,
      };
    }

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
        const started = Date.now();
        try {
        const out = runCommand({
          language,
          workdir: tmpDir,
          command: runCmd,
          timeoutMs: timeLimitMs,
          memoryLimitMb,
          input: tc.input || '',
        });
        runtimeMs = Math.max(runtimeMs, Date.now() - started);
        if (!outputsMatch(tc.output || '', out || '')) {
          verdict = 'Wrong Answer';
          failedIndex = i;
          expectedOutput = tc.output || '';
          actualOutput = String(out || '').trim();
          break;
        }
        passedCount += 1;
      } catch (err) {
        runtimeMs = Math.max(runtimeMs, Date.now() - started);
        failedIndex = i;
        const msg = err?.stderr?.toString?.() || err?.message || 'Execution failed';
        if (err?.killed || err?.signal === 'SIGTERM' || String(msg).toLowerCase().includes('timed out')) {
          verdict = 'Time Limit Exceeded';
        } else {
          verdict = 'Runtime Error';
        }
        errorMessage = msg;
        break;
      }
    }

    const totalCount = testCases.length;
    const output =
      verdict === 'Accepted'
        ? 'All tests passed!'
        : verdict === 'Wrong Answer'
          ? actualOutput || 'No output'
          : errorMessage || `${verdict} during execution`;

    return {
      verdict,
      runtimeMs,
      passedCount,
      totalCount,
      output,
      timeLimitMs,
      memoryLimitMb,
      details: {
        testCaseIndex: failedIndex,
        failedInput: failedIndex >= 0 ? (testCases[failedIndex]?.input || '') : '',
        expectedOutput,
        actualOutput,
        errorMessage,
      },
      message:
        verdict === 'Accepted'
          ? `Accepted (${passedCount}/${totalCount} test cases passed)`
          : `${verdict} at test case ${failedIndex + 1} (${passedCount}/${totalCount} passed)`,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = {
  runJudgeJob,
};
