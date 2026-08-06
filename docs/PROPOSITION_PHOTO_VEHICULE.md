# Propositions — photo véhicule & avatar généré

Aucun code n'a été écrit. Ceci est une synthèse de l'état actuel + options,
pour décision avant implémentation.

## État actuel (constat)

- **Pas de composant `VehicleForm` dédié** : le formulaire est dupliqué en
  inline dans `post-trip/page.tsx` (complet : type, province, imageUrl) et
  `edit-trip/[tripId]/page.tsx` (allégé : ni type, ni province, ni imageUrl).
  Incohérence déjà présente, indépendante de ce chantier.
- **Champ photo actuel = simple `<Input>` texte** attendant une URL déjà
  hébergée ailleurs (`z.string().url()`). Aucun upload, aucune compression,
  aucune caméra, aucun preview dans le formulaire.
- **Champ `color` = texte libre**, réutilisé directement comme valeur CSS
  (`style={{ backgroundColor: vehicle.color.toLowerCase() }}` dans
  `TripPublieRow.tsx`). Fragile : ne fonctionne que si l'utilisateur tape un
  mot-clé CSS anglais valide ("blue"), pas un texte FR ("Bleu nuit") — dans ce
  cas le style est silencieusement ignoré.
- **Champ `type`**, lui, est déjà propre : `z.enum` structuré + `<Select>`,
  avec un mapping `VEHICLE_TYPE_CONFIG` (label + places max).
- **Le flux avatar profil** (`AvatarUpload.tsx`) est mature : modale caméra
  avec fallback natif, compression WebP 512×512 ≤200 Ko, upload Firebase
  Storage, preview live, gestion d'erreurs fine (permissions, HEIC, timeout).
- Il n'existe **aucune** brique de génération d'avatar (pas de lib type
  dicebear/boring-avatars, pas de mapping couleur→hex). Le seul fallback
  visuel actuel est une icône `Car` générique statique.

## Décision préalable — le champ couleur

Les deux idées (swatch fiable + avatar généré) dépendent de pouvoir traduire
`vehicle.color` en une vraie valeur hexadécimale. Deux options :

**Option C1 — Garder le texte libre, ajouter une table de correspondance FR→hex**
Mapper ~15 mots-clés français courants (bleu, rouge, noir, blanc, gris,
argent, vert, jaune, brun/marron, orange, violet, beige, or, bordeaux...) vers
un hex, avec un gris neutre par défaut si le mot ne matche rien.

- ✅ N'importe pas de contrainte UX supplémentaire, rétrocompatible avec les
  véhicules déjà en base.
- ⚠️ Toujours approximatif pour les couleurs non listées ou nuancées
  ("bleu ciel", "gris anthracite") → retombe sur le défaut.

**Option C2 — Remplacer par un `<Select>` fermé (~12-15 couleurs)**
Enum structuré comme `type`, chaque couleur déjà associée à son hex exact.

- ✅ Fiable à 100 %, cohérent avec le traitement déjà appliqué à `type`.
- ⚠️ Moins de liberté ("bleu nuit" métallisé devient juste "Bleu"). Nécessite
  une migration douce pour les véhicules existants (texte libre en base ne
  matchera pas forcément un enum — prévoir un fallback "Autre").

Recommandation : **C2**, par cohérence avec `type` et parce que la fiabilité
sert directement les deux propositions ci-dessous. C1 reste une option de
repli si tu préfères ne rien casser côté UX existante.

## Proposition A — Avatar généré (type + couleur) — ta suggestion

Un avatar composé, réutilisable partout où un véhicule est affiché sans
"vraie" photo (cartes trajet, `TripPublieRow`, profil transporteur) :

- **Fond** = couleur du véhicule (via C1 ou C2 ci-dessus).
- **Icône** = dérivée de `type` via `VEHICLE_TYPE_CONFIG` étendu (mapping
  simple type → icône lucide-react : `berline`/`autre` → `Car`,
  `vus`/`vus_compact` → `CarFront` — déjà importée mais inutilisée dans
  `TripPublieRow.tsx`, signe qu'un essai avait été commencé —,
  `minifourgonnette` → à choisir, `camionnette` → `Truck`, déjà importée elle
  aussi mais inutilisée).
- Techniquement : composant `VehicleAvatar` réutilisant `Avatar`/
  `AvatarFallback` (déjà dans `src/components/ui/avatar.tsx`), aucune
  dépendance externe, aucun coût Storage, rendu 100 % côté client.

**Faisabilité : élevée, effort faible.** C'est la proposition la plus
rentable — elle corrige au passage le bug actuel du swatch fragile.

## Proposition B — Adapter la photo véhicule au style avatar profil

Reprendre le flux `AvatarUpload.tsx` (caméra + fallback + compression +
Storage) pour remplacer le champ URL texte actuel :

- Chemin Storage proposé : `vehicles/{ownerId}/{vehicleId}.webp`.
- Réutilisation directe des helpers déjà exportés (`compressImage`,
  `formatSize`, `isHeicFile`, `MAX_FILE_SIZE`, `CameraModal`).
- Corrige au passage l'incohérence `edit-trip` vs `post-trip` (le champ
  `imageUrl`/upload doit exister aux deux endroits).

Deux niveaux possibles :

- **B1 — Parité complète** avec l'avatar profil (caméra + fichier + preview
  live + compression). Cohérent visuellement avec le reste du site, mais
  plus de code à dupliquer/factoriser (extraire les helpers de
  `AvatarUpload.tsx` vers un module partagé plutôt que copier-coller).
- **B2 — Version allégée** : juste upload fichier classique (pas de modale
  caméra dédiée — sur mobile, l'`<input type="file" accept="image/*">`
  natif propose déjà l'appareil photo) + compression WebP + Storage. Moins
  de code, expérience quasi identique sur mobile, un peu moins "riche" sur
  desktop (pas de prise de photo directe depuis webcam).

## Comment A et B se combinent

Ce ne sont pas des alternatives exclusives — proposition suggérée :

1. **A d'abord** (rentable, rapide, corrige un bug existant) : chaque
   véhicule a toujours une identité visuelle correcte (couleur + type), même
   sans photo réelle.
2. **B ensuite, en complément** : la vraie photo (si fournie) prend le pas
   sur l'avatar généré dans l'affichage (`imageUrl ? <Image> : <VehicleAvatar>`
   — remplace juste l'actuelle icône `Car` statique par `VehicleAvatar` dans
   ce même fallback).
3. Corriger l'incohérence `edit-trip`/`post-trip` (champs manquants) dans la
   même passe que B, puisque B touche ces deux formulaires de toute façon.

## Questions pour trancher avant de coder

1. Couleur : **C1** (mapping sur texte libre existant) ou **C2** (Select
   fermé, migration douce) ?
2. Avatar généré (**A**) : go, et si oui — l'affiche-t-on seulement en
   fallback (pas de photo), ou systématiquement à côté de la vraie photo
   (ex. petit badge) ?
3. Upload réel (**B**) : le fait-on maintenant (B1 parité complète, ou B2
   allégé), ou on s'arrête à **A** pour l'instant et on reporte B ?
4. Si B : on factorise `AvatarUpload.tsx` (extraire les helpers partagés
   dans un module commun) plutôt que dupliquer le code — d'accord ?

## Décisions actées

1. **Couleur → C2** : `<Select>` fermé avec hex exact par couleur, fallback
   "Autre" (gris neutre) pour les véhicules déjà en base dont le texte libre
   ne matche aucune option de la liste.
2. **A d'abord** : avatar généré, affiché en fallback (remplace l'icône `Car`
   statique actuelle partout où `imageUrl` est absent). B est reporté, pas
   annulé.
3. **Champ qui pilote l'icône de l'avatar → `type`** (catégorie existante :
   berline / VUS / VUS compact / minifourgonnette / camionnette / autre),
   **pas** le champ `model` (texte libre précis, ex. "Corolla"). Confirmé :
   pas d'icône par modèle exact, ça reviendrait à réinventer `type`.
4. Mapping icône retenu (lucide-react, `VEHICLE_TYPE_CONFIG` étendu) :
   - `berline` → `Car`
   - `vus` / `vus_compact` → `CarFront` (déjà importée mais inutilisée dans
     `TripPublieRow.tsx`)
   - `camionnette` → `Truck` (idem, déjà importée mais inutilisée)
   - `minifourgonnette` → `Bus` (approximation la plus proche disponible
     dans lucide-react ; pas d'icône minivan dédiée)
   - `autre` → `Car` (défaut générique)

## Prochaine étape

Implémentation de la Proposition A :

- Convertir `color` en `<Select>` C2 (liste hex + fallback "Autre").
- Créer `VehicleAvatar` (fond = hex couleur, icône = mapping ci-dessus).
- Remplacer le fallback `Car` statique dans `TripPublieRow.tsx` par
  `VehicleAvatar`, l'utiliser aussi dans le profil transporteur.
- B (upload réel) et la correction `edit-trip`/`post-trip` restent reportés,
  non annulés.
