"use client";

import * as React from "react";
import Link from "next/link";
import { Car, CheckCircle, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { doc, collection, query, orderBy } from "firebase/firestore";
import type { UserProfile, UserProfilePrivate, Vehicle } from "@/types/db";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

interface Criterion {
  key: string;
  met: boolean;
  label: string;
}

function buildCriteria(
  role: string | undefined,
  priv: UserProfilePrivate | undefined | null,
): Criterion[] {
  const isTransporteur = role === "transporteur";

  const criteria: Criterion[] = [
    {
      key: "phone",
      met: !!priv?.phoneNumber,
      label: "Ajoute ton numéro de téléphone",
    },
  ];

  if (isTransporteur) {
    criteria.push({
      key: "license",
      met: !!priv?.driverLicense,
      label: "Renseigne ton numéro de permis de conduire",
    });
  }

  criteria.push({
    key: "protocol",
    met: !!priv?.protocolSignedAt,
    label: "Signe le protocole d'accord",
  });

  return criteria;
}

interface ProfileSidebarProps {
  userId: string;
  userData: UserProfile;
  photoURL?: string | null;
}

export function ProfileSidebar({
  userId,
  userData,
  photoURL,
}: ProfileSidebarProps) {
  const firestore = useFirestore();
  const isTransporteur = userData.role === "transporteur";
  const verifiedLabel = isTransporteur
    ? "Conducteur vérifié"
    : "Profil vérifié";

  const privateRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "users", userId, "private", "profile");
  }, [firestore, userId]);
  const { data: privateProfile, isLoading: privateLoading } =
    useDoc<UserProfilePrivate>(privateRef);

  const vehiclesRef = useMemoFirebase(() => {
    if (!firestore || !isTransporteur) return null;
    return query(
      collection(firestore, "users", userId, "vehicles"),
      orderBy("createdAt", "asc"),
    );
  }, [firestore, userId, isTransporteur]);
  const { data: vehicles } = useCollection<Vehicle>(vehiclesRef);
  const firstVehicle = vehicles?.[0] ?? null;

  const criteria = buildCriteria(userData.role, privateProfile);
  const metCount = criteria.filter((c) => c.met).length;
  const completeness = Math.round((metCount / criteria.length) * 100);
  // Source canonique : champ public users/{uid}.isVerified, écrit une seule fois
  // lors de la signature du protocole et jamais remis à false.
  const isVerified = !!userData.isVerified;
  const missing = criteria.filter((c) => !c.met);

  const avatarSrc = userData.profilePictureUrl || photoURL || undefined;
  const rating = userData.averageRating;
  const ratingCount = userData.totalRatings ?? 0;

  const CompletenessBar = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="w-full cursor-help"
            role="group"
            aria-label="Avancement du profil"
          >
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                Profil complété
                <Info className="h-3 w-3" aria-hidden="true" />
              </span>
              <span>{completeness} %</span>
            </div>
            <Progress
              value={completeness}
              aria-label={`Profil complété à ${completeness} %`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px]">
          {missing.length === 0 ? (
            <p className="text-xs">Profil complet !</p>
          ) : (
            <ul className="text-xs space-y-1">
              {missing.map((c) => (
                <li key={c.key}>· {c.label}</li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* ── MOBILE : bannière horizontale (masquée lg+) ── */}
      <div className="lg:hidden flex items-center gap-3 p-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={avatarSrc} alt={userData.name} />
          <AvatarFallback className="text-lg font-bold">
            {getInitials(userData.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-tight truncate">{userData.name}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {userData.role ?? "Voyageur"}
          </p>
          {isTransporteur && firstVehicle && (
            <p className="text-xs text-muted-foreground truncate">
              {firstVehicle.make} {firstVehicle.model}
            </p>
          )}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {ratingCount > 0 && (
              <span className="text-sm">
                <span className="text-yellow-400">★</span>
                <span className="font-semibold ml-0.5">
                  {rating?.toFixed(1)}
                </span>
              </span>
            )}
            {isVerified && (
              <span className="inline-flex items-center gap-0.5 text-xs text-green-400">
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
                {verifiedLabel}
              </span>
            )}
          </div>
        </div>
        <Link
          href="/profile"
          className="text-sm font-medium text-primary shrink-0 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring rounded"
        >
          Modifier
        </Link>
      </div>
      {/* Barre complétion mobile */}
      <div className="lg:hidden px-4 pb-3">
        {privateLoading ? <Skeleton className="h-5 w-full" /> : CompletenessBar}
      </div>

      {/* ── DESKTOP : carte verticale (masquée < lg) ── */}
      <div className="hidden lg:flex flex-col items-center gap-0 p-6 text-center">
        <Avatar className="h-24 w-24 mb-3">
          <AvatarImage src={avatarSrc} alt={userData.name} />
          <AvatarFallback className="text-3xl font-bold">
            {getInitials(userData.name)}
          </AvatarFallback>
        </Avatar>
        <p className="font-bold text-xl leading-tight">{userData.name}</p>
        <p className="text-sm text-muted-foreground capitalize mb-2">
          {userData.role ?? "Voyageur"}
        </p>
        {ratingCount > 0 && (
          <div className="flex items-center justify-center gap-1 text-sm mb-2">
            <span className="text-yellow-400 text-base" aria-hidden="true">
              ★
            </span>
            <span className="font-semibold">{rating?.toFixed(1)}</span>
            <span className="text-muted-foreground text-xs">
              ({ratingCount} avis)
            </span>
          </div>
        )}
        {isVerified && (
          <Badge className="gap-1 mb-3 bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/15">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            {verifiedLabel}
          </Badge>
        )}

        {/* Véhicule du transporteur */}
        {isTransporteur && firstVehicle && (
          <div className="w-full rounded-lg border bg-muted/40 px-3 py-2.5 mb-3 text-left">
            <div className="flex items-center gap-2">
              <Car
                className="h-4 w-4 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">
                  {firstVehicle.make} {firstVehicle.model} {firstVehicle.year}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {firstVehicle.color} · {firstVehicle.licensePlate}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="w-full mb-4">
          {privateLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            CompletenessBar
          )}
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/profile">Modifier le profil</Link>
        </Button>
      </div>
    </div>
  );
}
