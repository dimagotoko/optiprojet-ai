"use client";

import * as React from "react";
import Image from "next/image";
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  useUser,
  useCollection,
} from "@/firebase";
import {
  doc,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LoadingLogo } from "@/components/LoadingLogo";
import { TripDetailSkeleton } from "@/components/skeletons/TripDetailSkeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Star,
  Calendar,
  Users,
  Dog,
  CigaretteOff,
  Luggage,
  Landmark,
  Banknote,
  CheckCircle,
  XCircle,
  Clock,
  Share2,
  Car,
  MapPin,
  Navigation,
  ShieldCheck,
  Mail,
  Phone,
  Plus,
  Trash2,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import type {
  Trip,
  UserProfile,
  Booking,
  Vehicle,
  PassengerEntry,
} from "@/types/db";
import { CANADIAN_PROVINCES, RELATION_LABELS } from "@/types/db";
import { useToast } from "@/hooks/use-toast";
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
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RatingDialog } from "@/components/rating/RatingDialog";
import { ProtocolDialog } from "@/components/ProtocolDialog";

const GRADIENTS = [
  { from: "#3b82f6", to: "#8b5cf6" },
  { from: "#10b981", to: "#06b6d4" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#6366f1", to: "#ec4899" },
  { from: "#14b8a6", to: "#3b82f6" },
  { from: "#7c3aed", to: "#db2777" },
];

function getGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++)
    h = (seed.charCodeAt(i) + ((h << 5) - h)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

const getInitials = (name: string | undefined) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
};

const statusConfig = {
  pending: {
    label: "En attente",
    icon: Clock,
    className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  },
  accepted: {
    label: "Acceptée",
    icon: CheckCircle,
    className: "text-green-600 bg-green-50 dark:bg-green-900/20",
  },
  rejected: {
    label: "Refusée",
    icon: XCircle,
    className: "text-red-500 bg-red-50 dark:bg-red-900/20",
  },
  cancelled: {
    label: "Annulée",
    icon: XCircle,
    className: "text-muted-foreground bg-muted",
  },
};

const BookingRow = ({
  booking,
  tripId,
  isOwner,
  driverUserId,
  tripIsPast,
}: {
  booking: Booking;
  tripId: string;
  isOwner: boolean;
  driverUserId?: string;
  tripIsPast: boolean;
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [ratingOpen, setRatingOpen] = React.useState(false);

  const travelerRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "users", booking.travelerId);
  }, [firestore, booking.travelerId]);
  const { data: traveler, isLoading } = useDoc<UserProfile>(travelerRef);

  // Profil privé du conducteur — pour dénormaliser contact lors de l'acceptation
  const driverPrivateRef = useMemoFirebase(() => {
    if (!firestore || !isOwner || !driverUserId) return null;
    return doc(firestore, "users", driverUserId, "private", "profile");
  }, [firestore, isOwner, driverUserId]);
  const { data: driverPrivate } =
    useDoc<import("@/types/db").UserProfilePrivate>(driverPrivateRef);

  const updateStatus = async (status: "accepted" | "rejected") => {
    if (!firestore) return;
    setIsUpdating(true);
    try {
      const bookingRef = doc(
        firestore,
        "trips",
        tripId,
        "bookings",
        booking.id,
      );
      const tripRef = doc(firestore, "trips", tripId);
      if (status === "rejected") {
        await runTransaction(firestore, async (tx) => {
          tx.update(bookingRef, { status });
          tx.update(tripRef, { totalBookings: increment(-1) });
        });
      } else {
        await updateDoc(bookingRef, {
          status,
          ...(driverPrivate
            ? {
                driverEmail: driverPrivate.email,
                driverPhone: driverPrivate.phoneNumber,
              }
            : {}),
        });
      }
      toast({
        title:
          status === "accepted"
            ? "Réservation acceptée"
            : "Réservation refusée",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const status = booking.status ?? "pending";
  const cfg = statusConfig[status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;

  if (isLoading) return <Skeleton className="h-20 w-full rounded-md" />;
  if (!traveler)
    return (
      <div className="p-3 text-sm text-muted-foreground">Voyageur inconnu</div>
    );

  const seats = booking.seatsBooked ?? 1;

  return (
    <>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        {/* Ligne principale : avatar + infos + boutons */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-12 w-12 shrink-0 mt-0.5">
              <AvatarImage
                src={traveler.profilePictureUrl}
                alt={traveler.name}
              />
              <AvatarFallback>{getInitials(traveler.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              {/* Nom + badge vérifié */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold leading-tight">{traveler.name}</p>
                {traveler.isVerified && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Vérifié
                  </span>
                )}
              </div>

              {/* Note + ville + places */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                {traveler.averageRating != null ? (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">
                      {traveler.averageRating.toFixed(1)}
                    </span>
                    <span>({traveler.totalRatings ?? 0} avis)</span>
                  </span>
                ) : (
                  <span>Pas encore évalué</span>
                )}
                {traveler.city && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {traveler.city}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-0.5 font-medium text-foreground">
                  <Users className="h-3 w-3 shrink-0" />
                  {seats} place{seats > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 shrink-0">
            {isOwner && status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                  disabled={isUpdating}
                  onClick={() => updateStatus("accepted")}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Accepter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                  disabled={isUpdating}
                  onClick={() => updateStatus("rejected")}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Refuser
                </Button>
              </>
            )}
            {isOwner && status === "accepted" && tripIsPast && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRatingOpen(true)}
              >
                <Star className="h-4 w-4 mr-1" /> Évaluer
              </Button>
            )}
          </div>
        </div>

        {/* Co-passagers */}
        {booking.passengers && booking.passengers.length > 0 && (
          <div className="border-t pt-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Co-passagers ({booking.passengers.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {booking.passengers.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.relation && (
                    <span className="text-muted-foreground">
                      · {RELATION_LABELS[p.relation] ?? p.relation}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Statut */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
              cfg.className,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
      </div>
      <RatingDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        driverId={booking.travelerId}
        driverName={traveler.name}
        tripId={tripId}
      />
    </>
  );
};

const PassengersList = ({
  tripId,
  isOwner,
  driverUserId,
  tripIsPast,
}: {
  tripId: string;
  isOwner: boolean;
  driverUserId?: string;
  tripIsPast: boolean;
}) => {
  const firestore = useFirestore();

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !driverUserId) return null;
    // Filtre explicite sur offeredBy pour que Firestore puisse vérifier
    // statiquement la règle `list: if offeredBy == auth.uid`.
    return query(
      collection(firestore, "trips", tripId, "bookings"),
      where("offeredBy", "==", driverUserId),
    );
  }, [firestore, tripId, driverUserId]);

  const { data: bookings, isLoading } = useCollection<Booking>(bookingsQuery);

  if (isLoading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  if (!bookings || bookings.length === 0)
    return (
      <p className="text-sm text-muted-foreground p-2">
        Aucune demande de réservation pour le moment.
      </p>
    );

  return (
    <div className="space-y-2">
      {bookings.map((booking) => (
        <BookingRow
          key={booking.id}
          booking={booking}
          tripId={tripId}
          isOwner={isOwner}
          driverUserId={driverUserId}
          tripIsPast={tripIsPast}
        />
      ))}
    </div>
  );
};

function ShareButton({
  origin,
  destination,
}: {
  origin: string;
  destination: string;
}) {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = window.location.href;
    const title = `Covoiturage ${origin} → ${destination}`;
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
      } catch {
        /* annulé */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Lien copié !",
        description: "Partagez ce lien avec vos contacts.",
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-1.5"
    >
      <Share2 className="h-4 w-4" />
      Partager
    </Button>
  );
}

function TripDetailsPageContent() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const tripId = params.tripId as string;
  const searchParams = useSearchParams();
  const autobook = searchParams.get("autobook") === "1";
  const [showBookingConfirm, setShowBookingConfirm] = React.useState(false);
  const [showProtocolDialog, setShowProtocolDialog] = React.useState(false);
  const [protocolReadOnly, setProtocolReadOnly] = React.useState(false);
  const [isBooking, setIsBooking] = React.useState(false);
  const [selectedSeats, setSelectedSeats] = React.useState(1);
  const [passengerStep, setPassengerStep] = React.useState(false);
  const [newBookingId, setNewBookingId] = React.useState<string | null>(null);
  const [passengerEntries, setPassengerEntries] = React.useState<
    PassengerEntry[]
  >([]);
  const [isSavingPassengers, setIsSavingPassengers] = React.useState(false);

  const tripRef = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, "trips", tripId);
  }, [firestore, tripId]);
  const { data: trip, isLoading: isTripLoading } = useDoc<Trip>(tripRef);

  const driverId = trip?.offeredBy;
  const driverRef = useMemoFirebase(() => {
    if (!firestore || !driverId) return null;
    return doc(firestore, "users", driverId);
  }, [firestore, driverId]);
  const { data: driver, isLoading: isDriverLoading } =
    useDoc<UserProfile>(driverRef);

  const isOwner = user?.uid === driverId;

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user || isOwner) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user, isOwner]);
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useDoc<UserProfile>(userProfileRef);
  const isTransporteur = userProfile?.role === "transporteur";

  const userPrivateRef = useMemoFirebase(() => {
    if (!firestore || !user || isOwner) return null;
    return doc(firestore, "users", user.uid, "private", "profile");
  }, [firestore, user, isOwner]);
  const { data: userPrivate } =
    useDoc<import("@/types/db").UserProfilePrivate>(userPrivateRef);
  // Optimiste pendant le chargement (undefined) : on ne bloque pas tant qu'on ne sait pas
  const hasSignedProtocol = !userPrivate || !!userPrivate.protocolSignedAt;

  const userBookingQuery = useMemoFirebase(() => {
    // Attendre que `trip` soit chargé pour que `isOwner` soit fiable.
    // Sans ce guard, la requête se déclenche brièvement avec isOwner=false même
    // pour le conducteur, causant un PERMISSION_DENIED sur la collection bookings.
    if (!firestore || !tripId || !user || !trip || isOwner) return null;
    const bookingsRef = collection(firestore, "trips", tripId, "bookings");
    return query(bookingsRef, where("travelerId", "==", user.uid));
  }, [firestore, tripId, user, trip, isOwner]);

  const { data: userBookingResult, isLoading: isUserBookingLoading } =
    useCollection<Booking>(userBookingQuery);

  const vehicleRef = useMemoFirebase(() => {
    if (!firestore || !trip?.vehicleId || !trip?.offeredBy) return null;
    return doc(firestore, "users", trip.offeredBy, "vehicles", trip.vehicleId);
  }, [firestore, trip?.vehicleId, trip?.offeredBy]);
  const { data: vehicle } = useDoc<Vehicle>(vehicleRef);

  const isLoading =
    isUserLoading ||
    isTripLoading ||
    isDriverLoading ||
    isUserBookingLoading ||
    isUserProfileLoading;

  const handleBookTrip = async () => {
    if (!firestore || !user || !trip) return;

    setIsBooking(true);
    try {
      const tripRef = doc(firestore, "trips", trip.id);
      const bookingsCollection = collection(
        firestore,
        "trips",
        trip.id,
        "bookings",
      );
      const bookingRef = doc(bookingsCollection);

      await runTransaction(firestore, async (transaction) => {
        const tripSnap = await transaction.get(tripRef);
        if (!tripSnap.exists()) throw new Error("Trajet introuvable.");

        const current = tripSnap.data() as Trip;
        const booked = current.totalBookings ?? 0;
        if (booked + selectedSeats > current.availableSeats)
          throw new Error("Plus assez de places disponibles.");

        transaction.set(bookingRef, {
          tripId: trip.id,
          travelerId: user.uid,
          offeredBy: current.offeredBy,
          status: "pending",
          seatsBooked: selectedSeats,
          createdAt: serverTimestamp(),
          departureTime: current.departureTime,
        });
        transaction.update(tripRef, {
          totalBookings: increment(selectedSeats),
        });
      });

      toast({
        title: "Réservation confirmée !",
        description: `${selectedSeats} place${selectedSeats > 1 ? "s" : ""} réservée${selectedSeats > 1 ? "s" : ""}. Bon voyage !`,
      });
      setNewBookingId(bookingRef.id);
      setShowBookingConfirm(false);
      if (selectedSeats > 1) {
        setPassengerEntries(
          Array.from({ length: selectedSeats - 1 }, () => ({
            name: "",
            relation: "ami" as const,
          })),
        );
        setPassengerStep(true);
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Booking error: ", error);
      toast({
        variant: "destructive",
        title: "Erreur de réservation",
        description:
          error.message ||
          "Impossible de réserver ce trajet. Veuillez réessayer.",
      });
    } finally {
      setIsBooking(false);
      setShowBookingConfirm(false);
    }
  };

  const handleSavePassengers = async () => {
    if (!firestore || !newBookingId || !trip) return;
    setIsSavingPassengers(true);
    try {
      const cleaned = passengerEntries.filter((p) => p.name.trim() !== "");
      if (cleaned.length > 0) {
        const bookingRef = doc(
          firestore,
          "trips",
          trip.id,
          "bookings",
          newBookingId,
        );
        await updateDoc(bookingRef, { passengers: cleaned });
      }
      router.push("/dashboard");
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer les passagers.",
      });
    } finally {
      setIsSavingPassengers(false);
    }
  };

  // Auto-ouvre la modal après retour d'authentification
  React.useEffect(() => {
    if (!isLoading && autobook && user && !isOwner && !isTransporteur) {
      setShowBookingConfirm(true);
      router.replace(`/trip-details/${tripId}`, { scroll: false });
    }
  }, [autobook, isLoading, user, isOwner, tripId, router]);

  if (isLoading) {
    return <TripDetailSkeleton />;
  }

  if (!trip || !driver) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <p>Trajet non trouvé.</p>
      </div>
    );
  }

  const departureDate = trip.departureTime.toDate();
  const tripIsPast = departureDate < new Date();
  const reservedSeats = trip.totalBookings || 0;
  const totalSeats = trip.availableSeats;
  const userBooking = userBookingResult?.[0];
  const isAccepted = userBooking?.status === "accepted";
  const gradient = getGradient(trip.destination);
  const remainingSeats = totalSeats - reservedSeats;
  const hasAlreadyBooked = userBookingResult
    ? userBookingResult.length > 0
    : false;
  const isSoldOut = remainingSeats <= 0;
  const fillPercent =
    totalSeats > 0
      ? Math.min(((trip.totalBookings ?? 1) / totalSeats) * 100, 100)
      : 0;

  return (
    <>
      <div className="container pt-4 px-4 md:px-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1 text-muted-foreground"
        >
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Tableau de bord
          </Link>
        </Button>
      </div>
      <div className="container py-12 px-4 md:px-6 max-md:pb-28">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="md:col-span-2 space-y-8">
            <div>
              {/* Bannière gradient — zéro requête réseau, couleur déterministe */}
              <div
                className="relative h-44 md:h-56 w-full rounded-xl overflow-hidden mb-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
                style={{
                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                }}
              >
                <div className="absolute inset-0 bg-black/25" />
                {/* Points décoratifs */}
                <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/10" />
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{trip.origin}</span>
                    <span>→</span>
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{trip.destination}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    {trip.origin} → {trip.destination}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2 text-sm sm:text-lg text-muted-foreground">
                  <Calendar className="h-5 w-5 shrink-0" />
                  <span>
                    {format(departureDate, "d MMMM yyyy", { locale: fr })} à{" "}
                    {format(departureDate, "HH:mm")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShareButton
                    origin={trip.origin}
                    destination={trip.destination}
                  />
                  <Badge
                    variant="secondary"
                    className="text-xl sm:text-2xl font-bold py-1 px-3 sm:px-4"
                  >
                    {trip.pricePerSeat}$
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Carte conducteur enrichie ── */}
            <div>
              <h2 className="text-xl font-bold mb-3">Votre conducteur</h2>
              <Card className="overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
                <div
                  className="h-1"
                  style={{
                    background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                  }}
                />
                <CardContent className="p-5 space-y-4">
                  {/* Identité */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20 shrink-0">
                      <AvatarImage
                        src={driver.profilePictureUrl}
                        alt={driver.name}
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials(driver.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-lg leading-tight">
                          {driver.name}
                        </p>
                        {driver.isVerified && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <ShieldCheck
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            Vérifié
                          </span>
                        )}
                      </div>
                      {!!driver.totalRatings && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                          <span className="font-semibold text-sm">
                            {driver.averageRating?.toFixed(1)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({driver.totalRatings} avis)
                          </span>
                        </div>
                      )}
                      {driver.city && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {driver.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Véhicule — visible par tous */}
                  {vehicle && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Véhicule
                      </p>
                      <div className="flex items-center gap-3">
                        {vehicle.imageUrl ? (
                          <div className="relative h-14 w-20 rounded-lg overflow-hidden shrink-0 border">
                            <Image
                              src={vehicle.imageUrl}
                              alt={`${vehicle.make} ${vehicle.model}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-14 w-14 rounded-lg bg-muted shrink-0">
                            <Car className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">
                            {vehicle.make} {vehicle.model} {vehicle.year}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-border shrink-0"
                              style={{
                                backgroundColor: vehicle.color.toLowerCase(),
                              }}
                              title={vehicle.color}
                            />
                            <span>{vehicle.color}</span>
                          </div>
                        </div>
                      </div>

                      {/* Encadré d'identification — voyageur accepté ou conducteur */}
                      {(isAccepted || isOwner) && (
                        <div className="mt-3 rounded-lg border bg-muted/40 px-3 py-2.5 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Identifier le véhicule
                          </p>
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-border shrink-0"
                              style={{
                                backgroundColor: vehicle.color.toLowerCase(),
                              }}
                            />
                            <span className="font-medium">
                              {vehicle.make} {vehicle.model}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {vehicle.color}
                            </span>
                            {vehicle.province && (
                              <span className="text-muted-foreground">
                                · {vehicle.province}
                              </span>
                            )}
                          </div>
                          {vehicle.province && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground shrink-0">
                                Plaque :
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded border bg-background px-2 py-1">
                                <span className="text-xs font-semibold text-primary">
                                  {vehicle.province}
                                </span>
                                <span className="text-muted-foreground">·</span>
                                <span className="font-mono font-bold tracking-widest text-foreground text-sm">
                                  {vehicle.licensePlate}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bannière statut réservation */}
                  {isAccepted &&
                    (() => {
                      const mapsUrl = trip.originCoords
                        ? `https://www.google.com/maps/dir/?api=1&destination=${trip.originCoords.lat},${trip.originCoords.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.origin)}`;
                      return (
                        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 space-y-2.5">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-green-700 dark:text-green-400">
                                Réservation acceptée !
                              </p>
                              <p className="text-sm text-green-600 dark:text-green-500 mt-0.5">
                                Présentez-vous le{" "}
                                {format(departureDate, "d MMMM à HH:mm", {
                                  locale: fr,
                                })}
                              </p>
                            </div>
                          </div>
                          {/* Point de départ + lien GPS */}
                          <div className="flex items-center justify-between gap-3 rounded-md bg-green-100/60 dark:bg-green-900/30 px-3 py-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                              <span className="text-sm text-green-700 dark:text-green-300 line-clamp-2 break-words">
                                {trip.origin}
                              </span>
                            </div>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 transition-colors"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              Itinéraire
                            </a>
                          </div>
                          {/* Contact conducteur */}
                          {(userBooking?.driverPhone ||
                            userBooking?.driverEmail) && (
                            <div className="rounded-md bg-green-100/60 dark:bg-green-900/30 px-3 py-2 space-y-1.5">
                              <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                                Contacter le conducteur
                              </p>
                              {userBooking.driverPhone && (
                                <a
                                  href={`tel:${userBooking.driverPhone}`}
                                  className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 hover:underline"
                                >
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  {userBooking.driverPhone}
                                </a>
                              )}
                              {userBooking.driverEmail && (
                                <a
                                  href={`mailto:${userBooking.driverEmail}`}
                                  className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 hover:underline"
                                >
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  {userBooking.driverEmail}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  {userBooking?.status === "pending" && (
                    <div className="flex items-center gap-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3">
                      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        En attente de confirmation du conducteur
                      </p>
                    </div>
                  )}
                  {userBooking?.status === "rejected" && (
                    <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Votre demande a été refusée par le conducteur
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold mb-4">
                Détails, options et paiement
              </h2>
              <Card>
                <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold">Places restantes</p>
                      <p className="text-muted-foreground">
                        {remainingSeats} / {totalSeats}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-3"
                    data-glowing={trip.options?.isNonSmoking}
                  >
                    <CigaretteOff
                      className={cn(
                        "h-8 w-8",
                        trip.options?.isNonSmoking
                          ? "text-primary"
                          : "text-muted-foreground/50",
                      )}
                    />
                    <div>
                      <p className="font-semibold">Non-fumeur</p>
                      <p className="text-muted-foreground">
                        {trip.options?.isNonSmoking ? "Oui" : "Non"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Dog
                      className={cn(
                        "h-8 w-8",
                        trip.options?.allowPets
                          ? "text-primary"
                          : "text-muted-foreground/50",
                      )}
                    />
                    <div>
                      <p className="font-semibold">Animaux</p>
                      <p className="text-muted-foreground">
                        {trip.options?.allowPets ? "Permis" : "Non permis"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Luggage
                      className={cn(
                        "h-8 w-8",
                        trip.options?.allowLargeBags
                          ? "text-primary"
                          : "text-muted-foreground/50",
                      )}
                    />
                    <div>
                      <p className="font-semibold">Grands bagages</p>
                      <p className="text-muted-foreground">
                        {trip.options?.allowLargeBags ? "Permis" : "Non permis"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Banknote
                      className={cn(
                        "h-8 w-8",
                        trip.paymentOptions?.cash
                          ? "text-primary"
                          : "text-muted-foreground/50",
                      )}
                    />
                    <div>
                      <p className="font-semibold">Argent comptant</p>
                      <p className="text-muted-foreground">
                        {trip.paymentOptions?.cash ? "Accepté" : "Non"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Landmark
                      className={cn(
                        "h-8 w-8",
                        trip.paymentOptions?.interac
                          ? "text-primary"
                          : "text-muted-foreground/50",
                      )}
                    />
                    <div>
                      <p className="font-semibold">Virement Interac</p>
                      <p className="text-muted-foreground">
                        {trip.paymentOptions?.interac ? "Accepté" : "Non"}
                      </p>
                    </div>
                  </div>
                </CardContent>
                {trip.details && (
                  <>
                    <Separator />
                    <CardContent className="p-6">
                      <p className="text-muted-foreground italic">
                        "{trip.details}"
                      </p>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>

            {isOwner && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Passagers</h2>
                <Card>
                  <CardContent className="p-4">
                    <PassengersList
                      tripId={trip.id}
                      isOwner={isOwner}
                      driverUserId={user?.uid}
                      tripIsPast={tripIsPast}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-24 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-500">
              <div
                className="h-1"
                style={{
                  background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                }}
              />
              <CardContent className="p-6">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-muted-foreground">
                    Prix par passager
                  </span>
                  <span className="text-2xl font-bold">
                    {trip.pricePerSeat}$
                  </span>
                </div>

                {/* Barre de remplissage */}
                <div className="mb-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {reservedSeats} / {totalSeats} place
                      {totalSeats !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {remainingSeats} restante
                      {remainingSeats !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary motion-safe:transition-[width] duration-500"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                </div>

                {isOwner ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => router.push("/dashboard")}
                    >
                      Gérer ce trajet
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      C&apos;est votre trajet — gérez les demandes et les
                      passagers depuis votre tableau de bord.
                    </p>
                  </>
                ) : isAccepted ? (
                  <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 py-2.5 text-green-700 dark:text-green-400 font-semibold text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Réservation confirmée
                  </div>
                ) : userBooking?.status === "pending" ? (
                  <Button className="w-full" disabled variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    En attente…
                  </Button>
                ) : isSoldOut ? (
                  <Button className="w-full" disabled>
                    Complet
                  </Button>
                ) : hasAlreadyBooked ? (
                  <Button className="w-full" disabled>
                    Vous avez déjà réservé
                  </Button>
                ) : isTransporteur ? (
                  <p className="text-sm text-center text-muted-foreground py-2">
                    En tant que transporteur, vous proposez des trajets — vous
                    ne pouvez pas en réserver.
                  </p>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        if (!user) {
                          router.push(
                            `/login?redirect=${encodeURIComponent(`/trip-details/${tripId}?autobook=1`)}`,
                          );
                          return;
                        }
                        if (!hasSignedProtocol) {
                          setProtocolReadOnly(false);
                          setShowProtocolDialog(true);
                          return;
                        }
                        setShowBookingConfirm(true);
                      }}
                    >
                      Réserver ce trajet
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      En réservant, vous acceptez le{" "}
                      <button
                        type="button"
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                        onClick={() => {
                          setProtocolReadOnly(true);
                          setShowProtocolDialog(true);
                        }}
                      >
                        protocole d&apos;utilisation
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Une fois la réservation confirmée, vous pourrez vous
                      arranger avec le conducteur pour le paiement.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA sticky mobile — voyageur non-propriétaire uniquement */}
      {!isOwner && !isTransporteur && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-sm p-4">
          {isAccepted ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 py-2.5 text-green-700 dark:text-green-400 font-semibold text-sm">
              <CheckCircle className="h-4 w-4" />
              Réservation confirmée
            </div>
          ) : userBooking?.status === "pending" ? (
            <Button className="w-full" size="lg" disabled variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              En attente…
            </Button>
          ) : isSoldOut ? (
            <Button className="w-full" size="lg" disabled>
              Complet
            </Button>
          ) : hasAlreadyBooked ? (
            <Button className="w-full" size="lg" disabled>
              Vous avez déjà réservé
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={isBooking}
              onClick={() => {
                if (!user) {
                  router.push(
                    `/login?redirect=${encodeURIComponent(`/trip-details/${tripId}?autobook=1`)}`,
                  );
                  return;
                }
                if (!hasSignedProtocol) {
                  setProtocolReadOnly(false);
                  setShowProtocolDialog(true);
                  return;
                }
                setShowBookingConfirm(true);
              }}
            >
              {isBooking && <LoadingLogo className="mr-2 h-4 w-4" />}
              Réserver ce trajet
            </Button>
          )}
        </div>
      )}

      <ProtocolDialog
        open={showProtocolDialog}
        onOpenChange={setShowProtocolDialog}
        role="voyageur"
        onAccepted={
          protocolReadOnly ? undefined : () => setShowBookingConfirm(true)
        }
      />

      <AlertDialog
        open={showBookingConfirm}
        onOpenChange={setShowBookingConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {trip.origin} → {trip.destination} · Paiement :{" "}
              <span className="font-semibold">
                {trip.paymentOptions?.cash && "Argent comptant"}
                {trip.paymentOptions?.cash &&
                  trip.paymentOptions?.interac &&
                  " / "}
                {trip.paymentOptions?.interac && "Interac"}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Sélecteur de places */}
          <div className="py-2 space-y-3">
            <p className="text-sm font-medium">Nombre de places</p>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setSelectedSeats((s) => Math.max(1, s - 1))}
                disabled={selectedSeats <= 1 || isBooking}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold">{selectedSeats}</span>
                <span className="text-muted-foreground ml-1 text-sm">
                  place{selectedSeats > 1 ? "s" : ""}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() =>
                  setSelectedSeats((s) =>
                    Math.min(Math.min(remainingSeats, 8), s + 1),
                  )
                }
                disabled={
                  selectedSeats >= Math.min(remainingSeats, 8) || isBooking
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total estimé</span>
              <span className="font-bold text-base">
                {selectedSeats * trip.pricePerSeat} $
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {remainingSeats} place{remainingSeats > 1 ? "s" : ""} disponible
              {remainingSeats > 1 ? "s" : ""}
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isBooking}
              onClick={() => setSelectedSeats(1)}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBookTrip} disabled={isBooking}>
              {isBooking && (
                <LoadingLogo className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={passengerStep}
        onOpenChange={(open) => {
          if (!open) router.push("/dashboard");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Qui voyagent avec vous ?</DialogTitle>
            <DialogDescription>
              Indiquez le prénom et le lien de chaque co-passager. Le conducteur
              pourra ainsi identifier tout le monde à bord.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {passengerEntries.map((entry, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_160px] gap-2 items-center"
              >
                <Input
                  placeholder={`Prénom passager ${index + 1}`}
                  value={entry.name}
                  onChange={(e) => {
                    const updated = [...passengerEntries];
                    updated[index] = {
                      ...updated[index],
                      name: e.target.value,
                    };
                    setPassengerEntries(updated);
                  }}
                />
                <Select
                  value={entry.relation}
                  onValueChange={(val) => {
                    const updated = [...passengerEntries];
                    updated[index] = {
                      ...updated[index],
                      relation: val as PassengerEntry["relation"],
                    };
                    setPassengerEntries(updated);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lien" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ami">Ami(e)</SelectItem>
                    <SelectItem value="conjoint">Conjoint(e)</SelectItem>
                    <SelectItem value="parent">Père / Mère</SelectItem>
                    <SelectItem value="enfant">Enfant</SelectItem>
                    <SelectItem value="cousin">Cousin(e)</SelectItem>
                    <SelectItem value="collegue">Collègue</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              disabled={isSavingPassengers}
            >
              Passer
            </Button>
            <Button
              onClick={handleSavePassengers}
              disabled={
                isSavingPassengers ||
                passengerEntries.every((p) => p.name.trim() === "")
              }
            >
              {isSavingPassengers ? "Enregistrement…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TripDetailsPage() {
  return (
    <React.Suspense fallback={<TripDetailSkeleton />}>
      <TripDetailsPageContent />
    </React.Suspense>
  );
}
