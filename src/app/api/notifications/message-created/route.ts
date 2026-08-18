import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { requireUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPushToUser, createInAppNotification } from "@/lib/notify";

async function claim(ref: DocumentReference) {
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.data()?.notifiedAt) return false;
    tx.update(ref, { notifiedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

export async function POST(request: NextRequest) {
  let uid: string;
  try {
    const { user } = await requireUser();
    uid = user.uid;
  } catch (err) {
    console.error("[message-created] 403 — requireUser a échoué:", err);
    return new NextResponse(null, { status: 403 });
  }

  const { bookingId, messageId } = await request.json();
  if (
    !bookingId ||
    !messageId ||
    typeof bookingId !== "string" ||
    typeof messageId !== "string"
  ) {
    console.error(
      "[message-created] 403 — bookingId/messageId invalide:",
      bookingId,
      messageId,
    );
    return new NextResponse(null, { status: 403 });
  }

  const db = getAdminDb();
  const channelRef = db.collection("chat_channels").doc(bookingId);
  const channelSnap = await channelRef.get();
  if (!channelSnap.exists) {
    console.error(
      `[message-created] 403 — canal introuvable chat_channels/${bookingId}`,
    );
    return new NextResponse(null, { status: 403 });
  }
  const channel = channelSnap.data()!;
  if (channel.participant1Id !== uid && channel.participant2Id !== uid) {
    console.error(
      `[message-created] 403 — uid=${uid} n'est pas participant du canal ${bookingId}`,
    );
    return new NextResponse(null, { status: 403 });
  }

  const messageRef = channelRef.collection("messages").doc(messageId);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists) {
    console.error(
      `[message-created] 403 — message introuvable chat_channels/${bookingId}/messages/${messageId}`,
    );
    return new NextResponse(null, { status: 403 });
  }
  const message = messageSnap.data()!;

  const won = await claim(messageRef);
  if (!won) {
    return NextResponse.json({ status: "already-notified" });
  }

  const recipientId =
    channel.participant1Id === message.senderId
      ? channel.participant2Id
      : channel.participant1Id;

  const link = `/trip-details/${channel.tripId}`;
  const preview: string =
    message.text.length > 80 ? `${message.text.slice(0, 80)}…` : message.text;

  await Promise.all([
    sendPushToUser(recipientId, {
      title: "Nouveau message",
      body: preview,
      url: link,
      tag: `chat-${bookingId}`,
    }),
    createInAppNotification(recipientId, {
      type: "new-message",
      title: "Nouveau message",
      body: preview,
      link,
    }),
    channelRef.set(
      {
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: preview,
      },
      { merge: true },
    ),
  ]);

  return NextResponse.json({ status: "sent" });
}
