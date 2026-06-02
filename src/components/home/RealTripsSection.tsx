'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { TripCard } from '@/components/TripCard';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Trip } from '@/types/db';

export function RealTripsSection() {
  const firestore = useFirestore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!firestore || loaded) return;

    async function fetchTrips() {
      try {
        const q = query(
          collection(firestore!, 'trips'),
          where('departureTime', '>=', Timestamp.now()),
          orderBy('departureTime', 'asc'),
          limit(3)
        );
        const snap = await getDocs(q);
        setTrips(snap.docs.map(d => ({ ...d.data(), id: d.id } as Trip)));
      } catch {
        // Silently ignore — section simplement vide
      } finally {
        setLoaded(true);
      }
    }

    fetchTrips();
  }, [firestore, loaded]);

  if (!loaded) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (trips.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
      {trips.map(trip => (
        <TripCard
          key={trip.id}
          id={trip.id}
          from={trip.origin}
          to={trip.destination}
          date={format(trip.departureTime.toDate(), 'd MMMM yyyy', { locale: fr })}
          price={`${trip.pricePerSeat}$`}
        />
      ))}
    </div>
  );
}
