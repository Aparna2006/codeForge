import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';

async function resolveSlug(
  request: NextRequest,
  params: { slug: string } | Promise<{ slug: string }> | undefined
) {
  const resolved = params ? await params : undefined;
  const fromParams = resolved?.slug;
  if (fromParams) return fromParams;

  const chunks = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = chunks.findIndex((c) => c === 'problems');
  return idx >= 0 && chunks[idx + 1] ? chunks[idx + 1] : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    if (!hasSupabaseEnv) {
      return NextResponse.json({ success: true, starterCodes: [] });
    }

    const slug = await resolveSlug(request, params);
    if (!slug) return NextResponse.json({ success: false, message: 'Missing slug' }, { status: 400 });

    const { data: problem, error: pErr } = await supabase
      .from('problems')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (pErr || !problem) {
      return NextResponse.json({ success: true, starterCodes: [] });
    }

    const { data, error } = await supabase
      .from('problem_starter_codes')
      .select('language,starter_code')
      .eq('problem_id', problem.id);
    if (error) {
      return NextResponse.json({ success: true, starterCodes: [] });
    }

    return NextResponse.json({ success: true, starterCodes: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
