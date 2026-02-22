import { createClient } from '@supabase/supabase-js';
import { getProblemCatalog, getStarterCodes } from '@/lib/problem-catalog';

async function seedProblemCatalog(supabase: any) {
  const catalog = getProblemCatalog();
  const { data: upserted, error: upsertError } = await supabase
    .from('problems')
    .upsert(catalog, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id,slug');

  if (upsertError) {
    throw new Error(upsertError.message || 'Failed to seed problems');
  }

  const rows = upserted || [];
  if (rows.length === 0) return { seeded: 0 };

  const starters = getStarterCodes();
  const starterRows: Array<{ problem_id: string; language: string; starter_code: string }> = [];
  for (const row of rows) {
    starterRows.push(
      { problem_id: row.id, language: 'python', starter_code: starters.python },
      { problem_id: row.id, language: 'c', starter_code: starters.c },
      { problem_id: row.id, language: 'cpp', starter_code: starters.cpp },
      { problem_id: row.id, language: 'java', starter_code: starters.java }
    );
  }

  const { error: starterErr } = await supabase
    .from('problem_starter_codes')
    .upsert(starterRows, { onConflict: 'problem_id,language', ignoreDuplicates: false });

  if (starterErr) {
    throw new Error(starterErr.message || 'Failed to seed starter codes');
  }

  return { seeded: catalog.length };
}

export async function POST(_request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        {
          error:
            'Missing Supabase credentials in environment. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.',
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const seeded = await seedProblemCatalog(supabase);

    return Response.json(
      {
        message: `Database setup completed. ${seeded.seeded} problems are available.`,
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'An error occurred during setup',
      },
      { status: 500 }
    );
  }
}
