
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
  }

  const expiresIn = 60 * 60 * 24 * 14 * 1000;

  try {
    const decodedIdToken = await getAdminAuth().verifyIdToken(idToken);

    if (new Date().getTime() / 1000 - decodedIdToken.auth_time < 5 * 60) {
      const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });

      const response = NextResponse.json({ status: 'success' });
      response.cookies.set('__session', sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'lax',
      });
      return response;
    }
    return NextResponse.json({ error: 'Recent sign-in required' }, { status: 401 });

  } catch (error) {
    console.error('Error creating session cookie:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ status: 'success' });
    response.cookies.set('__session', '', { maxAge: 0 });
    return response;
  } catch (error) {
    console.error('Error deleting session cookie:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
