
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, Timestamp, DocumentData, deleteDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { Chatbot } from '@/components/Chatbot';
import { LoadingLogo } from '@/components/LoadingLogo';
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
import { TripDetailsCard } from '@/components/TripDetailsCard';


type Trip = {
    id: string;
    origin: string;
    destination: string;
    departureTime: Timestamp;
    pricePerSeat: number;
    offeredBy: string;
    availableSeats: number;
    isClosed?: boolean;
};

type UserProfile = {
    id: string;
    name: string;
    profilePictureUrl?: string;
    averageRating?: number;
    role?: string;
    totalRatings?: number;
}

function TripList({ trips, userProfile, currentUserId, onDeleteClick, onEditClick, onToggleCloseTrip }: { trips: Trip[] | null, userProfile: UserProfile | null, currentUserId: string, onDeleteClick: (tripId: string) => void, onEditClick: (tripId: string) => void, onToggleCloseTrip: (tripId: string, currentState: boolean) => void }) {
    if (!trips || trips.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                        {userProfile?.role === 'transporteur' 
                            ? "Vous n'avez aucun trajet programmé."
                            : "Vous n'avez aucun trajet à venir pour le moment."
                        }
                    </p>
                    <Button asChild className="mt-4">
                        <Link href={userProfile?.role === 'transporteur' ? "/post-trip" : "/trips"}>
                            {userProfile?.role === 'transporteur' ? "Proposer un trajet" : "Trouver un trajet"}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-6">
            {trips.map((trip) => (
                <TripDetailsCard 
                    key={trip.id}
                    trip={trip}
                    driverProfile={userProfile}
                    currentUserId={currentUserId}
                    onDeleteClick={onDeleteClick}
                    onEditClick={onEditClick}
                    onToggleCloseTrip={onToggleCloseTrip}
                />
            ))}
        </div>
    );
}


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [tripToDelete, setTripToDelete] = React.useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc<UserProfile>(userDocRef);
  
  const tripsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userData) return null;
    if (userData.role === 'transporteur') {
        return query(collection(firestore, 'trips'), where('offeredBy', '==', user.uid));
    }
    // TODO: Implement logic for travelers (e.g., query bookings subcollection)
    return null; 
  }, [firestore, user, userData]);

  const { data: allTrips, isLoading: isTripsLoading } = useCollection<Trip>(tripsQuery);

  const { upcomingTrips, pastTrips } = React.useMemo(() => {
    if (!allTrips) return { upcomingTrips: [], pastTrips: [] };
    
    const now = new Date();
    const upcoming: Trip[] = [];
    const past: Trip[] = [];

    allTrips.forEach(trip => {
      if (trip.departureTime.toDate() >= now) {
        upcoming.push(trip);
      } else {
        past.push(trip);
      }
    });

    upcoming.sort((a, b) => a.departureTime.toMillis() - b.departureTime.toMillis());
    past.sort((a, b) => b.departureTime.toMillis() - a.departureTime.toMillis());

    return { upcomingTrips: upcoming, pastTrips: past };
  }, [allTrips]);
  

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleDeleteClick = (tripId: string) => {
    // TODO: Check for bookings before allowing deletion
    setTripToDelete(tripId);
  };

  const handleEditClick = (tripId: string) => {
    // TODO: Implement edit functionality
    toast({
        title: "Fonctionnalité à venir",
        description: "La modification des trajets sera bientôt disponible.",
    });
  };

  const handleToggleCloseTrip = async (tripId: string, currentState: boolean) => {
    if (!firestore) return;
    try {
        const tripRef = doc(firestore, 'trips', tripId);
        await updateDoc(tripRef, { isClosed: !currentState });
        toast({
            title: "Mise à jour réussie",
            description: `Les réservations pour ce trajet ont été ${!currentState ? 'fermées' : 'rouvertes'}.`
        });
    } catch (error) {
        console.error("Error toggling trip state: ", error);
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de mettre à jour le statut du trajet."
        });
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!tripToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'trips', tripToDelete));
      toast({
        title: "Trajet annulé",
        description: "Votre trajet a été supprimé avec succès."
      });
    } catch (error) {
      console.error("Error deleting trip: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'annuler le trajet. Veuillez réessayer."
      });
    } finally {
      setTripToDelete(null);
    }
  };


  const isLoading = isUserLoading || isUserDocLoading || (!!tripsQuery && isTripsLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <LoadingLogo className="h-12 w-12 text-primary" />
      </div>
    );
  }
  
  if (!user || !userData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <p>Utilisateur non trouvé.</p>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }


  return (
    <>
      <div className="container py-12 px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={userData?.profilePictureUrl || user.photoURL || undefined} alt={userData?.name || 'Avatar'} />
                    <AvatarFallback className="text-3xl">
                        {userData?.name ? getInitials(userData.name) : (user.displayName ? getInitials(user.displayName) : '')}
                    </AvatarFallback>
                  </Avatar>
                <CardTitle className="text-2xl">{userData?.name || user.displayName}</CardTitle>
                <CardDescription className="capitalize">{userData?.role || 'Voyageur'}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex justify-center items-center gap-1 text-lg">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                  <span className="font-bold">{userData?.averageRating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-muted-foreground">({userData?.totalRatings || 0} avis)</span>
                </div>
                <Button asChild className="mt-6 w-full">
                  <Link href="/profile">Modifier le profil</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold tracking-tight mb-8">
              Bonjour, {userData?.name?.split(' ')[0] || user.displayName?.split(' ')[0]} !
            </h1>
            <Tabs defaultValue="upcoming">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">{userData?.role === 'transporteur' ? "Trajets publiés" : "Trajets à venir"}</TabsTrigger>
                <TabsTrigger value="history">Historique des trajets</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="mt-6">
                <TripList 
                    trips={upcomingTrips} 
                    userProfile={userData} 
                    currentUserId={user.uid} 
                    onDeleteClick={handleDeleteClick}
                    onEditClick={handleEditClick}
                    onToggleCloseTrip={handleToggleCloseTrip}
                />
              </TabsContent>
              <TabsContent value="history" className="mt-6">
                  {pastTrips.length > 0 ? (
                      <TripList 
                          trips={pastTrips} 
                          userProfile={userData} 
                          currentUserId={user.uid} 
                          onDeleteClick={handleDeleteClick}
                          onEditClick={handleEditClick}
                          onToggleCloseTrip={handleToggleCloseTrip}
                      />
                  ) : (
                      <Card>
                          <CardContent className="p-6 text-center">
                              <p className="text-muted-foreground">Vous n'avez effectué aucun trajet.</p>
                          </CardContent>
                      </Card>
                  )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Chatbot onSearch={(search) => router.push(`/trips?departure=${search.departure}&destination=${search.destination}&date=${search.date}`)} />
      
      <AlertDialog open={!!tripToDelete} onOpenChange={(open) => !open && setTripToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce trajet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Voulez-vous vraiment annuler ce trajet ?
              Cette option est disponible car aucune réservation n'a encore été effectuée.
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
