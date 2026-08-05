import { signOut, type Auth } from "firebase/auth";
import { unregisterFcmToken } from "@/firebase/messaging";

function withTimeout(p: Promise<unknown>, ms = 3000): Promise<unknown> {
  return Promise.race([p, new Promise((resolve) => setTimeout(resolve, ms))]);
}

// Ordre strict : la désinscription push et la suppression du cookie de session
// ne doivent jamais empêcher signOut() — c'est la déconnexion qui prime, pas la
// propreté des tokens. Un timeout protège ces deux étapes : sur une déconnexion
// pour inactivité (réseau coupé, onglet en veille), un fetch qui pend sans jamais
// rejeter empêcherait sinon signOut() de s'exécuter, laissant l'utilisateur connecté
// indéfiniment — l'inverse du but recherché. signOut() n'a pas de timeout : cette
// étape doit aboutir.
export async function logout(auth: Auth, uid: string): Promise<void> {
  try {
    await withTimeout(unregisterFcmToken(uid));
  } catch (err) {
    console.error("[logout] désinscription du token push a échoué:", err);
  }

  try {
    await withTimeout(fetch("/api/auth/session", { method: "DELETE" }));
  } catch (err) {
    console.error("[logout] suppression du cookie de session a échoué:", err);
  }

  await signOut(auth);
}
