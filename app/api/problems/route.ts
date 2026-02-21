import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-server';

const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);
const ALLOWED_LANGUAGES = new Set(['python', 'c', 'cpp', 'java']);

export async function GET() {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('problems')
    .select('id,slug,title,category,difficulty,constraints,time_limit_ms,memory_limit_mb,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, problems: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
  }

  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const {
      title,
      slug,
      description,
      difficulty = 'Easy',
      category = 'General',
      constraints = '',
      examples = [],
      test_cases = [],
      time_limit_ms = 1000,
      memory_limit_mb = 256,
      starter_codes = {},
    } = body || {};

    if (!title || !slug || !description) {
      return NextResponse.json({ success: false, message: 'Missing title, slug, or description' }, { status: 400 });
    }
    if (!ALLOWED_DIFFICULTIES.has(String(difficulty))) {
      return NextResponse.json({ success: false, message: 'Invalid difficulty' }, { status: 400 });
    }
    if (!Array.isArray(examples) || !Array.isArray(test_cases)) {
      return NextResponse.json({ success: false, message: 'examples and test_cases must be arrays' }, { status: 400 });
    }

    const { data: upserted, error: upsertError } = await supabase
      .from('problems')
      .upsert(
        {
          title,
          slug,
          description,
          difficulty,
          category,
          constraints,
          examples,
          test_cases,
          time_limit_ms,
          memory_limit_mb,
        },
        { onConflict: 'slug' }
      )
      .select('id,slug')
      .single();

    if (upsertError || !upserted?.id) {
      return NextResponse.json({ success: false, message: upsertError?.message || 'Failed to save problem' }, { status: 500 });
    }

    const starterRows: Array<{ problem_id: string; language: string; starter_code: string }> = [];
    for (const [language, starterCode] of Object.entries(starter_codes || {})) {
      if (!ALLOWED_LANGUAGES.has(language)) continue;
      if (typeof starterCode !== 'string') continue;
      starterRows.push({
        problem_id: upserted.id,
        language,
        starter_code: starterCode,
      });
    }

    if (starterRows.length > 0) {
      const { error: starterError } = await supabase
        .from('problem_starter_codes')
        .upsert(starterRows, { onConflict: 'problem_id,language' });
      if (starterError) {
        return NextResponse.json({ success: false, message: starterError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, problem: upserted });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
