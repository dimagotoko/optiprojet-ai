import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import { Suspense } from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';

export const metadata: Metadata = {
  title: 'OptiTrajet AI',
  description: "Trouvez votre covoiturage idéal, optimisé par l'IA",
};

function RootLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <LoadingLogo className="h-16 w-16 text-primary" />
    </div>
  )
}

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
        <Suspense fallback={<RootLoading />}>
          <GoogleMapsProvider>
            <FirebaseClientProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Toaster />
            </FirebaseClientProvider>
          </GoogleMapsProvider>
        </Suspense>
      </body>
    </html>
  );
}
