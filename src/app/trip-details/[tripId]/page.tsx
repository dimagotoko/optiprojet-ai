'use client';

import * as React from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where, addDoc, updateDoc, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LoadingLogo } from '@/components/LoadingLogo';
import { TripDetailSkeleton } from '@/components/skeletons/TripDetailSkeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Calendar, Users, Dog, CigaretteOff, Luggage, Landmark, Banknote, CheckCircle, XCircle, Clock, Share2, Car, MapPin, Navigation, ShieldCheck, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import type { Trip, UserProfile, Booking, Vehicle } from '@/types/db';
import { CANADIAN_PROVINCES } from '@/types/db';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const GRADIENTS = [
    { from: '#3b82f6', to: '#8b5cf6' },
    { from: '#10b981', to: '#06b6d4' },
    { from: '#f59e0b', to: '#ef4444' },
    { from: '#6366f1', to: '#ec4899' },
    { from: '#14b8a6', to: '#3b82f6' },
    { from: '#7c3aed', to: '#db2777' },
];

function getGradient(seed: string) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (seed.charCodeAt(i) + ((h << 5) - h)) | 0;
    return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

const getInitials = (name: string | undefined) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('');
};

const statusConfig = {
    pending:   { label: 'En attente', icon: Clock,       className: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
    accepted:  { label: 'Acceptée',   icon: CheckCircle, className: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    rejected:  { label: 'Refusée',    icon: XCircle,     className: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
    cancelled: { label: 'Annulée',    icon: XCircle,     className: 'text-muted-foreground bg-muted' },
};

const BookingRow = ({ booking, tripId, isOwner, driverUserId }: { booking: Booking; tripId: string; isOwner: boolean; driverUserId?: string }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = React.useState(false);

    const travelerRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', booking.travelerId);
    }, [firestore, booking.travelerId]);
    const { data: traveler, isLoading } = useDoc<UserProfile>(travelerRef);

    // Profil privé du conducteur — pour dénormaliser contact lors de l'acceptation
    const driverPrivateRef = useMemoFirebase(() => {
        if (!firestore || !isOwner || !driverUserId) return null;
        return doc(firestore, 'users', driverUserId, 'private', 'profile');
    }, [firestore, isOwner, driverUserId]);
    const { data: driverPrivate } = useDoc<import('@/types/db').UserProfilePrivate>(driverPrivateRef);

    const updateStatus = async (status: 'accepted' | 'rejected') => {
        if (!firestore) return;
        setIsUpdating(true);
        try {
            const bookingRef = doc(firestore, 'trips', tripId, 'bookings', booking.id);
            const tripRef = doc(firestore, 'trips', tripId);
            if (status === 'rejected') {
                await runTransaction(firestore, async (tx) => {
                    tx.update(bookingRef, { status });
                    tx.update(tripRef, { totalBookings: increment(-1) });
                });
            } else {
                await updateDoc(bookingRef, {
                    status,
                    ...(driverPrivate ? {
                        driverEmail: driverPrivate.email,
                        driverPhone: driverPrivate.phoneNumber,
                    } : {}),
                });
            }
            toast({ title: status === 'accepted' ? 'Réservation acceptée' : 'Réservation refusée' });
        } catch {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour.' });
        } finally {
            setIsUpdating(false);
        }
    };

    const status = booking.status ?? 'pending';
    const cfg = statusConfig[status] ?? statusConfig.pending;
    const StatusIcon = cfg.icon;

    if (isLoading) return <Skeleton className="h-14 w-full rounded-md" />;
    if (!traveler) return <div className="p-3 text-sm text-muted-foreground">Voyageur inconnu</div>;

    return (
        <div className="flex items-center justify-between p-3 rounded-lg border gap-3">
            <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={traveler.profilePictureUrl} alt={traveler.name} />
                    <AvatarFallback>{getInitials(traveler.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="font-medium truncate">{traveler.name}</p>
                    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', cfg.className)}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                    </span>
                </div>
            </div>
            {isOwner && status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20" disabled={isUpdating} onClick={() => updateStatus('accepted')}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Accepter
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20" disabled={isUpdating} onClick={() => updateStatus('rejected')}>
                        <XCircle className="h-4 w-4 mr-1" /> Refuser
                    </Button>
                </div>
            )}
        </div>
    );
};

const PassengersList = ({ tripId, isOwner, driverUserId }: { tripId: string; isOwner: boolean; driverUserId?: string }) => {
    const firestore = useFirestore();

    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'trips', tripId, 'bookings');
    }, [firestore, tripId]);

    const { data: bookings, isLoading } = useCollection<Booking>(bookingsQuery);

    if (isLoading) return <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>;
    if (!bookings || bookings.length === 0) return <p className="text-sm text-muted-foreground p-2">Aucune demande de réservation pour le moment.</p>;

    return (
        <div className="space-y-2">
            {bookings.map(booking => (
                <BookingRow key={booking.id} booking={booking} tripId={tripId} isOwner={isOwner} driverUserId={driverUserId} />
            ))}
        </div>
    );
};


function ShareButton({ origin, destination }: { origin: string; destination: string }) {
    const { toast } = useToast();

    const handleShare = async () => {
        const url = window.location.href;
        const title = `Covoiturage ${origin} → ${destination}`;
        const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
        if (typeof nav.share === 'function') {
            try { await nav.share({ title, url }); } catch { /* annulé */ }
        } else {
            await navigator.clipboard.writeText(url);
            toast({ title: 'Lien copié !', description: 'Partagez ce lien avec vos contacts.' });
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
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
    const autobook = searchParams.get('autobook') === '1';
    const [showBookingConfirm, setShowBookingConfirm] = React.useState(false);
    const [isBooking, setIsBooking] = React.useState(false);

    const tripRef = useMemoFirebase(() => {
        if (!firestore || !tripId) return null;
        return doc(firestore, 'trips', tripId);
    }, [firestore, tripId]);
    const { data: trip, isLoading: isTripLoading } = useDoc<Trip>(tripRef);
    
    const driverId = trip?.offeredBy;
    const driverRef = useMemoFirebase(() => {
        if (!firestore || !driverId) return null;
        return doc(firestore, 'users', driverId);
    }, [firestore, driverId]);
    const { data: driver, isLoading: isDriverLoading } = useDoc<UserProfile>(driverRef);

    const isOwner = user?.uid === driverId;

    const userBookingQuery = useMemoFirebase(() => {
        if (!firestore || !tripId || !user || isOwner) return null;
        const bookingsRef = collection(firestore, 'trips', tripId, 'bookings');
        return query(bookingsRef, where('travelerId', '==', user.uid));
    }, [firestore, tripId, user, isOwner]);

    const { data: userBookingResult, isLoading: isUserBookingLoading } = useCollection<Booking>(userBookingQuery);

    const vehicleRef = useMemoFirebase(() => {
        if (!firestore || !trip?.vehicleId || !trip?.offeredBy) return null;
        return doc(firestore, 'users', trip.offeredBy, 'vehicles', trip.vehicleId);
    }, [firestore, trip?.vehicleId, trip?.offeredBy]);
    const { data: vehicle } = useDoc<Vehicle>(vehicleRef);

    const isLoading = isUserLoading || isTripLoading || isDriverLoading || isUserBookingLoading;

    const handleBookTrip = async () => {
        if (!firestore || !user || !trip) return;

        setIsBooking(true);
        try {
            const tripRef = doc(firestore, 'trips', trip.id);
            const bookingsCollection = collection(firestore, 'trips', trip.id, 'bookings');

            await runTransaction(firestore, async (transaction) => {
                const tripSnap = await transaction.get(tripRef);
                if (!tripSnap.exists()) throw new Error('Trajet introuvable.');

                const current = tripSnap.data() as Trip;
                const booked = current.totalBookings ?? 0;
                if (booked >= current.availableSeats) throw new Error('Plus de places disponibles.');

                const bookingRef = doc(bookingsCollection);
                transaction.set(bookingRef, {
                    tripId: trip.id,
                    travelerId: user.uid,
                    offeredBy: current.offeredBy,
                    status: 'pending',
                    createdAt: serverTimestamp(),
                });
                transaction.update(tripRef, { totalBookings: increment(1) });
            });

            toast({
                title: "Réservation confirmée !",
                description: "Votre place est réservée. Bon voyage !",
            });
            router.push('/dashboard');

        } catch (error: any) {
            console.error("Booking error: ", error);
            toast({
                variant: "destructive",
                title: "Erreur de réservation",
                description: error.message || "Impossible de réserver ce trajet. Veuillez réessayer."
            });
        } finally {
            setIsBooking(false);
            setShowBookingConfirm(false);
        }
    }

    // Auto-ouvre la modal après retour d'authentification
    React.useEffect(() => {
        if (!isLoading && autobook && user && !isOwner) {
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
    const reservedSeats = trip.totalBookings || 0;
    const totalSeats = trip.availableSeats;
    const userBooking = userBookingResult?.[0];
    const isAccepted = userBooking?.status === 'accepted';
    const gradient = getGradient(trip.destination);
    const remainingSeats = totalSeats - reservedSeats;
    const hasAlreadyBooked = userBookingResult ? userBookingResult.length > 0 : false;
    const isSoldOut = remainingSeats <= 0;

    return (
        <>
            <div className="container py-12 px-4 md:px-6">
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div className="md:col-span-2 space-y-8">
                    <div>
                        {/* Bannière gradient — zéro requête réseau, couleur déterministe */}
                        <div
                            className="relative h-44 md:h-56 w-full rounded-xl overflow-hidden mb-4"
                            style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
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
                                <span>{format(departureDate, 'd MMMM yyyy', { locale: fr })} à {format(departureDate, 'HH:mm')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShareButton origin={trip.origin} destination={trip.destination} />
                                <Badge variant="secondary" className="text-xl sm:text-2xl font-bold py-1 px-3 sm:px-4">{trip.pricePerSeat}$</Badge>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* ── Carte conducteur enrichie ── */}
                    <div>
                        <h2 className="text-xl font-bold mb-3">Votre conducteur</h2>
                        <Card className="overflow-hidden">
                            <div className="h-1" style={{ background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})` }} />
                            <CardContent className="p-5 space-y-4">
                                {/* Identité */}
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-16 w-16 border-2 border-primary/20 shrink-0">
                                        <AvatarImage src={driver.profilePictureUrl} alt={driver.name} />
                                        <AvatarFallback className="text-lg">{getInitials(driver.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-lg leading-tight">{driver.name}</p>
                                            {driver.isVerified && (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                                                    Vérifié
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                                            <span className="font-semibold text-sm">{driver.averageRating?.toFixed(1) ?? 'N/A'}</span>
                                            <span className="text-sm text-muted-foreground">({driver.totalRatings ?? 0} avis)</span>
                                        </div>
                                        {driver.city && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />{driver.city}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Véhicule — visible par tous */}
                                {vehicle && (
                                    <div className="border-t pt-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Véhicule</p>
                                        <div className="flex items-center gap-3">
                                            {vehicle.imageUrl ? (
                                                <div className="relative h-14 w-20 rounded-lg overflow-hidden shrink-0 border">
                                                    <Image src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} fill className="object-cover" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-14 w-14 rounded-lg bg-muted shrink-0">
                                                    <Car className="h-7 w-7 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold">{vehicle.make} {vehicle.model} {vehicle.year}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
                                                    <span
                                                        className="inline-block h-3 w-3 rounded-full border border-border shrink-0"
                                                        style={{ backgroundColor: vehicle.color.toLowerCase() }}
                                                        title={vehicle.color}
                                                    />
                                                    <span>{vehicle.color}</span>
                                                    {/* Plaque + province — visible seulement pour le voyageur accepté ou le conducteur */}
                                                    {(isAccepted || isOwner) && vehicle.province && (
                                                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5">
                                                            <span className="text-xs font-bold text-primary">{vehicle.province}</span>
                                                            <span className="text-muted-foreground">·</span>
                                                            <span className="font-mono font-semibold tracking-widest text-foreground text-xs">{vehicle.licensePlate}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bannière statut réservation */}
                                {isAccepted && (() => {
                                    const mapsUrl = trip.originCoords
                                        ? `https://www.google.com/maps/dir/?api=1&destination=${trip.originCoords.lat},${trip.originCoords.lng}`
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.origin)}`;
                                    return (
                                        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 space-y-2.5">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-semibold text-green-700 dark:text-green-400">Réservation acceptée !</p>
                                                    <p className="text-sm text-green-600 dark:text-green-500 mt-0.5">
                                                        Présentez-vous le {format(departureDate, 'd MMMM à HH:mm', { locale: fr })}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Point de départ + lien GPS */}
                                            <div className="flex items-center justify-between gap-3 rounded-md bg-green-100/60 dark:bg-green-900/30 px-3 py-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                                                    <span className="text-sm text-green-700 dark:text-green-300 truncate">{trip.origin}</span>
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
                                            {(userBooking?.driverPhone || userBooking?.driverEmail) && (
                                                <div className="rounded-md bg-green-100/60 dark:bg-green-900/30 px-3 py-2 space-y-1.5">
                                                    <p className="text-xs font-semibold text-green-700 dark:text-green-400">Contacter le conducteur</p>
                                                    {userBooking.driverPhone && (
                                                        <a href={`tel:${userBooking.driverPhone}`} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 hover:underline">
                                                            <Phone className="h-3.5 w-3.5 shrink-0" />
                                                            {userBooking.driverPhone}
                                                        </a>
                                                    )}
                                                    {userBooking.driverEmail && (
                                                        <a href={`mailto:${userBooking.driverEmail}`} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 hover:underline">
                                                            <Mail className="h-3.5 w-3.5 shrink-0" />
                                                            {userBooking.driverEmail}
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {userBooking?.status === 'pending' && (
                                    <div className="flex items-center gap-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3">
                                        <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                                        <p className="text-sm text-yellow-700 dark:text-yellow-400">En attente de confirmation du conducteur</p>
                                    </div>
                                )}
                                {userBooking?.status === 'rejected' && (
                                    <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                        <p className="text-sm text-red-600 dark:text-red-400">Votre demande a été refusée par le conducteur</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Separator />

                     <div>
                        <h2 className="text-2xl font-bold mb-4">Détails, options et paiement</h2>
                        <Card>
                            <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <div className="flex items-center gap-3">
                                    <Users className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-semibold">Places restantes</p>
                                        <p className="text-muted-foreground">{remainingSeats} / {totalSeats}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3" data-glowing={trip.options?.isNonSmoking}>
                                    <CigaretteOff className={cn("h-8 w-8", trip.options?.isNonSmoking ? "text-primary": "text-muted-foreground/50")} />
                                    <div>
                                        <p className="font-semibold">Non-fumeur</p>
                                        <p className="text-muted-foreground">{trip.options?.isNonSmoking ? 'Oui' : 'Non'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Dog className={cn("h-8 w-8", trip.options?.allowPets ? "text-primary": "text-muted-foreground/50")} />
                                    <div>
                                        <p className="font-semibold">Animaux</p>
                                        <p className="text-muted-foreground">{trip.options?.allowPets ? 'Permis' : 'Non permis'}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <Luggage className={cn("h-8 w-8", trip.options?.allowLargeBags ? "text-primary": "text-muted-foreground/50")} />
                                    <div>
                                        <p className="font-semibold">Grands bagages</p>
                                        <p className="text-muted-foreground">{trip.options?.allowLargeBags ? 'Permis' : 'Non permis'}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <Banknote className={cn("h-8 w-8", trip.paymentOptions?.cash ? "text-primary": "text-muted-foreground/50")} />
                                    <div>
                                        <p className="font-semibold">Argent comptant</p>
                                        <p className="text-muted-foreground">{trip.paymentOptions?.cash ? 'Accepté' : 'Non'}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <Landmark className={cn("h-8 w-8", trip.paymentOptions?.interac ? "text-primary": "text-muted-foreground/50")} />
                                    <div>
                                        <p className="font-semibold">Virement Interac</p>
                                        <p className="text-muted-foreground">{trip.paymentOptions?.interac ? 'Accepté' : 'Non'}</p>
                                    </div>
                                 </div>
                            </CardContent>
                            {trip.details && (
                                <>
                                    <Separator/>
                                    <CardContent className="p-6">
                                        <p className="text-muted-foreground italic">"{trip.details}"</p>
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
                                    <PassengersList tripId={trip.id} isOwner={isOwner} driverUserId={user?.uid} />
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                <div className="md:col-span-1">
                    <Card className="sticky top-24 overflow-hidden">
                        <div className="h-1" style={{ background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})` }} />
                        <CardContent className="p-6">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-muted-foreground">Prix par passager</span>
                                <span className="text-2xl font-bold">{trip.pricePerSeat}$</span>
                            </div>

                            {isOwner ? (
                                <Button className="w-full" disabled>Vous êtes le conducteur</Button>
                            ) : isAccepted ? (
                                <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 py-2.5 text-green-700 dark:text-green-400 font-semibold text-sm">
                                    <CheckCircle className="h-4 w-4" />
                                    Réservation confirmée
                                </div>
                            ) : userBooking?.status === 'pending' ? (
                                <Button className="w-full" disabled variant="outline">
                                    <Clock className="h-4 w-4 mr-2" />
                                    En attente…
                                </Button>
                            ) : isSoldOut ? (
                                <Button className="w-full" disabled>Complet</Button>
                            ) : hasAlreadyBooked ? (
                                <Button className="w-full" disabled>Vous avez déjà réservé</Button>
                            ) : (
                                <Button className="w-full" size="lg" onClick={() => user ? setShowBookingConfirm(true) : router.push(`/login?redirect=${encodeURIComponent(`/trip-details/${tripId}?autobook=1`)}`)}>
                                    Réserver ce trajet
                                </Button>
                            )}

                            <p className="text-xs text-muted-foreground text-center mt-4">
                                Une fois la réservation confirmée, vous pourrez vous arranger avec le conducteur pour le paiement.
                            </p>
                        </CardContent>
                    </Card>
                </div>
                </div>
            </div>
            
            <AlertDialog open={showBookingConfirm} onOpenChange={setShowBookingConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la réservation ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous êtes sur le point de réserver une place pour le trajet de <strong>{trip.origin}</strong> à <strong>{trip.destination}</strong> pour <strong>{trip.pricePerSeat}$</strong>.
                             Le conducteur accepte les paiements par : 
                             <span className="font-semibold">{trip.paymentOptions?.cash && "Argent comptant"}{trip.paymentOptions?.cash && trip.paymentOptions?.interac && ' et '}{trip.paymentOptions?.interac && "Virement Interac"}</span>.
                             <br/><br/>
                             Une fois la réservation confirmée, vous pourrez discuter des détails avec le conducteur.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBooking}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBookTrip} disabled={isBooking}>
                             {isBooking && <LoadingLogo className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmer la réservation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function TripDetailsPage() {
    return (
        <React.Suspense fallback={<TripDetailSkeleton />}>
            <TripDetailsPageContent />
        </React.Suspense>
    )
}
