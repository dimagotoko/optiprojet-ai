import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { requireUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUser, firstNameOr } from "@/lib/notify";
import { formatShortLocation } from "@/lib/address";

async function claim(
  ref: DocumentReference,
  field: "notifiedAt" | "statusNotifiedAt",
) {
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.data()?.[field]) return false;
    tx.update(ref, { [field]: FieldValue.serverTimestamp() });
    return true;
  });
}

export async function POST(request: NextRequest) {
  let uid: string;
  try {
    const { user } = await requireUser();
    uid = user.uid;
  } catch {
    return new NextResponse(null, { status: 403 });
  }

  const { tripId, bookingId } = await request.json();
  if (
    !tripId ||
    !bookingId ||
    typeof tripId !== "string" ||
    typeof bookingId !== "string"
  ) {
    return new NextResponse(null, { status: 403 });
  }

  const db = getAdminDb();
  const bookingRef = db
    .collection("trips")
    .doc(tripId)
    .collection("bookings")
    .doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) {
    return new NextResponse(null, { status: 403 });
  }
  const booking = bookingSnap.data()!;
  if (booking.offeredBy !== uid) {
    return new NextResponse(null, { status: 403 });
  }

  const status = booking.status; // jamais lu depuis le client
  if (status !== "accepted" && status !== "rejected") {
    return NextResponse.json({ status: "nothing-to-notify" });
  }

  const won = await claim(bookingRef, "statusNotifiedAt");
  if (!won) {
    return NextResponse.json({ status: "already-notified" });
  }

  const [tripSnap, conducteurSnap] = await Promise.all([
    db.collection("trips").doc(tripId).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const trip = tripSnap.data();
  const prenom = firstNameOr(conducteurSnap.data()?.name, "Le conducteur");

  await sendPushToUser(booking.travelerId, {
    title:
      status === "accepted" ? "Réservation acceptée" : "Réservation refusée",
    body: `${prenom} a ${status === "accepted" ? "accepté" : "refusé"} ta demande pour ${formatShortLocation(trip?.origin ?? "")} → ${formatShortLocation(trip?.destination ?? "")}`,
    url: `/trip-details/${tripId}`,
    tag: `booking-${bookingId}`,
  });

  return NextResponse.json({ status: "sent" });
}
