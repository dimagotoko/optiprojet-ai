"use client";

import * as React from "react";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
  increment,
} from "firebase/firestore";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import {
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
} from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type {
  Booking,
  Trip,
  UserProfile,
  UserProfilePrivate,
} from "@/types/db";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ─── DemandeCard ──────────────────────────────────────────────────────────────

function DemandeCard({
  booking,
  trip,
  driverId,
}: {
  booking: Booking;
  trip: Trip;
  driverId: string;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState<"accept" | "refuse" | null>(
    null,
  );

  const travelerRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "users", booking.travelerId);
  }, [firestore, booking.travelerId]);
  const { data: traveler, isLoading: travelerLoading } =
    useDoc<UserProfile>(travelerRef);

  // Profil privé du conducteur pour dénormaliser le contact lors de l'acceptation
  const driverPrivateRef = useMemoFirebase(() => {
    if (!firestore || !driverId) return null;
    return doc(firestore, "users", driverId, "private", "profile");
  }, [firestore, driverId]);
  const { data: driverPrivate } = useDoc<UserProfilePrivate>(driverPrivateRef);

  const handleAccept = async () => {
    if (!firestore || loading) return;
    setLoading("accept");
    try {
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, "trips", trip.id, "bookings", booking.id), {
        status: "accepted",
        ...(driverPrivate
          ? {
              driverEmail: driverPrivate.email,
              driverPhone: driverPrivate.phoneNumber,
            }
          : {}),
      });
      batch.update(doc(firestore, "trips", trip.id), {
        availableSeats: increment(-1),
        totalBookings: increment(1),
      });
      await batch.commit();
      toast({
        title: "Demande acceptée",
        description: `${traveler?.name ?? "Voyageur"} a été confirmé(e).`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'accepter la demande.",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRefuse = async () => {
    if (!firestore || loading) return;
    setLoading("refuse");
    try {
      await updateDoc(
        doc(firestore, "trips", trip.id, "bookings", booking.id),
        {
          status: "rejected",
        },
      );
      toast({ title: "Demande refusée" });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de refuser la demande.",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage
            src={traveler?.profilePictureUrl}
            alt={traveler?.name ?? ""}
          />
          <AvatarFallback>
            {travelerLoading
              ? "?"
              : traveler?.name
                ? getInitials(traveler.name)
                : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {travelerLoading ? (
            <Skeleton className="h-4 w-32 mb-1" />
          ) : (
            <p className="font-semibold text-sm leading-tight">
              {traveler?.name ?? "Voyageur"} — demande 1 place
            </p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 min-w-0">
            <span className="truncate min-w-0 flex-1">{trip.origin}</span>
            <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate min-w-0 flex-1">{trip.destination}</span>
            {traveler?.averageRating && (
              <>
                <span className="mx-0.5">·</span>
                <span className="text-yellow-400" aria-hidden="true">
                  ★
                </span>
                <span>{traveler.averageRating.toFixed(1)}</span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          className="gap-1"
          onClick={handleAccept}
          disabled={!!loading}
          aria-label={`Accepter la demande de ${traveler?.name ?? "ce voyageur"}`}
        >
          {loading === "accept" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Accepter
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefuse}
          disabled={!!loading}
          aria-label={`Refuser la demande de ${traveler?.name ?? "ce voyageur"}`}
        >
          {loading === "refuse" && (
            <Loader2
              className="h-3.5 w-3.5 animate-spin mr-1"
              aria-hidden="true"
            />
          )}
          Refuser
        </Button>
      </div>
    </div>
  );
}

// ─── TripPendingBookings ───────────────────────────────────────────────────────

interface TripPendingProps {
  trip: Trip;
  userId: string;
  onCountChange: (tripId: string, count: number) => void;
}

function TripPendingBookings({
  trip,
  userId,
  onCountChange,
}: TripPendingProps) {
  const firestore = useFirestore();

  const pendingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "trips", trip.id, "bookings"),
      where("offeredBy", "==", userId),
      where("status", "==", "pending"),
    );
  }, [firestore, trip.id, userId]);

  const { data: pending, isLoading } = useCollection<Booking>(pendingQuery);

  React.useEffect(() => {
    if (!isLoading) {
      onCountChange(trip.id, pending?.length ?? 0);
    }
  }, [isLoading, pending?.length, trip.id, onCountChange]);

  if (isLoading || !pending?.length) return null;

  return (
    <>
      {pending.map((booking) => (
        <DemandeCard
          key={booking.id}
          booking={booking}
          trip={trip}
          driverId={userId}
        />
      ))}
    </>
  );
}

// ─── DemandesEnAttente ─────────────────────────────────────────────────────────

interface DemandesEnAttenteProps {
  userId: string;
  trips: Trip[];
}

export function DemandesEnAttente({ userId, trips }: DemandesEnAttenteProps) {
  const [counts, setCounts] = React.useState<Record<string, number>>({});

  const handleCountChange = React.useCallback(
    (tripId: string, count: number) => {
      setCounts((prev) => {
        if (prev[tripId] === count) return prev;
        return { ...prev, [tripId]: count };
      });
    },
    [],
  );

  const totalPending = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const allLoaded = trips.length > 0 && trips.every((t) => t.id in counts);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Demandes en attente</h2>
        {totalPending > 0 && (
          <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/15">
            {totalPending} nouvelle{totalPending > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {trips.map((trip) => (
          <TripPendingBookings
            key={trip.id}
            trip={trip}
            userId={userId}
            onCountChange={handleCountChange}
          />
        ))}
        {allLoaded && totalPending === 0 && (
          <p className="text-sm text-muted-foreground py-1">
            Aucune demande en attente.
          </p>
        )}
      </div>
    </div>
  );
}
