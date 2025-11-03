'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Calendar as CalendarIcon, Users, Clock, DollarSign, Car, Plus,
  Luggage, Briefcase, Dog, Cigarette, Info
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
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';

const vehicleSchema = z.object({
    make: z.string().min(1, 'La marque est requise'),
    model: z.string().min(1, 'Le modèle est requis'),
    year: z.coerce.number().min(1900, 'Année invalide').max(new Date().getFullYear() + 1, 'Année invalide'),
    color: z.string().min(1, 'La couleur est requise'),
    licensePlate: z.string().min(1, 'La plaque est requise'),
});

const tripSchema = z.object({
    departure: z.string().min(3, 'Le lieu de départ est requis.'),
    destination: z.string().min(3, 'Le lieu de destination est requis.'),
    date: z.date({ required_error: 'La date est requise.' }),
    time: z.string().min(1, "L'heure est requise."),
    seats: z.coerce.number().min(1, 'Il doit y avoir au moins une place.'),
    price: z.coerce.number().min(0, 'Le prix doit être positif.'),
    vehicleId: z.string().min(1, 'Veuillez sélectionner un véhicule.'),
    options: z.object({
        allowLargeBags: z.boolean(),
        allowSmallBags: z.boolean(),
        allowPets: z.boolean(),
        allowSmoking: z-boolean(),
    }),
    details: z.string().optional(),
});


type VehicleFormValues = z.infer<typeof vehicleSchema>;
type TripFormValues = z.infer<typeof tripSchema>;


export default function PostTripPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [submittedTripData, setSubmittedTripData] = useState<TripFormValues | null>(null);

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
  
  const tripForm = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
        departure: '',
        destination: '',
        time: '',
        seats: 1,
        price: 10,
        vehicleId: '',
        options: {
            allowLargeBags: false,
            allowSmallBags: false,
            allowPets: false,
            allowSmoking: false,
        },
        details: '',
    },
    mode: 'onChange',
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
  
  const onSubmitTrip = (data: TripFormValues) => {
    setSubmittedTripData(data);
    setShowConfirmationDialog(true);
  };
  
  const handleConfirmAndPublish = async () => {
    if (!submittedTripData || !firestore || !user) return;

    try {
        const departureDateTime = new Date(submittedTripData.date);
        const [hours, minutes] = submittedTripData.time.split(':').map(Number);
        departureDateTime.setHours(hours, minutes);

        await addDoc(collection(firestore, 'trips'), {
            origin: submittedTripData.departure,
            destination: submittedTripData.destination,
            departureTime: serverTimestamp(),
            availableSeats: submittedTripData.seats,
            pricePerSeat: submittedTripData.price,
            offeredBy: user.uid,
            vehicleId: submittedTripData.vehicleId,
            options: submittedTripData.options,
            details: submittedTripData.details,
            createdAt: serverTimestamp(),
        });

        toast({
            title: "Trajet publié !",
            description: "Votre trajet est maintenant visible par la communauté."
        });
        
        router.push('/dashboard');

    } catch (error) {
        console.error("Error publishing trip: ", error);
        toast({
            variant: 'destructive',
            title: "Erreur de publication",
            description: "Une erreur est survenue. Veuillez réessayer."
        });
    } finally {
        setShowConfirmationDialog(false);
        setSubmittedTripData(null);
    }
  };


  if (isUserLoading || !user || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <LoadingLogo className="h-12 w-12 text-primary" />
      </div>
    );
  }
  
  const selectedVehicle = vehicles?.find(v => v.id === tripForm.watch('vehicleId'));

  return (
    <div className="container py-12 px-4 md:px-6">
    <Form {...tripForm}>
      <form onSubmit={tripForm.handleSubmit(onSubmitTrip)} className="space-y-8">
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
            <CardTitle className="text-3xl font-bold">Proposer un trajet</CardTitle>
            <CardDescription>
                Partagez votre itinéraire et vos places disponibles avec la communauté.
            </CardDescription>
            </CardHeader>
            <CardContent>
            
                {/* Trip Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Détails du trajet</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={tripForm.control}
                                name="departure"
                                render={({ field }) => (
                                    <FormItem className="grid gap-2">
                                        <FormLabel>Départ</FormLabel>
                                        <FormControl>
                                            <AddressInput 
                                                placeholder="Adresse de départ" 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={tripForm.control}
                                name="destination"
                                render={({ field }) => (
                                    <FormItem className="grid gap-2">
                                        <FormLabel>Destination</FormLabel>
                                        <FormControl>
                                            <AddressInput 
                                                placeholder="Adresse de destination" 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={tripForm.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="grid gap-2">
                                    <FormLabel>Date du trajet</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-full justify-start text-left font-normal h-11',
                                                !field.value && 'text-muted-foreground'
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, 'd MMMM yyyy', { locale: fr }) : <span>Choisissez une date</span>}
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                        initialFocus
                                        />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                          <FormField
                            control={tripForm.control}
                            name="time"
                            render={({ field }) => (
                                <FormItem className="grid gap-2">
                                    <FormLabel>Heure de départ</FormLabel>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <FormControl>
                                            <Input type="time" className="pl-10 h-11" {...field} />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={tripForm.control}
                                name="seats"
                                render={({ field }) => (
                                <FormItem className="grid gap-2">
                                    <FormLabel>Places disponibles</FormLabel>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <FormControl>
                                            <Input type="number" placeholder="ex: 3" className="pl-10 h-11" min="1" {...field} />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={tripForm.control}
                                name="price"
                                render={({ field }) => (
                                <FormItem className="grid gap-2">
                                    <FormLabel>Prix par place</FormLabel>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <FormControl>
                                            <Input type="number" placeholder="ex: 25" className="pl-10 h-11" min="0" {...field} />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Vehicle & Options */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Véhicule et Options</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <FormField
                            control={tripForm.control}
                            name="vehicleId"
                            render={({ field }) => (
                                <FormItem className="grid gap-2">
                                    <FormLabel>Véhicule</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Sélectionnez votre véhicule" />
                                                </SelectTrigger>
                                            </FormControl>
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
                                     <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={tripForm.control}
                            name="options"
                            render={({ field }) => (
                                <FormItem className="grid gap-2">
                                    <FormLabel>Options du trajet</FormLabel>
                                    <div className="flex flex-wrap gap-2">
                                        <Toggle aria-label="Grands bagages autorisés" pressed={field.value.allowLargeBags} onPressedChange={(pressed) => tripForm.setValue('options.allowLargeBags', pressed)} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                            <Luggage className="h-5 w-5" /> Grands bagages
                                        </Toggle>
                                        <Toggle aria-label="Petits bagages (sac à dos) autorisés" pressed={field.value.allowSmallBags} onPressedChange={(pressed) => tripForm.setValue('options.allowSmallBags', pressed)} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                            <Briefcase className="h-5 w-5" /> Sac à dos
                                        </Toggle>
                                        <Toggle aria-label="Animaux autorisés" pressed={field.value.allowPets} onPressedChange={(pressed) => tripForm.setValue('options.allowPets', pressed)} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                            <Dog className="h-5 w-5" /> Animaux
                                        </Toggle>
                                        <Toggle aria-label="Fumeurs autorisés" pressed={field.value.allowSmoking} onPressedChange={(pressed) => tripForm.setValue('options.allowSmoking', pressed)} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                            <Cigarette className="h-5 w-5" /> Fumeurs
                                        </Toggle>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={tripForm.control}
                            name="details"
                            render={({ field }) => (
                                <FormItem className="grid gap-2">
                                    <FormLabel>Détails supplémentaires (optionnel)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="ex: Je fais un arrêt à mi-chemin, voiture non-fumeur, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full" disabled={!tripForm.formState.isValid || tripForm.formState.isSubmitting}>
                  {tripForm.formState.isSubmitting ? 'Publication...' : 'Publier mon trajet'}
                </Button>
            
            </CardContent>
        </Card>
      </form>
    </Form>
    
    {submittedTripData && (
        <AlertDialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer votre trajet</AlertDialogTitle>
                    <AlertDialogDescription>
                        Veuillez vérifier les informations de votre trajet avant de le publier.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="text-sm space-y-4 py-4">
                    <div className="font-semibold">{submittedTripData.departure} &rarr; {submittedTripData.destination}</div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <div>
                            <p className="font-medium text-foreground">Date & Heure</p>
                            <p>{format(submittedTripData.date, 'd MMMM yyyy', { locale: fr })} à {submittedTripData.time}</p>
                        </div>
                         <div>
                            <p className="font-medium text-foreground">Prix & Places</p>
                            <p>{submittedTripData.price}$ par place / {submittedTripData.seats} places</p>
                        </div>
                        <div>
                            <p className="font-medium text-foreground">Véhicule</p>
                            <p>{selectedVehicle?.make} {selectedVehicle?.model}</p>
                        </div>
                        <div>
                            <p className="font-medium text-foreground">Options</p>
                             <div className="flex flex-wrap gap-x-2">
                                {submittedTripData.options.allowLargeBags && <span>Grands bagages</span>}
                                {submittedTripData.options.allowSmallBags && <span>Sac à dos</span>}
                                {submittedTripData.options.allowPets && <span>Animaux</span>}
                                {submittedTripData.options.allowSmoking && <span>Fumeurs</span>}
                                {!Object.values(submittedTripData.options).some(Boolean) && <span>Aucune</span>}
                            </div>
                        </div>
                    </div>
                     {submittedTripData.details && (
                        <div>
                            <p className="font-medium text-foreground">Détails supplémentaires</p>
                            <p className="text-muted-foreground italic">"{submittedTripData.details}"</p>
                        </div>
                    )}

                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAndPublish}>Confirmer et publier</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}

    </div>
  );
}
