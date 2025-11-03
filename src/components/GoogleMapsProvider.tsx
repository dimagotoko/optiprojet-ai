'use client';

import * as React from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: ['places'],
  });

  if (loadError) {
    console.error('Google Maps script failed to load:', loadError);
    return (
      <div className="container py-8">
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
          <h3 className="font-bold">Erreur de chargement de Google Maps</h3>
          <p>L'API Google Maps n'a pas pu se charger correctement. Cela peut être dû à un problème de réseau ou à une clé d'API manquante/invalide.</p>
           <p className="mt-2 text-xs">Veuillez vérifier la variable d'environnement <code className="font-mono bg-destructive/20 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.</p>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    );
  }

  // We don't render a loading skeleton anymore.
  // The AddressInput component will be disabled by default until isLoaded is true.
  return <>{children}</>;
}
