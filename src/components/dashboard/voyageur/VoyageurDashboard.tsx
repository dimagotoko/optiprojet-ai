"use client";

import * as React from "react";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from "@/firebase";
import {
  collection,
  collectionGroup,
  query,
  where,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Car,
  DollarSign,
  Leaf,
  Star,
  MapPin,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import { StatCard } from "../shared/StatCard";
import { QuickSearchBar } from "./QuickSearchBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RatingDialog } from "@/components/rating/RatingDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type {
  Booking,
  FavoriteRoute,
  Trip,
  UserProfile,
  Vehicle,
} from "@/types/db";

const CO2_PER_TRIP_KG = 18;
// Coût moyen de conduite au Canada (~taux ARC 2026 : carburant, entretien,
// assurance, dépréciation). Sert au calcul "Argent économisé vs voiture solo".
const COUT_PAR_KM = 0.7;

const statusConfig = {
  pending: {
    label: "En attente",
    icon: Clock,
    className:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200",
  },
  accepted: {
    label: "Acceptée",
    icon: CheckCircle,
    className:
      "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200",
  },
  rejected: {
    label: "Refusée",
    icon: XCircle,
    className:
      "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-200",
  },
  cancelled: {
    label: "Annulée",
    icon: XCircle,
    className: "bg-muted text-muted-foreground border-muted",
  },
};

function BookedTripItem({
  booking,
  showWhenPast,
}: {
  booking: Booking;
  showWhenPast: boolean;
}) {
  const firestore = useFirestore();
  const [ratingOpen, setRatingOpen] = React.useState(false);
  const [hasRated, setHasRated] = React.useState(false);

  const tripRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "trips", booking.tripId);
  }, [firestore, booking.tripId]);
  const { data: trip, isLoading } = useDoc<Trip>(tripRef);

  const driverRef = useMemoFirebase(() => {
    if (!firestore || !trip?.offeredBy) return null;
    return doc(firestore, "users", trip.offeredBy);
  }, [firestore, trip?.offeredBy]);
  const { data: driver } = useDoc<UserProfile>(driverRef);

  const vehicleRef = useMemoFirebase(() => {
    if (
      !firestore ||
      !trip?.offeredBy ||
      !trip?.vehicleId ||
      booking.status !== "accepted"
    )
      return null;
    return doc(firestore, "users", trip.offeredBy, "vehicles", trip.vehicleId);
  }, [firestore, trip?.offeredBy, trip?.vehicleId, booking.status]);
  const { data: vehicle } = useDoc<Vehicle>(vehicleRef);

  const cfg = statusConfig[booking.status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;

  if (isLoading) return <Skeleton className="h-20 w-full rounded-lg" />;
  if (!trip) return null;

  const date = trip.departureTime.toDate();
  const isPast = date < new Date();
  // Renvoie null si ce booking n'appartient pas à l'onglet demandé.
  // Gère les anciens bookings sans departureTime dénormalisé.
  if (isPast !== showWhenPast) return null;
  const canRate = booking.status === "accepted" && isPast && trip.offeredBy;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold flex items-center gap-1 min-w-0">
                  <span className="truncate min-w-0 flex-1">{trip.origin}</span>
                  <ArrowRight
                    className="h-3 w-3 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate min-w-0 flex-1">
                    {trip.destination}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(date, "d MMM yyyy · HH:mm", { locale: fr })} ·{" "}
                  {trip.pricePerSeat} $
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  cfg.className,
                )}
              >
                <StatusIcon className="h-3 w-3" aria-hidden="true" />
                {cfg.label}
              </Badge>
              {canRate && !hasRated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                  onClick={() => setRatingOpen(true)}
                >
                  <Star className="h-3.5 w-3.5" aria-hidden="true" /> Évaluer
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/trip-details/${trip.id}`}>Voir</Link>
              </Button>
            </div>
          </div>

          {/* Infos conducteur + véhicule + contact — visibles si réservation acceptée */}
          {booking.status === "accepted" && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 space-y-2">
              {/* Badge vérifié */}
              {driver?.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  Chauffeur vérifié
                </span>
              )}
              {/* Véhicule */}
              {vehicle && (
                <div className="flex items-center gap-3">
                  {vehicle.imageUrl ? (
                    <div className="relative h-10 w-16 rounded overflow-hidden shrink-0 border">
                      <Image
                        src={vehicle.imageUrl}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-10 w-10 rounded bg-background border shrink-0">
                      <Car
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {vehicle.make} {vehicle.model} {vehicle.year}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-border shrink-0"
                        style={{ backgroundColor: vehicle.color.toLowerCase() }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {vehicle.color}
                      </span>
                      {vehicle.province && (
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                          <span className="font-bold text-primary">
                            {vehicle.province}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="font-mono font-semibold tracking-widest">
                            {vehicle.licensePlate}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Contact conducteur */}
              {(booking.driverPhone || booking.driverEmail) && (
                <div className="border-t pt-2 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Contacter le conducteur
                  </p>
                  {booking.driverPhone && (
                    <a
                      href={`tel:${booking.driverPhone}`}
                      className="flex items-center gap-2 text-xs text-foreground hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      {booking.driverPhone}
                    </a>
                  )}
                  {booking.driverEmail && (
                    <a
                      href={`mailto:${booking.driverEmail}`}
                      className="flex items-center gap-2 text-xs text-foreground hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                      {booking.driverEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {canRate && driver && (
        <RatingDialog
          open={ratingOpen}
          onOpenChange={setRatingOpen}
          driverId={trip.offeredBy}
          driverName={driver.name}
          tripId={booking.tripId}
          onRated={() => setHasRated(true)}
        />
      )}
    </>
  );
}

interface VoyageurDashboardProps {
  userId: string;
  userData: UserProfile;
}

/* ── En-tête pleine largeur : stats + barre de recherche ── */
export function VoyageurDashboardHeader({
  userId,
  userData,
}: VoyageurDashboardProps) {
  const firestore = useFirestore();

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collectionGroup(firestore, "bookings"),
      where("travelerId", "==", userId),
    );
  }, [firestore, userId]);

  const { data: bookings, isLoading } = useCollection<Booking>(bookingsQuery);

  const acceptedCount =
    bookings?.filter((b) => b.status === "accepted").length ?? 0;
  const co2Saved = acceptedCount * CO2_PER_TRIP_KG;
  const moneySaved = (bookings ?? [])
    .filter(
      (b) =>
        b.status === "accepted" &&
        b.pricePerSeat != null &&
        b.distanceKm != null,
    )
    .reduce(
      (acc, b) =>
        acc +
        Math.max(
          0,
          b.distanceKm! * COUT_PAR_KM - b.pricePerSeat! * (b.seatsBooked ?? 1),
        ),
      0,
    );

  const favoritesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "users", userId, "favorites");
  }, [firestore, userId]);

  const { data: favorites, isLoading: favLoading } =
    useCollection<FavoriteRoute>(favoritesRef);

  const [prefill, setPrefill] = React.useState<{
    departure: string;
    destination: string;
  } | null>(null);

  const handleSaveFavorite = async (fav: {
    origin: string;
    destination: string;
    originCoords?: { lat: number; lng: number };
    destinationCoords?: { lat: number; lng: number };
  }) => {
    if (!firestore) return;
    await addDoc(collection(firestore, "users", userId, "favorites"), {
      ...fav,
      createdAt: serverTimestamp(),
    });
  };

  const handleDeleteFavorite = async (favId: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "users", userId, "favorites", favId));
  };

  const handleFavoriteClick = (fav: FavoriteRoute) => {
    setPrefill({ departure: fav.origin, destination: fav.destination });
  };

  return (
    <div className="space-y-4">
      {/* Stats — 2 col mobile / 4 col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Car}
          label="Trajets effectués"
          value={isLoading ? "…" : acceptedCount}
          subtitle={`${bookings?.length ?? 0} au total`}
          iconClassName="text-primary"
          accentClassName="bg-primary/10"
        />
        <StatCard
          icon={DollarSign}
          label="Argent économisé"
          value={
            isLoading
              ? "…"
              : moneySaved > 0
                ? `${moneySaved.toFixed(0)} $`
                : "—"
          }
          subtitle={
            isLoading || moneySaved === 0
              ? "Aucune réservation confirmée"
              : "vs. voiture solo"
          }
          iconClassName="text-green-400"
          accentClassName="bg-green-400/10"
        />
        <StatCard
          icon={Leaf}
          label="CO₂ évité"
          value={isLoading ? "…" : `${co2Saved} kg`}
          subtitle="vs. voiture solo"
          iconClassName="text-emerald-400"
          accentClassName="bg-emerald-400/10"
        />
        <StatCard
          icon={Star}
          label="Note moyenne"
          value={
            userData.averageRating ? userData.averageRating.toFixed(1) : "N/A"
          }
          subtitle={
            userData.totalRatings
              ? `${userData.totalRatings} avis`
              : "Pas encore noté"
          }
          iconClassName="text-yellow-400"
          accentClassName="bg-yellow-400/10"
        />
      </div>

      {/* Recherche rapide + bouton Enregistrer */}
      <QuickSearchBar
        initialDeparture={prefill?.departure}
        initialDestination={prefill?.destination}
        onSaveFavorite={handleSaveFavorite}
      />

      {/* Itinéraires favoris */}
      <div>
        {favLoading && (
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        )}
        {!favLoading && favorites && favorites.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Vos itinéraires favoris
            </p>
            <div className="flex flex-wrap gap-2">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="inline-flex items-center max-w-[260px] pl-3 pr-1 py-1.5 rounded-full border bg-card text-sm font-medium"
                >
                  <button
                    type="button"
                    onClick={() => handleFavoriteClick(fav)}
                    className="flex items-center gap-0.5 min-w-0 hover:text-primary transition-colors"
                    aria-label={`Pré-remplir ${fav.origin} → ${fav.destination}`}
                  >
                    <span className="truncate">{fav.origin}</span>
                    <ArrowRight
                      className="h-3 w-3 shrink-0 mx-0.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{fav.destination}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFavorite(fav.id)}
                    className="shrink-0 ml-1 rounded-full p-0.5 hover:bg-muted transition-colors"
                    aria-label={`Supprimer le favori ${fav.origin} → ${fav.destination}`}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {!favLoading && favorites?.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Aucun itinéraire favori — enregistrez un trajet via la recherche
            ci-dessus.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Corps : suggestions IA + onglets trajets + favoris ── */
export function VoyageurDashboard({
  userId,
  userData: _userData,
}: VoyageurDashboardProps) {
  const firestore = useFirestore();

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collectionGroup(firestore, "bookings"),
      where("travelerId", "==", userId),
    );
  }, [firestore, userId]);

  const { data: bookings, isLoading } = useCollection<Booking>(bookingsQuery);

  const pendingRatingsCount = React.useMemo(() => {
    const now = new Date();
    return (bookings ?? []).filter(
      (b) =>
        b.status === "accepted" &&
        b.departureTime != null &&
        b.departureTime.toDate() < now,
    ).length;
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Suggestions IA + Tabs trajets */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Suggérés pour vous</h2>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            PAR L'IA
          </span>
        </div>
        {/* Phase 2 : résultats Genkit trip-planner-flow */}
        <div className="rounded-xl border border-dashed bg-card/50 p-6 flex flex-col items-center gap-2 text-center">
          <Sparkles className="h-7 w-7 text-primary/40" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground/70">
            Suggestions personnalisées par l'IA
          </p>
          <p className="text-xs text-muted-foreground">
            Disponibles dans une prochaine version
          </p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Trajets à venir</TabsTrigger>
            <TabsTrigger value="history">
              Historique des trajets
              {pendingRatingsCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold h-4 min-w-4 px-1">
                  {pendingRatingsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4 space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : !bookings?.length ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4 text-sm">
                    Aucun trajet à venir.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/trips">Trouver un trajet</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              bookings.map((b) => (
                <BookedTripItem key={b.id} booking={b} showWhenPast={false} />
              ))
            )}
          </TabsContent>
          <TabsContent value="history" className="mt-4 space-y-2">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : !bookings?.length ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    Aucun trajet passé.
                  </p>
                </CardContent>
              </Card>
            ) : (
              bookings.map((b) => (
                <BookedTripItem key={b.id} booking={b} showWhenPast={true} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
