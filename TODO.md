# TODO

## Protocole d'accord — versioning futur (non implémenté en v1)

Si le protocole passe un jour en version 2.0, décider si on exige une
re-acceptation : comparer `protocolVersion` enregistré dans
`users/{uid}/private/profile` à la constante `PROTOCOL_VERSION` définie dans
`src/lib/protocol.ts`. En v1, `protocolVersion` est écrit à la signature mais
aucune re-acceptation n'est exigée si la version change — comportement
intentionnel.

---

## Plafond légal QC — durcissement côté serveur (Cloud Function)

La règle Firestore `isValidTrip()` vérifie `pricePerSeat × availableSeats ≤ 0,54 × distanceKm`,
mais `distanceKm` est fourni par le client — un attaquant peut le falsifier.

**Durcissement recommandé (v1.x) :** Cloud Function `onTripCreate` qui :

1. Récupère `originCoords` et `destinationCoords` depuis le document créé.
2. Recalcule `distanceKm` côté serveur (haversine).
3. Compare au `distanceKm` écrit par le client.
4. Si l'écart est > 5 % : supprime le document et rejette la création.

Tant que cette Cloud Function n'existe pas, la vérification est défense en
profondeur uniquement (bloque UI + clients naïfs, pas un attaquant déterminé).

---

## TripCard — image picsum décorative

Remplacer l'image picsum décorative des TripCard par une vraie image (ou retirer) — trompeur en l'état.

---

## Pagination /trips — filtres client-side sur l'ensemble accumulé

La pagination Firestore de /trips utilise `limit(50)` + curseur `startAfter`.
Les filtres (origine, destination, créneau horaire, options, prix) s'appliquent
**côté client** sur l'ensemble accumulé des batches chargés. C'est correct pour
un volume faible à moyen. Quand le volume grandira, basculer les filtres
principaux (origine / destination / date) **côté serveur** avec des index
composites Firestore (déplacer le matching texte vers Algolia ou Typesense,
ou ajouter des champs normalisés `originCity` / `destinationCity` indexés).

---

## Stat CO₂ évité — amélioration distance réelle

La stat "CO₂ évité" (voyageur dashboard) utilise actuellement un forfait fixe de
`CO2_PER_TRIP_KG = 18 kg` par trajet accepté, quelle que soit la distance.

Depuis le commit "feat - Argent économisé", chaque Booking accepté stocke
`distanceKm` (haversine réelle, calculée à l'acceptation). La stat "Argent
économisé" l'utilise déjà.

**Amélioration possible (hors scope initial) :** remplacer le forfait par
`distanceKm * CO2_PAR_KM_SOLO` où `CO2_PAR_KM_SOLO ≈ 0.12 kg/km` (référence
voiture solo à essence, 120 g CO₂/km).

Prérequis : les bookings créés avant la dénormalisation de `distanceKm` n'ont
pas ce champ — même contrainte de backfill que pour `pricePerSeat`.

---

## Notifications push — perte possible si l'onglet se ferme trop vite

Les points d'accroche (`TripDetailsClient.tsx`, `DemandesEnAttente.tsx`) déclenchent un
`fetch(...).catch(() => {})` fire-and-forget juste après l'écriture Firestore. Si l'onglet
se ferme entre les deux, la requête ne part jamais — le drapeau d'idempotence
(`notifiedAt` / `statusNotifiedAt`) protège du spam en cas de double appel, pas de cette
perte-là. Correction prévue : trigger Firestore (`onDocumentCreated`/`onDocumentUpdated`)
ou Cloud Function déclenchée côté serveur, indépendante du fetch client.

---

## requireUser() — aller-retour réseau superflu

`requireUser()` (`src/lib/auth.ts`) appelle `verifySessionCookie()` puis
`getAdminAuth().getUser(decodedIdToken.uid)`. Le second appel réseau est inutile pour les 3
endpoints de notifications : l'`uid` est déjà dans le token décodé par `verifySessionCookie()`.
Un `getCurrentUid()` léger (sans le `getUser()`) éviterait un aller-retour réseau par
notification envoyée.

---

## getCurrentUser() — expiration de session serveur sans déconnexion client

`src/lib/auth.ts`, bloc `catch` de `getCurrentUser()` : quand `verifySessionCookie()` échoue
(cookie expiré/révoqué), le serveur vide le cookie `__session` **côté serveur uniquement**,
sans jamais appeler `signOut(auth)` côté client ni `unregisterFcmToken(uid)`. Un appareil peut
donc continuer à recevoir des push après expiration de la session serveur, puisque ce chemin
ne déclenche ni déconnexion client ni désinscription du token. Piste : intercepteur sur les
réponses 403 côté client qui appelle `logout()` (`src/lib/logout.ts`).

---

## Safari iOS — push nécessite l'installation en PWA

Sur Safari iOS, les notifications push web ne fonctionnent que si le site est installé sur
l'écran d'accueil (mode PWA autonome) — un onglet Safari classique ne peut pas recevoir de
push. À mentionner dans l'UI d'opt-in si on veut couvrir ce cas correctement.

---

## Rappels de trajet programmés (hors périmètre v1)

Notifier un voyageur/conducteur avant le départ d'un trajet nécessite un déclenchement
temporel (pas un événement Firestore) — Cloud Scheduler + Cloud Function. Hors périmètre de
la v1 événementielle actuelle.

---

## Page de préférences de notifications

Actuellement tout ou rien (permission navigateur). Une page de préférences par type
d'événement (mute réservations acceptées / refusées / nouvelles demandes, etc.) demanderait
un nouveau champ dans `users/{uid}/private/profile` et un filtre dans `sendPushToUser`.

---

## firestore.rules — `isExistingParticipant` inutilisée

`firestore.rules` ligne 310, dans `match /chat_channels/{chatChannelId}/messages/{messageId}` :
`isExistingParticipant(chatChannelId)` est définie mais jamais appelée — la règle
`allow read, write` (ligne 314) utilise directement `isParticipant(chatChannelId)`. Code mort,
à supprimer.
(Précision : `request`/`resource` dans son corps ne sont pas des paramètres de la fonction —
son seul paramètre est `chatChannelId` — ce sont les variables globales Firestore standard,
référencées sans conflit. Pas de bug de masquage, juste du code mort.)

---

## Purge des tokens FCM dormants

`lastSeenAt` (`users/{uid}/fcmTokens/{token}`) est écrit à chaque enregistrement
(`src/app/api/notifications/token/route.ts`) mais jamais lu ni utilisé pour purger quoi que
ce soit. FCM invalide unilatéralement un token après ~270 jours d'inactivité de l'appareil ;
sans purge périodique, ces tokens morts restent en base indéfiniment (l'envoi échoue et le
purge-sur-échec de `notify.ts` s'en charge _au prochain envoi_, mais jamais proactivement pour
un utilisateur qui ne reçoit plus jamais de notification).
