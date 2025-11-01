'use client';

import { initializeFirebase } from '.';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { AuthProvider, FirestoreProvider } from './provider';

interface FirebaseClientProviderProps {
  children: React.ReactNode;
}

const FirebaseContext = createContext<any>(null);

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<any>(null);

  useEffect(() => {
    const initializedServices = initializeFirebase(firebaseConfig);
    setServices(initializedServices);
  }, []);

  if (!services) {
    return null; 
  }

  return (
    <FirebaseContext.Provider value={services}>
      <AuthProvider auth={services.auth}>
        <FirestoreProvider firestore={services.firestore}>
          {children}
        </FirestoreProvider>
      </AuthProvider>
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);
