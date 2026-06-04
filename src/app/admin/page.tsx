
'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), orderBy('name')) : null, [firestore]);
    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

    if (isLoading) return <div className="py-12 flex justify-center"><LoadingLogo className="h-8 w-8 text-primary" /></div>;

    if (!users || users.length === 0) return <p className="text-muted-foreground p-8 text-center border rounded-lg border-dashed">Aucun utilisateur trouvé.</p>;

    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

    return (
        <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[250px]">Utilisateur</TableHead>
                        <TableHead>Email & Téléphone</TableHead>
                        <TableHead>Localisation</TableHead>
                        <TableHead className="text-center">Rôle</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map(user => (
                        <TableRow key={user.id} className="hover:bg-muted/30">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border shadow-sm">
                                        <AvatarImage src={user.profilePictureUrl} alt={user.name} />
                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm leading-tight">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">ID: {user.id.substring(0, 8)}...</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col text-sm">
                                    {/* email/phoneNumber dans /private/profile — consulter Firebase Console */}
                                    <span className="font-medium text-muted-foreground italic text-xs">Données privées</span>
                                    <span className="text-xs text-muted-foreground">→ Firebase Console</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col text-sm">
                                    <span className="font-medium">{user.city || 'N/A'}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant={user.role === 'transporteur' ? 'default' : 'secondary'} className="capitalize px-3">
                                    {user.role || 'voyageur'}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function TripsTable() {
    const firestore = useFirestore();
    const tripsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'trips'), orderBy('departureTime', 'desc')) : null, [firestore]);
    const { data: trips, isLoading } = useCollection<Trip>(tripsQuery);
    
    if (isLoading) return <div className="py-12 flex justify-center"><LoadingLogo className="h-8 w-8 text-primary" /></div>;

    if (!trips || trips.length === 0) return <p className="text-muted-foreground p-8 text-center border rounded-lg border-dashed">Aucun trajet publié.</p>;

    return (
        <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Itinéraire</TableHead>
                        <TableHead>Date & Heure</TableHead>
                        <TableHead className="text-center">Places</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {trips.map(trip => (
                        <TableRow key={trip.id} className="hover:bg-muted/30">
                            <TableCell>
                                <div className="flex items-center gap-2 font-semibold text-sm">
                                    <span>{trip.origin}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span>{trip.destination}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm">
                                    {format(trip.departureTime.toDate(), 'd MMM yyyy, HH:mm', { locale: fr })}
                                </span>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center bg-secondary/50 rounded-full px-2 py-1 text-xs font-bold">
                                    {trip.availableSeats}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <span className="font-bold text-primary">{trip.pricePerSeat}$</span>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant={trip.isClosed ? "destructive" : "outline"} className="text-[10px] uppercase">
                                    {trip.isClosed ? "Fermé" : "Ouvert"}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default function AdminPage() {
    const { isAdmin, isCheckingAdmin } = useAdmin();
    const router = useRouter();

    React.useEffect(() => {
        if (!isCheckingAdmin && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, isCheckingAdmin, router]);

    if (isCheckingAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
                <LoadingLogo className="h-12 w-12 text-primary" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="container py-12 px-4 md:px-6 space-y-12">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Portail Admin</h1>
                <p className="text-muted-foreground text-sm sm:text-lg">Supervision des activités de la plateforme OptiTrajet AI.</p>
            </header>
            
            <div className="grid gap-8">
                <Card className="shadow-md border-primary/10">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <span>👥 Utilisateurs</span>
                        </CardTitle>
                        <CardDescription>Liste exhaustive des membres inscrits et leurs rôles.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <UsersTable />
                    </CardContent>
                </Card>

                <Card className="shadow-md border-primary/10">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <span>🚗 Trajets</span>
                        </CardTitle>
                        <CardDescription>Historique et trajets planifiés sur la plateforme.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <TripsTable />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
