'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Car, Users, Star } from 'lucide-react';
import { StatCard } from '../shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
import { TripDetailsCard } from '@/components/TripDetailsCard';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Trip, UserProfile } from '@/types/db';

interface TransporteurDashboardProps {
  userId: string;
  userData: UserProfile;
}

export function TransporteurDashboard({ userId, userData }: TransporteurDashboardProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [tripToDelete, setTripToDelete] = React.useState<string | null>(null);

  const tripsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'trips'), where('offeredBy', '==', userId));
  }, [firestore, userId]);

  const { data: allTrips, isLoading } = useCollection<Trip>(tripsQuery);

  const { upcomingTrips, pastTrips } = React.useMemo(() => {
    if (!allTrips) return { upcomingTrips: [], pastTrips: [] };
    const now = new Date();
    const upcoming = allTrips.filter(t => t.departureTime.toDate() >= now)
      .sort((a, b) => a.departureTime.toMillis() - b.departureTime.toMillis());
    const past = allTrips.filter(t => t.departureTime.toDate() < now)
      .sort((a, b) => b.departureTime.toMillis() - a.departureTime.toMillis());
    return { upcomingTrips: upcoming, pastTrips: past };
  }, [allTrips]);

  const totalBookings = (allTrips ?? []).reduce((acc, t) => acc + (t.totalBookings ?? 0), 0);
  const totalSeats = (allTrips ?? []).reduce((acc, t) => acc + t.availableSeats, 0);
  const fillRate = totalSeats > 0 ? Math.round((totalBookings / totalSeats) * 100) : 0;

  const handleEditClick = (tripId: string) => router.push(`/edit-trip/${tripId}`);

  const handleToggleCloseTrip = async (tripId: string, currentState: boolean) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'trips', tripId), { isClosed: !currentState });
      toast({ title: 'Mise à jour réussie', description: `Réservations ${!currentState ? 'fermées' : 'rouvertes'}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'trips', tripToDelete));
      toast({ title: 'Trajet annulé', description: 'Votre trajet a été supprimé.' });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'annuler le trajet.' });
    } finally {
      setTripToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Car}
            label="Trajets offerts"
            value={isLoading ? '…' : (allTrips?.length ?? 0)}
            subtitle={`${upcomingTrips.length} à venir`}
          />
          <StatCard
            icon={Users}
            label="Passagers totaux"
            value={isLoading ? '…' : totalBookings}
            subtitle={`${fillRate}% de taux de remplissage`}
          />
          <StatCard
            icon={Star}
            label="Note moyenne"
            value={userData.averageRating ? userData.averageRating.toFixed(1) : 'N/A'}
            subtitle={userData.totalRatings ? `${userData.totalRatings} avis` : 'Pas encore noté'}
            iconClassName="text-yellow-500"
          />
        </div>

        {/* Liste des trajets */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">Trajets publiés</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-6">
              {upcomingTrips.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Vous n'avez aucun trajet programmé.</p>
                    <Button asChild className="mt-4">
                      <Link href="/post-trip">Proposer un trajet</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {upcomingTrips.map(trip => (
                    <TripDetailsCard
                      key={trip.id}
                      trip={trip}
                      currentUserId={userId}
                      onDeleteClick={setTripToDelete}
                      onEditClick={handleEditClick}
                      onToggleCloseTrip={handleToggleCloseTrip}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              {pastTrips.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Aucun trajet passé.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {pastTrips.map(trip => (
                    <TripDetailsCard
                      key={trip.id}
                      trip={trip}
                      currentUserId={userId}
                      onDeleteClick={setTripToDelete}
                      onEditClick={handleEditClick}
                      onToggleCloseTrip={handleToggleCloseTrip}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog open={!!tripToDelete} onOpenChange={(open) => !open && setTripToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce trajet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Voulez-vous vraiment annuler ce trajet ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Oui, annuler le trajet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
