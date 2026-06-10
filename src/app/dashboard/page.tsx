"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Chatbot } from "@/components/Chatbot";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ProfileSidebar } from "@/components/dashboard/shared/ProfileSidebar";
import {
  VoyageurDashboard,
  VoyageurDashboardHeader,
} from "@/components/dashboard/voyageur/VoyageurDashboard";
import { TransporteurDashboard } from "@/components/dashboard/transporteur/TransporteurDashboard";
import type { UserProfile } from "@/types/db";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [greeting, setGreeting] = React.useState("Bonjour");

  React.useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Bonjour");
    else if (h < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
  }, []);

  React.useEffect(() => {
    if (!isUserLoading && !user) router.push("/login");
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDocLoading } =
    useDoc<UserProfile>(userDocRef);

  const isLoading = isUserLoading || (!!user && isUserDocLoading);

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return null;

  if (userData?.onboardingCompleted === false) {
    router.push("/onboarding");
    return null;
  }

  if (!userData && !isUserDocLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Profil non trouvé</h2>
        <p className="text-muted-foreground max-w-md mt-2">
          Nous n'avons pas pu charger votre profil. Veuillez compléter vos
          informations pour continuer.
        </p>
        <Button asChild className="mt-6">
          <Link href="/profile">Compléter mon profil</Link>
        </Button>
      </div>
    );
  }

  const isTransporteur = userData?.role === "transporteur";
  const firstName =
    userData?.name?.split(" ")[0] || user.displayName?.split(" ")[0] || "";
  const subtitle = isTransporteur
    ? "Gérez vos départs et vos réservations."
    : "Voici un aperçu de vos trajets et suggestions.";

  return (
    <>
      <div className="container py-8 px-4 md:px-6">
        {isTransporteur ? (
          /* ── Layout transporteur : sidebar + colonne contenu ── */
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start min-w-0">
            <aside className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-20">
              {userData && (
                <ProfileSidebar
                  userId={user.uid}
                  userData={userData}
                  photoURL={user.photoURL}
                />
              )}
            </aside>
            <div className="flex-1 min-w-0 space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {greeting}, {firstName} !
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
              </div>
              {userData && (
                <TransporteurDashboard userId={user.uid} userData={userData} />
              )}
            </div>
          </div>
        ) : (
          /* ── Layout voyageur : en-tête pleine largeur + 2 colonnes ── */
          <div className="space-y-6">
            {/* 1. Accueil — pleine largeur */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {greeting}, {firstName} !
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
            </div>

            {/* 2. Stats + recherche — pleine largeur */}
            {userData && (
              <VoyageurDashboardHeader userId={user.uid} userData={userData} />
            )}

            {/* 3. Sidebar profil (gauche) + contenu (droite) */}
            <div className="flex flex-col lg:flex-row gap-6 lg:items-start min-w-0">
              <aside className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-20">
                {userData && (
                  <ProfileSidebar
                    userId={user.uid}
                    userData={userData}
                    photoURL={user.photoURL}
                  />
                )}
              </aside>
              <div className="flex-1 min-w-0">
                {userData && (
                  <VoyageurDashboard userId={user.uid} userData={userData} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Chatbot
        onSearch={(s) =>
          router.push(
            `/trips?departure=${s.departure}&destination=${s.destination}&date=${s.date}`,
          )
        }
      />
    </>
  );
}
