import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        { 
          status: 'error', 
          message: 'Missing Supabase credentials in environment' 
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('problems')
      .select('COUNT(*)')
      .limit(1);

    if (tablesError) {
      return Response.json({
        status: 'error',
        message: 'Database tables not found',
        details: tablesError.message,
      }, { status: 400 });
    }

    // Count problems
    const { data: problems, error: problemsError } = await supabase
      .from('problems')
      .select('id', { count: 'exact' });

    if (problemsError) {
      return Response.json({
        status: 'error',
        message: 'Failed to fetch problems',
        details: problemsError.message,
      }, { status: 400 });
    }

    const problemCount = problems?.length || 0;

    if (problemCount === 0) {
      return Response.json({
        status: 'warning',
        message: 'Database tables exist but no sample problems found',
        problemCount: 0,
        recommendation: 'Visit /setup and click "Initialize Database" to add sample problems',
      }, { status: 200 });
    }

    return Response.json({
      status: 'success',
      message: 'Database setup complete!',
      problemCount,
      ready: true,
    }, { status: 200 });

  } catch (error) {
    return Response.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
