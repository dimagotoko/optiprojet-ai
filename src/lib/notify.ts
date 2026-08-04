import { getAdminDb, getAdminMessaging } from "@/lib/firebase-admin";

type PushPayload = { title: string; body: string; url: string; tag: string };

const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export async function sendPushToUser(
  uid: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const tokensSnap = await getAdminDb()
      .collection(`users/${uid}/fcmTokens`)
      .get();
    if (tokensSnap.empty) return;

    const tokens = tokensSnap.docs.map((d) => d.id);

    // sendEachForMulticast est limité à 500 tokens par appel. À notre échelle
    // (un seul utilisateur, quelques appareils) cette limite n'est jamais
    // approchée ; si elle le devenait, il faudrait chunker `tokens` par 500.
    const response = await getAdminMessaging().sendEachForMulticast({
      tokens,
      data: payload, // data-only — jamais de bloc "notification" (sinon double affichage avec onBackgroundMessage)
    });

    // response.responses est garanti dans le même ordre que `tokens` (contrat API FCM) :
    // response.responses[i] correspond à tokens[i] / tokensSnap.docs[i].
    const deletions: Promise<unknown>[] = [];
    response.responses.forEach((r, i) => {
      if (r.success) return;
      const code = r.error?.code ?? "";
      if (DEAD_TOKEN_CODES.has(code)) {
        deletions.push(tokensSnap.docs[i].ref.delete());
      } else {
        // Erreur réseau, quota, indisponibilité, etc. — on log, on NE supprime PAS.
        console.error(
          `[notify] échec d'envoi vers ${uid} (token index ${i}):`,
          code || r.error,
        );
      }
    });
    await Promise.all(deletions);
  } catch (err) {
    // Fire-and-forget côté appelant : cette fonction ne doit jamais lever.
    console.error(`[notify] sendPushToUser a échoué pour ${uid}:`, err);
  }
}

export function firstNameOr(
  name: string | undefined,
  fallback: string,
): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed.split(" ")[0] : fallback;
}
