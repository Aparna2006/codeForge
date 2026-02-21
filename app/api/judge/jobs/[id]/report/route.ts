import { NextRequest, NextResponse } from 'next/server';

const JUDGE_SERVICE_URL = process.env.JUDGE_SERVICE_URL || 'http://localhost:4100';
const JUDGE_SERVICE_API_TOKEN = process.env.JUDGE_SERVICE_API_TOKEN || '';

async function resolveJobId(
  request: NextRequest,
  params: { id: string } | Promise<{ id: string }> | undefined
) {
  const resolved = params ? await params : undefined;
  const fromParams = resolved?.id;
  if (fromParams) return fromParams;
  const chunks = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = chunks.findIndex((c) => c === 'jobs');
  return idx >= 0 && chunks[idx + 1] ? chunks[idx + 1] : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const jobId = await resolveJobId(request, params);
    if (!jobId) {
      return NextResponse.json({ success: false, message: 'Missing job id' }, { status: 400 });
    }

    const resp = await fetch(`${JUDGE_SERVICE_URL}/api/v1/judge/jobs/${encodeURIComponent(jobId)}/report`, {
      headers: {
        ...(JUDGE_SERVICE_API_TOKEN ? { 'x-judge-service-token': JUDGE_SERVICE_API_TOKEN } : {}),
      },
    });
    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ success: false, message: text || 'Failed to fetch report' }, { status: resp.status });
    }
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=\"judge-report-${jobId}.json\"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
