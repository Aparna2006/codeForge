'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Play, Upload, ChevronDown, ChevronUp } from 'lucide-react';

interface TestCase {
  input: string;
  output: string;
  explanation?: string;
}

interface Problem {
  id: string;
  title: string;
  category: string;
  description: string;
  examples: TestCase[];
  constraints: string;
  difficulty?: string;
  solved?: number;
  submissions?: number;
}

interface CodingPlatformProps {
  problem: Problem;
  onSolve?: () => void;
}

export default function CodingPlatform({ problem, onSolve }: CodingPlatformProps) {
  const [code, setCode] = useState('function solution(n) {\n  // Write your solution here\n  \n}');
  const [activeTab, setActiveTab] = useState('description');
  const [testResults, setTestResults] = useState<Array<{ passed: boolean; input: string; expected: string; output: string }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedTest, setExpandedTest] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const examples = Array.isArray(problem.examples) ? problem.examples : [];
  const constraintsText = typeof problem.constraints === 'string' && problem.constraints.trim().length > 0
    ? problem.constraints
    : 'No constraints provided.';

  // Generate 15-20 test cases
  const generateTestCases = (): TestCase[] => {
    const baseCases = [
      { input: '[2, 7, 11, 15], 9', output: '[0, 1]', explanation: 'Target = 9, indices 0 and 1 sum to 9' },
      { input: '[3, 2, 4], 6', output: '[1, 2]', explanation: 'Target = 6, indices 1 and 2 sum to 6' },
      { input: '[3, 3], 6', output: '[0, 1]', explanation: 'Target = 6, identical elements' },
    ];
    
    // Add more test cases
    const additionalCases: TestCase[] = [];
    for (let i = 0; i < 12; i++) {
      additionalCases.push({
        input: `[${Math.random().toString().slice(2, 5)}, ${Math.random().toString().slice(2, 5)}], ${Math.random().toString().slice(2, 4)}`,
        output: `[${i % 3}, ${(i + 1) % 3}]`,
      });
    }
    
    return [...baseCases, ...additionalCases];
  };

  const testCases = generateTestCases();

  const handleRunCode = async () => {
    setIsRunning(true);
    // Simulate code execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = testCases.slice(0, 5).map((testCase, index) => ({
      passed: index < 3, // First 3 pass, others fail for demo
      input: testCase.input,
      expected: testCase.output,
      output: index < 3 ? testCase.output : 'null',
    }));
    
    setTestResults(results);
    setIsRunning(false);
    setActiveTab('testcases');
  };

  const handleSubmit = async () => {
    setIsRunning(true);
    // Simulate all test cases running
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const allPassed = testCases.length > 0;
    const results = testCases.map((testCase, index) => ({
      passed: true,
      input: testCase.input,
      expected: testCase.output,
      output: testCase.output,
    }));
    
    if (allPassed) {
      setShowSuccess(true);
      setTestResults(results);
      if (onSolve) onSolve();
      setTimeout(() => setShowSuccess(false), 3000);
    }
    
    setIsRunning(false);
    setActiveTab('testcases');
  };

  const categoryColors: Record<string, string> = {
    Arrays: 'bg-blue-500/20 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800',
    Strings: 'bg-green-500/20 text-green-600 border-green-200 dark:text-green-400 dark:border-green-800',
    LinkedLists: 'bg-purple-500/20 text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-800',
    Trees: 'bg-orange-500/20 text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-800',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-w-full">
        {/* Left Panel - Problem Description */}
        <div className="space-y-4">
          <Card className="border-gray-200 dark:border-white/10">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl text-gray-900 dark:text-white mb-2">
                    {problem.title}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className={`border ${categoryColors[problem.category as keyof typeof categoryColors]}`}
                  >
                    {problem.category}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="testcases">Test Cases ({testResults.length})</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {problem.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Examples</h3>
                    <div className="space-y-3">
                      {examples.length === 0 ? (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-gray-400">
                          No examples available for this problem.
                        </div>
                      ) : examples.map((example, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                          <p className="text-sm font-mono text-gray-600 dark:text-gray-400 mb-1">
                            <span className="font-semibold">Input:</span> {example.input}
                          </p>
                          <p className="text-sm font-mono text-gray-600 dark:text-gray-400 mb-1">
                            <span className="font-semibold">Output:</span> {example.output}
                          </p>
                          {example.explanation && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-semibold">Explanation:</span> {example.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Constraints</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {constraintsText}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="testcases" className="space-y-3">
                  {testResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>Run your code to see test results</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {testResults.map((result, idx) => (
                        <div key={idx} className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                          <div
                            className={`p-3 flex items-center justify-between cursor-pointer ${
                              result.passed
                                ? 'bg-green-50 dark:bg-green-950/30'
                                : 'bg-red-50 dark:bg-red-950/30'
                            }`}
                            onClick={() => setExpandedTest(expandedTest === idx ? null : idx)}
                          >
                            <div className="flex items-center gap-3">
                              {result.passed ? (
                                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                              )}
                              <span className={`font-medium ${
                                result.passed
                                  ? 'text-green-900 dark:text-green-400'
                                  : 'text-red-900 dark:text-red-400'
                              }`}>
                                Test Case {idx + 1}
                              </span>
                            </div>
                            {expandedTest === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                          {expandedTest === idx && (
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2 border-t border-gray-200 dark:border-white/10">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Input</p>
                                <p className="text-sm font-mono bg-white dark:bg-black/30 p-2 rounded border border-gray-200 dark:border-white/10">
                                  {result.input}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Expected Output</p>
                                <p className="text-sm font-mono bg-white dark:bg-black/30 p-2 rounded border border-gray-200 dark:border-white/10">
                                  {result.expected}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Your Output</p>
                                <p className="text-sm font-mono bg-white dark:bg-black/30 p-2 rounded border border-gray-200 dark:border-white/10">
                                  {result.output}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="submissions">
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No submissions yet</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-900/30">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-600">{problem.solved || 0}</div>
                <p className="text-sm text-green-600/80">Accepted</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-900/30">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600">{problem.submissions || 0}</div>
                <p className="text-sm text-blue-600/80">Submissions</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <Card className="border-gray-200 dark:border-white/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-gray-900 dark:text-white">Code Editor</CardTitle>
              <CardDescription>Write your solution below</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Code Editor */}
              <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                <div className="bg-gray-900 text-white p-4 font-mono text-sm">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none font-mono text-sm"
                    rows={20}
                    placeholder="function solution(n) {&#10;  // Write your solution here&#10;}"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? 'Running...' : 'Run Code'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isRunning}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isRunning ? 'Submitting...' : 'Submit'}
                </Button>
              </div>

              {/* Total Test Cases Info */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-400">
                Total Test Cases: <span className="font-semibold">{testCases.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Success Message */}
          {showSuccess && (
            <Card className="border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🎉</div>
                  <div>
                    <p className="font-bold text-green-900 dark:text-green-400">
                      Hooray! All test cases passed!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-500">
                      Great job! You've successfully solved this problem.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wrong Answer Message */}
          {testResults.length > 0 && testResults.some(r => !r.passed) && !showSuccess && (
            <Card className="border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">❌</div>
                  <div>
                    <p className="font-bold text-red-900 dark:text-red-400">
                      Wrong Answer
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-500">
                      {testResults.filter(r => !r.passed).length} test case(s) failed. Check the output above.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
