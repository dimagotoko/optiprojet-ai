
import type { Timestamp } from 'firebase/firestore';

export type Trip = {
  id: string;
  origin: string;
  destination: string;
  departureTime: Timestamp;
  arrivalTime?: Timestamp;
  pricePerSeat: number;
  offeredBy: string;
  availableSeats: number;
  totalBookings?: number;
  isClosed?: boolean;
  options?: {
    allowPets?: boolean;
    isNonSmoking?: boolean;
    allowLargeBags?: boolean;
    allowSmallBags?: boolean;
  };
  details?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  profilePictureUrl?: string;
  averageRating?: number;
  totalRatings?: number;
  role?: string;
};

export type Booking = {
  id: string;
  tripId: string;
  travelerId: string;
  paymentIntentId: string;
  paymentStatus: string;
  createdAt: Timestamp;
};
