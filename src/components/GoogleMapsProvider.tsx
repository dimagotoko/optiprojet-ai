'use client';

import * as React from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  if (loadError) {
    console.error('Google Maps script failed to load:', loadError);
    return <div>Erreur de chargement de la carte. Avez-vous configuré la variable d'environnement NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?</div>;
  }

  if (!isLoaded) {
    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-1/2" />
                    <Skeleton className="h-8 w-1/4" />
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                    </div>
                     <Skeleton className="h-20 w-full" />
                </div>
            </div>
        </div>
    );
  }

  return <>{children}</>;
}
