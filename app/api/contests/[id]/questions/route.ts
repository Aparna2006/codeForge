import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-server';

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

export async function GET(_request: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
  }

  const contestId = await resolveContestId(_request, params);
  if (!contestId) {
    return NextResponse.json({ success: false, message: 'Missing contest id' }, { status: 400 });
  }
  const { data: questions, error } = await supabase
    .from('contest_questions')
    .select('*')
    .eq('contest_id', contestId)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  const questionIds = (questions ?? []).map((q) => q.id);
  let testcases: Array<Record<string, any>> = [];
  if (questionIds.length > 0) {
    const tcResp = await supabase
      .from('contest_testcases')
      .select('*')
      .in('question_id', questionIds)
      .order('position', { ascending: true });
    if (tcResp.error) {
      return NextResponse.json({ success: false, message: tcResp.error.message }, { status: 500 });
    }
    testcases = tcResp.data ?? [];
  }

  const merged = (questions ?? []).map((q) => {
    const qTests = testcases
      .filter((tc) => tc.question_id === q.id)
      .map((tc) => ({ input: tc.input, output: tc.output, hidden: tc.hidden }));
    const examples = qTests
      .filter((t) => !t.hidden)
      .slice(0, 1)
      .map((t) => ({ input: t.input, output: t.output }));
    return {
      id: q.id,
      position: q.position,
      title: q.title,
      category: q.category,
      description: q.description,
      constraints: q.constraints,
      examples,
      testCaseCount: qTests.length,
      testCases: qTests.map((t) => ({ hidden: !!t.hidden })),
    };
  });

  return NextResponse.json({ success: true, questions: merged });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const contestId = await resolveContestId(request, params);
  const body = await request.json();
  const { position, title, category, description, constraints, testCases = [] } = body || {};

  const validationErrors: string[] = [];
  if (!contestId) validationErrors.push('contest id is missing');
  if (typeof title !== 'string' || !title.trim()) validationErrors.push('title is required');
  if (typeof category !== 'string' || !category.trim()) validationErrors.push('category is required');
  if (typeof description !== 'string' || !description.trim()) validationErrors.push('description is required');
  if (typeof constraints !== 'string' || !constraints.trim()) validationErrors.push('constraints is required');
  if (!Array.isArray(testCases)) {
    validationErrors.push('testCases must be a JSON array');
  } else {
    if (testCases.length < 5) validationErrors.push('at least 5 testcases are required');
    const invalidCaseIndex = testCases.findIndex(
      (tc) => !tc || typeof tc.input !== 'string' || typeof tc.output !== 'string'
    );
    if (invalidCaseIndex >= 0) {
      validationErrors.push(`testcase at index ${invalidCaseIndex} must include string input and output`);
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { success: false, message: `Invalid payload: ${validationErrors.join('; ')}` },
      { status: 400 }
    );
  }

  const { data: question, error: questionError } = await supabase
    .from('contest_questions')
    .insert({
      contest_id: contestId,
      position: Number(position) || 1,
      title,
      category,
      description,
      constraints,
    })
    .select('*')
    .single();

  if (questionError || !question) {
    return NextResponse.json({ success: false, message: questionError?.message || 'Question insert failed' }, { status: 500 });
  }

  const { error: testcaseError } = await supabase.from('contest_testcases').insert(
    testCases.map((tc: { input: string; output: string; hidden?: boolean }, idx: number) => ({
      question_id: question.id,
      input: tc.input,
      output: tc.output,
      hidden: !!tc.hidden,
      position: idx + 1,
    }))
  );

  if (testcaseError) {
    return NextResponse.json({ success: false, message: testcaseError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, questionId: question.id });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const contestId = await resolveContestId(request, params);
  const body = await request.json();
  const { questionId } = body || {};

  if (!contestId || !questionId) {
    return NextResponse.json({ success: false, message: 'Missing contest id or question id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('contest_questions')
    .delete()
    .eq('contest_id', contestId)
    .eq('id', questionId);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
