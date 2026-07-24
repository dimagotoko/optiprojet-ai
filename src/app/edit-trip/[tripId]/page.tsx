"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  vehicleBaseSchema as vehicleSchema,
  type VehicleBaseFormValues as VehicleFormValues,
} from "@/lib/vehicle-schema";
import {
  Users,
  Clock,
  DollarSign,
  Minus,
  Plus,
  Luggage,
  Briefcase,
  Dog,
  CigaretteOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Toggle } from "@/components/ui/toggle";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { haversineKm } from "@/lib/geo";
import { COVOITURAGE_PLAFOND_PAR_KM } from "@/lib/legal";
import { AddressInput, type Address } from "@/components/AddressInput";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from "@/firebase";
import { useEffect, useState } from "react";
import { LoadingLogo } from "@/components/LoadingLogo";
import { PostTripSkeleton } from "@/components/skeletons/PostTripSkeleton";
import {
  collection,
  addDoc,
  doc,
  Timestamp,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const addressSchema = z.object({
  description: z
    .string({
      required_error: "Veuillez sélectionner une adresse dans la liste.",
    })
    .min(3, "Veuillez sélectionner une adresse dans la liste."),
  coords: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

const tripSchema = z
  .object({
    departure: addressSchema,
    destination: addressSchema,
    date: z.date({ required_error: "La date est requise." }),
    time: z.string().min(1, "L'heure de départ est requise."),
    arrivalTime: z.string().optional(),
    seats: z.coerce.number().min(1, "Il doit y avoir au moins une place."),
    price: z.coerce.number().min(0, "Le prix doit être positif.").max(200),
    vehicleId: z.string().min(1, "Veuillez sélectionner un véhicule."),
    options: z.object({
      allowLargeBags: z.boolean(),
      allowSmallBags: z.boolean(),
      allowPets: z.boolean(),
      isNonSmoking: z.boolean(),
    }),
    details: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.arrivalTime) return true;
      const departureDateTime = new Date(
        `${format(data.date, "yyyy-MM-dd")}T${data.time}`,
      );
      const arrivalDateTime = new Date(
        `${format(data.date, "yyyy-MM-dd")}T${data.arrivalTime}`,
      );
      return arrivalDateTime >= departureDateTime;
    },
    {
      message: "L'heure d'arrivée doit être après l'heure de départ.",
      path: ["arrivalTime"],
    },
  );

type TripFormValues = z.infer<typeof tripSchema>;

export default function EditTripPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;

  const { toast } = useToast();
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);

  // Fetch trip data
  const tripRef = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, "trips", tripId);
  }, [firestore, tripId]);
  const { data: tripData, isLoading: tripLoading } = useDoc(tripRef);

  // Fetch user's vehicles
  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/vehicles`);
  }, [firestore, user]);
  const { data: vehicles, isLoading: vehiclesLoading } =
    useCollection(vehiclesQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    } else if (tripData && user && tripData.offeredBy !== user.uid) {
      // Redirect if the user is not the owner of the trip
      toast({
        variant: "destructive",
        title: "Accès non autorisé",
        description: "Vous ne pouvez pas modifier ce trajet.",
      });
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router, tripData, toast]);

  const vehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      licensePlate: "",
    },
  });

  const tripForm = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      time: "",
      arrivalTime: "",
      seats: 1,
      price: 10,
      vehicleId: "",
      options: {
        allowLargeBags: false,
        allowSmallBags: true,
        allowPets: false,
        isNonSmoking: true,
      },
      details: "",
    },
    mode: "onChange",
  });

  // Populate form with trip data once loaded
  useEffect(() => {
    if (tripData) {
      const departureTime = tripData.departureTime.toDate();
      const arrivalTime = tripData.arrivalTime
        ? tripData.arrivalTime.toDate()
        : null;

      tripForm.reset({
        departure: {
          description: tripData.origin,
          coords: tripData.originCoords,
        },
        destination: {
          description: tripData.destination,
          coords: tripData.destinationCoords,
        },
        date: departureTime,
        time: format(departureTime, "HH:mm"),
        arrivalTime: arrivalTime ? format(arrivalTime, "HH:mm") : "",
        seats: tripData.availableSeats,
        price: tripData.pricePerSeat,
        vehicleId: tripData.vehicleId,
        options: tripData.options || {
          allowLargeBags: false,
          allowSmallBags: true,
          allowPets: false,
          isNonSmoking: true,
        },
        details: tripData.details || "",
      });
    }
  }, [tripData, tripForm.reset]);

  const handleAddVehicle = async (values: VehicleFormValues) => {
    if (!firestore || !user) return;
    try {
      const vehicleRef = collection(firestore, `users/${user.uid}/vehicles`);
      await addDoc(vehicleRef, {
        ...values,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Succès", description: "Votre véhicule a été ajouté." });
      vehicleForm.reset();
      setShowAddVehicleDialog(false);
    } catch (error) {
      console.error("Error adding vehicle: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le véhicule.",
      });
    }
  };

  const watchedDeparture = tripForm.watch("departure");
  const watchedDestination = tripForm.watch("destination");
  const distanceKm = (() => {
    const depCoords = watchedDeparture?.coords;
    const destCoords = watchedDestination?.coords;
    if (
      depCoords &&
      destCoords &&
      (depCoords.lat !== destCoords.lat || depCoords.lng !== destCoords.lng)
    ) {
      return Math.round(
        haversineKm(
          depCoords.lat,
          depCoords.lng,
          destCoords.lat,
          destCoords.lng,
        ),
      );
    }
    return null;
  })();
  const currentPrice = Number(tripForm.watch("price")) || 0;
  const currentSeats = Number(tripForm.watch("seats")) || 1;
  const legalMaxTotal = distanceKm
    ? COVOITURAGE_PLAFOND_PAR_KM * distanceKm
    : null;
  const legalMaxPerSeat =
    legalMaxTotal !== null && currentSeats > 0
      ? Math.floor((legalMaxTotal / currentSeats) * 100) / 100
      : null;
  const isOverLegalCap =
    legalMaxTotal !== null && currentPrice * currentSeats > legalMaxTotal;
  const sliderMax =
    legalMaxPerSeat !== null ? Math.min(200, Math.floor(legalMaxPerSeat)) : 200;

  useEffect(() => {
    if (isOverLegalCap && legalMaxPerSeat !== null) {
      tripForm.setError("price", {
        type: "manual",
        message: `Plafond légal dépassé. Maximum : ${legalMaxPerSeat.toFixed(2)} $/place pour ${currentSeats} place(s) sur ${distanceKm} km.`,
      });
    } else {
      tripForm.clearErrors("price");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, currentSeats, isOverLegalCap, legalMaxPerSeat]);

  const onSubmitTrip = (data: TripFormValues) => {
    if (!tripRef || !user) return;

    try {
      const { date, time, arrivalTime, ...rest } = data;

      const departureDateTime = new Date(date);
      const [hours, minutes] = time.split(":").map(Number);
      departureDateTime.setHours(hours, minutes);

      let arrivalTimestamp: Timestamp | null = null;
      if (arrivalTime) {
        const arrivalDateTime = new Date(date);
        const [arrHours, arrMinutes] = arrivalTime.split(":").map(Number);
        arrivalDateTime.setHours(arrHours, arrMinutes);
        if (arrivalDateTime < departureDateTime) {
          arrivalDateTime.setDate(arrivalDateTime.getDate() + 1);
        }
        arrivalTimestamp = Timestamp.fromDate(arrivalDateTime);
      }

      const originCoords = data.departure.coords;
      const destinationCoords = data.destination.coords;
      const computedDistanceKm =
        originCoords && destinationCoords
          ? Math.round(
              haversineKm(
                originCoords.lat,
                originCoords.lng,
                destinationCoords.lat,
                destinationCoords.lng,
              ),
            )
          : 0;

      const payload = {
        origin: data.departure.description,
        destination: data.destination.description,
        originCoords,
        destinationCoords,
        departureTime: Timestamp.fromDate(departureDateTime),
        arrivalTime: arrivalTimestamp,
        availableSeats: data.seats,
        pricePerSeat: data.price,
        vehicleId: data.vehicleId,
        options: data.options,
        details: data.details,
        offeredBy: user.uid, // Ensure owner isn't changed
        distanceKm: computedDistanceKm,
      };

      updateDocumentNonBlocking(tripRef, payload);

      toast({
        title: "Trajet mis à jour !",
        description: "Vos modifications ont été enregistrées.",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating trip: ", error);
      toast({
        variant: "destructive",
        title: "Erreur de mise à jour",
        description: "Une erreur est survenue. Veuillez réessayer.",
      });
    }
  };

  if (isUserLoading || vehiclesLoading || tripLoading) {
    return <PostTripSkeleton />;
  }

  return (
    <div className="container py-12 px-4 md:px-6">
      <FormProvider {...tripForm}>
        <form
          onSubmit={tripForm.handleSubmit(onSubmitTrip)}
          className="space-y-8"
        >
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">
                Modifier le trajet
              </CardTitle>
              <CardDescription>
                Mettez à jour les informations de votre trajet ci-dessous.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* ITINÉRAIRE */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">
                    Itinéraire
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={tripForm.control}
                    name="departure"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Départ</FormLabel>
                        <FormControl>
                          <AddressInput
                            id="departure"
                            placeholder="Adresse de départ"
                            defaultValue={field.value?.description}
                            onAddressSelect={field.onChange}
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
                            id="destination"
                            placeholder="Adresse de destination"
                            defaultValue={field.value?.description}
                            onAddressSelect={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* DATE & HEURE */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">
                    Date &amp; heure
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={tripForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Date du trajet</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={tripForm.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem className="grid gap-2">
                          <FormLabel>Heure de départ</FormLabel>
                          <FormControl>
                            <TimePicker
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={tripForm.control}
                      name="arrivalTime"
                      render={({ field }) => (
                        <FormItem className="grid gap-2">
                          <FormLabel>Heure d&apos;arrivée estimée</FormLabel>
                          <FormControl>
                            <TimePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="HH : mm (opt.)"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* PLACES & PRIX */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">
                    Places &amp; prix
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <FormField
                    control={tripForm.control}
                    name="seats"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Places disponibles</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 shrink-0"
                              onClick={() =>
                                field.onChange(
                                  Math.max(1, Number(field.value) - 1),
                                )
                              }
                              disabled={Number(field.value) <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums">
                              {field.value}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 shrink-0"
                              onClick={() =>
                                field.onChange(Number(field.value) + 1)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tripForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <FormLabel>Prix par place</FormLabel>
                          <span className="flex items-center gap-1 text-2xl font-bold text-primary tabular-nums">
                            <DollarSign className="h-5 w-5" />
                            {Math.min(currentPrice, sliderMax)}
                          </span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={sliderMax}
                            step={1}
                            value={[Math.min(currentPrice, sliderMax)]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="my-1"
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0 $</span>
                          <span>Max : {sliderMax} $</span>
                        </div>
                        {legalMaxPerSeat !== null && (
                          <p
                            className={cn(
                              "text-xs",
                              isOverLegalCap
                                ? "text-destructive/70"
                                : "text-success",
                            )}
                          >
                            {isOverLegalCap
                              ? `Plafond légal dépassé — max : ${legalMaxPerSeat.toFixed(2)} $/place`
                              : "Sous le plafond légal (0,54 $/km)"}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* VÉHICULE & PAIEMENT */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">
                    Véhicule &amp; paiement
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <FormField
                    control={tripForm.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Véhicule</FormLabel>
                        <div className="flex items-center gap-2">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Sélectionnez votre véhicule" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicles &&
                                vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.make} {v.model} ({v.licensePlate})
                                  </SelectItem>
                                ))}
                              {vehicles?.length === 0 && (
                                <p className="p-4 text-sm text-muted-foreground">
                                  Aucun véhicule. Ajoutez-en un.
                                </p>
                              )}
                            </SelectContent>
                          </Select>
                          <Dialog
                            open={showAddVehicleDialog}
                            onOpenChange={setShowAddVehicleDialog}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-11 w-11 flex-shrink-0"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">
                                  Ajouter un véhicule
                                </span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>
                                  Ajouter un nouveau véhicule
                                </DialogTitle>
                                <DialogDescription>
                                  Les informations de votre véhicule seront
                                  visibles par les passagers.
                                </DialogDescription>
                              </DialogHeader>
                              <FormProvider {...vehicleForm}>
                                <form
                                  id="add-vehicle-form"
                                  onSubmit={vehicleForm.handleSubmit(
                                    handleAddVehicle,
                                  )}
                                  className="grid gap-4 py-4"
                                >
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={vehicleForm.control}
                                      name="make"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Marque</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={vehicleForm.control}
                                      name="model"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Modèle</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={vehicleForm.control}
                                      name="year"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Année</FormLabel>
                                          <FormControl>
                                            <Input type="number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={vehicleForm.control}
                                      name="color"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Couleur</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <FormField
                                    control={vehicleForm.control}
                                    name="licensePlate"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Plaque d'immatriculation
                                        </FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </form>
                              </FormProvider>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button" variant="ghost">
                                    Annuler
                                  </Button>
                                </DialogClose>
                                <Button
                                  type="submit"
                                  form="add-vehicle-form"
                                  disabled={vehicleForm.formState.isSubmitting}
                                >
                                  {vehicleForm.formState.isSubmitting && (
                                    <LoadingLogo className="mr-2 h-4 w-4" />
                                  )}
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
                          <Toggle
                            aria-label="Grands bagages autorisés"
                            pressed={field.value.allowLargeBags}
                            onPressedChange={(pressed) =>
                              tripForm.setValue("options", {
                                ...field.value,
                                allowLargeBags: pressed,
                              })
                            }
                            variant="outline"
                            className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20"
                          >
                            <Luggage className="h-5 w-5" /> Grands bagages
                          </Toggle>
                          <Toggle
                            aria-label="Petits bagages (sac à dos) autorisés"
                            pressed={field.value.allowSmallBags}
                            onPressedChange={(pressed) =>
                              tripForm.setValue("options", {
                                ...field.value,
                                allowSmallBags: pressed,
                              })
                            }
                            variant="outline"
                            className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20"
                          >
                            <Briefcase className="h-5 w-5" /> Sac à dos
                          </Toggle>
                          <Toggle
                            aria-label="Animaux autorisés"
                            pressed={field.value.allowPets}
                            onPressedChange={(pressed) =>
                              tripForm.setValue("options", {
                                ...field.value,
                                allowPets: pressed,
                              })
                            }
                            variant="outline"
                            className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20"
                          >
                            <Dog className="h-5 w-5" /> Animaux
                          </Toggle>
                          <Toggle
                            aria-label="Trajet non-fumeur"
                            pressed={field.value.isNonSmoking}
                            onPressedChange={(pressed) =>
                              tripForm.setValue("options", {
                                ...field.value,
                                isNonSmoking: pressed,
                              })
                            }
                            variant="outline"
                            className="flex items-center gap-2 px-3 h-11 data-[state=on]:bg-primary/20"
                          >
                            <CigaretteOff className="h-5 w-5" /> Non-fumeur
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
                        <FormLabel>
                          Détails supplémentaires (optionnel)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="ex: Je fais un arrêt à mi-chemin, voiture non-fumeur, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="sticky bottom-0 z-10 -mx-6 -mb-6 border-t border-white/[0.06] bg-background/95 px-6 pb-6 pt-3 backdrop-blur-sm sm:relative sm:bottom-auto sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:flex-1"
                    onClick={() => router.back()}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:flex-1"
                    disabled={
                      !tripForm.formState.isDirty ||
                      tripForm.formState.isSubmitting ||
                      isOverLegalCap
                    }
                  >
                    {tripForm.formState.isSubmitting && (
                      <LoadingLogo className="mr-2 h-4 w-4" />
                    )}
                    {tripForm.formState.isSubmitting
                      ? "Sauvegarde..."
                      : "Sauvegarder les modifications"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}
