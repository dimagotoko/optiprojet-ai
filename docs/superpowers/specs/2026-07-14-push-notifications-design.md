# Spec — Notifications Push OptiTrajet

**Date :** 2026-07-14  
**Statut :** Approuvé (v2 — corrections semi-anonymat, stockage privé tokens, config)  
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

**Cloud Functions Firestore triggers (Gen 2) + Firebase Cloud Messaging (FCM)**

- `onCreate` sur bookings → notification A (conducteur)
- `onUpdate` sur bookings → notification B ou C (voyageur) selon le nouveau statut
- Envoi via Firebase Admin SDK (`admin.messaging().sendEachForMulticast`)
- Réception côté navigateur via Service Worker (`push` event)

---

## 2. Semi-anonymat dans les notifications

**Règle absolue :** les noms affichés dans les notifications suivent la même convention
que le reste de l'app — prénom + initiale du nom de famille. "Eden D." pas "Eden Dawn".
Cette règle s'applique **avant toute acceptation** (notif A notamment) et dans tous les
sens (voyageur → conducteur, conducteur → voyageur).

### Fonction utilitaire partagée

La fonction `formatDriverName` existe aujourd'hui dans `src/components/TripCard.tsx`
comme fonction locale. Elle doit être extraite dans un module partagé **et** répliquée
dans les Cloud Functions (Node.js ne peut pas importer depuis Next.js).

**Logique (identique dans les deux contextes) :**

```ts
// prénom + initiale du dernier mot — "Eden Dawn" → "Eden D."
function formatName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
```

**Emplacements :**

- `src/lib/format-name.ts` → exporté, utilisé par `TripCard.tsx` (remplace la copie locale)
- `functions/src/format-name.ts` → copie identique pour les Cloud Functions

---

## 3. Stockage des tokens FCM

### Emplacement — `users/{uid}/private/fcm`

Les tokens FCM ne vont **pas** sur le document public `users/{uid}`
(règle `allow get: if true` — lisible par n'importe qui).
Ils vont dans le sous-document **privé** : `users/{uid}/private/fcm`.

```
users/{uid}/private/fcm
  { tokens: string[] }
```

### Règles Firestore

La règle existante couvre déjà ce chemin, aucune modification nécessaire :

```js
match /users/{userId}/private/{docId} {
  allow read, write: if request.auth.uid == userId || isAdmin();
}
```

La Cloud Function (Admin SDK) lit et modifie ce document hors règles.

### Type TypeScript

`UserProfile` (type public, `src/types/db.ts`) **n'est pas modifié**.  
Le token est une donnée privée — il n'appartient pas au profil public.

### Nettoyage des tokens périmés

Quand FCM Admin SDK retourne `messaging/registration-token-not-registered`
lors de `sendEachForMulticast`, la Cloud Function supprime le token invalide via
`admin.firestore().doc('users/{uid}/private/fcm').update({ tokens: FieldValue.arrayRemove(token) })`.

### Tests Firestore rules

Ajouter dans `tests/` les cas suivants pour garder `test:rules` au vert :

| Cas                                             | Résultat attendu |
| ----------------------------------------------- | ---------------- |
| Owner lit `private/fcm`                         | ✅ autorisé      |
| Owner écrit `private/fcm`                       | ✅ autorisé      |
| Autre utilisateur authentifié lit `private/fcm` | ❌ refusé        |
| Non authentifié lit `private/fcm`               | ❌ refusé        |
| Admin lit `private/fcm`                         | ✅ autorisé      |

---

## 4. UX — Demande de permission

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
setDoc(users/{uid}/private/fcm, { tokens: arrayUnion(token) }, { merge: true })
```

### Conditions de non-affichage

- `'Notification' in window` est faux (navigateur sans support)
- `Notification.permission === 'denied'`
- `Notification.permission === 'granted'` (déjà accordé)
- `localStorage.getItem('optitrajet_notif_dismissed') === '1'`

Clic "Plus tard" → `localStorage.setItem('optitrajet_notif_dismissed', '1')` →
bannière ne réapparaît plus.

### Composant

`src/components/NotificationPrompt.tsx`

- Bannière fixe en bas de l'écran (z-50)
- Props : `onGranted?: () => void`, `onDismiss?: () => void`
- Intégration dans `TripDetailsClient.tsx` (post-réservation) et dans le flow publication trajet

---

## 5. Extension du Service Worker

`public/sw.js` — ajout de deux handlers au fichier existant :

### Handler `push`

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

## 6. Cloud Functions

### Structure de fichiers

```
functions/
  src/
    index.ts          ← exports onBookingCreated + onBookingStatusChanged
    notifications.ts  ← logique des 3 notifications (A, B, C)
    fcm.ts            ← utilitaire sendToUser(uid, payload)
    format-name.ts    ← copie de la fonction formatName (pas d'import Next.js)
  package.json
  tsconfig.json
```

### Utilitaire `sendToUser`

```ts
sendToUser(uid: string, payload: { title: string; body: string; url: string }): Promise<void>
```

1. Lire `users/{uid}/private/fcm` → `{ tokens: string[] }`
2. Si tableau vide ou absent → return
3. `admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, webpush: { fcmOptions: { link: url }, notification: { icon: '/icon-192.png' } } })`
4. Pour chaque réponse en erreur `registration-token-not-registered` → `arrayRemove(token)` sur `users/{uid}/private/fcm`

### Fonction 1 — `onBookingCreated`

**Trigger :** `onDocumentCreated('trips/{tripId}/bookings/{bookingId}')` (Gen 2)

**Logique :**

1. Lire le booking créé (status toujours `pending` à la création)
2. Lire `trips/{tripId}` pour origin, destination, departureTime
3. Lire `users/{travelerId}.name` → appliquer `formatName` → "Eden D."
4. Appeler `sendToUser(booking.offeredBy, payload_A)`

### Fonction 2 — `onBookingStatusChanged`

**Trigger :** `onDocumentUpdated('trips/{tripId}/bookings/{bookingId}')` (Gen 2)

**Logique :**

```ts
const before = change.data.before.data();
const after  = change.data.after.data();

if (before.status === after.status) return;

if (after.status === 'accepted' && before.status !== 'accepted') {
  // Lire users/{offeredBy}.name → formatName → "Eden D."
  → sendToUser(after.travelerId, payload_B)
}

if (after.status === 'rejected' && before.status !== 'rejected') {
  → sendToUser(after.travelerId, payload_C)
  // Pas de nom affiché dans C — pas de lecture users nécessaire
}
```

---

## 7. Contenu des 3 notifications

**Format de date :** `new Intl.DateTimeFormat('fr-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(departureTime.toDate())`

### A — Nouvelle demande → Conducteur

| Champ        | Valeur                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- |
| Titre        | `Nouvelle demande de place`                                                               |
| Corps        | `{formatName(voyageur.name)} veut rejoindre {trip.origin} → {trip.destination} le {date}` |
| URL clic     | `/trip-details/{tripId}`                                                                  |
| Déclencheur  | `onCreate`                                                                                |
| Destinataire | `booking.offeredBy`                                                                       |

> Le nom est semi-anonymisé même ici — la demande arrive avant toute acceptation.

### B — Réservation acceptée → Voyageur

| Champ        | Valeur                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Titre        | `Place confirmée`                                                                                         |
| Corps        | `{formatName(conducteur.name)} a accepté votre demande pour {trip.origin} → {trip.destination} le {date}` |
| URL clic     | `/trip-details/{tripId}`                                                                                  |
| Déclencheur  | `onUpdate`, `before.status !== 'accepted'` && `after.status === 'accepted'`                               |
| Destinataire | `booking.travelerId`                                                                                      |

### C — Réservation refusée → Voyageur

| Champ        | Valeur                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| Titre        | `Demande non retenue`                                                                 |
| Corps        | `Votre demande pour {trip.origin} → {trip.destination} le {date} n'a pas été retenue` |
| URL clic     | `/trips`                                                                              |
| Déclencheur  | `onUpdate`, `before.status !== 'rejected'` && `after.status === 'rejected'`           |
| Destinataire | `booking.travelerId`                                                                  |

> Pas de nom dans C — inutile d'exposer le conducteur dans un refus.

---

## 8. Configuration

### Clé VAPID

La clé VAPID est une **clé publique** par design (la moitié privée reste dans Firebase).
Elle n'est pas un secret mais une configuration publique.

**Génération :** Console Firebase → Project Settings → Cloud Messaging →
Web Push certificates → "Generate key pair"

**Stockage :**

- `.env.local` → `NEXT_PUBLIC_FIREBASE_VAPID_KEY=<valeur>`
- `apphosting.yaml` → ajout d'une entrée `env:` avec `value:` (pas `secret:`) :

```yaml
- variable: NEXT_PUBLIC_FIREBASE_VAPID_KEY
  value: <valeur>
  availability:
    - BUILD
    - RUNTIME
```

### `firebase.json` — bloc functions manquant

Le `firebase.json` actuel n'a pas de section `functions`. À ajouter :

```json
"functions": {
  "source": "functions",
  "codebase": "default",
  "ignore": [
    "node_modules",
    ".git",
    "firebase-debug.log",
    "firebase-debug.*.log"
  ]
}
```

---

## 9. Hors scope sprint actuel

Les notifications D/E/F suivent le même pattern `sendToUser` :

| Notif | Événement                          | Complexité supplémentaire                       |
| ----- | ---------------------------------- | ----------------------------------------------- |
| D     | Annulation voyageur → conducteur   | `onUpdate`, status → `cancelled`                |
| E     | Trajet annulé → voyageurs acceptés | `onUpdate` sur trip + requête bookings accepted |
| F     | Rappel 24h avant départ            | Cloud Function `onSchedule` (pubsub cron)       |

---

## 10. Estimation

| Étape                                                                  | Durée                  |
| ---------------------------------------------------------------------- | ---------------------- |
| Génération VAPID key + `apphosting.yaml` + `firebase.json`             | 30 min                 |
| Extraction `formatName` → `src/lib/format-name.ts`                     | 30 min                 |
| Extension `public/sw.js` (push + notificationclick)                    | 1h                     |
| `NotificationPrompt.tsx` + intégration post-booking + post-publication | 2h                     |
| `src/lib/fcm-client.ts` — `getToken` + `saveToken` vers `private/fcm`  | 1h                     |
| Tests Firestore rules (`private/fcm`)                                  | 1h                     |
| Scaffold `functions/` + `fcm.ts` + `format-name.ts`                    | 1h                     |
| `notifications.ts` — logique A/B/C + `sendToUser`                      | 2h                     |
| Tests navigateur réel + emulateur Functions                            | 2-3h                   |
| **Total**                                                              | **~11-12h ≈ 1,5 jour** |
