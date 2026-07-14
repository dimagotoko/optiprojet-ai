# Spec — Notifications Push OptiTrajet

**Date :** 2026-07-14  
**Statut :** Approuvé  
**Scope :** Notifications A (nouvelle demande), B (acceptée), C (refusée)  
**Hors scope v1 :** D (annulation voyageur), E (trajet annulé), F (rappel 24h)

---

## 1. Architecture

### Flux de données

```
Client → Firestore write → Cloud Function trigger → FCM Admin SDK → SW push handler → Notification OS
```

Les actions booking (`accept`, `reject`) sont des écrits Firestore directs depuis le client
(`TripDetailsClient.tsx:201`). Il n'existe pas de server action à accrocher. Des triggers
Cloud Functions sur `trips/{tripId}/bookings/{bookingId}` sont donc le seul endroit fiable
pour déclencher les notifications.

### Approche retenue

**Cloud Functions Firestore triggers + Firebase Cloud Messaging (FCM)**

- `onCreate` sur bookings → notification A (conducteur)
- `onUpdate` sur bookings → notification B ou C (voyageur) selon le nouveau statut
- Envoi via Firebase Admin SDK (`admin.messaging().sendEachForMulticast`)
- Réception côté navigateur via Service Worker (`push` event)

---

## 2. Stockage des tokens FCM

### Emplacement

Champ `fcmTokens: string[]` sur le document public `users/{uid}`.  
Un utilisateur peut être connecté sur plusieurs appareils : le tableau est nécessaire.

### Modification du type

`src/types/db.ts` — `UserProfile` ajoute :

```ts
fcmTokens?: string[];
```

### Règles Firestore

La règle `allow update` existante sur `users/{userId}` autorise déjà le propriétaire à
modifier ses propres champs. On ajoute une clause explicite pour permettre la mise à jour
de `fcmTokens` seul (sans renvoyer tout le profil, évite les race conditions) :

```js
// Clause additionnelle dans match /users/{userId} → allow update :
|| (request.auth.uid == userId
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['fcmTokens'])
    && request.resource.data.fcmTokens is list)
```

### Nettoyage des tokens périmés

Quand FCM Admin SDK retourne `messaging/registration-token-not-registered`,
la Cloud Function supprime le token invalide du tableau via Admin SDK
(hors règles Firestore, donc sans contrainte côté client).

---

## 3. UX — Demande de permission

### Principe

Jamais au premier chargement. La bannière s'affiche uniquement **dans le contexte d'une
action** où la valeur des notifications est immédiatement évidente.

### Déclencheurs

| Rôle       | Moment                                          | Message de valeur                                  |
| ---------- | ----------------------------------------------- | -------------------------------------------------- |
| Voyageur   | Après confirmation d'une demande de réservation | "Sois notifié quand le conducteur répond"          |
| Conducteur | Après publication d'un trajet                   | "Sois notifié quand un voyageur demande une place" |

### Flux en 2 étapes

```
Action réussie (réservation envoyée / trajet publié)
    ↓
Délai 1 500 ms
    ↓
<NotificationPrompt> — bannière douce in-app (PAS le dialog natif du navigateur)
  "Activer les notifications pour suivre ce trajet ? [Activer] [Plus tard]"
    ↓ clic "Activer"
Notification.requestPermission()
    ↓ résultat "granted"
getToken(messaging, { vapidKey: NEXT_PUBLIC_FIREBASE_VAPID_KEY })
    ↓
arrayUnion(token) dans users/{uid}.fcmTokens (Firestore client SDK)
```

### Conditions de non-affichage

- `'Notification' in window` est faux (navigateur sans support)
- `Notification.permission === 'denied'` (utilisateur a refusé via dialog natif)
- `Notification.permission === 'granted'` (déjà accordé)
- `localStorage.getItem('optitrajet_notif_dismissed') === '1'`

Clic "Plus tard" → `localStorage.setItem('optitrajet_notif_dismissed', '1')` →
bannière ne réapparaît plus jamais.

### Composant

`src/components/NotificationPrompt.tsx`

- Bannière fixe en bas de l'écran (bottom sheet légère, z-50)
- Props : `onGranted?: () => void`, `onDismiss?: () => void`
- S'intègre dans `TripDetailsClient.tsx` (post-réservation) et dans le flow publication trajet

---

## 4. Extension du Service Worker

`public/sw.js` — ajout de deux handlers au fichier existant :

### Handler `push`

Reçoit le payload FCM et affiche la notification OS :

```js
self.addEventListener("push", (event) => {
  const { title, body, url, icon } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon ?? "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    }),
  );
});
```

### Handler `notificationclick`

Ouvre l'URL cible quand l'utilisateur tape la notification :

```js
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(event.notification.data.url);
    }),
  );
});
```

---

## 5. Cloud Functions

### Structure de fichiers

```
functions/
  src/
    index.ts          ← exports onBookingCreated + onBookingStatusChanged
    notifications.ts  ← logique des 3 notifications (A, B, C)
    fcm.ts            ← utilitaire sendToUser(uid, payload)
  package.json
  tsconfig.json
```

### Utilitaire `sendToUser`

```ts
sendToUser(uid: string, payload: { title: string; body: string; url: string }): Promise<void>
```

1. Lire `users/{uid}.fcmTokens` via Admin Firestore
2. Si tableau vide ou absent → return (pas de token enregistré)
3. `admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, webpush: { fcmOptions: { link: url }, notification: { icon: '/icon-192.png' } } })`
4. Pour chaque réponse en erreur `registration-token-not-registered` → `arrayRemove(token)` sur `users/{uid}`

### Fonction 1 — `onBookingCreated`

**Trigger :** `functions.firestore.document('trips/{tripId}/bookings/{bookingId}').onCreate`

**Logique :**

1. Lire le booking créé (status est toujours `pending` à la création)
2. Lire `trips/{tripId}` pour origin, destination, departureTime
3. Lire `users/{travelerId}.name` pour le nom du voyageur
4. Appeler `sendToUser(booking.offeredBy, payload_A)`

### Fonction 2 — `onBookingStatusChanged`

**Trigger :** `functions.firestore.document('trips/{tripId}/bookings/{bookingId}').onUpdate`

**Logique :**

```
const before = change.before.data();
const after  = change.after.data();

if (before.status === after.status) return; // pas de changement de statut

if (after.status === 'accepted' && before.status !== 'accepted')
  → sendToUser(after.travelerId, payload_B)

if (after.status === 'rejected' && before.status !== 'rejected')
  → sendToUser(after.travelerId, payload_C)
```

Données nécessaires : lire `trips/{tripId}` + `users/{offeredBy}.name` pour B.

---

## 6. Contenu des 3 notifications

### A — Nouvelle demande → Conducteur

| Champ        | Valeur                                                                               |
| ------------ | ------------------------------------------------------------------------------------ |
| Titre        | `Nouvelle demande de place`                                                          |
| Corps        | `{voyageur.name} veut rejoindre {trip.origin} → {trip.destination} le {date courte}` |
| URL clic     | `/trip-details/{tripId}`                                                             |
| Déclencheur  | `onCreate` — status toujours `pending`                                               |
| Destinataire | `booking.offeredBy`                                                                  |

### B — Réservation acceptée → Voyageur

| Champ        | Valeur                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- |
| Titre        | `Place confirmée`                                                                             |
| Corps        | `{conducteur.name} a accepté votre demande pour {trip.origin} → {trip.destination} le {date}` |
| URL clic     | `/trip-details/{tripId}`                                                                      |
| Déclencheur  | `onUpdate`, `before.status !== 'accepted'` && `after.status === 'accepted'`                   |
| Destinataire | `booking.travelerId`                                                                          |

### C — Réservation refusée → Voyageur

| Champ        | Valeur                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| Titre        | `Demande non retenue`                                                                 |
| Corps        | `Votre demande pour {trip.origin} → {trip.destination} le {date} n'a pas été retenue` |
| URL clic     | `/trips`                                                                              |
| Déclencheur  | `onUpdate`, `before.status !== 'rejected'` && `after.status === 'rejected'`           |
| Destinataire | `booking.travelerId`                                                                  |

**Format de date :** `new Intl.DateTimeFormat('fr-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(departureTime.toDate())`

---

## 7. Variables d'environnement

| Variable                         | Emplacement                            | Usage                               |
| -------------------------------- | -------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | `.env.local` + Firebase Hosting config | `getToken(messaging, { vapidKey })` |
| Config Firebase client existante | Déjà en place                          | Init `messaging`                    |
| Firebase Admin SDK               | Déjà initialisé via `firebase-admin`   | Cloud Functions                     |

La VAPID key se génère dans la console Firebase → Project Settings → Cloud Messaging → Web Push certificates.

---

## 8. Hors scope sprint actuel

Les notifications D/E/F suivent le même pattern `sendToUser` et s'ajoutent sans modifier l'architecture :

| Notif | Événement                          | Complexité supplémentaire                      |
| ----- | ---------------------------------- | ---------------------------------------------- |
| D     | Annulation voyageur → conducteur   | `onUpdate`, status → `cancelled`               |
| E     | Trajet annulé → voyageurs acceptés | `onUpdate` sur trip, requête bookings accepted |
| F     | Rappel 24h avant départ            | Cloud Function `onSchedule` (pubsub cron)      |

---

## 9. Estimation

| Étape                                                                  | Durée                  |
| ---------------------------------------------------------------------- | ---------------------- |
| Génération VAPID key + variable d'env                                  | 30 min                 |
| Extension `public/sw.js` (push + notificationclick)                    | 1h                     |
| `NotificationPrompt.tsx` + intégration post-booking + post-publication | 2h                     |
| `src/types/db.ts` + règle Firestore `fcmTokens`                        | 30 min                 |
| Initialisation FCM client (`src/lib/fcm-client.ts`) + `saveToken`      | 1h                     |
| Cloud Functions : scaffold + `fcm.ts` + `notifications.ts` (A/B/C)     | 3h                     |
| Tests navigateur réel + emulateur Functions                            | 2-3h                   |
| **Total**                                                              | **~10-11h ≈ 1,5 jour** |
