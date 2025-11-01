'use client';

import {
  initializeApp,
  getApp,
  getApps,
  FirebaseOptions,
  FirebaseApp,
} from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

let services: FirebaseServices | null = null;

export const initializeFirebase = (options: FirebaseOptions) => {
  if (services) {
    console.warn('Firebase already initialized');
    return services;
  }
  const app = getApps().length === 0 ? initializeApp(options) : getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  services = { app, auth, firestore };
  return services;
};

export function useFirebaseApp() {
  if (!services) {
    throw new Error(
      'Firebase not initialized. Please call initializeFirebase first.'
    );
  }
  return services.app;
}

export function useAuth() {
  if (!services) {
    return null;
  }
  return services.auth;
}

export function useFirestore() {
  if (!services) {
    throw new Error(
      'Firebase not initialized. Please call initializeFirebase first.'
    );
  }
  return services.firestore;
}

export { useUser } from './use-user';
