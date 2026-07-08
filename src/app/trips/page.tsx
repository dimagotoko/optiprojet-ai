"use client";
import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TripCard } from "@/components/TripCard";
import { TripSearchForm } from "@/components/TripSearchForm";
import { useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import {
  collection,
  doc,
  Timestamp,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/types/db";
import { TripGridSkeleton } from "@/components/skeletons/TripCardSkeleton";
import { format, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dog,
  CigaretteOff,
  Luggage,
  Sunrise,
  Sun,
  Sunset,
  Share2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types/db";

const TripCardWrapper = ({
  trip,
  onLocationClick,
}: {
  trip: Trip;
  onLocationClick: (type: "departure" | "destination", value: string) => void;
}) => {
  const firestore = useFirestore();
  const driverRef = useMemoFirebase(
    () => (firestore ? doc(firestore, "users", trip.offeredBy) : null),
    [firestore, trip.offeredBy],
  );
  const { data: driver, isLoading: isDriverLoading } =
    useDoc<UserProfile>(driverRef);

  return (
    <TripCard
      id={trip.id}
      from={trip.origin}
      to={trip.destination}
      date={format(trip.departureTime.toDate(), "d MMM", { locale: fr })}
      price={`${trip.pricePerSeat}$`}
      onLocationClick={onLocationClick}
      driverName={driver?.name}
      driverPhotoUrl={driver?.profilePictureUrl}
      driverRating={driver?.averageRating}
      driverTotalRatings={driver?.totalRatings}
      driverIsVerified={driver?.isVerified}
      isDriverLoading={isDriverLoading}
    />
  );
};

function TripsPageContent() {
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (userData?.role === "transporteur") {
      toast({
        title: "Accès réservé aux voyageurs",
        description:
          "En tant que transporteur, vous proposez des trajets depuis le tableau de bord.",
      });
      router.replace("/dashboard");
    }
  }, [userData?.role, router, toast]);

  // Filter states
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [departureTime, setDepartureTime] = useState<string>("all");
  const [showNonSmoking, setShowNonSmoking] = useState(false);
  const [showPetsAllowed, setShowPetsAllowed] = useState(false);
  const [showLargeBagsAllowed, setShowLargeBagsAllowed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetFilters = () => {
    setMaxPrice(undefined);
    setDepartureTime("all");
    setShowNonSmoking(false);
    setShowPetsAllowed(false);
    setShowLargeBagsAllowed(false);
  };

  // Get search params from URL
  const departure = searchParams.get("departure")?.toLowerCase();
  const destination = searchParams.get("destination")?.toLowerCase();
  const dateStr = searchParams.get("date");

  // Correctly parse the date only if it's a valid string
  const searchDate = useMemo(() => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime()) ? date : null;
  }, [dateStr]);

  const FIRESTORE_PAGE_SIZE = 50;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasFirestoreMore, setHasFirestoreMore] = useState(false);

  // Charge le premier batch Firestore (et recharge si la date change)
  useEffect(() => {
    if (!firestore) return;
    let cancelled = false;
    setIsLoading(true);
    setTrips([]);
    setLastVisible(null);
    setHasFirestoreMore(false);

    const baseConstraints: QueryConstraint[] = searchDate
      ? [
          where("departureTime", ">=", startOfDay(searchDate)),
          where("departureTime", "<=", endOfDay(searchDate)),
        ]
      : [where("departureTime", ">=", startOfDay(new Date()))];
    baseConstraints.push(orderBy("departureTime", "asc"));

    getDocs(
      query(
        collection(firestore, "trips"),
        ...baseConstraints,
        limit(FIRESTORE_PAGE_SIZE),
      ),
    ).then((snap) => {
      if (cancelled) return;
      setTrips(snap.docs.map((d) => ({ ...(d.data() as Trip), id: d.id })));
      setLastVisible(snap.docs[snap.docs.length - 1] ?? null);
      setHasFirestoreMore(snap.docs.length === FIRESTORE_PAGE_SIZE);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [firestore, searchDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadFirestoreMore = async () => {
    if (!firestore || !lastVisible || isLoadingMore) return;
    setIsLoadingMore(true);

    const baseConstraints: QueryConstraint[] = searchDate
      ? [
          where("departureTime", ">=", startOfDay(searchDate)),
          where("departureTime", "<=", endOfDay(searchDate)),
        ]
      : [where("departureTime", ">=", startOfDay(new Date()))];
    baseConstraints.push(orderBy("departureTime", "asc"));

    try {
      const snap = await getDocs(
        query(
          collection(firestore, "trips"),
          ...baseConstraints,
          startAfter(lastVisible),
          limit(FIRESTORE_PAGE_SIZE),
        ),
      );
      setTrips((prev) => [
        ...prev,
        ...snap.docs.map((d) => ({ ...(d.data() as Trip), id: d.id })),
      ]);
      if (snap.docs.length > 0) setLastVisible(snap.docs[snap.docs.length - 1]);
      setHasFirestoreMore(snap.docs.length === FIRESTORE_PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredTrips = useMemo(() => {
    if (!trips.length) return [];

    return trips.filter((trip: Trip) => {
      const tripDepartureTime = trip.departureTime.toDate();
      const matchesPrice = maxPrice ? trip.pricePerSeat <= maxPrice : true;
      const matchesNonSmoking = showNonSmoking
        ? trip.options?.isNonSmoking === true
        : true;
      const matchesPetsAllowed = showPetsAllowed
        ? trip.options?.allowPets === true
        : true;
      const matchesLargeBags = showLargeBagsAllowed
        ? trip.options?.allowLargeBags === true
        : true;
      const hour = tripDepartureTime.getHours();
      const matchesTime =
        departureTime === "all" ||
        (departureTime === "morning" && hour >= 6 && hour < 12) ||
        (departureTime === "afternoon" && hour >= 12 && hour < 18) ||
        (departureTime === "evening" && hour >= 18);
      return (
        matchesPrice &&
        matchesTime &&
        matchesNonSmoking &&
        matchesPetsAllowed &&
        matchesLargeBags
      );
    });
  }, [
    trips,
    maxPrice,
    departureTime,
    showNonSmoking,
    showPetsAllowed,
    showLargeBagsAllowed,
  ]);

  const { exactMatches, suggestedMatches } = useMemo(() => {
    const exact: Trip[] = [];
    const suggested: Trip[] = [];
    if (!filteredTrips)
      return { exactMatches: exact, suggestedMatches: suggested };

    const hasDeparture = !!departure;
    const hasDestination = !!destination;

    for (const trip of filteredTrips) {
      const tripOrigin = trip.origin.toLowerCase();
      const tripDestination = trip.destination.toLowerCase();
      const matchesDeparture = hasDeparture
        ? tripOrigin.includes(departure)
        : false;
      const matchesDestination = hasDestination
        ? tripDestination.includes(destination)
        : false;

      if (hasDeparture && hasDestination) {
        if (matchesDeparture && matchesDestination) {
          exact.push(trip);
        } else if (matchesDeparture || matchesDestination) {
          suggested.push(trip);
        }
      } else if (hasDeparture) {
        if (matchesDeparture) {
          exact.push(trip);
        }
      } else if (hasDestination) {
        if (matchesDestination) {
          exact.push(trip);
        }
      }
    }
    return { exactMatches: exact, suggestedMatches: suggested };
  }, [filteredTrips, departure, destination]);

  const handleSearch = (search: {
    departure?: string;
    destination?: string;
    date?: Date;
  }) => {
    const params = new URLSearchParams();
    if (search.departure) params.set("departure", search.departure);
    if (search.destination) params.set("destination", search.destination);
    if (search.date) params.set("date", search.date.toISOString());

    router.push(`/trips?${params.toString()}`);
  };

  const initialDate =
    searchDate instanceof Date && !isNaN(searchDate.getTime())
      ? searchDate
      : undefined;

  const maxPriceInResults = useMemo(() => {
    if (!trips.length) return 100;
    const max = trips.reduce(
      (max, trip) => Math.max(max, trip.pricePerSeat),
      0,
    );
    return max > 0 ? Math.ceil(max / 5) * 5 : 100; // Round up to nearest 5
  }, [trips]);

  const handleLocationClick = (
    type: "departure" | "destination",
    value: string,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(type, value);
    router.push(`/trips?${params.toString()}`);
  };

  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const hasActiveSearch = departure || destination;
  const resultsToShow = hasActiveSearch ? exactMatches : filteredTrips || [];
  const visibleTrips = resultsToShow.slice(0, visibleCount);
  const hasMore = visibleCount < resultsToShow.length;

  // Réinitialise la pagination quand les filtres/recherche changent
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [departure, destination, dateStr]);

  const renderResults = () => {
    if (isLoading) {
      return <TripGridSkeleton count={6} />;
    }

    if (resultsToShow.length > 0) {
      return (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleTrips.map((trip) => (
              <TripCardWrapper
                key={trip.id}
                trip={trip}
                onLocationClick={handleLocationClick}
              />
            ))}
          </div>
          {(hasMore || hasFirestoreMore) && (
            <div className="flex justify-center gap-3 pt-4 flex-wrap">
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Charger plus ({resultsToShow.length - visibleCount} restants)
                </Button>
              )}
              {!hasMore && hasFirestoreMore && (
                <Button
                  variant="outline"
                  onClick={handleLoadFirestoreMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore
                    ? "Chargement…"
                    : "Charger les 50 trajets suivants"}
                </Button>
              )}
            </div>
          )}
        </div>
      );
    }

    if (hasActiveSearch && suggestedMatches.length > 0) {
      return (
        <div className="space-y-8">
          <div className="text-center py-6 bg-secondary/30 rounded-lg">
            <h3 className="text-lg font-semibold">
              Aucun trajet direct trouvé pour vos critères.
            </h3>
            <p className="text-muted-foreground mt-1">
              Voici des suggestions de trajets pour la date sélectionnée :
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suggestedMatches.map((trip) => (
              <TripCardWrapper
                key={trip.id}
                trip={trip}
                onLocationClick={handleLocationClick}
              />
            ))}
          </div>
        </div>
      );
    }

    if (trips.length === 0) {
      return (
        <div className="text-center py-16 border border-dashed rounded-xl space-y-4">
          <p className="text-4xl">🌱</p>
          <p className="text-lg font-semibold">La communauté se construit !</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Aucun conducteur n&apos;a encore publié de trajet. Vous connaissez
            quelqu&apos;un qui fait ce trajet régulièrement ? Invitez-le — ça
            prend 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild variant="outline">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
            <Button onClick={handleCopyInvite}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              {copied ? "Lien copié !" : "Copier le lien d'invitation"}
            </Button>
          </div>
        </div>
      );
    }

    const searchLabel = [
      departure && destination
        ? `${departure} → ${destination}`
        : departure
          ? `depuis ${departure}`
          : destination
            ? `vers ${destination}`
            : null,
      dateStr
        ? `le ${format(new Date(dateStr), "d MMM", { locale: fr })}`
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="text-center py-16 border border-dashed rounded-xl space-y-4">
        <p className="text-3xl">🔍</p>
        <p className="text-lg font-semibold">
          {searchLabel
            ? `Aucun trajet ${searchLabel}`
            : "Aucun trajet pour ces critères"}
        </p>
        <p className="text-sm text-muted-foreground">
          Pas de conducteur disponible pour cet itinéraire pour le moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {dateStr && (
            <Button
              variant="outline"
              onClick={() => {
                const params = new URLSearchParams();
                if (departure) params.set("departure", departure);
                if (destination) params.set("destination", destination);
                router.push(`/trips?${params.toString()}`);
              }}
            >
              Effacer la date
            </Button>
          )}
          <Button variant="outline" onClick={resetFilters}>
            Effacer les filtres
          </Button>
          <Button onClick={() => router.push("/trips")}>
            Nouvelle recherche
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container py-12 px-4 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
            Tous les trajets
          </h1>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Trouvez le covoiturage parfait pour votre prochaine destination.
          </p>
        </div>
      </div>
      <div className="mb-8">
        <TripSearchForm
          initialSearch={{
            departure: searchParams.get("departure") || "",
            destination: searchParams.get("destination") || "",
            date: initialDate,
          }}
          onSearch={handleSearch}
        />
      </div>

      <Accordion type="single" collapsible className="w-full mb-8">
        <AccordionItem value="item-1">
          <AccordionTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "no-underline hover:no-underline",
            )}
          >
            <span>
              Filtres avancés (
              {isLoading
                ? "..."
                : hasActiveSearch
                  ? exactMatches.length + suggestedMatches.length
                  : filteredTrips.length}{" "}
              résultats)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* Heure de départ */}
              <div className="space-y-2">
                <Label>Heure de départ</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={departureTime === "all" ? "secondary" : "outline"}
                    onClick={() => setDepartureTime("all")}
                    aria-label="Toutes les heures"
                  >
                    Tous
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      departureTime === "morning" ? "secondary" : "outline"
                    }
                    onClick={() => setDepartureTime("morning")}
                    aria-label="Filtrer : Matin (6h–12h)"
                    className="flex items-center gap-2"
                  >
                    <Sunrise className="h-4 w-4" /> Matin
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      departureTime === "afternoon" ? "secondary" : "outline"
                    }
                    onClick={() => setDepartureTime("afternoon")}
                    aria-label="Filtrer : Après-midi (12h–18h)"
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" /> Après-midi
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      departureTime === "evening" ? "secondary" : "outline"
                    }
                    onClick={() => setDepartureTime("evening")}
                    aria-label="Filtrer : Soir (18h+)"
                    className="flex items-center gap-2"
                  >
                    <Sunset className="h-4 w-4" /> Soir
                  </Button>
                </div>
              </div>
              {/* Prix */}
              <div className="space-y-2">
                <Label htmlFor="price">
                  Prix maximum: {maxPrice ? `${maxPrice}$` : "Aucun"}
                </Label>
                <Slider
                  id="price"
                  max={maxPriceInResults}
                  step={5}
                  value={[maxPrice || maxPriceInResults]}
                  onValueChange={(value) =>
                    setMaxPrice(
                      value[0] === maxPriceInResults ? undefined : value[0],
                    )
                  }
                />
              </div>
              {/* Options */}
              <div className="space-y-2">
                <Label>Options du trajet</Label>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="non-smoking"
                      checked={showNonSmoking}
                      onCheckedChange={(checked) =>
                        setShowNonSmoking(!!checked)
                      }
                    />
                    <Label
                      htmlFor="non-smoking"
                      className="flex items-center gap-2 font-normal"
                    >
                      <CigaretteOff className="h-4 w-4" /> Non-fumeur
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pets"
                      checked={showPetsAllowed}
                      onCheckedChange={(checked) =>
                        setShowPetsAllowed(!!checked)
                      }
                    />
                    <Label
                      htmlFor="pets"
                      className="flex items-center gap-2 font-normal"
                    >
                      <Dog className="h-4 w-4" /> Animaux permis
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="large-bags"
                      checked={showLargeBagsAllowed}
                      onCheckedChange={(checked) =>
                        setShowLargeBagsAllowed(!!checked)
                      }
                    />
                    <Label
                      htmlFor="large-bags"
                      className="flex items-center gap-2 font-normal"
                    >
                      <Luggage className="h-4 w-4" /> Grands bagages
                    </Label>
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
    <Suspense fallback={<TripGridSkeleton count={6} />}>
      <TripsPageContent />
    </Suspense>
  );
}
