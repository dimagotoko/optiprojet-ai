
'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingLogo } from '@/components/LoadingLogo';
import { useAdmin } from '@/hooks/use-admin';
import { useRouter } from 'next/navigation';
import { Trip, UserProfile } from '@/types/db';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function UsersTable() {
    const firestore = useFirestore();
    const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

    if (isLoading) return <div className="py-4"><LoadingLogo className="mx-auto h-8 w-8" /></div>;

    if (!users) return <p className="text-muted-foreground p-4 text-center">Impossible de charger les utilisateurs.</p>;

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead className="text-center">Rôle</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map(user => (
                    <TableRow key={user.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.profilePictureUrl} alt={user.name} />
                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.city}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={user.role === 'transporteur' ? 'secondary' : 'outline'} className="capitalize">{user.role}</Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function TripsTable() {
    const firestore = useFirestore();
    const tripsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'trips')) : null, [firestore]);
    const { data: trips, isLoading } = useCollection<Trip>(tripsQuery);
    
    if (isLoading) return <div className="py-4"><LoadingLogo className="mx-auto h-8 w-8" /></div>;

    if (!trips) return <p className="text-muted-foreground p-4 text-center">Impossible de charger les trajets.</p>;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Trajet</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Conducteur ID</TableHead>
                    <TableHead className="text-center">Places</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {trips.map(trip => (
                    <TableRow key={trip.id}>
                        <TableCell className="font-medium">{trip.origin} &rarr; {trip.destination}</TableCell>
                        <TableCell>{format(trip.departureTime.toDate(), 'd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                        <TableCell className="font-mono text-xs">{trip.offeredBy}</TableCell>
                        <TableCell className="text-center">{trip.availableSeats}</TableCell>
                        <TableCell className="text-right">{trip.pricePerSeat}$</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


export default function AdminPage() {
    const { isAdmin, isCheckingAdmin } = useAdmin();
    const router = useRouter();

    React.useEffect(() => {
        // Redirect only when we are certain the user is not an admin.
        if (!isCheckingAdmin && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, isCheckingAdmin, router]);

    // While checking, or if the user is not an admin (and the redirect is in progress),
    // show a loading screen. This prevents any content from flashing.
    if (isCheckingAdmin || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
                <LoadingLogo className="h-12 w-12 text-primary" />
            </div>
        );
    }

    // If we've finished checking and the user is an admin, render the page.
    return (
        <div className="container py-12 px-4 md:px-6 space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Portail d'administration</h1>
                <p className="text-muted-foreground">Gestion des utilisateurs et des trajets de la plateforme.</p>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Utilisateurs</CardTitle>
                    <CardDescription>Liste de tous les utilisateurs inscrits sur la plateforme.</CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Trajets</CardTitle>
                    <CardDescription>Liste de tous les trajets publiés sur la plateforme.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TripsTable />
                </CardContent>
            </Card>
        </div>
    );
}
