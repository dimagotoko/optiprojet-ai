
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

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  city: string;
  postalCode: string;
  phoneNumber: string;
  profilePictureUrl?: string;
  averageRating?: number;
  totalRatings?: number;
  role?: string;
  driverLicense?: string;
  stripeCustomerId?: string;
};

export type Booking = {
  id: string;
  tripId: string;
  travelerId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  paymentIntentId?: string;
  paymentStatus?: string;
  createdAt: Timestamp;
};

export type Vehicle = {
    id: string;
    ownerId: string;
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
};
