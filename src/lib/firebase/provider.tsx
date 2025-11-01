'use client';

import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import React, { createContext, useContext } from 'react';

const AuthContext = createContext<Auth | null>(null);
const FirestoreContext = createContext<Firestore | null>(null);

export const AuthProvider = ({
  children,
  auth,
}: {
  children: React.ReactNode;
  auth: Auth;
}) => {
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const FirestoreProvider = ({
  children,
  firestore,
}: {
  children: React.ReactNode;
  firestore: Firestore;
}) => {
  return (
    <FirestoreContext.Provider value={firestore}>
      {children}
    </FirestoreContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const useFirestoreContext = () => {
  const context = useContext(FirestoreContext);
  if (context === undefined) {
    throw new Error(
      'useFirestoreContext must be used within a FirestoreProvider'
    );
  }
  return context;
};
