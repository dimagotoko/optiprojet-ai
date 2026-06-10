import type { Timestamp } from "firebase/firestore";

export type Trip = {
  id: string;
  origin: string;
  destination: string;
  originCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  departureTime: Timestamp;
  arrivalTime?: Timestamp;
  pricePerSeat: number;
  offeredBy: string;
  availableSeats: number;
  totalBookings?: number;
  isClosed?: boolean;
  vehicleId: string;
  options?: {
    allowPets?: boolean;
    isNonSmoking?: boolean;
    allowLargeBags?: boolean;
    allowSmallBags?: boolean;
  };
  paymentOptions?: {
    cash?: boolean;
    interac?: boolean;
  };
  details?: string;
};

// Champs stockés dans /users/{uid} — lisibles publiquement
export type UserProfile = {
  id: string;
  name: string;
  city?: string;
  profilePictureUrl?: string;
  averageRating?: number;
  totalRatings?: number;
  role?: string;
  isVerified?: boolean;
  onboardingCompleted?: boolean;
  preferences?: {
    allowPets?: boolean;
    isNonSmoking?: boolean;
    allowLargeBags?: boolean;
    allowSmallBags?: boolean;
  };
};

// Champs stockés dans /users/{uid}/private/profile — owner + admin seulement
export type UserProfilePrivate = {
  email: string;
  phoneNumber: string;
  postalCode: string;
  driverLicense?: string;
  protocolSignedAt?: Timestamp;
};

export type Booking = {
  id: string;
  tripId: string;
  travelerId: string;
  offeredBy: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  paymentIntentId?: string;
  paymentStatus?: string;
  createdAt: Timestamp;
  // Dénormalisé lors de l'acceptation pour que le voyageur puisse contacter le conducteur
  driverEmail?: string;
  driverPhone?: string;
  // Dénormalisé lors de l'acceptation pour calculer l'argent économisé
  pricePerSeat?: number;
  seatsBooked?: number;
  distanceKm?: number;
};

export type VehicleType =
  | "berline"
  | "vus_compact"
  | "vus"
  | "minifourgonnette"
  | "camionnette"
  | "autre";

export const VEHICLE_TYPE_CONFIG: Record<
  VehicleType,
  { label: string; maxSeats: number }
> = {
  berline: { label: "Berline / Coupé", maxSeats: 4 },
  vus_compact: { label: "VUS compact", maxSeats: 5 },
  vus: { label: "VUS / SUV", maxSeats: 7 },
  minifourgonnette: { label: "Minifourgonnette", maxSeats: 8 },
  camionnette: { label: "Camionnette", maxSeats: 5 },
  autre: { label: "Autre", maxSeats: 8 },
};

export type ProvinceCode =
  | "QC"
  | "ON"
  | "BC"
  | "AB"
  | "MB"
  | "SK"
  | "NS"
  | "NB"
  | "PE"
  | "NL"
  | "YT"
  | "NT"
  | "NU";

export const CANADIAN_PROVINCES: Record<
  ProvinceCode,
  { label: string; plateFormat: string; placeholder: string }
> = {
  QC: { label: "Québec", plateFormat: "AAA-999", placeholder: "ABC-123" },
  ON: { label: "Ontario", plateFormat: "AAAA-999", placeholder: "ABCD-123" },
  BC: {
    label: "Colombie-Britannique",
    plateFormat: "AAA-999A",
    placeholder: "ABC-123D",
  },
  AB: { label: "Alberta", plateFormat: "AAA-9999", placeholder: "ABC-1234" },
  MB: { label: "Manitoba", plateFormat: "AAA-999", placeholder: "ABC-123" },
  SK: { label: "Saskatchewan", plateFormat: "AAA-999", placeholder: "ABC-123" },
  NS: {
    label: "Nouvelle-Écosse",
    plateFormat: "AAA-999",
    placeholder: "ABC-123",
  },
  NB: {
    label: "Nouveau-Brunswick",
    plateFormat: "AAA-999",
    placeholder: "ABC-123",
  },
  PE: {
    label: "Île-du-Prince-Édouard",
    plateFormat: "AA-9999",
    placeholder: "AB-1234",
  },
  NL: {
    label: "Terre-Neuve-et-Labrador",
    plateFormat: "AAA-999",
    placeholder: "ABC-123",
  },
  YT: { label: "Yukon", plateFormat: "AAAA-99", placeholder: "ABCD-12" },
  NT: {
    label: "Territoires du Nord-Ouest",
    plateFormat: "AAA-999",
    placeholder: "ABC-123",
  },
  NU: { label: "Nunavut", plateFormat: "AAA-999", placeholder: "ABC-123" },
};

export type Vehicle = {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  province: ProvinceCode;
  type: VehicleType;
  maxSeats: number;
  imageUrl?: string;
};
