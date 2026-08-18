# Spec — Chat utilisateur-utilisateur lié aux réservations

**Date :** 2026-08-17
**Statut :** Approuvé
**Scope :** Contact texte libre entre voyageur et transporteur, une fois une réservation acceptée
**Hors scope v1 :** page `/messages` globale, pièces jointes, messages rapides pré-écrits, blocage/signalement, accusé de lecture par message

---

## 1. Contexte et principe directeur

Le besoin exprimé : un voyageur ou un transporteur doit parfois joindre l'autre pour un
imprévu (retard, changement mineur) une fois la réservation confirmée. Ce n'est pas une
messagerie sociale continue — c'est un contact ponctuel, toujours rattaché à une
réservation précise. Le design suit ce principe : **pas d'inbox globale**, une conversation
par réservation, accessible depuis les surfaces où l'utilisateur voit déjà cette réservation
(dashboard, trip-details).

Les règles Firestore pour `chat_channels` et `chat_channels/{id}/messages` existent déjà
dans `firestore.rules` (accès par participant) mais n'étaient consommées par aucune UI.
Ce spec les active et les durcit.

---

## 2. Modèle de données

### `chat_channels/{bookingId}`

ID déterministe = l'ID du document `booking` lui-même. Un canal par réservation, pas par
paire d'utilisateurs — évite toute course à la création et permet de retrouver le canal
directement depuis `booking.id` sans requête supplémentaire.

```ts
export type ChatChannel = {
  id: string; // == bookingId
  tripId: string;
  bookingId: string;
  participant1Id: string; // travelerId
  participant2Id: string; // offeredBy (conducteur)
  createdAt: Timestamp;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  readBy?: Record<string, Timestamp>; // uid -> dernière lecture
};
```

### `chat_channels/{bookingId}/messages/{messageId}`

```ts
export type ChatMessage = {
  id: string;
  senderId: string;
  text: string; // texte libre, 1-1000 caractères
  createdAt: Timestamp;
  notifiedAt?: Timestamp; // idempotence push, même pattern que Booking.notifiedAt
};
```

Ajouts dans `src/types/db.ts` : `ChatChannel`, `ChatMessage`, et extension de
`AppNotification.type` avec `"new-message"`.

---

## 3. Création automatique du canal

Le canal est créé côté serveur, dans le même flux que la notification d'acceptation.
`src/app/api/notifications/booking-status/route.ts` gère déjà, de façon idempotente
(transaction `claim()` sur `statusNotifiedAt`), le moment exact où une réservation passe à
`accepted`. On y ajoute la création du canal :

```ts
if (status === "accepted") {
  const channelRef = db.collection("chat_channels").doc(bookingId);
  await channelRef.set(
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
```

Placé après le `claim()` réussi (donc exécuté une seule fois), avant l'envoi des
notifications. Aucun nouvel endpoint requis pour cette étape.

---

## 4. Point d'entrée UI

- Icône (note/message, pas un bouton texte) affichée sur la carte de réservation dès que
  `booking.status === 'accepted'`, dans :
  - le dashboard, côté voyageur (liste de ses réservations) et côté transporteur
    (`TripPublieRow` / section demandes acceptées)
  - `trip-details/[tripId]`, dans la carte conducteur enrichie, si l'utilisateur courant a
    une réservation acceptée sur ce trajet
- Badge visuel sur l'icône si non-lu (voir §5)
- Clic → ouverture d'un `Sheet` (`src/components/ui/sheet.tsx`, déjà utilisé pour la sidebar
  mobile) contenant le fil de messages + champ de saisie en bas

### Nouveaux composants

```
src/components/chat/
├── ContactBookingButton.tsx   (icône + badge, reçoit bookingId + otherUserName)
└── BookingChatSheet.tsx       (Sheet : liste messages temps réel + input)
```

`ContactBookingButton` ne fait aucune lecture tant que le `Sheet` n'est pas ouvert, à
l'exception d'un `useDoc` léger sur `chat_channels/{bookingId}` pour le badge non-lu
(le doc existe forcément puisque créé à l'acceptation).

---

## 5. Non-lu

Pas de sous-collection dédiée : `readBy` est un champ map sur le document canal lui-même
(cohérent avec le style "shape validation relaxée" déjà en place dans `firestore.rules`).

- Badge affiché si `channel.lastMessageAt > (channel.readBy?.[uid] ?? epoch 0)`
- À l'ouverture du `Sheet`, le client écrit `readBy.{uid} = serverTimestamp()` en `merge`
- Écriture autorisée par la règle existante d'update sur `chat_channels` (participant),
  restreinte à ce seul champ (voir §7)

Pas d'agrégation dans `NotificationBell` pour l'instant — le badge par icône suffit au cas
d'usage (contact ponctuel par réservation, pas de vue globale).

---

## 6. Notifications

Réutilisation intégrale de `src/lib/notify.ts` (`sendPushToUser`, `createInAppNotification`),
même pattern que `booking-created` / `booking-status`.

### Nouvel endpoint `src/app/api/notifications/message-created/route.ts`

Appelé par le client juste après avoir écrit un message dans
`chat_channels/{bookingId}/messages`.

```
POST body: { bookingId, messageId }
```

1. `requireUser()` → 403 si absent
2. Lire `chat_channels/{bookingId}` → 403 si absent ou si `uid` n'est ni
   `participant1Id` ni `participant2Id`
3. Lire le message → déterminer le destinataire (l'autre participant)
4. `claim(messageRef, "notifiedAt")` — même transaction d'idempotence que les endpoints
   existants
5. `sendPushToUser` + `createInAppNotification` (type `"new-message"`, lien
   `/trip-details/{tripId}`)
6. Mettre à jour `chat_channels/{bookingId}` : `lastMessageAt`, `lastMessagePreview`
   (tronqué à ~80 caractères)

---

## 7. Sécurité — modifications de `firestore.rules`

### `chat_channels/{chatChannelId}` — verrouiller la création client

```js
// AVANT
allow create: if request.auth != null && (request.resource.data.participant1Id == request.auth.uid || ...);

// APRÈS — créé uniquement par l'Admin SDK (route booking-status), jamais par le client
allow create: if false;
```

`get`/`list`/`update`/`delete` restent inchangés (participant ou admin), mais `update` doit
être restreint pour n'autoriser que le champ `readBy` côté client (le reste — `lastMessageAt`,
`lastMessagePreview` — n'est écrit que par l'Admin SDK, qui bypass les règles) :

```js
allow update: if (isExistingParticipant(resource.data.participant1Id, resource.data.participant2Id)
                  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['readBy']))
              || isAdmin();
```

### `chat_channels/{chatChannelId}/messages/{messageId}` — shape validation + immutabilité

```js
// AVANT : allow read, write si participant (trop permissif : update/delete libres)

// APRÈS
allow get, list: if (request.auth != null && isParticipant(chatChannelId)) || isAdmin();
allow create: if request.auth != null && isParticipant(chatChannelId)
              && request.resource.data.senderId == request.auth.uid
              && request.resource.data.text is string
              && request.resource.data.text.size() > 0
              && request.resource.data.text.size() <= 1000;
allow update, delete: if false; // messages immuables en v1
```

### Tests `firestore.rules` (`test:rules`)

| Cas                                                      | Résultat attendu |
| -------------------------------------------------------- | ---------------- |
| Client tente de créer un `chat_channels` directement     | ❌ refusé        |
| Participant crée un message valide                       | ✅ autorisé      |
| Non-participant tente de créer un message                | ❌ refusé        |
| Message avec `senderId` usurpé                           | ❌ refusé        |
| Message `text` vide ou > 1000 caractères                 | ❌ refusé        |
| Participant modifie `readBy` uniquement                  | ✅ autorisé      |
| Participant tente de modifier `lastMessageAt`            | ❌ refusé        |
| Participant tente d'éditer/supprimer un message existant | ❌ refusé        |

---

## 8. Hors scope v1

- Page `/messages` globale (déjà tranché en brainstorm)
- Pièces jointes / images
- Messages rapides pré-écrits ("Je suis en retard de 10 min")
- Blocage / signalement d'utilisateur
- Accusé de lecture par message (seul le badge non-lu global par canal existe)
- Expiration/archivage du canal — reste accessible indéfiniment

---

## 9. Fichiers à créer/modifier

| Fichier                                                   | Action                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/types/db.ts`                                         | Ajout `ChatChannel`, `ChatMessage`, extension `AppNotification.type` |
| `firestore.rules`                                         | Durcissement `chat_channels` + `messages` (§7)                       |
| `src/app/api/notifications/booking-status/route.ts`       | Création du canal à l'acceptation (§3)                               |
| `src/app/api/notifications/message-created/route.ts`      | **Nouveau** — notif push/in-app sur nouveau message (§6)             |
| `src/components/chat/ContactBookingButton.tsx`            | **Nouveau** — icône + badge                                          |
| `src/components/chat/BookingChatSheet.tsx`                | **Nouveau** — fil de messages + input                                |
| Dashboard voyageur/transporteur + `trip-details/[tripId]` | Intégration du bouton sur les réservations acceptées                 |
| `tests/` (rules)                                          | Cas du tableau §7                                                    |

---

## 10. Estimation

| Étape                                                                          | Durée              |
| ------------------------------------------------------------------------------ | ------------------ |
| Types + durcissement `firestore.rules` + tests rules                           | 2h                 |
| Création canal dans `booking-status/route.ts`                                  | 30 min             |
| Endpoint `message-created/route.ts`                                            | 1h                 |
| `ContactBookingButton.tsx` + `BookingChatSheet.tsx` (UI + listener temps réel) | 2-3h               |
| Intégration dashboard (voyageur + transporteur) + trip-details                 | 1-2h               |
| Tests manuels bout-en-bout (2 comptes, notifs push)                            | 1h                 |
| **Total**                                                                      | **~8-9h ≈ 1 jour** |
