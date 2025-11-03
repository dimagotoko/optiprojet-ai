
'use client';
import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, DocumentData, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ArrowRight, Calendar, Users, MoreVertical, Edit, Trash2, MessageSquare, Phone, Lock, Unlock } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Badge } from '@/components/ui/badge';

type Trip = {
    id: string;
    origin: string;
    destination: string;
    departureTime: Timestamp;
    pricePerSeat: number;
    availableSeats: number;
    offeredBy: string;
    isClosed?: boolean;
};

type Booking = {
    id: string;
    travelerId: string;
};

type UserProfile = {
    id: string;
    name: string;
    profilePictureUrl?: string;
    averageRating?: number;
};

const BookingCard = ({ booking }: { booking: Booking }) => {
    const firestore = useFirestore();
    const travelerRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', booking.travelerId);
    }, [firestore, booking.travelerId]);

    const { data: traveler, isLoading } = useDoc<UserProfile>(travelerRef);

    if (isLoading) {
        return <Skeleton className="h-10 w-full rounded-md" />;
    }

    if (!traveler) {
        return null;
    }
    
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

    return (
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={traveler.profilePictureUrl} alt={traveler.name} />
                    <AvatarFallback>{getInitials(traveler.name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{traveler.name}</span>
            </div>
            <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Discuter (bientôt disponible)</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Phone className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Contacter (bientôt disponible)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};

export const TripDetailsCard = ({ trip, driverProfile, currentUserId, onDeleteClick, onEditClick, onToggleCloseTrip }: { trip: Trip, driverProfile: UserProfile | null, currentUserId: string, onDeleteClick: (tripId: string) => void, onEditClick: (tripId: string) => void, onToggleCloseTrip: (tripId: string, currentState: boolean) => void }) => {
    const firestore = useFirestore();

    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'trips', trip.id, 'bookings');
    }, [firestore, trip.id]);

    const { data: bookings, isLoading: bookingsLoading } = useCollection<Booking>(bookingsQuery);

    const reservedSeats = bookings?.length ?? 0;
    const totalSeats = trip.availableSeats + reservedSeats;
    const progressValue = totalSeats > 0 ? (reservedSeats / totalSeats) * 100 : 0;
    const isOwner = trip.offeredBy === currentUserId;
    const isPastTrip = trip.departureTime.toDate() < new Date();

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <span>{trip.origin}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span>{trip.destination}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1 text-sm">
                            <Calendar className="h-4 w-4" />
                            {format(trip.departureTime.toDate(), 'd MMM yyyy à HH:mm', { locale: fr })}
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Badge variant={trip.isClosed ? 'destructive' : 'secondary'} className="text-lg font-bold">
                            {trip.pricePerSeat}$
                        </Badge>
                         {isOwner && !isPastTrip && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onToggleCloseTrip(trip.id, !!trip.isClosed)}>
                                        {trip.isClosed ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                                        <span>{trip.isClosed ? 'Rouvrir' : 'Fermer'} les réservations</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onEditClick(trip.id)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Modifier</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDeleteClick(trip.id)} className="text-red-500 focus:text-red-500" disabled={reservedSeats > 0}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Annuler</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Places réservées</span>
                        </div>
                        <span className="font-semibold">{reservedSeats} / {totalSeats}</span>
                    </div>
                    <Progress value={progressValue} aria-label={`${reservedSeats} sur ${totalSeats} places réservées`} />
                </div>
            </CardContent>
            {isOwner && bookings && bookings.length > 0 && (
                <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                    <h4 className="font-semibold text-sm">Voyageurs</h4>
                     <div className="w-full space-y-1">
                        {bookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}
                     </div>
                </CardFooter>
            )}
        </Card>
    );
};
