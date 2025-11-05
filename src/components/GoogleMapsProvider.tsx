
'use client';

import * as React from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { LoadingLogo } from './LoadingLogo';

const libraries: ("places")[] = ['places'];

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
      console.error("Google Maps API key is missing or invalid. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.");
       return (
        <div className="container py-8">
          <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
            <h3 className="font-bold">Erreur de configuration de Google Maps</h3>
            <p className="mt-2 text-xs">La clé API Google Maps est manquante ou invalide. Veuillez vérifier la variable d'environnement <code className="font-mono bg-destructive/20 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.</p>
          </div>
          <div className="mt-4 opacity-50">{children}</div>
        </div>
      );
  }

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });
  
  if (loadError) {
       return (
        <div className="container py-8">
          <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
            <h3 className="font-bold">Erreur de chargement de Google Maps</h3>
            <p className="mt-2 text-xs">Impossible de charger le script Google Maps. Veuillez vérifier votre connexion internet et la validité de votre clé API.</p>
          </div>
          <div className="mt-4 opacity-50">{children}</div>
        </div>
      );
  }
  
  if (!isLoaded) {
     return (
       <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <LoadingLogo className="h-16 w-16 text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

    