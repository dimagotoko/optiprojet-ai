'use client';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TripCard } from '@/components/TripCard';
import { TripSearchForm } from '@/components/TripSearchForm';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, DocumentData, Timestamp, query, where, doc, QueryConstraint } from 'firebase/firestore';
import { LoadingLogo } from '@/components/LoadingLogo';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dog, CigaretteOff, Luggage } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';


type Trip = {
    id: string;
    origin: string;
    destination: string;
    departureTime: Timestamp;
    pricePerSeat: number;
    offeredBy: string;
    availableSeats: number;
    options?: {
        allowPets?: boolean;
        isNonSmoking?: boolean;
        allowLargeBags?: boolean;
    }
};

type UserProfile = {
    id: string;
    name: string;
    profilePictureUrl?: string;
    averageRating?: number;
};

// A small component to fetch driver info for a TripCard
const TripCardWrapper = ({ trip, onLocationClick }: { trip: Trip, onLocationClick: (type: 'departure' | 'destination', value: string) => void }) => {
    const firestore = useFirestore();

    const driverRef = useMemoFirebase(() => {
        if (!firestore || !trip.offeredBy) return null;
        return doc(firestore, 'users', trip.offeredBy);
    }, [firestore, trip.offeredBy]);

    const { data: driver, isLoading } = useDoc<UserProfile>(driverRef);

    if (isLoading) {
        // You can render a skeleton card here
        return <div className="w-full h-96 rounded-lg bg-muted animate-pulse" />;
    }

    if (!driver) return null;

    return (
        <TripCard
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
            onLocationClick={onLocationClick}
        />
    );
};


function TripsPageContent() {
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter states
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [departureTime, setDepartureTime] = useState<string>('all');
  const [showNonSmoking, setShowNonSmoking] = useState(false);
  const [showPetsAllowed, setShowPetsAllowed] = useState(false);
  const [showLargeBagsAllowed, setShowLargeBagsAllowed] = useState(false);


  // Get search params from URL
  const departure = searchParams.get('departure')?.toLowerCase();
  const destination = searchParams.get('destination')?.toLowerCase();
  const dateStr = searchParams.get('date');
  const searchDate = dateStr ? new Date(dateStr) : null;
  
  const tripsQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    const constraints: QueryConstraint[] = [where('departureTime', '>=', startOfDay(new Date()))];

    if (searchDate) {
        constraints.push(where('departureTime', '>=', startOfDay(searchDate)));
        constraints.push(where('departureTime', '<=', endOfDay(searchDate)));
    }
    
    return query(collection(firestore, 'trips'), ...constraints);
  }, [firestore, searchDate]);

  const { data: allTrips, isLoading } = useCollection<Trip>(tripsQuery);
  
  const filteredTrips = useMemo(() => {
    if (!allTrips) return [];
    
    return allTrips.filter((trip: Trip) => {
        const tripDepartureTime = trip.departureTime.toDate();
        const matchesPrice = maxPrice ? trip.pricePerSeat <= maxPrice : true;
        const matchesNonSmoking = showNonSmoking ? trip.options?.isNonSmoking === true : true;
        const matchesPetsAllowed = showPetsAllowed ? trip.options?.allowPets === true : true;
        const matchesLargeBags = showLargeBagsAllowed ? trip.options?.allowLargeBags === true : true;
        const hour = tripDepartureTime.getHours();
        const matchesTime = departureTime === 'all' ||
            (departureTime === 'morning' && hour >= 6 && hour < 12) ||
            (departureTime === 'afternoon' && hour >= 12 && hour < 18) ||
            (departureTime === 'evening' && hour >= 18);
        return matchesPrice && matchesTime && matchesNonSmoking && matchesPetsAllowed && matchesLargeBags;
    });
    
  }, [allTrips, maxPrice, departureTime, showNonSmoking, showPetsAllowed, showLargeBagsAllowed]);

  const { exactMatches, suggestedMatches } = useMemo(() => {
    const exactMatches: Trip[] = [];
    const suggestedMatches: Trip[] = [];
    if (!filteredTrips) return { exactMatches, suggestedMatches };

    const hasDeparture = !!departure;
    const hasDestination = !!destination;

    for (const trip of filteredTrips) {
      const tripOrigin = trip.origin.toLowerCase();
      const tripDestination = trip.destination.toLowerCase();
      const matchesDeparture = hasDeparture ? tripOrigin.includes(departure) : true;
      const matchesDestination = hasDestination ? tripDestination.includes(destination) : true;
      
      if (matchesDeparture && matchesDestination) {
        exactMatches.push(trip);
      } else if (hasDeparture && hasDestination && (matchesDeparture || matchesDestination)) {
        suggestedMatches.push(trip);
      }
    }
    return { exactMatches, suggestedMatches };
  }, [filteredTrips, departure, destination]);

  const initialDate = searchDate instanceof Date && !isNaN(searchDate.getTime()) ? searchDate : undefined;

  const maxPriceInResults = useMemo(() => {
      if (!allTrips) return 100;
      const max = allTrips.reduce((max, trip) => Math.max(max, trip.pricePerSeat), 0);
      return max > 0 ? max : 100; // Return at least 100
  }, [allTrips]);

  const handleLocationClick = (type: 'departure' | 'destination', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(type, value);
    router.push(`/trips?${params.toString()}`);
  };

  const hasActiveSearch = departure || destination;

  const renderResults = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-10">
          <LoadingLogo className="h-10 w-10 text-primary" />
        </div>
      );
    }
  
    if (exactMatches.length > 0) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exactMatches.map((trip) => (
            <TripCardWrapper key={trip.id} trip={trip} onLocationClick={handleLocationClick} />
          ))}
        </div>
      );
    }
  
    if (hasActiveSearch && suggestedMatches.length > 0) {
      return (
        <div className="space-y-8">
          <div className="text-center py-6 bg-secondary/30 rounded-lg">
            <h3 className="text-lg font-semibold">Aucun trajet direct trouvé pour vos critères.</h3>
            <p className="text-muted-foreground mt-1">Voici des suggestions de trajets pour la date sélectionnée :</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suggestedMatches.map((trip) => (
              <TripCardWrapper key={trip.id} trip={trip} onLocationClick={handleLocationClick} />
            ))}
          </div>
        </div>
      );
    }

    if (!hasActiveSearch && filteredTrips.length > 0) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTrips.map((trip) => (
                    <TripCardWrapper key={trip.id} trip={trip} onLocationClick={handleLocationClick} />
                ))}
            </div>
        );
    }
  
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">Aucun trajet trouvé pour ces critères.</p>
        <p className="text-sm text-muted-foreground mt-2">Essayez de modifier votre recherche ou vos filtres.</p>
      </div>
    );
  };


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
      <div className="mb-8">
        <TripSearchForm initialSearch={{ departure: searchParams.get('departure') || '', destination: searchParams.get('destination') || '', date: initialDate }} />
      </div>

       <Accordion type="single" collapsible className="w-full mb-8">
        <AccordionItem value="item-1">
          <AccordionTrigger className={cn(buttonVariants({ variant: "outline" }), "no-underline hover:no-underline")}>
            <span>Filtres avancés ({isLoading ? '...' : exactMatches.length + suggestedMatches.length} résultats)</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
               {/* Heure de départ */}
              <div className="space-y-2">
                <Label>Heure de départ</Label>
                <div className="flex gap-2">
                    <Button variant={departureTime === 'all' ? 'secondary' : 'outline'} onClick={() => setDepartureTime('all')}>Tous</Button>
                    <Button variant={departureTime === 'morning' ? 'secondary' : 'outline'} onClick={() => setDepartureTime('morning')}>Matin</Button>
                    <Button variant={departureTime === 'afternoon' ? 'secondary' : 'outline'} onClick={() => setDepartureTime('afternoon')}>Après-midi</Button>
                    <Button variant={departureTime === 'evening' ? 'secondary' : 'outline'} onClick={() => setDepartureTime('evening')}>Soir</Button>
                </div>
              </div>
              {/* Prix */}
              <div className="space-y-2">
                <Label htmlFor="price">Prix maximum: {maxPrice ? `${maxPrice}$` : 'Aucun'}</Label>
                <Slider
                    id="price"
                    max={maxPriceInResults}
                    step={5}
                    value={[maxPrice || maxPriceInResults]}
                    onValueChange={(value) => setMaxPrice(value[0] === maxPriceInResults ? undefined : value[0])}
                />
              </div>
              {/* Options */}
              <div className="space-y-2">
                 <Label>Options du trajet</Label>
                 <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="non-smoking" checked={showNonSmoking} onCheckedChange={(checked) => setShowNonSmoking(!!checked)} />
                        <Label htmlFor="non-smoking" className="flex items-center gap-2 font-normal"><CigaretteOff className="h-4 w-4" /> Non-fumeur</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="pets" checked={showPetsAllowed} onCheckedChange={(checked) => setShowPetsAllowed(!!checked)} />
                        <Label htmlFor="pets" className="flex items-center gap-2 font-normal"><Dog className="h-4 w-4" /> Animaux permis</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="large-bags" checked={showLargeBagsAllowed} onCheckedChange={(checked) => setShowLargeBagsAllowed(!!checked)} />
                        <Label htmlFor="large-bags" className="flex items-center gap-2 font-normal"><Luggage className="h-4 w-4" /> Grands bagages</Label>
                    </div>
                 </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {renderResults()}
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
