'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Chatbot } from '@/components/Chatbot';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { VoyageurDashboard } from '@/components/dashboard/voyageur/VoyageurDashboard';
import { TransporteurDashboard } from '@/components/dashboard/transporteur/TransporteurDashboard';
import type { UserProfile } from '@/types/db';

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [greeting, setGreeting] = React.useState('Bonjour');

  React.useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Bonjour');
    else if (h < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
  }, []);

  React.useEffect(() => {
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc<UserProfile>(userDocRef);

  const isLoading = isUserLoading || (!!user && isUserDocLoading);

  if (isLoading) return <DashboardSkeleton />;
  if (!user) return null;

  if (!userData && !isUserDocLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Profil non trouvé</h2>
        <p className="text-muted-foreground max-w-md mt-2">
          Nous n'avons pas pu charger votre profil. Veuillez compléter vos informations pour continuer.
        </p>
        <Button asChild className="mt-6">
          <Link href="/profile">Compléter mon profil</Link>
        </Button>
      </div>
    );
  }

  const isTransporteur = userData?.role === 'transporteur';

  return (
    <>
      <div className="container py-12 px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Profil */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={userData?.profilePictureUrl || user?.photoURL || undefined} alt={userData?.name || 'Avatar'} />
                  <AvatarFallback className="text-3xl">
                    {userData?.name ? getInitials(userData.name) : (user?.displayName ? getInitials(user.displayName) : '')}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl">{userData?.name || user?.displayName}</CardTitle>
                <CardDescription className="capitalize">{userData?.role || 'Voyageur'}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex justify-center items-center gap-1 text-lg">
                  {userData?.totalRatings && userData.totalRatings > 0 ? (
                    <>
                      <Star className="w-5 h-5 fill-primary text-primary" />
                      <span className="font-bold">{userData.averageRating?.toFixed(1)}</span>
                      <span className="text-muted-foreground text-sm">({userData.totalRatings} avis)</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Pas encore noté</span>
                  )}
                </div>
                <Button asChild className="mt-6 w-full">
                  <Link href="/profile">Modifier le profil</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contenu principal par rôle */}
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold tracking-tight mb-8">
              {greeting}, {userData?.name?.split(' ')[0] || user?.displayName?.split(' ')[0]} ! 👋
            </h1>
            {userData && (
              isTransporteur ? (
                <TransporteurDashboard userId={user.uid} userData={userData} />
              ) : (
                <VoyageurDashboard userId={user.uid} userData={userData} />
              )
            )}
          </div>
        </div>
      </div>

      <Chatbot onSearch={(s) => router.push(`/trips?departure=${s.departure}&destination=${s.destination}&date=${s.date}`)} />
    </>
  );
}
