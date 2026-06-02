'use client';

import * as React from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { LoadingLogo } from '@/components/LoadingLogo';
import { TripDetailSkeleton } from '@/components/skeletons/TripDetailSkeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Calendar, Users, Briefcase, Dog, CigaretteOff, Luggage, Landmark, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import type { Trip, UserProfile, Booking } from '@/types/db';
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

const getInitials = (name: string | undefined) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('');
};

const Passenger = ({ travelerId }: { travelerId: string }) => {
    const firestore = useFirestore();
    const travelerRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', travelerId);
    }, [firestore, travelerId]);

    const { data: traveler, isLoading } = useDoc<UserProfile>(travelerRef);

    if (isLoading) {
        return <Skeleton className="h-12 w-full rounded-md" />;
    }

    if (!traveler) {
        return <div className="p-3 text-sm text-muted-foreground">Voyageur inconnu</div>;
    }

    return (
        <div className="flex items-center justify-between p-2 rounded-lg">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={traveler.profilePictureUrl} alt={traveler.name} />
                    <AvatarFallback>{getInitials(traveler.name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{traveler.name}</span>
            </div>
        </div>
    );
};

const PassengersList = ({ tripId }: { tripId: string }) => {
    const firestore = useFirestore();
    
    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'trips', tripId, 'bookings');
    }, [firestore, tripId]);
    
    const { data: bookings, isLoading } = useCollection<Booking>(bookingsQuery);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }
    
    if (!bookings || bookings.length === 0) {
        return <p className="text-sm text-muted-foreground p-2">Aucune réservation pour le moment.</p>;
    }

    return (
        <div className="space-y-2">
            {bookings.map(booking => (
                <Passenger key={booking.id} travelerId={booking.travelerId} />
            ))}
        </div>
    );
};


function TripDetailsPageContent() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const tripId = params.tripId as string;
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

    const isLoading = isUserLoading || isTripLoading || isDriverLoading || isUserBookingLoading;

    const toSeed = (s: string) => {
        if (!s) return 0;
        return s.split('').reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
        }, 0);
    };

    const handleBookTrip = async () => {
        if (!firestore || !user || !trip) return;

        setIsBooking(true);
        try {
            const bookingsCollection = collection(firestore, 'trips', trip.id, 'bookings');
            await addDoc(bookingsCollection, {
                tripId: trip.id,
                travelerId: user.uid,
                status: 'pending',
                createdAt: serverTimestamp(),
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
    const remainingSeats = totalSeats - reservedSeats;
    const hasAlreadyBooked = userBookingResult ? userBookingResult.length > 0 : false;
    const isSoldOut = remainingSeats <= 0;

    return (
        <>
            <div className="container py-12 px-4 md:px-6">
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div className="md:col-span-2 space-y-8">
                    <div>
                        <div className="relative h-64 md:h-96 w-full rounded-lg overflow-hidden mb-4">
                            <Image
                                src={`https://picsum.photos/seed/${toSeed(trip.destination)}/1200/800`}
                                alt={`Paysage représentant la destination: ${trip.destination}`}
                                fill
                                className="object-cover"
                                priority
                            />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <h1 className="text-3xl md:text-4xl font-bold">{trip.origin} &rarr; {trip.destination}</h1>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-lg text-muted-foreground">
                                <Calendar className="h-5 w-5" />
                                <span>{format(departureDate, 'd MMMM yyyy', { locale: fr })} à {format(departureDate, 'HH:mm')}</span>
                            </div>
                            <Badge variant="secondary" className="text-2xl font-bold py-1 px-4">{trip.pricePerSeat}$</Badge>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                         <h2 className="text-2xl font-bold">Votre conducteur</h2>
                         <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-bold text-lg">{driver.name}</p>
                                <div className="flex items-center justify-end gap-1 text-muted-foreground">
                                    <Star className="w-5 h-5 fill-primary text-primary" />
                                    <span className="font-semibold">{driver.averageRating?.toFixed(1) ?? 'N/A'}</span>
                                    <span>({driver.totalRatings ?? 0} avis)</span>
                                </div>
                            </div>
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={driver.profilePictureUrl} alt={driver.name} />
                                <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                            </Avatar>
                         </div>
                    </div>

                    <Separator />

                     <div>
                        <h2 className="text-2xl font-bold mb-4">Détails, options et paiement</h2>
                        <Card>
                            <CardContent className="p-6 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                    <PassengersList tripId={trip.id} />
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                <div className="md:col-span-1">
                    <Card className="sticky top-24">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold mb-4">Réservez votre place</h3>
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-muted-foreground">Prix par passager</span>
                                <span className="text-2xl font-bold">{trip.pricePerSeat}$</span>
                            </div>
                            
                            {isOwner ? (
                                <Button className="w-full" disabled>Vous êtes le conducteur</Button>
                            ) : hasAlreadyBooked ? (
                                 <Button className="w-full" disabled>Vous avez déjà réservé</Button>
                            ) : isSoldOut ? (
                                <Button className="w-full" disabled>Complet</Button>
                            ) : (
                                 <Button className="w-full" size="lg" onClick={() => user ? setShowBookingConfirm(true) : router.push('/login')}>Réserver ce trajet</Button>
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
