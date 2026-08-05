import { getApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
  type Messaging,
} from "firebase/messaging";

// getMessaging() lève une exception dans les navigateurs non supportés (pas de SW, pas de
// Notification API) : on ne l'appelle donc jamais au niveau module, uniquement à l'intérieur
// des fonctions ci-dessous, une fois l'app Firebase déjà initialisée par FirebaseClientProvider.
function getMessagingInstance(): Messaging {
  return getMessaging(getApp());
}

const THROTTLE_MS = 24 * 60 * 60 * 1000;

function lastSeenKey(uid: string) {
  return `fcmLastSeen:${uid}`;
}
function lastTokenKey(uid: string) {
  return `fcmLastToken:${uid}`;
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator))
    return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function registerFcmToken(uid: string): Promise<string | null> {
  try {
    if (!(await isPushSupported())) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const reg = await navigator.serviceWorker.ready;

    const token = await getToken(getMessagingInstance(), {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: reg, // sans ça, FCM cherche /firebase-messaging-sw.js et échoue silencieusement
    });
    if (!token) return null;

    const lastSeen = Number(localStorage.getItem(lastSeenKey(uid)) ?? 0);
    const lastToken = localStorage.getItem(lastTokenKey(uid));
    const tokenChanged = lastToken !== token;
    const throttleExpired = Date.now() - lastSeen > THROTTLE_MS;

    // Le throttle porte sur le rafraîchissement de lastSeenAt ; un token qui a changé
    // doit toujours être posté, même si les 24h ne sont pas écoulées.
    if (tokenChanged || throttleExpired) {
      const res = await fetch("/api/notifications/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      // Un token obtenu localement n'est pas des notifications activées : si le serveur
      // échoue (ex. purge cross-compte en erreur), rien n'est en base pour cet appareil.
      if (!res.ok) return null;
      localStorage.setItem(lastSeenKey(uid), String(Date.now()));
      localStorage.setItem(lastTokenKey(uid), token);
    }

    return token;
  } catch (err) {
    console.error("[messaging] registerFcmToken a échoué:", err);
    return null;
  }
}

export async function unregisterFcmToken(uid: string): Promise<void> {
  try {
    // Ne jamais appeler getToken() ici : si la permission n'a jamais été accordée, il
    // déclenche Notification.requestPermission() — inacceptable au moment du logout.
    if (Notification.permission !== "granted") return;

    const token = localStorage.getItem(lastTokenKey(uid));
    if (!token) return; // rien n'a jamais été enregistré

    await deleteToken(getMessagingInstance());

    await fetch("/api/notifications/token", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    localStorage.removeItem(lastSeenKey(uid));
    localStorage.removeItem(lastTokenKey(uid));
  } catch (err) {
    // Appelé pendant le logout : une erreur ici ne doit jamais bloquer signOut().
    console.error("[messaging] unregisterFcmToken a échoué:", err);
  }
}
