# TODO

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
