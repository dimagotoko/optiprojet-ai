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
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Car, DollarSign, TrendingUp, Star } from "lucide-react";
import { RatingDialog } from "@/components/rating/RatingDialog";
import { StatCard } from "../shared/StatCard";
import { DemandesEnAttente } from "./DemandesEnAttente";
import { TripPublieRow } from "./TripPublieRow";
import { ProchainVersement } from "./ProchainVersement";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Trip, UserProfile, Vehicle, Booking } from "@/types/db";

interface TransporteurDashboardProps {
  userId: string;
  userData: UserProfile;
}

function TravelerRatingButton({
  booking,
  tripId,
}: {
  booking: Booking;
  tripId: string;
}) {
  const firestore = useFirestore();
  const [ratingOpen, setRatingOpen] = React.useState(false);
  const [hasRated, setHasRated] = React.useState(false);

  const travelerRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "users", booking.travelerId);
  }, [firestore, booking.travelerId]);
  const { data: traveler } = useDoc<UserProfile>(travelerRef);

  if (hasRated) return null;

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-yellow-400/50 px-2 py-1 text-xs font-medium text-yellow-500 hover:bg-yellow-400/10 transition-colors"
        onClick={() => setRatingOpen(true)}
      >
        <Star className="h-3 w-3" aria-hidden="true" />
        Évaluer {traveler?.name ?? "le passager"}
      </button>
      <RatingDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        driverId={booking.travelerId}
        driverName={traveler?.name ?? "ce passager"}
        tripId={tripId}
        onRated={() => setHasRated(true)}
      />
    </>
  );
}

function PastTripRatingSection({
  tripId,
  driverId,
}: {
  tripId: string;
  driverId: string;
}) {
  const firestore = useFirestore();

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "trips", tripId, "bookings"),
      where("offeredBy", "==", driverId),
      where("status", "==", "accepted"),
    );
  }, [firestore, tripId, driverId]);

  const { data: bookings } = useCollection<Booking>(bookingsQuery);

  if (!bookings?.length) return null;

  return (
    <div className="rounded-b-xl border-x border-b bg-yellow-400/10 px-4 py-2 -mt-1 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-yellow-500">
        Passagers à évaluer :
      </span>
      {bookings.map((booking) => (
        <TravelerRatingButton
          key={booking.id}
          booking={booking}
          tripId={tripId}
        />
      ))}
    </div>
  );
}

/* ── En-tête pleine largeur : 4 stats ── */
export function TransporteurDashboardHeader({
  userId,
  userData,
}: TransporteurDashboardProps) {
  const firestore = useFirestore();

  const tripsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "trips"),
      where("offeredBy", "==", userId),
    );
  }, [firestore, userId]);

  const { data: allTrips, isLoading } = useCollection<Trip>(tripsQuery);

  const upcomingCount = React.useMemo(() => {
    if (!allTrips) return 0;
    const now = new Date();
    return allTrips.filter((t) => t.departureTime.toDate() >= now).length;
  }, [allTrips]);

  const totalBookings = (allTrips ?? []).reduce(
    (acc, t) => acc + (t.totalBookings ?? 0),
    0,
  );
  const totalCapacity = (allTrips ?? []).reduce(
    (acc, t) => acc + t.availableSeats + (t.totalBookings ?? 0),
    0,
  );
  const fillRate =
    totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
  const totalGains = (allTrips ?? []).reduce(
    (acc, t) => acc + t.pricePerSeat * (t.totalBookings ?? 0),
    0,
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={Car}
        label="Trajets offerts"
        value={isLoading ? "…" : (allTrips?.length ?? 0)}
        subtitle={`${upcomingCount} à venir`}
        iconClassName="text-primary"
        accentClassName="bg-primary/10"
      />
      <StatCard
        icon={DollarSign}
        label="Gains cumulés"
        value={isLoading ? "…" : `${totalGains.toLocaleString("fr-CA")} $`}
        subtitle="basé sur les places réservées"
        iconClassName="text-green-400"
        accentClassName="bg-green-400/10"
      />
      <StatCard
        icon={TrendingUp}
        label="Taux de remplissage"
        value={isLoading ? "…" : `${fillRate} %`}
        subtitle={`${totalBookings} passagers au total`}
        iconClassName="text-violet-400"
        accentClassName="bg-violet-400/10"
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
  );
}

/* ── Corps : demandes en attente + trajets publiés + prochain versement ── */
export function TransporteurDashboard({
  userId,
  userData: _userData,
}: TransporteurDashboardProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [tripToDelete, setTripToDelete] = React.useState<string | null>(null);

  const tripsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "trips"),
      where("offeredBy", "==", userId),
    );
  }, [firestore, userId]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "users", userId, "vehicles");
  }, [firestore, userId]);

  const { data: allTrips, isLoading } = useCollection<Trip>(tripsQuery);
  const { data: vehicles } = useCollection<Vehicle>(vehiclesQuery);

  const vehicleMap = React.useMemo(() => {
    if (!vehicles) return {};
    return Object.fromEntries(vehicles.map((v) => [v.id, v]));
  }, [vehicles]);

  const { upcomingTrips, pastTrips } = React.useMemo(() => {
    if (!allTrips) return { upcomingTrips: [], pastTrips: [] };
    const now = new Date();
    const upcoming = allTrips
      .filter((t) => t.departureTime.toDate() >= now)
      .sort((a, b) => a.departureTime.toMillis() - b.departureTime.toMillis());
    const past = allTrips
      .filter((t) => t.departureTime.toDate() < now)
      .sort((a, b) => b.departureTime.toMillis() - a.departureTime.toMillis());
    return { upcomingTrips: upcoming, pastTrips: past };
  }, [allTrips]);

  const ratingsCount = React.useMemo(
    () => pastTrips.filter((t) => (t.totalBookings ?? 0) > 0).length,
    [pastTrips],
  );

  const handleEditClick = (tripId: string) =>
    router.push(`/edit-trip/${tripId}`);

  const handleRepublier = (tripId: string) =>
    router.push(`/post-trip?republier=${tripId}`);

  const handleToggleCloseTrip = async (
    tripId: string,
    currentState: boolean,
  ) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "trips", tripId), {
        isClosed: !currentState,
      });
      toast({
        title: "Mise à jour réussie",
        description: `Réservations ${!currentState ? "fermées" : "rouvertes"}.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, "trips", tripToDelete));
      toast({
        title: "Trajet annulé",
        description: "Votre trajet a été supprimé.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'annuler le trajet.",
      });
    } finally {
      setTripToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Demandes en attente */}
        <DemandesEnAttente userId={userId} trips={upcomingTrips} />

        {/* Vos trajets publiés */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Vos trajets publiés</h2>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <Tabs defaultValue="upcoming">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">À venir</TabsTrigger>
                <TabsTrigger value="history">
                  Historique
                  {ratingsCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold h-4 min-w-4 px-1">
                      {ratingsCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-3 space-y-3">
                {upcomingTrips.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground text-sm mb-3">
                        Aucun trajet programmé.
                      </p>
                      <Button asChild size="sm">
                        <Link href="/post-trip">Proposer un trajet</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingTrips.map((trip) => (
                    <TripPublieRow
                      key={trip.id}
                      trip={trip}
                      vehicle={vehicleMap[trip.vehicleId]}
                      onEditClick={handleEditClick}
                      onDeleteClick={setTripToDelete}
                      onToggleCloseTrip={handleToggleCloseTrip}
                      onRepublierClick={handleRepublier}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-3 space-y-3">
                {pastTrips.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground text-sm">
                        Aucun trajet passé.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  pastTrips.map((trip) => (
                    <div key={trip.id}>
                      <TripPublieRow
                        trip={trip}
                        vehicle={vehicleMap[trip.vehicleId]}
                        onEditClick={handleEditClick}
                        onDeleteClick={setTripToDelete}
                        onToggleCloseTrip={handleToggleCloseTrip}
                        onRepublierClick={handleRepublier}
                        isPast
                      />
                      {(trip.totalBookings ?? 0) > 0 && (
                        <PastTripRatingSection
                          tripId={trip.id}
                          driverId={userId}
                        />
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Prochain versement */}
        {!isLoading && <ProchainVersement upcomingTrips={upcomingTrips} />}
      </div>

      <AlertDialog
        open={!!tripToDelete}
        onOpenChange={(open) => !open && setTripToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce trajet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Voulez-vous vraiment annuler ce
              trajet ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Oui, annuler le trajet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
