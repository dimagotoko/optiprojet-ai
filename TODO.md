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
