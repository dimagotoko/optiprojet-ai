'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collectionGroup, query, where, doc } from 'firebase/firestore';
import { Car, Leaf, Star, MapPin, ArrowRight, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { StatCard } from '../shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingDialog } from '@/components/rating/RatingDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Booking, Trip, UserProfile } from '@/types/db';

const CO2_PER_TRIP_KG = 18; // ~150 km moy. × 0.12 kg/km, cohérent avec LiveCounters

const statusConfig = {
  pending:   { label: 'En attente',  icon: Clock,         className: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200' },
  accepted:  { label: 'Acceptée',    icon: CheckCircle,   className: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200' },
  rejected:  { label: 'Refusée',     icon: XCircle,       className: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-200' },
  cancelled: { label: 'Annulée',     icon: XCircle,       className: 'bg-muted text-muted-foreground border-muted' },
};

function BookedTripItem({ booking }: { booking: Booking }) {
  const firestore = useFirestore();
  const [ratingOpen, setRatingOpen] = React.useState(false);

  const tripRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'trips', booking.tripId);
  }, [firestore, booking.tripId]);
  const { data: trip, isLoading } = useDoc<Trip>(tripRef);

  const driverRef = useMemoFirebase(() => {
    if (!firestore || !trip?.offeredBy) return null;
    return doc(firestore, 'users', trip.offeredBy);
  }, [firestore, trip?.offeredBy]);
  const { data: driver } = useDoc<UserProfile>(driverRef);

  const cfg = statusConfig[booking.status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;

  if (isLoading) return <Skeleton className="h-20 w-full rounded-lg" />;
  if (!trip) return null;

  const date = trip.departureTime.toDate();
  const isPast = date < new Date();
  const canRate = booking.status === 'accepted' && isPast && trip.offeredBy;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-full bg-primary/10 shrink-0">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold flex items-center gap-1">
                <span className="truncate">{trip.origin}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{trip.destination}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {format(date, 'd MMM yyyy · HH:mm', { locale: fr })} · {trip.pricePerSeat}$
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn('text-xs font-medium flex items-center gap-1', cfg.className)}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </Badge>
            {canRate && (
              <Button variant="outline" size="sm" className="gap-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20" onClick={() => setRatingOpen(true)}>
                <Star className="h-3.5 w-3.5" /> Évaluer
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/trip-details/${trip.id}`}>Voir</Link>
            </Button>
          </div>
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

interface VoyageurDashboardProps {
  userId: string;
  userData: UserProfile;
}

export function VoyageurDashboard({ userId, userData }: VoyageurDashboardProps) {
  const firestore = useFirestore();

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'bookings'), where('travelerId', '==', userId));
  }, [firestore, userId]);

  const { data: bookings, isLoading } = useCollection<Booking>(bookingsQuery);

  const acceptedCount = bookings?.filter(b => b.status === 'accepted').length ?? 0;
  const co2Saved = acceptedCount * CO2_PER_TRIP_KG;

  const activeBookings = bookings?.filter(b => b.status === 'pending' || b.status === 'accepted') ?? [];
  const pastBookings = bookings?.filter(b => b.status === 'rejected' || b.status === 'cancelled') ?? [];

  return (
    <div className="space-y-8">
      {/* Barre de recherche rapide */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <Search className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">Vous voulez voyager quelque part ?</p>
        <Button asChild size="sm">
          <Link href="/trips">Trouver un trajet</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Car}
          label="Trajets réservés"
          value={isLoading ? '…' : (bookings?.length ?? 0)}
          subtitle={`${acceptedCount} confirmé(s)`}
        />
        <StatCard
          icon={Leaf}
          label="CO₂ économisé"
          value={isLoading ? '…' : `${co2Saved} kg`}
          subtitle="vs. voiture solo"
          iconClassName="text-green-600"
        />
        <StatCard
          icon={Star}
          label="Note moyenne"
          value={userData.averageRating ? userData.averageRating.toFixed(1) : 'N/A'}
          subtitle={userData.totalRatings ? `${userData.totalRatings} avis` : 'Pas encore noté'}
          iconClassName="text-yellow-500"
        />
      </div>

      {/* Liste des réservations */}
      <div>
        <h2 className="text-xl font-bold mb-4">Mes réservations</h2>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : activeBookings.length === 0 && pastBookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Vous n'avez aucune réservation pour le moment.</p>
              <Button asChild>
                <Link href="/trips">Trouver un trajet</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeBookings.map(b => <BookedTripItem key={b.id} booking={b} />)}
            {pastBookings.length > 0 && activeBookings.length > 0 && (
              <p className="text-xs text-muted-foreground font-medium pt-2 uppercase tracking-wide">Passés / Refusés</p>
            )}
            {pastBookings.map(b => <BookedTripItem key={b.id} booking={b} />)}
          </div>
        )}
      </div>
    </div>
  );
}
