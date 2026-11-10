import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionCookie, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json().catch(() => ({ idToken: null }));

  if (typeof idToken !== 'string' || !idToken) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  let result;
  try {
    result = await createAdminSessionCookie(idToken);
  } catch (error) {
    console.error('[admin-session] Failed to verify ID token:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!result) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // `lasting` says whether this is the 14-day session or the one-hour fallback.
  const response = NextResponse.json({ ok: true, lasting: result.lasting });
  response.cookies.set(ADMIN_SESSION_COOKIE, result.cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(result.maxAgeMs / 1000),
  });
  return response;
}
