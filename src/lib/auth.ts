'use server';

import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/lib/firebase-admin';

/**
 * Gets the current user from the session cookie.
 * This function should be called at the beginning of any protected server-side operation.
 * 
 * @returns {Promise<{user: import('firebase-admin/auth').UserRecord | null}>}
 */
export async function getCurrentUser() {
  await initializeAdminApp();
  const sessionCookie = cookies().get('__session')?.value;

  if (!sessionCookie) {
    return { user: null };
  }

  try {
    const decodedIdToken = await getAuth().verifySessionCookie(sessionCookie, true);
    const user = await getAuth().getUser(decodedIdToken.uid);
    return { user };
  } catch (error) {
    console.error('Error verifying session cookie:', error);
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
