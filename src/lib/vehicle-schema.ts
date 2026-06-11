import { z } from "zod";

const PROVINCE_CODES = [
  "QC",
  "ON",
  "BC",
  "AB",
  "MB",
  "SK",
  "NS",
  "NB",
  "PE",
  "NL",
  "YT",
  "NT",
  "NU",
] as const;

const VEHICLE_TYPES = [
  "berline",
  "vus_compact",
  "vus",
  "minifourgonnette",
  "camionnette",
  "autre",
] as const;

export const vehicleBaseSchema = z.object({
  make: z.string().min(1, "La marque est requise"),
  model: z.string().min(1, "Le modèle est requis"),
  year: z.coerce
    .number()
    .min(1900, "Année invalide")
    .max(new Date().getFullYear() + 1, "Année invalide"),
  color: z.string().min(1, "La couleur est requise"),
  licensePlate: z
    .string()
    .min(1, "La plaque est requise")
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z
        .string()
        .max(8, "Plaque trop longue (8 caractères max)")
        .regex(
          /^[A-Z0-9 \-]+$/,
          "Caractères non autorisés — lettres, chiffres, espace ou tiret seulement",
        ),
    ),
});

export const vehicleSchema = vehicleBaseSchema.extend({
  province: z.enum(PROVINCE_CODES, {
    required_error: "La province est requise",
  }),
  type: z.enum(VEHICLE_TYPES, {
    required_error: "Le type de véhicule est requis",
  }),
  imageUrl: z.string().url("URL invalide").optional().or(z.literal("")),
});

export type VehicleBaseFormValues = z.infer<typeof vehicleBaseSchema>;
export type VehicleFormValues = z.infer<typeof vehicleSchema>;
