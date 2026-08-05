import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  let uid: string;
  try {
    const { user } = await requireUser();
    uid = user.uid;
  } catch {
    return new NextResponse(null, { status: 403 });
  }

  const { token } = await request.json();
  if (!token || typeof token !== "string") {
    return new NextResponse(null, { status: 403 });
  }

  const db = getAdminDb();

  // Purge cross-compte D'ABORD (fail closed — Loi 25) : si un autre compte
  // détient déjà ce token (même navigateur, connexions successives), on le
  // retire avant d'écrire quoi que ce soit pour ce compte-ci.
  try {
    const matches = await db
      .collectionGroup("fcmTokens")
      .where("token", "==", token)
      .get();
    await Promise.all(
      matches.docs
        .filter((d) => d.ref.parent.parent?.id !== uid)
        .map((d) => d.ref.delete()),
    );
  } catch (err) {
    console.error("[notifications/token] purge cross-compte échouée:", err);
    return new NextResponse(null, { status: 500 });
  }

  const tokenRef = db
    .collection("users")
    .doc(uid)
    .collection("fcmTokens")
    .doc(token);
  const existing = await tokenRef.get();
  await tokenRef.set(
    {
      token,
      userAgent: request.headers.get("user-agent") ?? "",
      lastSeenAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  let uid: string;
  try {
    const { user } = await requireUser();
    uid = user.uid;
  } catch {
    return new NextResponse(null, { status: 403 });
  }

  const { token } = await request.json();
  if (!token || typeof token !== "string") {
    return new NextResponse(null, { status: 403 });
  }

  await getAdminDb()
    .collection("users")
    .doc(uid)
    .collection("fcmTokens")
    .doc(token)
    .delete();

  return NextResponse.json({ ok: true });
}
