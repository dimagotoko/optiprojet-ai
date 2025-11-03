
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Calendar as CalendarIcon, Users, Clock, DollarSign, Car, Plus,
  Luggage, Briefcase, Dog, Cigarette
} from 'lucide-react';

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
  CardFooter,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Toggle } from '@/components/ui/toggle';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AddressInput } from '@/components/AddressInput';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const vehicleSchema = z.object({
    make: z.string().min(1, 'La marque est requise'),
    model: z.string().min(1, 'Le modèle est requis'),
    year: z.coerce.number().min(1900, 'Année invalide').max(new Date().getFullYear() + 1, 'Année invalide'),
    color: z.string().min(1, 'La couleur est requise'),
    licensePlate: z.string().min(1, 'La plaque est requise'),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;


export default function PostTripPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date>();
  
  const [allowLargeBags, setAllowLargeBags] = useState(false);
  const [allowSmallBags, setAllowSmallBags] = useState(false);
  const [allowPets, setAllowPets] = useState(false);
  const [allowSmoking, setAllowSmoking] = useState(false);
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);

  // Fetch user's vehicles
  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user]);
  const { data: vehicles, isLoading: vehiclesLoading } = useCollection(vehiclesQuery);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const vehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { make: '', model: '', year: new Date().getFullYear(), color: '', licensePlate: '' },
  });

  const handleAddVehicle = async (values: VehicleFormValues) => {
    if (!firestore || !user) return;
    try {
        const vehicleRef = collection(firestore, `users/${user.uid}/vehicles`);
        await addDoc(vehicleRef, { ...values, ownerId: user.uid });
        toast({ title: "Succès", description: "Votre véhicule a été ajouté." });
        vehicleForm.reset();
        setShowAddVehicleDialog(false);
    } catch (error) {
        console.error("Error adding vehicle: ", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'ajouter le véhicule." });
    }
  }


  if (isUserLoading || !user || vehiclesLoading) {
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
            {/* Trip Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Détails du trajet</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
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
                </CardContent>
            </Card>

            {/* Vehicle & Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Véhicule et Options</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="vehicle">Véhicule</Label>
                        <div className="flex items-center gap-2">
                            <Select>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Sélectionnez votre véhicule" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles && vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate})</SelectItem>
                                    ))}
                                    {vehicles?.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucun véhicule. Ajoutez-en un.</p>}
                                </SelectContent>
                            </Select>

                            <Dialog open={showAddVehicleDialog} onOpenChange={setShowAddVehicleDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-11 w-11 flex-shrink-0">
                                        <Plus className="h-4 w-4" />
                                        <span className="sr-only">Ajouter un véhicule</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Ajouter un nouveau véhicule</DialogTitle>
                                        <DialogDescription>
                                            Les informations de votre véhicule seront visibles par les passagers.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Form {...vehicleForm}>
                                        <form id="add-vehicle-form" onSubmit={vehicleForm.handleSubmit(handleAddVehicle)} className="grid gap-4 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={vehicleForm.control} name="make" render={({ field }) => ( <FormItem><Label>Marque</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                <FormField control={vehicleForm.control} name="model" render={({ field }) => ( <FormItem><Label>Modèle</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={vehicleForm.control} name="year" render={({ field }) => ( <FormItem><Label>Année</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                <FormField control={vehicleForm.control} name="color" render={({ field }) => ( <FormItem><Label>Couleur</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                            </div>
                                            <FormField control={vehicleForm.control} name="licensePlate" render={({ field }) => ( <FormItem><Label>Plaque d'immatriculation</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        </form>
                                    </Form>
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
                                        <Button type="submit" form="add-vehicle-form" disabled={vehicleForm.formState.isSubmitting}>
                                            {vehicleForm.formState.isSubmitting && <LoadingLogo className="mr-2 h-4 w-4"/>}
                                            Ajouter le véhicule
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Options du trajet</Label>
                        <div className="flex flex-wrap gap-2">
                             <Toggle aria-label="Grands bagages autorisés" pressed={allowLargeBags} onPressedChange={setAllowLargeBags} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                <Luggage className="h-5 w-5" /> Grands bagages
                            </Toggle>
                             <Toggle aria-label="Petits bagages (sac à dos) autorisés" pressed={allowSmallBags} onPressedChange={setAllowSmallBags} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                <Briefcase className="h-5 w-5" /> Sac à dos
                            </Toggle>
                            <Toggle aria-label="Animaux autorisés" pressed={allowPets} onPressedChange={setAllowPets} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                <Dog className="h-5 w-5" /> Animaux
                            </Toggle>
                            <Toggle aria-label="Fumeurs autorisés" pressed={allowSmoking} onPressedChange={setAllowSmoking} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                <Cigarette className="h-5 w-5" /> Fumeurs
                            </Toggle>
                        </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="details">Détails supplémentaires (optionnel)</Label>
                       <div className="relative">
                          <Textarea
                            id="details"
                            placeholder="ex: Je fais un arrêt à mi-chemin, voiture non-fumeur, etc."
                          />
                      </div>
                    </div>
                </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full">
              Publier mon trajet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


    