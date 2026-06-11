"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { vehicleSchema, type VehicleFormValues } from "@/lib/vehicle-schema";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Users,
  Clock,
  DollarSign,
  Plus,
  Luggage,
  Briefcase,
  Dog,
  CigaretteOff,
  Landmark,
  Banknote,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toggle } from "@/components/ui/toggle";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { haversineKm } from "@/lib/geo";
import { AddressInput, type Address } from "@/components/AddressInput";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingLogo } from "@/components/LoadingLogo";
import { PostTripSkeleton } from "@/components/skeletons/PostTripSkeleton";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  VEHICLE_TYPE_CONFIG,
  CANADIAN_PROVINCES,
  type VehicleType,
  type ProvinceCode,
  type Vehicle,
} from "@/types/db";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

const addressSchema = z.object({
  description: z
    .string({
      required_error: "Veuillez sélectionner une adresse valide dans la liste.",
    })
    .min(1, "Veuillez sélectionner une adresse valide dans la liste."),
  coords: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .nullable()
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
    price: z.coerce
      .number()
      .min(0, "Le prix doit être positif.")
      .max(200, "Le prix maximum par place est de 200 $."),
    vehicleId: z.string().min(1, "Veuillez sélectionner un véhicule."),
    options: z.object({
      allowLargeBags: z.boolean(),
      allowSmallBags: z.boolean(),
      allowPets: z.boolean(),
      isNonSmoking: z.boolean(),
    }),
    paymentOptions: z
      .object({
        cash: z.boolean(),
        interac: z.boolean(),
      })
      .refine((data) => data.cash || data.interac, {
        message: "Veuillez sélectionner au moins une option de paiement.",
        path: ["cash"],
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

export default function PostTripPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showReturnTripDialog, setShowReturnTripDialog] = useState(false);
  const [showFinalConfirmationDialog, setShowFinalConfirmationDialog] =
    useState(false);
  const [submittedTripData, setSubmittedTripData] =
    useState<TripFormValues | null>(null);
  const [showDuplicateTripError, setShowDuplicateTripError] = useState(false);
  const [showHighTripCountWarning, setShowHighTripCountWarning] =
    useState(false);
  const [existingTripCount, setExistingTripCount] = useState(0);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);

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
    }
  }, [user, isUserLoading, router]);

  const vehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      province: "QC" as ProvinceCode,
      licensePlate: "",
      type: "berline",
      imageUrl: "",
    },
  });

  const tripForm = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      departure: { description: "" },
      destination: { description: "" },
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
      paymentOptions: {
        cash: true,
        interac: false,
      },
      details: "",
    },
    mode: "onChange",
  });

  // Pre-fill form for return trip
  useEffect(() => {
    if (searchParams.has("return")) {
      try {
        const returnData = JSON.parse(searchParams.get("return") || "{}");

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
          time: "",
          arrivalTime: "",
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
      const maxSeats =
        VEHICLE_TYPE_CONFIG[values.type as VehicleType]?.maxSeats ?? 8;
      const plateFormatted = values.licensePlate.toUpperCase().trim();
      await addDoc(vehicleRef, {
        ...values,
        licensePlate: plateFormatted,
        ownerId: user.uid,
        maxSeats,
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

  const onSubmitTrip = (data: TripFormValues) => {
    setSubmittedTripData(data);
    setShowConfirmationDialog(true);
  };

  // Writes the trip to Firestore — called after all checks pass.
  const doPublish = async () => {
    if (
      !submittedTripData ||
      !firestore ||
      !user ||
      !submittedTripData.departure ||
      !submittedTripData.destination
    )
      return;
    try {
      const { date, time, arrivalTime } = submittedTripData;

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

      const originCoords = submittedTripData.departure.coords || {
        lat: 0,
        lng: 0,
      };
      const destinationCoords = submittedTripData.destination.coords || {
        lat: 0,
        lng: 0,
      };

      await addDoc(collection(firestore, "trips"), {
        origin: submittedTripData.departure.description,
        destination: submittedTripData.destination.description,
        originCoords,
        destinationCoords,
        departureTime: Timestamp.fromDate(departureDateTime),
        arrivalTime: arrivalTimestamp,
        availableSeats: submittedTripData.seats,
        pricePerSeat: submittedTripData.price,
        vehicleId: submittedTripData.vehicleId,
        options: submittedTripData.options,
        paymentOptions: submittedTripData.paymentOptions,
        details: submittedTripData.details || "",
        offeredBy: user.uid,
        isClosed: false,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Trajet publié !",
        description: "Votre trajet est maintenant visible par la communauté.",
      });

      setShowConfirmationDialog(false);

      if (searchParams.has("return")) {
        setShowFinalConfirmationDialog(true);
      } else {
        setShowReturnTripDialog(true);
      }
    } catch (error) {
      console.error("Error publishing trip: ", error);
      toast({
        variant: "destructive",
        title: "Erreur de publication",
        description: "Une erreur est survenue. Veuillez réessayer.",
      });
      setShowConfirmationDialog(false);
      setSubmittedTripData(null);
    }
  };

  const handleConfirmAndPublish = async () => {
    if (!submittedTripData || !firestore || !user) return;

    try {
      const targetDate = format(submittedTripData.date, "yyyy-MM-dd");

      // Fetch all trips by this driver (client-side filter, no composite index needed)
      const snapshot = await getDocs(
        query(
          collection(firestore, "trips"),
          where("offeredBy", "==", user.uid),
        ),
      );

      const sameDayTrips = snapshot.docs.filter((doc) => {
        const d = doc.data();
        if (!d.departureTime) return false;
        return format(d.departureTime.toDate(), "yyyy-MM-dd") === targetDate;
      });

      // Level 1 — hard block: exact duplicate (same origin + destination + date)
      const isDuplicate = sameDayTrips.some((doc) => {
        const d = doc.data();
        return (
          d.origin === submittedTripData.departure.description &&
          d.destination === submittedTripData.destination.description
        );
      });

      if (isDuplicate) {
        setShowConfirmationDialog(false);
        setShowDuplicateTripError(true);
        return;
      }

      // Level 2 — soft warning: already 2+ trips this day (driving load)
      if (sameDayTrips.length >= 2) {
        setExistingTripCount(sameDayTrips.length);
        setShowConfirmationDialog(false);
        setShowHighTripCountWarning(true);
        return;
      }

      await doPublish();
    } catch (error) {
      console.error("Error checking duplicates: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de vérifier les trajets existants.",
      });
    }
  };

  // Called when driver acknowledges the trip-count warning and wants to publish anyway.
  const handleForcePublish = async () => {
    setShowHighTripCountWarning(false);
    await doPublish();
  };

  const handleProposeReturnTrip = () => {
    if (!submittedTripData) return;
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
    const query = new URLSearchParams({
      return: JSON.stringify(returnTripData),
    });
    // We need to reload the page for the useEffect to catch the new params
    window.location.href = `/post-trip?${query.toString()}`;
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
  const suggestedMaxPrice = distanceKm
    ? Math.min(200, Math.max(3, Math.round(distanceKm * 0.2)))
    : null;
  const hardCap =
    suggestedMaxPrice !== null ? Math.min(200, suggestedMaxPrice + 25) : 200;
  const currentPrice = Number(tripForm.watch("price")) || 0;

  useEffect(() => {
    if (currentPrice > hardCap) {
      tripForm.setError("price", {
        type: "manual",
        message: `Prix trop élevé. Maximum autorisé : ${hardCap} $ (recommandé ${suggestedMaxPrice} $ + marge 25 $).`,
      });
    } else {
      tripForm.clearErrors("price");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, hardCap]);

  const selectedVehicle = vehicles?.find(
    (v) => v.id === tripForm.watch("vehicleId"),
  ) as Vehicle | undefined;
  const maxSeatsForVehicle = selectedVehicle?.maxSeats ?? 8;

  // Quand le véhicule change, plafonne les places au max autorisé
  React.useEffect(() => {
    const currentSeats = tripForm.getValues("seats");
    if (selectedVehicle?.maxSeats && currentSeats > selectedVehicle.maxSeats) {
      tripForm.setValue("seats", selectedVehicle.maxSeats, {
        shouldValidate: true,
      });
    }
  }, [selectedVehicle?.maxSeats, tripForm]);

  const handleCancel = () => {
    if (tripForm.formState.isDirty) {
      setShowCancelConfirmDialog(true);
    } else {
      router.push("/dashboard");
    }
  };

  if (isUserLoading || !user || vehiclesLoading) {
    return <PostTripSkeleton />;
  }

  return (
    <div className="container py-12 px-4 md:px-6">
      {/* Lien de retour */}
      <div className="w-full max-w-2xl mx-auto mb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="-ml-2 gap-1 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tableau de bord
        </Button>
      </div>

      <Form {...tripForm}>
        <form
          onSubmit={tripForm.handleSubmit(onSubmitTrip)}
          className="space-y-8"
        >
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl sm:text-3xl font-bold">
                {searchParams.has("return")
                  ? "Proposer un trajet retour"
                  : "Proposer un trajet"}
              </CardTitle>
              <CardDescription>
                {searchParams.has("return")
                  ? "Vérifiez et complétez les informations pour votre trajet retour."
                  : "Partagez votre itinéraire et vos places disponibles avec la communauté."}
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
                              id="departure"
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
                              id="destination"
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
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-11",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, "d MMMM yyyy", {
                                      locale: fr,
                                    })
                                  ) : (
                                    <span>Choisissez une date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date <
                                  new Date(new Date().setHours(0, 0, 0, 0))
                                }
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
                                <Input
                                  type="time"
                                  className="pl-10 h-11"
                                  {...field}
                                />
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
                                <Input
                                  type="time"
                                  className="pl-10 h-11"
                                  {...field}
                                />
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
                              <Input
                                type="number"
                                placeholder="ex: 3"
                                className="pl-10 h-11"
                                min="1"
                                max={maxSeatsForVehicle}
                                {...field}
                              />
                            </FormControl>
                          </div>
                          {selectedVehicle && (
                            <p className="text-xs text-muted-foreground">
                              Maximum {maxSeatsForVehicle} places pour ce
                              véhicule (
                              {VEHICLE_TYPE_CONFIG[
                                selectedVehicle.type as VehicleType
                              ]?.label ?? "Autre"}
                              )
                            </p>
                          )}
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
                              {Math.min(currentPrice, hardCap)}
                            </span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={hardCap}
                              step={1}
                              value={[Math.min(currentPrice, hardCap)]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="my-1"
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0 $</span>
                            {suggestedMaxPrice && (
                              <span className="font-medium text-primary">
                                Recommandé : {suggestedMaxPrice} $
                              </span>
                            )}
                            <span>Max : {hardCap} $</span>
                          </div>
                          {distanceKm && (
                            <p className="text-xs text-muted-foreground">
                              Trajet ~{distanceKm} km — maximum autorisé :{" "}
                              <span className="font-medium text-foreground">
                                {hardCap} $
                              </span>
                            </p>
                          )}
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
                  <CardTitle className="text-xl">
                    Véhicule, Options & Paiement
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
                              <Form {...vehicleForm}>
                                <form
                                  id="add-vehicle-form"
                                  onSubmit={vehicleForm.handleSubmit(
                                    handleAddVehicle,
                                  )}
                                  className="grid gap-4 py-4"
                                >
                                  <FormField
                                    control={vehicleForm.control}
                                    name="type"
                                    render={({ field }) => (
                                      <FormItem>
                                        <Label>Type de véhicule</Label>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Sélectionner le type" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {(
                                              Object.entries(
                                                VEHICLE_TYPE_CONFIG,
                                              ) as [
                                                VehicleType,
                                                {
                                                  label: string;
                                                  maxSeats: number;
                                                },
                                              ][]
                                            ).map(([key, cfg]) => (
                                              <SelectItem key={key} value={key}>
                                                {cfg.label} — max {cfg.maxSeats}{" "}
                                                places
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={vehicleForm.control}
                                      name="make"
                                      render={({ field }) => (
                                        <FormItem>
                                          <Label>Marque</Label>
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
                                          <Label>Modèle</Label>
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
                                          <Label>Année</Label>
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
                                          <Label>Couleur</Label>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              placeholder="ex: Bleu nuit"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={vehicleForm.control}
                                      name="province"
                                      render={({ field }) => (
                                        <FormItem>
                                          <Label>Province</Label>
                                          <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                          >
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Prov." />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {(
                                                Object.entries(
                                                  CANADIAN_PROVINCES,
                                                ) as [
                                                  ProvinceCode,
                                                  {
                                                    label: string;
                                                    plateFormat: string;
                                                    placeholder: string;
                                                  },
                                                ][]
                                              ).map(([code, p]) => (
                                                <SelectItem
                                                  key={code}
                                                  value={code}
                                                >
                                                  {code} — {p.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={vehicleForm.control}
                                      name="licensePlate"
                                      render={({ field }) => {
                                        const prov = vehicleForm.watch(
                                          "province",
                                        ) as ProvinceCode;
                                        const fmt = CANADIAN_PROVINCES[prov];
                                        return (
                                          <FormItem>
                                            <Label>Plaque</Label>
                                            <FormControl>
                                              <Input
                                                {...field}
                                                placeholder={
                                                  fmt?.placeholder ?? "ABC-123"
                                                }
                                                onChange={(e) =>
                                                  field.onChange(
                                                    e.target.value.toUpperCase(),
                                                  )
                                                }
                                              />
                                            </FormControl>
                                            {fmt && (
                                              <p className="text-xs text-muted-foreground">
                                                Format : {fmt.plateFormat}
                                              </p>
                                            )}
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  </div>
                                  <FormField
                                    control={vehicleForm.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                      <FormItem>
                                        <Label>
                                          Photo du véhicule{" "}
                                          <span className="text-muted-foreground">
                                            (URL, optionnel)
                                          </span>
                                        </Label>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder="https://example.com/photo.jpg"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </form>
                              </Form>
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
                    name="paymentOptions"
                    render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel className="text-base">
                            Options de paiement
                          </FormLabel>
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
                                  <Banknote className="h-5 w-5 text-primary" />{" "}
                                  Argent comptant
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
                                  <Landmark className="h-5 w-5 text-primary" />{" "}
                                  Virement Interac
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormMessage>
                          {tripForm.formState.errors.paymentOptions?.root
                            ?.message ||
                            tripForm.formState.errors.paymentOptions?.cash
                              ?.message}
                        </FormMessage>
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

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  className="w-full sm:flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:flex-1"
                  disabled={
                    tripForm.formState.isSubmitting ||
                    !tripForm.formState.isValid
                  }
                >
                  {tripForm.formState.isSubmitting
                    ? "Publication..."
                    : "Publier mon trajet"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {submittedTripData && (
        <AlertDialog
          open={showConfirmationDialog}
          onOpenChange={setShowConfirmationDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer votre trajet</AlertDialogTitle>
              <AlertDialogDescription>
                Veuillez vérifier les informations de votre trajet avant de le
                publier.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="text-sm space-y-4 py-4">
              <div className="font-semibold">
                {submittedTripData.departure?.description} &rarr;{" "}
                {submittedTripData.destination?.description}
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Date & Heure</p>
                  <p>
                    {submittedTripData.date
                      ? format(submittedTripData.date, "d MMMM yyyy", {
                          locale: fr,
                        })
                      : ""}{" "}
                    à {submittedTripData.time}{" "}
                    {submittedTripData.arrivalTime
                      ? `(arrivée ~${submittedTripData.arrivalTime})`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Prix & Places</p>
                  <p>
                    {submittedTripData.price}$ par place /{" "}
                    {submittedTripData.seats} places
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Véhicule</p>
                  <p>
                    {selectedVehicle?.make} {selectedVehicle?.model}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Paiement</p>
                  <div className="flex flex-wrap gap-x-2">
                    {submittedTripData.paymentOptions.cash && (
                      <span>Argent comptant</span>
                    )}
                    {submittedTripData.paymentOptions.interac && (
                      <span>Interac</span>
                    )}
                  </div>
                </div>
              </div>
              {submittedTripData.details && (
                <div>
                  <p className="font-medium text-foreground">
                    Détails supplémentaires
                  </p>
                  <p className="text-muted-foreground italic">
                    "{submittedTripData.details}"
                  </p>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAndPublish}
                disabled={tripForm.formState.isSubmitting}
              >
                {tripForm.formState.isSubmitting && (
                  <LoadingLogo className="mr-2 h-4 w-4" />
                )}
                Confirmer et publier
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog
        open={showReturnTripDialog}
        onOpenChange={setShowReturnTripDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trajet publié avec succès !</AlertDialogTitle>
            <AlertDialogDescription>
              Souhaitez-vous maintenant publier le trajet retour ? Les
              informations seront pré-remplies pour vous.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => router.push("/dashboard")}>
              Non, merci
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleProposeReturnTrip}>
              Oui, proposer le retour
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showFinalConfirmationDialog}
        onOpenChange={setShowFinalConfirmationDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trajet aller-retour planifié !</AlertDialogTitle>
            <AlertDialogDescription>
              Votre trajet aller et votre trajet retour ont été publiés avec
              succès. Vous pouvez les consulter dans votre tableau de bord.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push("/dashboard")}>
              Aller au tableau de bord
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard block: exact duplicate trip */}
      <AlertDialog
        open={showDuplicateTripError}
        onOpenChange={setShowDuplicateTripError}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trajet déjà publié</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez déjà publié ce trajet (
              {submittedTripData?.departure?.description} →{" "}
              {submittedTripData?.destination?.description}) pour cette date. La
              publication a été annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDuplicateTripError(false)}>
              Compris
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soft warning: already 2+ trips on this day */}
      <AlertDialog
        open={showHighTripCountWarning}
        onOpenChange={setShowHighTripCountWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Journée chargée</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez déjà {existingTripCount} trajet
              {existingTripCount > 1 ? "s" : ""} prévu
              {existingTripCount > 1 ? "s" : ""} ce jour-là. Pensez à votre
              sécurité et à la limite de conduite journalière recommandée.
              Souhaitez-vous quand même publier ce trajet ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowHighTripCountWarning(false)}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleForcePublish}>
              Publier quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Garde-fou : confirmation avant d'abandonner le formulaire */}
      <AlertDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner ce trajet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les informations saisies seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer la saisie</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/dashboard")}>
              Abandonner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
