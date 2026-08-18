import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { requireUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  sendPushToUser,
  createInAppNotification,
  firstNameOr,
} from "@/lib/notify";
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
  } catch (err) {
    console.error("[booking-status] 403 — requireUser a échoué:", err);
    return new NextResponse(null, { status: 403 });
  }

  const { tripId, bookingId } = await request.json();
  if (
    !tripId ||
    !bookingId ||
    typeof tripId !== "string" ||
    typeof bookingId !== "string"
  ) {
    console.error(
      "[booking-status] 403 — tripId/bookingId invalide:",
      tripId,
      bookingId,
    );
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
    console.error(
      `[booking-status] 403 — booking introuvable trips/${tripId}/bookings/${bookingId}`,
    );
    return new NextResponse(null, { status: 403 });
  }
  const booking = bookingSnap.data()!;
  if (booking.offeredBy !== uid) {
    console.error(
      `[booking-status] 403 — uid=${uid} != booking.offeredBy=${booking.offeredBy}`,
    );
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

  if (status === "accepted") {
    await db.collection("chat_channels").doc(bookingId).set(
      {
        tripId,
        bookingId,
        participant1Id: booking.travelerId,
        participant2Id: booking.offeredBy,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  const [tripSnap, conducteurSnap] = await Promise.all([
    db.collection("trips").doc(tripId).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const trip = tripSnap.data();
  const prenom = firstNameOr(conducteurSnap.data()?.name, "Le conducteur");
  const title =
    status === "accepted" ? "Réservation acceptée" : "Réservation refusée";
  const body = `${prenom} a ${status === "accepted" ? "accepté" : "refusé"} ta demande pour ${formatShortLocation(trip?.origin ?? "")} → ${formatShortLocation(trip?.destination ?? "")}`;
  const link = `/trip-details/${tripId}`;

  await Promise.all([
    sendPushToUser(booking.travelerId, {
      title,
      body,
      url: link,
      tag: `booking-${bookingId}`,
    }),
    createInAppNotification(booking.travelerId, {
      type: "booking-status",
      title,
      body,
      link,
    }),
  ]);

  return NextResponse.json({ status: "sent" });
}
