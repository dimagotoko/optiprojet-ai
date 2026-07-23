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
  metadataBase: new URL("https://kamgo.ca"),
  title: {
    default: "KamGo — Covoiturage intelligent",
    template: "%s | KamGo",
  },
  description:
    "Trouvez votre covoiturage idéal partout au Canada, optimisé par l'IA pour des trajets plus intelligents, économiques et conviviaux.",
  keywords: [
    "covoiturage",
    "canada",
    "trajet partagé",
    "transport",
    "IA",
    "covoiturage canada",
  ],
  openGraph: {
    type: "website",
    locale: "fr_CA",
    siteName: "KamGo",
    title: "KamGo — Covoiturage intelligent",
    description:
      "Trouvez votre covoiturage idéal partout au Canada, optimisé par l'IA.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KamGo",
    description: "Covoiturage intelligent optimisé par l'IA",
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
