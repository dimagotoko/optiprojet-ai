import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

export const PROTOCOL_VERSION = "1.0";

export type SignProtocolResult =
  | { alreadySigned: true }
  | { alreadySigned: false };

/**
 * Idempotent: reads private/profile first.
 * If protocolSignedAt already exists, returns immediately without writing —
 * the original signature date is never overwritten.
 */
export async function signProtocol(
  firestore: Firestore,
  uid: string,
): Promise<SignProtocolResult> {
  const privateRef = doc(firestore, "users", uid, "private", "profile");
  const privateSnap = await getDoc(privateRef);

  if (privateSnap.exists() && privateSnap.data()?.protocolSignedAt) {
    return { alreadySigned: true };
  }

  const userRef = doc(firestore, "users", uid);

  await Promise.all([
    setDoc(
      privateRef,
      {
        protocolSignedAt: serverTimestamp(),
        protocolVersion: PROTOCOL_VERSION,
      },
      { merge: true },
    ),
    setDoc(userRef, { isVerified: true }, { merge: true }),
  ]);

  return { alreadySigned: false };
}
