import admin from 'firebase-admin';

// This is a singleton to ensure we only initialize the admin app once.
let app: admin.app.App | null = null;

export async function initializeAdminApp() {
  if (app) {
    return app;
  }

  // These environment variables are automatically set by Firebase App Hosting.
  const credential = admin.credential.applicationDefault();

  app = admin.initializeApp({
    credential,
  });

  return app;
}
