
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
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
import { Loader2, Star } from 'lucide-react';
import { TripCard } from '@/components/TripCard';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { Chatbot } from '@/components/Chatbot';

// Mock data, to be replaced with Firestore data
const upcomingTrips = [
    {
      from: 'Montréal',
      to: 'Québec',
      date: '15 Août',
      price: '35$',
      driver: {
        name: 'Amélie Tremblay',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-1')?.imageUrl || '',
        rating: 4.9,
      },
    }
];

const pastTrips = [
    {
      from: 'Longueuil',
      to: 'Laval',
      date: '02 Août',
      price: '15$',
      driver: {
        name: 'Félix Bouchard',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-2')?.imageUrl || '',
        rating: 4.8,
      },
    },
    {
      from: 'Montréal',
      to: 'Sherbrooke',
      date: '28 Juil',
      price: '25$',
      driver: {
        name: 'Florence Gagnon',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-3')?.imageUrl || '',
        rating: 5.0,
      },
    }
];


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Create a memoized document reference
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  // Use the useDoc hook to get real-time user data
  const { data: userData, isLoading: isDataLoading } = useDoc(userDocRef);

  React.useEffect(() => {
    // Redirect if user is not logged in after auth state is resolved
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Combined loading state
  const isLoading = isUserLoading || isDataLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || !userData) {
    // This can happen briefly during redirect or if the user document doesn't exist
    // You might want to show a more specific message if userData is null but user is not
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
                <TabsTrigger value="upcoming">Trajets à venir</TabsTrigger>
                <TabsTrigger value="history">Historique des trajets</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="mt-6">
                  {upcomingTrips.length > 0 ? (
                      <div className="grid gap-6">
                          {upcomingTrips.map((trip, index) => <TripCard key={index} {...trip} />)}
                      </div>
                  ) : (
                      <Card>
                          <CardContent className="p-6 text-center">
                              <p className="text-muted-foreground">Vous n'avez aucun trajet à venir pour le moment.</p>
                              <Button asChild className="mt-4">
                                  <Link href="/trips">Trouver un trajet</Link>
                              </Button>
                          </CardContent>
                      </Card>
                  )}
              </TabsContent>
              <TabsContent value="history" className="mt-6">
                  {pastTrips.length > 0 ? (
                      <div className="grid gap-6">
                          {pastTrips.map((trip, index) => <TripCard key={index} {...trip} />)}
                      </div>
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
    </>
  );
}
