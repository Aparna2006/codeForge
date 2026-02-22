import { NextRequest, NextResponse } from 'next/server';

function renderTemplate(type: 'signin' | 'signup', email: string) {
  if (type === 'signup') {
    return {
      subject: 'Welcome to codeForge',
      html: `<p>Hi ${email},</p><p>Welcome to <strong>codeForge</strong>. Happy to see you on board.</p><p>Start solving problems and contests now.</p>`,
    };
  }
  return {
    subject: 'You logged in to codeForge',
    html: `<p>Hi ${email},</p><p>You have logged in to <strong>codeForge</strong>. Welcome back.</p>`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body?.type === 'signup' ? 'signup' : body?.type === 'signin' ? 'signin' : null;
    const email = String(body?.email || '').trim().toLowerCase();

    if (!type || !email) {
      return NextResponse.json({ success: false, message: 'Missing type or email.' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'codeForge <onboarding@resend.dev>';

    if (!resendKey) {
      return NextResponse.json({ success: true, skipped: true, message: 'Email provider not configured.' });
    }

    const template = renderTemplate(type, email);
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ success: false, message: `Mail send failed: ${text}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
