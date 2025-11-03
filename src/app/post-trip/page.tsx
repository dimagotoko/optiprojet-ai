'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Users, Clock, DollarSign, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AddressInput } from '@/components/AddressInput';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';

export default function PostTripPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [date, setDate] = React.useState<Date>();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);


  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <LoadingLogo className="h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-12 px-4 md:px-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Proposer un trajet</CardTitle>
          <CardDescription>
            Partagez votre itinéraire et vos places disponibles avec la communauté.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="departure">Départ</Label>
                  <AddressInput placeholder="Adresse de départ" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destination">Destination</Label>
                  <AddressInput placeholder="Adresse de destination" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date du trajet</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal h-11',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'd MMMM yyyy', { locale: fr }) : <span>Choisissez une date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Heure de départ</Label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="time" type="time" className="pl-10 h-11" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="seats">Places disponibles</Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="seats" type="number" placeholder="ex: 3" className="pl-10 h-11" min="1" required />
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="price">Prix par place</Label>
                     <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="price" type="number" placeholder="ex: 25" className="pl-10 h-11" min="0" required />
                    </div>
                </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vehicle">Informations sur le véhicule (optionnel)</Label>
               <div className="relative">
                  <Car className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Textarea
                    id="vehicle"
                    placeholder="ex: Modèle de voiture, espace pour les bagages, etc."
                    className="pl-10"
                  />
              </div>
            </div>
            
            <Button type="submit" size="lg" className="w-full">
              Publier mon trajet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
