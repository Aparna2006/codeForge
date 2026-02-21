import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { checkRateLimit } from '@/lib/rate-limit';

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

export async function POST(request: NextRequest) {
  try {
    const { code, language, input } = await request.json();
    const identity =
      request.headers.get('authorization') ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'anonymous';
    const limiter = checkRateLimit(`run:${identity}`, 60, 60_000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded. Try again in a minute.' },
        { status: 429 }
      );
    }

    if (!code || !language) {
      return NextResponse.json(
        { success: false, message: 'Missing code or language' },
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

    if (typeof input === 'string' && input.length > 50_000) {
      return NextResponse.json(
        { success: false, message: 'Input is too large. Maximum size is 50KB.' },
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

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeforge-'));
    const ext = LANGUAGE_EXTENSIONS[language];
    const javaClassMatch =
      language === 'java' && typeof code === 'string'
        ? code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/)
        : null;
    const javaClassName = javaClassMatch?.[1] ?? 'Main';
    const fileBaseName = language === 'java' ? javaClassName : 'solution';
    const filePath = path.join(tmpDir, `${fileBaseName}.${ext}`);

    try {
      // Write code to file
      fs.writeFileSync(filePath, code);

      // Compile if needed
      const compileCmd = COMPILE_COMMANDS[language];
      if (compileCmd) {
        console.log('[v0] Compiling:', compileCmd(filePath));
        execSync(compileCmd(filePath), { cwd: tmpDir, timeout: 5000 });
      }

      // Run code
      const runCmd = getRunCommand(language, filePath);
      if (!runCmd) {
        return NextResponse.json({
          success: false,
          message: `Runtime not available for language: ${language}`,
        }, { status: 400 });
      }
      console.log('[v0] Running:', runCmd);

      const output = execSync(runCmd, {
        cwd: tmpDir,
        input: input || '',
        encoding: 'utf-8',
        timeout: 5000,
        maxBuffer: 1024 * 1024,
      });

      return NextResponse.json({
        success: true,
        output: output.trim(),
      });
    } catch (err: any) {
      const errorMessage = err.stderr ? err.stderr.toString() : err.message;
      return NextResponse.json({
        success: false,
        message: 'Execution Error',
        output: errorMessage,
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
