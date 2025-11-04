'use client';

import * as React from 'react';
import { useLoadScript } from '@react-google-maps/api';

// This provider is no longer strictly necessary if each component handles its own loading,
// but we'll keep it in case there's a need for a global context later.
// For now, it will just render its children.
export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  if (!apiKey) {
      console.error("Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.");
       return (
        <div className="container py-8">
          <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
            <h3 className="font-bold">Erreur de configuration de Google Maps</h3>
            <p className="mt-2 text-xs">La variable d'environnement <code className="font-mono bg-destructive/20 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> est manquante.</p>
          </div>
          <div className="mt-4 opacity-50">{children}</div>
        </div>
      );
  }

  return <>{children}</>;
}
