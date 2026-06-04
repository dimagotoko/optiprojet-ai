
import type { Timestamp } from 'firebase/firestore';

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
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  paymentIntentId?: string;
  paymentStatus?: string;
  createdAt: Timestamp;
};

export type VehicleType =
  | 'berline'
  | 'vus_compact'
  | 'vus'
  | 'minifourgonnette'
  | 'camionnette'
  | 'autre';

export const VEHICLE_TYPE_CONFIG: Record<VehicleType, { label: string; maxSeats: number }> = {
  berline:          { label: 'Berline / Coupé',  maxSeats: 4 },
  vus_compact:      { label: 'VUS compact',       maxSeats: 5 },
  vus:              { label: 'VUS / SUV',         maxSeats: 7 },
  minifourgonnette: { label: 'Minifourgonnette',  maxSeats: 8 },
  camionnette:      { label: 'Camionnette',       maxSeats: 5 },
  autre:            { label: 'Autre',             maxSeats: 8 },
};

export type Vehicle = {
    id: string;
    ownerId: string;
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
    type: VehicleType;
    maxSeats: number;
    imageUrl?: string;
};
