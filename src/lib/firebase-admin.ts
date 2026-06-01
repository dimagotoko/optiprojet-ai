import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  // On Firebase App Hosting, Application Default Credentials are injected automatically.
  // For local dev: run `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS.
  return initializeApp({ projectId: 'studio-2194514521-a4a53' });
}

// Lazy getters — nothing runs at module load time, only when first called
export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
