'use server';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    return { user: null };
  }

  try {
    const decodedIdToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    const user = await getAdminAuth().getUser(decodedIdToken.uid);
    return { user };
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    cookieStore.set('__session', '', { maxAge: 0 });
    return { user: null };
  }
}


/**
 * A helper function to be used in server actions or route handlers 
 * that require the user to be authenticated.
 * It throws an error if the user is not authenticated.
 * 
 * @returns {Promise<{user: import('firebase-admin/auth').UserRecord}>}
 * @throws {Error} if the user is not authenticated.
 */
export async function requireUser() {
    const { user } = await getCurrentUser();
    if (!user) {
        throw new Error("Authentication is required for this action.");
    }
    return { user };
}
