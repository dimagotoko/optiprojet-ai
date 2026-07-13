import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PwaRegister } from "@/components/PwaRegister";
import React, { Suspense } from "react";
import { LoadingLogo } from "@/components/LoadingLogo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "OptiTrajet AI — Covoiturage québécois intelligent",
    template: "%s | OptiTrajet AI",
  },
  description:
    "Trouvez votre covoiturage idéal au Québec, optimisé par l'IA pour des trajets plus intelligents, économiques et conviviaux.",
  keywords: [
    "covoiturage",
    "québec",
    "trajet partagé",
    "transport",
    "IA",
    "covoiturage québec",
  ],
  openGraph: {
    type: "website",
    locale: "fr_CA",
    siteName: "OptiTrajet AI",
    title: "OptiTrajet AI — Covoiturage québécois intelligent",
    description:
      "Trouvez votre covoiturage idéal au Québec, optimisé par l'IA.",
  },
  twitter: {
    card: "summary_large_image",
    title: "OptiTrajet AI",
    description: "Covoiturage québécois optimisé par l'IA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head />
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GoogleMapsProvider>
            <FirebaseClientProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
                        <LoadingLogo className="h-12 w-12 text-primary" />
                      </div>
                    }
                  >
                    {children}
                  </Suspense>
                </main>
                <Footer />
              </div>
              <Toaster />
              <PwaRegister />
            </FirebaseClientProvider>
          </GoogleMapsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
