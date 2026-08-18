"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900">
                Une erreur est survenue
              </h1>
              <p className="mt-2 text-slate-600">
                Quelque chose s&apos;est mal passé. Veuillez réessayer.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => reset()}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
              >
                Réessayer
              </button>
              <a
                href="/"
                className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
              >
                Retour à l&apos;accueil
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
