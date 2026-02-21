'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase, type Problem, type Submission } from '@/lib/supabase';
import { PlayIcon, SendIcon, CheckCircle2Icon, XCircleIcon, ClockIcon, AlertCircleIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const LANGUAGE_TEMPLATES = {
  python: `def solve(n):
    # Your code here
    return result

# Read input
n = int(input())
print(solve(n))`,
  javascript: `function solve(n) {
  // Your code here
  return result;
}

// Read input
const n = parseInt(require('fs').readFileSync(0, 'utf-8'));
console.log(solve(n));`,
  typescript: `function solve(n: number): number {
  // Your code here
  return result;
}

// Read input
const n = parseInt(require('fs').readFileSync(0, 'utf-8'));
console.log(solve(n));`,
  c: `#include <stdio.h>

int solve(int n) {
  // Your code here
  return result;
}

int main() {
  int n;
  scanf("%d", &n);
  printf("%d\\n", solve(n));
  return 0;
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int solve(int n) {
  // Your code here
  return result;
}

int main() {
  ios_base::sync_with_stdio(false);
  cin.tie(NULL);
  
  int n;
  cin >> n;
  cout << solve(n) << endl;
  
  return 0;
}`,
  java: `import java.util.*;

public class Solution {
  public static int solve(int n) {
    // Your code here
    return result;
  }

  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    int n = sc.nextInt();
    System.out.println(solve(n));
  }
}`,
  go: `package main

import "fmt"

func solve(n int) int {
  // Your code here
  return result
}

func main() {
  var n int
  fmt.Scanln(&n)
  fmt.Println(solve(n))
}`,
  r: `solve <- function(n) {
  # Your code here
  result
}

# Read input
n <- as.integer(readLines(n=1))
print(solve(n))`,
};

interface CodeEditorProps {
  problem: Problem;
}

type SubmissionStatus = 'idle' | 'submitting' | 'accepted' | 'rejected' | 'error';

export default function CodeEditor({ problem }: CodeEditorProps) {
  const [language, setLanguage] = useState<'python' | 'javascript' | 'typescript' | 'c' | 'cpp' | 'java' | 'go' | 'r'>('python');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.python);
  const [testInput, setTestInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [verdict, setVerdict] = useState<string>('');

  const handleLanguageChange = (newLanguage: any) => {
    setLanguage(newLanguage);
    setCode(LANGUAGE_TEMPLATES[newLanguage as keyof typeof LANGUAGE_TEMPLATES]);
  };

  const handleSubmit = async () => {
    try {
      setStatus('submitting');
      setOutput('Testing your solution...');

      // Call the judge API
      const response = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language,
          testInput,
        }),
      });

      const result = await response.json();
      console.log('[v0] Judge result:', result);

      if (result.success) {
        setStatus(result.verdict === 'Accepted' ? 'accepted' : 'rejected');
        setVerdict(result.verdict);
        setOutput(result.output || result.message);
      } else {
        setStatus('error');
        setOutput(result.message);
      }
    } catch (err) {
      console.error('[v0] Error:', err);
      setStatus('error');
      setOutput('Error running code. Please try again.');
    }
  };

  const handleRun = async () => {
    try {
      setStatus('submitting');
      setOutput('Running code...');

      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          input: testInput,
        }),
      });

      const result = await response.json();
      setStatus('idle');
      setOutput(result.output || result.message);
    } catch (err) {
      console.error('[v0] Error:', err);
      setStatus('error');
      setOutput('Error running code. Please try again.');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2Icon className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'submitting':
        return <ClockIcon className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Code Editor Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Code Editor</CardTitle>
              <CardDescription>Write your solution below</CardDescription>
            </div>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="c">C</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="r">R</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-96 p-4 bg-muted text-sm font-mono border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Write your code here..."
          />
        </CardContent>
      </Card>

      {/* Test Input Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Test Input</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            className="w-full h-24 p-3 bg-muted text-sm font-mono border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter test input..."
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleRun}
          disabled={status === 'submitting'}
          variant="outline"
          className="gap-2"
        >
          <PlayIcon className="w-4 h-4" />
          Run Code
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={status === 'submitting'}
          className="gap-2"
        >
          <SendIcon className="w-4 h-4" />
          Submit Solution
        </Button>
      </div>

      {/* Output Card */}
      {output && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Output</CardTitle>
                {getStatusIcon()}
              </div>
              {verdict && (
                <Badge variant={verdict === 'Accepted' ? 'default' : 'destructive'}>
                  {verdict}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-auto max-h-48 font-mono">
              {output}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
