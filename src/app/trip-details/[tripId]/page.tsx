import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import TripDetailsPage from "./TripDetailsClient";

type Props = { params: Promise<{ tripId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tripId } = await params;
  try {
    const db = getAdminDb();
    const snap = await db.collection("trips").doc(tripId).get();
    if (!snap.exists) return { title: "Trajet introuvable" };
    const trip = snap.data()!;

    const isPast =
      trip.departureTime != null && trip.departureTime.toDate() < new Date();
    const isUnavailable = trip.isClosed === true || isPast;

    const dateStr = trip.departureTime
      ? new Intl.DateTimeFormat("fr-CA", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(trip.departureTime.toDate())
      : "";

    const short = (s: string) => s.split(",")[0].trim();
    const from = short(trip.origin as string);
    const to = short(trip.destination as string);

    const title = dateStr
      ? `${from} → ${to} · ${dateStr} · ${trip.pricePerSeat} $/place`
      : `${from} → ${to} · ${trip.pricePerSeat} $/place`;

    const seats: number = trip.availableSeats ?? 0;
    const placeLabel = seats > 1 ? "places disponibles" : "place disponible";
    const description = `Covoiturage ${from} → ${to}${dateStr ? ` le ${dateStr}` : ""}. ${seats} ${placeLabel} à ${trip.pricePerSeat} $/place.`;

    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
      robots: isUnavailable ? { index: false, follow: false } : undefined,
    };
  } catch {
    return { title: "Trajet" };
  }
}

export default function Page() {
  return <TripDetailsPage />;
}
