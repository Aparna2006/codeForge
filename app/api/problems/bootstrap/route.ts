import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import { getProblemCatalog, getStarterCodes } from '@/lib/problem-catalog';

async function seedCatalogIfNeeded(force = false) {
  const { count, error: countError } = await supabase
    .from('problems')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    throw new Error(countError.message);
  }

  const current = Number(count ?? 0);
  if (!force && current >= 45) {
    return { seeded: 0, total: current };
  }

  const catalog = getProblemCatalog();
  const { data: rows, error: upsertError } = await supabase
    .from('problems')
    .upsert(catalog, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id');

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const starters = getStarterCodes();
  const starterRows: Array<{ problem_id: string; language: string; starter_code: string }> = [];
  for (const row of rows || []) {
    starterRows.push(
      { problem_id: row.id, language: 'python', starter_code: starters.python },
      { problem_id: row.id, language: 'c', starter_code: starters.c },
      { problem_id: row.id, language: 'cpp', starter_code: starters.cpp },
      { problem_id: row.id, language: 'java', starter_code: starters.java }
    );
  }

  if (starterRows.length > 0) {
    const { error: starterErr } = await supabase
      .from('problem_starter_codes')
      .upsert(starterRows, { onConflict: 'problem_id,language', ignoreDuplicates: false });
    if (starterErr) {
      throw new Error(starterErr.message);
    }
  }

  const { count: afterCount } = await supabase.from('problems').select('id', { count: 'exact', head: true });
  return { seeded: catalog.length, total: Number(afterCount ?? 0) };
}

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: false, message: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const force = Boolean(body?.force);
    const result = await seedCatalogIfNeeded(force);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
