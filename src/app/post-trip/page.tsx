
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Calendar as CalendarIcon, Users, Clock, DollarSign, Plus,
  Luggage, Briefcase, Dog, CigaretteOff, Landmark, Banknote
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
import { AddressInput, type Address } from '@/components/AddressInput';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';
import { collection, addDoc, serverTimestamp, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

const vehicleSchema = z.object({
    make: z.string().min(1, 'La marque est requise'),
    model: z.string().min(1, 'Le modèle est requis'),
    year: z.coerce.number().min(1900, 'Année invalide').max(new Date().getFullYear() + 1, 'Année invalide'),
    color: z.string().min(1, 'La couleur est requise'),
    licensePlate: z.string().min(1, 'La plaque est requise'),
});

const addressSchema = z.object({
    description: z.string().min(3, 'Une adresse est requise.'),
    coords: z.object({
        lat: z.number(),
        lng: z.number(),
    }),
});

const tripSchema = z.object({
    departure: addressSchema,
    destination: addressSchema,
    date: z.date({ required_error: 'La date est requise.' }),
    time: z.string().min(1, "L'heure de départ est requise."),
    arrivalTime: z.string().optional(),
    seats: z.coerce.number().min(1, 'Il doit y avoir au moins une place.'),
    price: z.coerce.number().min(0, 'Le prix doit être positif.'),
    vehicleId: z.string().min(1, 'Veuillez sélectionner un véhicule.'),
    options: z.object({
        allowLargeBags: z.boolean(),
        allowSmallBags: z.boolean(),
        allowPets: z.boolean(),
        isNonSmoking: z.boolean(),
    }),
    paymentOptions: z.object({
        cash: z.boolean(),
        interac: z.boolean(),
    }).refine(data => data.cash || data.interac, {
        message: 'Veuillez sélectionner au moins une option de paiement.',
        path: ['cash'],
    }),
    details: z.string().optional(),
}).refine(data => {
    if (!data.arrivalTime) return true;
    const departureDateTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.time}`);
    const arrivalDateTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.arrivalTime}`);
    return arrivalDateTime >= departureDateTime;
}, {
    message: "L'heure d'arrivée doit être après l'heure de départ.",
    path: ['arrivalTime'],
});


type VehicleFormValues = z.infer<typeof vehicleSchema>;
type TripFormValues = z.infer<typeof tripSchema>;


export default function PostTripPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showReturnTripDialog, setShowReturnTripDialog] = useState(false);
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
        time: '',
        arrivalTime: '',
        seats: 1,
        price: 10,
        vehicleId: '',
        options: {
            allowLargeBags: false,
            allowSmallBags: true,
            allowPets: false,
            isNonSmoking: true,
        },
        paymentOptions: {
            cash: true,
            interac: false,
        },
        details: '',
    },
    mode: 'onChange',
  });

   // Pre-fill form for return trip
  useEffect(() => {
    if (searchParams.has('return')) {
      try {
        const returnData = JSON.parse(searchParams.get('return') || '{}');
        
        // Swap departure and destination
        const departure = returnData.destination;
        const destination = returnData.departure;
        
        tripForm.reset({
            departure: departure,
            destination: destination,
            seats: returnData.seats,
            price: returnData.price,
            vehicleId: returnData.vehicleId,
            options: returnData.options,
            paymentOptions: returnData.paymentOptions,
            details: returnData.details,
            // Clear date and time
            date: undefined,
            time: '',
            arrivalTime: '',
        });
      } catch (error) {
        console.error("Failed to parse return trip data:", error);
      }
    }
  }, [searchParams, tripForm]);

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
        const { date, time, arrivalTime } = submittedTripData;

        const departureDateTime = new Date(date);
        const [hours, minutes] = time.split(':').map(Number);
        departureDateTime.setHours(hours, minutes);

        let arrivalTimestamp: Timestamp | null = null;
        if (arrivalTime) {
            const arrivalDateTime = new Date(date);
            const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number);
            arrivalDateTime.setHours(arrHours, arrMinutes);
            if (arrivalDateTime < departureDateTime) {
                arrivalDateTime.setDate(arrivalDateTime.getDate() + 1);
            }
            arrivalTimestamp = Timestamp.fromDate(arrivalDateTime);
        }

        await addDoc(collection(firestore, 'trips'), {
            origin: submittedTripData.departure.description,
            destination: submittedTripData.destination.description,
            originCoords: submittedTripData.departure.coords,
            destinationCoords: submittedTripData.destination.coords,
            departureTime: Timestamp.fromDate(departureDateTime),
            arrivalTime: arrivalTimestamp,
            availableSeats: submittedTripData.seats,
            pricePerSeat: submittedTripData.price,
            vehicleId: submittedTripData.vehicleId,
            options: submittedTripData.options,
            paymentOptions: submittedTripData.paymentOptions,
            details: submittedTripData.details,
            offeredBy: user.uid,
            isClosed: false,
            createdAt: serverTimestamp(),
        });

        toast({
            title: "Trajet publié !",
            description: "Votre trajet est maintenant visible par la communauté."
        });
        
        setShowConfirmationDialog(false);
        setShowReturnTripDialog(true); // Show the next dialog

    } catch (error) {
        console.error("Error publishing trip: ", error);
        toast({
            variant: 'destructive',
            title: "Erreur de publication",
            description: "Une erreur est survenue. Veuillez réessayer."
        });
        setShowConfirmationDialog(false);
        setSubmittedTripData(null);
    }
  };
  
  const handleProposeReturnTrip = () => {
    if (!submittedTripData) return;
    // Encode the necessary data for the return trip into a query parameter
    const returnTripData = {
        departure: submittedTripData.departure,
        destination: submittedTripData.destination,
        seats: submittedTripData.seats,
        price: submittedTripData.price,
        vehicleId: submittedTripData.vehicleId,
        options: submittedTripData.options,
        paymentOptions: submittedTripData.paymentOptions,
        details: submittedTripData.details,
    };
    const query = new URLSearchParams({ return: JSON.stringify(returnTripData) });
    router.push(`/post-trip?${query.toString()}`);
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
            <CardTitle className="text-3xl font-bold">{searchParams.has('return') ? 'Proposer un trajet retour' : 'Proposer un trajet'}</CardTitle>
            <CardDescription>
                {searchParams.has('return') ? 'Vérifiez et complétez les informations pour votre trajet retour.' : 'Partagez votre itinéraire et vos places disponibles avec la communauté.'}
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
                                                key={field.value?.description} // Re-render when value changes
                                                placeholder="Adresse de départ" 
                                                onAddressSelect={field.onChange} 
                                                defaultValue={field.value?.description}
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
                                                key={field.value?.description} // Re-render when value changes
                                                placeholder="Adresse de destination" 
                                                onAddressSelect={field.onChange} 
                                                defaultValue={field.value?.description}
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
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        initialFocus
                                        />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                            <div className="grid grid-cols-2 gap-2">
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
                                <FormField
                                    control={tripForm.control}
                                    name="arrivalTime"
                                    render={({ field }) => (
                                        <FormItem className="grid gap-2">
                                            <FormLabel>Heure d'arrivée</FormLabel>
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
                        <CardTitle className="text-xl">Véhicule, Options & Paiement</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <FormField
                            control={tripForm.control}
                            name="vehicleId"
                            render={({ field }) => (
                                <FormItem className="grid gap-2">
                                    <FormLabel>Véhicule</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                                        <Toggle aria-label="Grands bagages autorisés" pressed={field.value.allowLargeBags} onPressedChange={(pressed) => tripForm.setValue('options', { ...field.value, allowLargeBags: pressed })} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                            <Luggage className="h-5 w-5" /> Grands bagages
                                        </Toggle>
                                        <Toggle aria-label="Petits bagages (sac à dos) autorisés" pressed={field.value.allowSmallBags} onPressedChange={(pressed) => tripForm.setValue('options', { ...field.value, allowSmallBags: pressed })} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                            <Briefcase className="h-5 w-5" /> Sac à dos
                                        </Toggle>
                                        <Toggle aria-label="Animaux autorisés" pressed={field.value.allowPets} onPressedChange={(pressed) => tripForm.setValue('options', { ...field.value, allowPets: pressed })} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                            <Dog className="h-5 w-5" /> Animaux
                                        </Toggle>
                                        <Toggle aria-label="Trajet non-fumeur" pressed={field.value.isNonSmoking} onPressedChange={(pressed) => tripForm.setValue('options', { ...field.value, isNonSmoking: pressed })} variant="outline" className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20">
                                            <CigaretteOff className="h-5 w-5" /> Non-fumeur
                                        </Toggle>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={tripForm.control}
                            name="paymentOptions"
                            render={() => (
                                <FormItem>
                                    <div className="mb-2">
                                        <FormLabel className="text-base">Options de paiement</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Comment souhaitez-vous être payé ?
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <FormField
                                            control={tripForm.control}
                                            name="paymentOptions.cash"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal flex items-center gap-2">
                                                        <Banknote className="h-5 w-5 text-primary" /> Argent comptant
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={tripForm.control}
                                            name="paymentOptions.interac"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal flex items-center gap-2">
                                                        <Landmark className="h-5 w-5 text-primary" /> Virement Interac
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormMessage>
                                        {tripForm.formState.errors.paymentOptions?.root?.message || tripForm.formState.errors.paymentOptions?.cash?.message}
                                    </FormMessage>
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

                <Button type="submit" size="lg" className="w-full" disabled={tripForm.formState.isSubmitting}>
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
                    <div className="font-semibold">{submittedTripData.departure.description} &rarr; {submittedTripData.destination.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <div>
                            <p className="font-medium text-foreground">Date & Heure</p>
                            <p>{format(submittedTripData.date, 'd MMMM yyyy', { locale: fr })} à {submittedTripData.time} {submittedTripData.arrivalTime ? `(arrivée ~${submittedTripData.arrivalTime})`: ''}</p>
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
                            <p className="font-medium text-foreground">Paiement</p>
                            <div className="flex flex-wrap gap-x-2">
                                {submittedTripData.paymentOptions.cash && <span>Argent comptant</span>}
                                {submittedTripData.paymentOptions.interac && <span>Interac</span>}
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
                    <AlertDialogAction onClick={handleConfirmAndPublish} disabled={tripForm.formState.isSubmitting}>
                        {tripForm.formState.isSubmitting && <LoadingLogo className="mr-2 h-4 w-4" />}
                        Confirmer et publier
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}

    <AlertDialog open={showReturnTripDialog} onOpenChange={setShowReturnTripDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Trajet publié avec succès !</AlertDialogTitle>
                <AlertDialogDescription>
                    Souhaitez-vous maintenant publier le trajet retour ? Les informations seront pré-remplies pour vous.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => router.push('/dashboard')}>Non, merci</AlertDialogCancel>
                <AlertDialogAction onClick={handleProposeReturnTrip}>Oui, proposer le retour</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  );
}

    