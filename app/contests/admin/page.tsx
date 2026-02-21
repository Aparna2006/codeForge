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

type ContestQuestion = {
  id: string;
  position: number;
  title: string;
  category: string;
  description: string;
  constraints: string;
  testCases?: Array<{ hidden?: boolean }>;
  testCaseCount?: number;
};

export default function ContestAdminPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState('');
  const [questions, setQuestions] = useState<ContestQuestion[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [contestId, setContestId] = useState('contest-1');
  const [contestTitle, setContestTitle] = useState('contest-1');
  const [contestDesc, setContestDesc] = useState('Admin-created coding contest with 4 questions and auto-judging.');
  const [contestVisibility, setContestVisibility] = useState<'public' | 'private_code' | 'team'>('public');
  const [contestAccessCode, setContestAccessCode] = useState('');
  const [ownerTeamId, setOwnerTeamId] = useState('');
  const [teamAccessIds, setTeamAccessIds] = useState('');
  const [questionPosition, setQuestionPosition] = useState(1);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionCategory, setQuestionCategory] = useState('Arrays');
  const [questionDescription, setQuestionDescription] = useState('');
  const [questionConstraints, setQuestionConstraints] = useState('');
  const [testcaseJson, setTestcaseJson] = useState(
    JSON.stringify(
      [
        { input: '4\n1 2 3 4', output: '10', hidden: false },
        { input: '4\n2 3 4 9', output: '18', hidden: true },
        { input: '5\n10 20 30 40 50', output: '150', hidden: true },
        { input: '3\n-1 2 7', output: '8', hidden: true },
        { input: '6\n1 1 1 1 1 1', output: '6', hidden: true },
      ],
      null,
      2
    )
  );

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

  useEffect(() => {
    const verifyAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const allowed = isClientAdminEmail(user?.email ?? null);
      setIsAdmin(allowed);
      setAuthChecked(true);
      if (!allowed) {
        router.replace('/contests');
      }
    };
    void verifyAdmin();
  }, [router]);

  const loadQuestions = async () => {
    if (!contestId.trim() || !isAdmin) return;
    setQuestionLoading(true);
    try {
      const res = await fetch(`/api/contests/${encodeURIComponent(contestId)}/questions`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) {
        setMessage(`Error: ${json.message}`);
        setQuestions([]);
        return;
      }
      setQuestions((json.questions || []) as ContestQuestion[]);
    } catch (_e) {
      setMessage('Failed to load questions.');
      setQuestions([]);
    } finally {
      setQuestionLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, isAdmin]);

  const createContest = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setMessage('');
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setMessage('Please sign in as admin first.');
        return;
      }
      const res = await fetch('/api/contests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: contestId,
          title: contestTitle,
          description: contestDesc,
          duration_minutes: 90,
          prize_pool_coins: 2000,
          status: 'upcoming',
          visibility: contestVisibility,
          private_access_code: contestVisibility === 'private_code' ? contestAccessCode : null,
          owner_team_id: ownerTeamId || null,
          team_access_ids: teamAccessIds
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          prizes: [
            { rank_label: '1st', coins: 1000 },
            { rank_label: '2nd', coins: 600 },
            { rank_label: '3rd', coins: 400 },
          ],
        }),
      });
      const json = await res.json();
      setMessage(json.success ? 'Contest saved.' : `Error: ${json.message}`);
    } catch (_e) {
      setMessage('Error creating contest.');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setMessage('');
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setMessage('Please sign in as admin first.');
        return;
      }
      const testCases = JSON.parse(testcaseJson);
      const res = await fetch(`/api/contests/${encodeURIComponent(contestId)}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          position: questionPosition,
          title: questionTitle,
          category: questionCategory,
          description: questionDescription,
          constraints: questionConstraints,
          testCases,
        }),
      });
      const json = await res.json();
      setMessage(json.success ? 'Question added.' : `Error: ${json.message}`);
      if (json.success) {
        await loadQuestions();
      }
    } catch (_e) {
      setMessage('Invalid testcase JSON or API error.');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!contestId || !questionId || !isAdmin) return;
    const confirmed = window.confirm('Delete this question? This also removes all its testcases.');
    if (!confirmed) return;

    setDeletingQuestionId(questionId);
    setMessage('');
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setMessage('Please sign in as admin first.');
        return;
      }
      const res = await fetch(`/api/contests/${encodeURIComponent(contestId)}/questions`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ questionId }),
      });
      const json = await res.json();
      setMessage(json.success ? 'Question deleted.' : `Error: ${json.message}`);
      if (json.success) {
        await loadQuestions();
      }
    } catch (_e) {
      setMessage('Failed to delete question.');
    } finally {
      setDeletingQuestionId('');
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Checking admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-6 py-8 dark:from-black dark:to-gray-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Contest Admin</h1>
          <Link href="/contests"><Button variant="outline">Back to Contests</Button></Link>
        </div>

        <Card>
          <CardHeader><CardTitle>Create/Update Contest</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={contestId} onChange={(e) => setContestId(e.target.value)} placeholder="Contest ID (e.g., contest-1)" />
            <Input value={contestTitle} onChange={(e) => setContestTitle(e.target.value)} placeholder="Contest title" />
            <Textarea value={contestDesc} onChange={(e) => setContestDesc(e.target.value)} rows={3} placeholder="Contest description" />
            <Input
              value={contestVisibility}
              onChange={(e) => setContestVisibility((e.target.value as any) || 'public')}
              placeholder="Visibility: public | private_code | team"
            />
            <Input
              value={contestAccessCode}
              onChange={(e) => setContestAccessCode(e.target.value)}
              placeholder="Private access code (for private_code contests)"
            />
            <Input
              value={ownerTeamId}
              onChange={(e) => setOwnerTeamId(e.target.value)}
              placeholder="Owner team id (optional)"
            />
            <Input
              value={teamAccessIds}
              onChange={(e) => setTeamAccessIds(e.target.value)}
              placeholder="Team access ids CSV (for team contests)"
            />
            <Button onClick={createContest} disabled={loading}>Save Contest</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Add Question To {contestId} (needs 5 testcases)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input type="number" value={questionPosition} onChange={(e) => setQuestionPosition(Number(e.target.value || 1))} placeholder="Position" />
            <Input value={questionTitle} onChange={(e) => setQuestionTitle(e.target.value)} placeholder="Question title" />
            <Input value={questionCategory} onChange={(e) => setQuestionCategory(e.target.value)} placeholder="Category" />
            <Textarea value={questionDescription} onChange={(e) => setQuestionDescription(e.target.value)} rows={3} placeholder="Description" />
            <Textarea value={questionConstraints} onChange={(e) => setQuestionConstraints(e.target.value)} rows={2} placeholder="Constraints" />
            <Textarea value={testcaseJson} onChange={(e) => setTestcaseJson(e.target.value)} rows={10} />
            <Button onClick={addQuestion} disabled={loading}>Add Question</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Existing Questions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={loadQuestions} disabled={questionLoading}>
                {questionLoading ? 'Loading...' : 'Refresh Questions'}
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400">Contest: {contestId}</p>
            </div>

            {questions.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No questions found for this contest.</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between rounded border border-gray-200 p-3 dark:border-white/10">
                    <div>
                      <p className="font-medium">
                        #{q.position} {q.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {q.category} | {q.testCaseCount ?? q.testCases?.length ?? 0} testcases
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => deleteQuestion(q.id)}
                      disabled={deletingQuestionId === q.id}
                    >
                      {deletingQuestionId === q.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {message ? <p className="text-sm text-purple-600">{message}</p> : null}
      </div>
    </div>
  );
}
