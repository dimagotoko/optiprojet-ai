
'use client';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { TripCard } from '@/components/TripCard';
import { TripSearchForm } from '@/components/TripSearchForm';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, DocumentData, Timestamp } from 'firebase/firestore';
import { LoadingLogo } from '@/components/LoadingLogo';
import { format, isSameDay } from 'date-fns';

type Trip = {
    id: string;
    origin: string;
    destination: string;
    departureTime: Timestamp;
    pricePerSeat: number;
    offeredBy: string;
    availableSeats: number;
};

type UserProfile = {
    name: string;
    profilePictureUrl?: string;
    averageRating?: number;
};

// A small component to fetch driver info for a TripCard
const TripCardWrapper = ({ trip }: { trip: Trip }) => {
    const firestore = useFirestore();

    const driverRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users');
    }, [firestore]);

    const { data: driverData, isLoading } = useCollection<UserProfile>(driverRef);

    if (isLoading || !driverData) {
        // You can render a skeleton card here
        return <div className="w-full h-96 rounded-lg bg-muted animate-pulse" />;
    }
    
    const driver = driverData.find(d => d.id === trip.offeredBy);

    if(!driver) return null;

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

    return (
        <TripCard
            key={trip.id}
            id={trip.id}
            from={trip.origin}
            to={trip.destination}
            date={format(trip.departureTime.toDate(), 'd MMM')}
            price={`${trip.pricePerSeat}$`}
            driver={{
                name: driver.name,
                avatar: driver.profilePictureUrl || '',
                rating: driver.averageRating || 0,
            }}
        />
    );
};


function TripsPageContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  // Get search params from URL
  const departure = searchParams.get('departure')?.toLowerCase();
  const destination = searchParams.get('destination')?.toLowerCase();
  const dateStr = searchParams.get('date');
  const searchDate = dateStr ? new Date(dateStr) : null;
  
  const tripsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Fetch all future trips
    return collection(firestore, 'trips');
  }, [firestore]);

  const { data: allTrips, isLoading } = useCollection<Trip>(tripsQuery);
  
  const filteredTrips = useMemo(() => {
    if (!allTrips) return [];
    
    const now = new Date();

    return allTrips.filter(trip => {
      const departureTime = trip.departureTime.toDate();
      // Basic filtering logic
      const matchesDeparture = departure ? trip.origin.toLowerCase().includes(departure) : true;
      const matchesDestination = destination ? trip.destination.toLowerCase().includes(destination) : true;
      const matchesDate = searchDate ? isSameDay(departureTime, searchDate) : true;
      
      // Ensure the trip is in the future
      const isFutureTrip = departureTime > now;

      return matchesDeparture && matchesDestination && matchesDate && isFutureTrip;
    });
  }, [allTrips, departure, destination, searchDate]);

  // We need to get the initial search from the URL for the form
  const initialDate = searchDate instanceof Date && !isNaN(searchDate.getTime()) ? searchDate : undefined;


  return (
    <div className="container py-12 px-4 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Tous les trajets</h1>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Trouvez le covoiturage parfait pour votre prochaine destination.
          </p>
        </div>
      </div>
      <div className="mb-12">
        <TripSearchForm initialSearch={{ departure: searchParams.get('departure') || '', destination: searchParams.get('destination') || '', date: initialDate }} />
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
            <LoadingLogo className="h-10 w-10 text-primary" />
        </div>
      )}

      {!isLoading && filteredTrips.length > 0 && (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTrips.map((trip) => (
                <TripCardWrapper key={trip.id} trip={trip} />
            ))}
        </div>
      )}

      {!isLoading && filteredTrips.length === 0 && (
         <div className="text-center py-10">
            <p className="text-lg text-muted-foreground">Aucun trajet trouvé pour ces critères.</p>
            <p className="text-sm text-muted-foreground mt-2">Essayez d'élargir votre recherche.</p>
        </div>
      )}
    </div>
  );
}


export default function TripsPage() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
            <LoadingLogo className="h-12 w-12 text-primary" />
        </div>
    }>
      <TripsPageContent />
    </Suspense>
  )
}
