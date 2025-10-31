'use client';

import * as React from 'react';
import { useLoadScript } from '@react-google-maps/api';

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  if (loadError) {
    console.error('Google Maps script failed to load:', loadError);
    return <div>Erreur de chargement de la carte. Avez-vous configuré la variable d'environnement NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?</div>;
  }

  return <>{children}</>;
}

// We need to add @react-google-maps/api to dependencies
// Let's modify package.json to add "@react-google-maps/api": "^2.19.3"
