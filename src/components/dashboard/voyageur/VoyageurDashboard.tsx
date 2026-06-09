"use client";

import * as React from "react";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from "@/firebase";
import { collectionGroup, query, where, doc } from "firebase/firestore";
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
import type { Booking, Trip, UserProfile, Vehicle } from "@/types/db";

const CO2_PER_TRIP_KG = 18;

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

function BookedTripItem({ booking }: { booking: Booking }) {
  const firestore = useFirestore();
  const [ratingOpen, setRatingOpen] = React.useState(false);

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
              {canRate && (
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
        />
      )}
    </>
  );
}

// Phase 2 : charger depuis userData.favoriteRoutes
const PLACEHOLDER_FAVORITES = [
  { id: "1", label: "Montréal → Sherbrooke" },
  { id: "2", label: "Drummondville → Québec" },
];

interface VoyageurDashboardProps {
  userId: string;
  userData: UserProfile;
}

export function VoyageurDashboard({
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

  const activeBookings =
    bookings?.filter(
      (b) => b.status === "pending" || b.status === "accepted",
    ) ?? [];
  const pastBookings =
    bookings?.filter(
      (b) => b.status === "rejected" || b.status === "cancelled",
    ) ?? [];

  return (
    <div className="space-y-6">
      {/* Stats — 4 cartes, 2 col mobile / 4 col desktop */}
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
          value="—"
          subtitle="Phase 2"
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

      {/* Recherche rapide */}
      <QuickSearchBar />

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
            <TabsTrigger value="history">Historique des trajets</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4 space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : activeBookings.length === 0 ? (
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
              activeBookings.map((b) => (
                <BookedTripItem key={b.id} booking={b} />
              ))
            )}
          </TabsContent>
          <TabsContent value="history" className="mt-4 space-y-2">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : pastBookings.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    Aucun trajet passé.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pastBookings.map((b) => <BookedTripItem key={b.id} booking={b} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Itinéraires favoris — Phase 2 : charger userData.favoriteRoutes */}
      <div>
        <h2 className="text-lg font-bold mb-3">Vos itinéraires favoris</h2>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDER_FAVORITES.map((fav) => (
            <button
              key={fav.id}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-sm font-medium hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Star
                className="h-3.5 w-3.5 text-yellow-400"
                aria-hidden="true"
              />
              {fav.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
