
'use server';

import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { initializeAdminApp } from '@/lib/firebase-admin';

// Initialize the Firebase Admin SDK
initializeAdminApp();

/**
 * Creates a session cookie from a Firebase ID token.
 * POST /api/auth/session
 * Body: { idToken: string }
 */
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
  }

  // Set session expiration to 14 days.
  const expiresIn = 60 * 60 * 24 * 14 * 1000;

  try {
    const decodedIdToken = await getAuth().verifyIdToken(idToken);
    
    // Only process if the token is recent
    if (new Date().getTime() / 1000 - decodedIdToken.auth_time < 5 * 60) {
      const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
      
      cookies().set('__session', sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'lax',
      });
      
      return NextResponse.json({ status: 'success' });
    }
    return NextResponse.json({ error: 'Recent sign-in required' }, { status: 401 });

  } catch (error) {
    console.error('Error creating session cookie:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

/**
 * Deletes the session cookie.
 * DELETE /api/auth/session
 */
export async function DELETE() {
  try {
    // Clear the session cookie by setting its maxAge to 0
    cookies().set('__session', '', { maxAge: 0 });
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error deleting session cookie:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
