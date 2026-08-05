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
    if (snap.data()?.[field]) return false; // déjà notifié
    tx.update(ref, { [field]: FieldValue.serverTimestamp() });
    return true; // a gagné la course
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
  if (booking.travelerId !== uid) {
    return new NextResponse(null, { status: 403 });
  }

  const won = await claim(bookingRef, "notifiedAt");
  if (!won) {
    return NextResponse.json({ status: "already-notified" });
  }

  const [tripSnap, voyageurSnap] = await Promise.all([
    db.collection("trips").doc(tripId).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const trip = tripSnap.data();
  const prenom = firstNameOr(voyageurSnap.data()?.name, "Un voyageur");

  await sendPushToUser(booking.offeredBy, {
    title: "Nouvelle demande de réservation",
    body: `${prenom} veut réserver ${formatShortLocation(trip?.origin ?? "")} → ${formatShortLocation(trip?.destination ?? "")}`,
    url: "/dashboard",
    tag: `booking-${bookingId}`,
  });

  return NextResponse.json({ status: "sent" });
}
