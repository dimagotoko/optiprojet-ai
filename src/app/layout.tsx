import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import React, { Suspense } from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';

export const metadata: Metadata = {
  title: 'OptiTrajet AI',
  description: "Trouvez votre covoiturage idéal, optimisé par l'IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <GoogleMapsProvider>
          <FirebaseClientProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                 <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
                        <LoadingLogo className="h-12 w-12 text-primary" />
                    </div>
                }>
                    {children}
                </Suspense>
              </main>
              <Footer />
            </div>
            <Toaster />
          </FirebaseClientProvider>
        </GoogleMapsProvider>
      </body>
    </html>
  );
}
