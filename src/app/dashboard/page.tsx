"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useAuth,
} from "@/firebase";
import { doc } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
import { Plus, UserPlus, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Chatbot } from "@/components/Chatbot";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ProfileSidebar } from "@/components/dashboard/shared/ProfileSidebar";
import {
  VoyageurDashboard,
  VoyageurDashboardHeader,
} from "@/components/dashboard/voyageur/VoyageurDashboard";
import {
  TransporteurDashboard,
  TransporteurDashboardHeader,
} from "@/components/dashboard/transporteur/TransporteurDashboard";
import type { UserProfile } from "@/types/db";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [greeting, setGreeting] = React.useState("Bonjour");
  const [emailVerifiedOverride, setEmailVerifiedOverride] =
    React.useState(false);
  const [bannerCooldown, setBannerCooldown] = React.useState(0);
  const [bannerResendError, setBannerResendError] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (bannerCooldown <= 0) return;
    const id = setTimeout(() => setBannerCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [bannerCooldown]);

  const handleBannerResend = async () => {
    if (!auth?.currentUser || bannerCooldown > 0) return;
    setBannerResendError(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setBannerCooldown(60);
    } catch {
      setBannerResendError("Impossible d'envoyer. Réessayez plus tard.");
    }
  };

  const handleRefreshVerification = async () => {
    if (!user) return;
    await user.reload();
    if (user.emailVerified) setEmailVerifiedOverride(true);
  };

  const showEmailBanner = user && !user.emailVerified && !emailVerifiedOverride;

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
      {/* Bannière douce — email non vérifié (grandfathering : incitation, pas blocage) */}
      {showEmailBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
          <div className="container flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <MailWarning className="h-4 w-4 shrink-0" />
              <span>
                Pensez à vérifier votre email pour accéder à toutes les
                fonctionnalités.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {bannerResendError && (
                <span className="text-xs text-destructive">
                  {bannerResendError}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                disabled={bannerCooldown > 0}
                onClick={handleBannerResend}
              >
                {bannerCooldown > 0
                  ? `Renvoyer dans ${bannerCooldown}s`
                  : "Renvoyer"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-amber-700 dark:text-amber-400"
                onClick={handleRefreshVerification}
              >
                J&apos;ai vérifié
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container py-8 px-4 md:px-6">
        {isTransporteur ? (
          /* ── Layout transporteur : en-tête pleine largeur + 2 colonnes ── */
          <div className="space-y-6">
            {/* 1. Accueil + bouton Publier — même rangée, pleine largeur */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {greeting}, {firstName} !
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
              </div>
              <Button asChild className="gap-2 shrink-0">
                <Link href="/post-trip">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Publier un départ
                </Link>
              </Button>
            </div>

            {/* 2. Stats — pleine largeur */}
            {userData && (
              <TransporteurDashboardHeader
                userId={user.uid}
                userData={userData}
              />
            )}

            {/* 3. Sidebar profil (gauche) + corps (droite) */}
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
                  <TransporteurDashboard
                    userId={user.uid}
                    userData={userData}
                  />
                )}
              </div>
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
