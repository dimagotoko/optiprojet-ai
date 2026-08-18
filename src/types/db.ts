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
  distanceKm?: number;
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
  protocolVersion?: string;
};

export type PassengerRelation =
  "ami" | "conjoint" | "parent" | "enfant" | "cousin" | "collegue" | "autre";

export type PassengerEntry = {
  name: string;
  relation: PassengerRelation;
};

export const RELATION_LABELS: Record<PassengerRelation, string> = {
  ami: "Ami(e)",
  conjoint: "Conjoint(e)",
  parent: "Père / Mère",
  enfant: "Enfant",
  cousin: "Cousin(e)",
  collegue: "Collègue",
  autre: "Autre",
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
  // Dénormalisé à la création pour permettre le split date-based côté voyageur
  departureTime?: Timestamp;
  // Nombre de places réservées (1 = réservant seul, 2+ = avec co-passagers)
  seatsBooked?: number;
  // Dénormalisé lors de l'acceptation pour que le voyageur puisse contacter le conducteur
  driverEmail?: string;
  driverPhone?: string;
  // Dénormalisé lors de l'acceptation pour calculer l'argent économisé
  pricePerSeat?: number;
  distanceKm?: number;
  // Co-passagers renseignés après confirmation (hors réservant)
  passengers?: PassengerEntry[];
  // Idempotence des notifications push — posé dans une transaction (claim())
  notifiedAt?: Timestamp;
  statusNotifiedAt?: Timestamp;
};

export type AppNotification = {
  id: string;
  type: "booking-created" | "booking-status" | "new-message";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: Timestamp;
};

// ID déterministe == bookingId — un canal par réservation, pas par paire d'utilisateurs.
export type ChatChannel = {
  id: string;
  tripId: string;
  bookingId: string;
  participant1Id: string; // travelerId
  participant2Id: string; // offeredBy (conducteur)
  createdAt: Timestamp;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  readBy?: Record<string, Timestamp>;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string; // 1-1000 caractères
  createdAt: Timestamp;
  notifiedAt?: Timestamp; // idempotence push, même pattern que Booking.notifiedAt
};

export type FavoriteRoute = {
  id: string;
  origin: string;
  destination: string;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  createdAt: Timestamp;
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

export const VEHICLE_MAKES: readonly string[] = [
  "Acura",
  "Alfa Romeo",
  "Audi",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hummer",
  "Hyundai",
  "Infiniti",
  "Isuzu",
  "Jaguar",
  "Jeep",
  "Kia",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "Mercedes-Benz",
  "Mercury",
  "MINI",
  "Mitsubishi",
  "Nissan",
  "Pontiac",
  "Polestar",
  "Porsche",
  "RAM",
  "Rivian",
  "Saab",
  "Saturn",
  "Scion",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
];

export const VEHICLE_COLOR_OPTIONS: readonly { label: string; hex: string }[] =
  [
    { label: "Blanc", hex: "#F2F2F2" },
    { label: "Noir", hex: "#1A1A1A" },
    { label: "Gris", hex: "#9CA3AF" },
    { label: "Argent", hex: "#C7C9CC" },
    { label: "Bleu", hex: "#2563EB" },
    { label: "Bleu marine", hex: "#1E3A5F" },
    { label: "Turquoise", hex: "#14B8A6" },
    { label: "Vert", hex: "#16A34A" },
    { label: "Jaune", hex: "#EAB308" },
    { label: "Or / Champagne", hex: "#C9A227" },
    { label: "Orange", hex: "#EA580C" },
    { label: "Rouge", hex: "#DC2626" },
    { label: "Bordeaux", hex: "#7F1D2E" },
    { label: "Rose", hex: "#EC4899" },
    { label: "Violet", hex: "#7C3AED" },
    { label: "Brun / Marron", hex: "#78350F" },
    { label: "Beige", hex: "#D6CCB2" },
    { label: "Bronze / Cuivre", hex: "#8C5A2B" },
  ];

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
  createdAt?: Timestamp;
  isPrimary?: boolean;
};
