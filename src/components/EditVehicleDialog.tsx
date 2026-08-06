"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, updateDoc } from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { useFirestore, useStorage } from "@/firebase";
import { vehicleSchema, type VehicleFormValues } from "@/lib/vehicle-schema";
import {
  VEHICLE_TYPE_CONFIG,
  CANADIAN_PROVINCES,
  VEHICLE_MAKES,
  VEHICLE_COLOR_OPTIONS,
  type VehicleType,
  type ProvinceCode,
  type Vehicle,
} from "@/types/db";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VehiclePhotoPicker } from "@/components/VehiclePhotoPicker";
import { SelectOrCustomField } from "@/components/SelectOrCustomField";
import { LoadingLogo } from "@/components/LoadingLogo";

const makeOptions = VEHICLE_MAKES.map((m) => ({ value: m, label: m }));
const colorOptions = VEHICLE_COLOR_OPTIONS.map((c) => ({
  value: c.label,
  label: c.label,
  swatch: c.hex,
}));

interface EditVehicleDialogProps {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVehicleDialog({
  vehicle,
  open,
  onOpenChange,
}: EditVehicleDialogProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [photoUpdate, setPhotoUpdate] = React.useState<Blob | null | undefined>(
    undefined,
  );

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
      province: vehicle.province ?? "QC",
      type: vehicle.type ?? "berline",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
      province: vehicle.province ?? "QC",
      type: vehicle.type ?? "berline",
    });
    setPhotoUpdate(undefined);
  }, [open, vehicle, form]);

  const handleSubmit = async (values: VehicleFormValues) => {
    if (!firestore) return;
    try {
      const vehicleRef = doc(
        firestore,
        `users/${vehicle.ownerId}/vehicles/${vehicle.id}`,
      );
      let imageUrl = vehicle.imageUrl ?? "";
      if (photoUpdate === null) {
        imageUrl = "";
      } else if (photoUpdate && storage) {
        const photoRef = storageRef(
          storage,
          `vehicles/${vehicle.ownerId}/${vehicle.id}.webp`,
        );
        await uploadBytes(photoRef, photoUpdate, {
          contentType: "image/webp",
        });
        imageUrl = await getDownloadURL(photoRef);
      }
      const maxSeats =
        VEHICLE_TYPE_CONFIG[values.type as VehicleType]?.maxSeats ??
        vehicle.maxSeats ??
        8;
      await updateDoc(vehicleRef, {
        ...values,
        imageUrl,
        maxSeats,
      });
      toast({ title: "Succès", description: "Véhicule mis à jour." });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating vehicle: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le véhicule.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le véhicule</DialogTitle>
          <DialogDescription>
            Corrigez les informations de votre véhicule. Elles sont visibles par
            les passagers.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id="edit-vehicle-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de véhicule</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        Object.entries(VEHICLE_TYPE_CONFIG) as [
                          VehicleType,
                          { label: string; maxSeats: number },
                        ][]
                      ).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label} — max {cfg.maxSeats} places
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectOrCustomField
                control={form.control}
                name="make"
                label="Marque"
                placeholder="Sélectionner la marque"
                options={makeOptions}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle</FormLabel>
                    <FormControl>
                      <Input className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SelectOrCustomField
                control={form.control}
                name="color"
                label="Couleur"
                placeholder="Sélectionner la couleur"
                options={colorOptions}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Prov." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.entries(CANADIAN_PROVINCES) as [
                            ProvinceCode,
                            {
                              label: string;
                              plateFormat: string;
                              placeholder: string;
                            },
                          ][]
                        ).map(([code, p]) => (
                          <SelectItem key={code} value={code}>
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
                control={form.control}
                name="licensePlate"
                render={({ field }) => {
                  const prov = form.watch("province") as ProvinceCode;
                  const fmt = CANADIAN_PROVINCES[prov];
                  return (
                    <FormItem>
                      <FormLabel>Plaque</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-11"
                          placeholder={fmt?.placeholder ?? "ABC-123"}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
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
            <div>
              <FormLabel>Photo du véhicule</FormLabel>
              <div className="mt-2">
                <VehiclePhotoPicker
                  key={vehicle.id}
                  initialImageUrl={vehicle.imageUrl}
                  onChange={setPhotoUpdate}
                />
              </div>
            </div>
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
            form="edit-vehicle-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <LoadingLogo className="mr-2 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
