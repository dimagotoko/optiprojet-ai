'use client';

import * as React from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MapPin, ArrowRight, Calendar, Car } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { UserProfile, Trip } from '@/types/db';

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

function PublicProfileSkeleton() {
  return (
    <div className="container py-12 px-4 md:px-6 max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-28 w-28 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export default function PublicProfilePage() {
  const firestore = useFirestore();
  const params = useParams();
  const userId = params.userId as string;

  const userRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userRef);

  const upcomingTripsQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, 'trips'),
      where('offeredBy', '==', userId),
      where('departureTime', '>=', new Date()),
      orderBy('departureTime', 'asc'),
      limit(5)
    );
  }, [firestore, userId]);

  const { data: upcomingTrips, isLoading: isTripsLoading } = useCollection<Trip>(upcomingTripsQuery);

  if (isProfileLoading) return <PublicProfileSkeleton />;

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] gap-4">
        <Car className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Profil introuvable</h1>
        <Button asChild variant="outline"><Link href="/">Retour à l'accueil</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-12 px-4 md:px-6 max-w-3xl mx-auto space-y-8">
      {/* En-tête profil */}
      <div className="flex flex-col items-center text-center gap-3">
        <Avatar className="h-28 w-28">
          <AvatarImage src={profile.profilePictureUrl} alt={profile.name} />
          <AvatarFallback className="text-3xl">{getInitials(profile.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          {profile.city && (
            <p className="flex items-center justify-center gap-1 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />{profile.city}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">{profile.role || 'Voyageur'}</Badge>
          {profile.totalRatings && profile.totalRatings > 0 ? (
            <span className="flex items-center gap-1 text-sm font-medium">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {profile.averageRating?.toFixed(1)}
              <span className="text-muted-foreground">({profile.totalRatings} avis)</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Pas encore noté</span>
          )}
        </div>
      </div>

      {/* Trajets à venir */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" /> Prochains trajets
        </h2>
        {isTripsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !upcomingTrips || upcomingTrips.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Aucun trajet à venir publié.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingTrips.map(trip => (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold flex items-center gap-1">
                      <span>{trip.origin}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{trip.destination}</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {format(trip.departureTime.toDate(), 'd MMM yyyy · HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="font-bold">{trip.pricePerSeat}$</Badge>
                    <Button size="sm" asChild>
                      <Link href={`/trip-details/${trip.id}`}>Réserver</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
