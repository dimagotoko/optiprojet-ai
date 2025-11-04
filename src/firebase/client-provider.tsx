
'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { LoadingLogo } from '@/components/LoadingLogo';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

function InitialLoadingScreen() {
    const { isUserLoading } = useUser();

    if (!isUserLoading) {
        return null;
    }
    
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
            <LoadingLogo className="h-16 w-16 text-primary" />
        </div>
    )
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<ReturnType<typeof initializeFirebase> | null>(null);

  useEffect(() => {
    const services = initializeFirebase();
    setFirebaseServices(services);
  }, []);

  if (!firebaseServices) {
    return (
       <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <LoadingLogo className="h-16 w-16 text-primary" />
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
      <InitialLoadingScreen />
    </FirebaseProvider>
  );
}
