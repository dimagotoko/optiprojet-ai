# Spec — Complétude des véhicules (`type`/`maxSeats`) et édition universelle

**Date :** 2026-08-20
**Statut :** Approuvé
**Scope :** Corriger la fuite qui laisse des véhicules sans `type`/`maxSeats` (formulaire
d'ajout d'`edit-trip`), et permettre d'éditer N'IMPORTE QUEL véhicule d'un transporteur
(pas seulement le premier), pour compléter les véhicules déjà incomplets en base.
**Hors scope v1 :** migration silencieuse des véhicules existants, page dédiée « Mes
véhicules », Proposition A (avatar véhicule généré) — voir `docs/PROPOSITION_PHOTO_VEHICULE.md`.

---

## 1. Contexte et principe directeur

Audit `docs/AUDIT_2026-08-20.md` §3.1 : 5 véhicules sur 14 (36 %) en base n'ont ni `type` ni
`maxSeats`, tous créés via le formulaire « Ajouter un véhicule » d'`edit-trip/[tripId]/page.tsx`,
qui utilise `vehicleBaseSchema` (sans `type`/`province`) alors que `post-trip/page.tsx` utilise
déjà le schéma complet `vehicleSchema`. Conséquence concrète : `selectedVehicle?.maxSeats ?? 8`
permet à un transporteur avec un véhicule legacy de publier jusqu'à 8 places sur une berline —
donnée fausse montrée aux voyageurs.

En creusant, un vrai chemin d'édition existe déjà : `EditVehicleDialog` (créé le 2026-08-06,
commit `feat(vehicule): photo, listes deroulantes et edition depuis le profil`) gère
intégralement `type`/`maxSeats`/photo via `updateDoc`. Mais il n'est branché que sur
`vehicles[0]` (le véhicule le plus ancien, trié par `createdAt`), depuis `ProfileSidebar.tsx`.
Un transporteur multi-véhicules n'a donc **aucun** moyen de corriger un véhicule secondaire
incomplet — le vrai gap n'est pas l'absence d'un dialog d'édition, mais son sous-branchement.

Principe directeur : **ne pas dupliquer `EditVehicleDialog`**, le rendre accessible partout où
un véhicule est déjà listé/sélectionné (`edit-trip`, `post-trip`), et rendre le problème visible
(badge) plutôt que de forcer une migration de données.

---

## 2. Formulaire d'ajout — `edit-trip/[tripId]/page.tsx`

Aligner sur `post-trip/page.tsx`, qui fait déjà ceci correctement :

- Import : remplacer `vehicleBaseSchema as vehicleSchema` / `VehicleBaseFormValues as
VehicleFormValues` par le schéma complet `vehicleSchema` / `VehicleFormValues` (export déjà
  existant dans `src/lib/vehicle-schema.ts`, pas de changement de ce fichier).
- Ajouter `VEHICLE_TYPE_CONFIG`, `CANADIAN_PROVINCES`, `type VehicleType`, `type ProvinceCode`
  aux imports depuis `@/types/db` (déjà tous exportés, déjà utilisés tels quels par
  `EditVehicleDialog.tsx` et `post-trip/page.tsx`).
- `vehicleForm` : `defaultValues` gagne `province: "QC"` et `type: "berline"` (mêmes valeurs par
  défaut que `EditVehicleDialog`).
- JSX du dialog « Ajouter un nouveau véhicule » : insérer un `<Select>` Type de véhicule (options
  = `VEHICLE_TYPE_CONFIG`, affichant `${cfg.label} — max ${cfg.maxSeats} places`, identique à
  `EditVehicleDialog.tsx:163-191`) et un `<Select>` Province (`CANADIAN_PROVINCES`, identique à
  `EditVehicleDialog.tsx:236-269`).
- Champ `licensePlate` : aujourd'hui un simple `Input` statique dans `edit-trip`
  (`page.tsx:778-782`, aucun placeholder dynamique). L'aligner sur
  `EditVehicleDialog.tsx:270-283` : lire `const prov = vehicleForm.watch("province") as
ProvinceCode`, `const fmt = CANADIAN_PROVINCES[prov]`, et utiliser
  `placeholder={fmt?.placeholder ?? "ABC-123"}` (validation Zod déjà générique dans
  `vehicleBaseSchema`, aucun changement de schéma requis ici).
- `handleAddVehicle` : calculer `maxSeats` avant le `setDoc`, même ligne que `post-trip/page.tsx:392-393` :
  ```ts
  const maxSeats =
    VEHICLE_TYPE_CONFIG[values.type as VehicleType]?.maxSeats ?? 8;
  await setDoc(vehicleRef, {
    ...values,
    imageUrl,
    maxSeats,
    ownerId: user.uid,
    createdAt: serverTimestamp(),
  });
  ```

Résultat : tout véhicule créé depuis `edit-trip` a désormais systématiquement `type`+`maxSeats`
corrects — la fuite s'arrête pour les nouveaux véhicules.

---

## 3. Édition universelle — bouton crayon à côté du `<Select>` véhicule

`edit-trip` et `post-trip` partagent la même structure : un `<Select>` (`FormField
name="vehicleId"`) listant les véhicules de l'utilisateur, plus un bouton `+` (icône `Plus`) à
côté qui ouvre le dialog d'ajout. On ajoute un second bouton, crayon (icône `Pencil` de
lucide-react), entre le `<Select>` et le bouton `+` :

- **`post-trip/page.tsx`** : `selectedVehicle` est déjà calculé (`page.tsx:662`,
  `vehicles.find(v => v.id === tripForm.watch("vehicleId"))`). Le bouton crayon est désactivé
  (`disabled`) si `!selectedVehicle`, sinon ouvre `<EditVehicleDialog vehicle={selectedVehicle}
open={...} onOpenChange={...} />` — composant déjà importé nulle part dans ce fichier, à
  importer.
- **`edit-trip/[tripId]/page.tsx`** : pas de `selectedVehicle` mémoïsé aujourd'hui — en dériver
  un identique (`vehicles?.find(v => v.id === tripForm.watch("vehicleId"))`) juste avant le bloc
  JSX du `<Select>` véhicule. Même bouton crayon, même import `EditVehicleDialog`.
- État local nécessaire dans chaque fichier : `const [showEditVehicleDialog, setShowEditVehicleDialog] = useState(false)` (nom différent de `showAddVehicleDialog` déjà présent, pour ne pas
  les confondre).

`EditVehicleDialog` n'a besoin d'aucune modification — il accepte déjà n'importe quel `Vehicle`,
gère un `type` `undefined` en base (`vehicle.type ?? "berline"` dans ses `defaultValues`) et
écrit `type`+`maxSeats` corrects au `updateDoc`.

---

## 4. Badge « À compléter »

Signal visuel non bloquant (pas de migration forcée) partout où un véhicule est listé :

- **`SelectItem`** (`edit-trip` et `post-trip`) : à la suite du texte existant
  (`{v.make} {v.model} ({v.licensePlate})`), ajouter conditionnellement un petit `Badge`
  (`@/components/ui/badge`, déjà utilisé ailleurs dans le projet) `variant="outline"` texte
  « À compléter » si `!v.type`. `SelectItem` accepte du contenu enfant non interactif (un `Badge`
  est un `<span>` stylé) — pas de restriction Radix ici, seul un élément interactif imbriqué
  (bouton, lien) casserait le `Select`.
- **`ProfileSidebar.tsx`** : même `Badge` sur la carte du véhicule principal (bloc
  `firstVehicle`, ~ligne 258-270), affiché si `!firstVehicle.type`, à côté du nom
  make/model déjà affiché.

Pas de badge agrégé dans le dashboard ou une notification — le signal reste local à l'endroit où
le véhicule est déjà visible, cohérent avec l'absence de migration forcée.

---

## 5. Edge cases

- **Véhicule sans `type` ouvert dans `EditVehicleDialog`** : déjà géré (`vehicle.type ??
"berline"` comme valeur de départ du `<Select>` Type) — l'utilisateur doit explicitement
  confirmer ou changer le type avant `Enregistrer`, ce qui écrit toujours un `type` valide.
- **Trajet en cours d'édition (`edit-trip`) alors que le véhicule sélectionné vient d'être
  corrigé** : `EditVehicleDialog` fait un `updateDoc` Firestore ; le `<Select>` véhicule
  (alimenté par `useCollection`) et `selectedVehicle` se remettent à jour automatiquement via le
  listener temps réel existant — aucun code supplémentaire requis.
- **`maxSeats` recalculé alors que `tripForm.seats` dépasse la nouvelle valeur** : le
  `useEffect` de clamp déjà présent dans `post-trip/page.tsx` (`selectedVehicle?.maxSeats` →
  ajuste `tripForm.seats`) s'applique aussi après une édition, puisqu'il dépend de
  `selectedVehicle?.maxSeats` réactif. `edit-trip` n'a pas cet effet aujourd'hui — à vérifier
  s'il existe un clamp équivalent ou s'il faut l'ajouter (question ouverte pour l'implémentation,
  pas bloquante pour ce spec : au pire la valeur legacy `8` reste affichée jusqu'à
  re-sélection).

---

## 6. Hors scope v1

- Migration silencieuse des véhicules déjà incomplets — l'utilisateur doit ouvrir
  `EditVehicleDialog` lui-même et confirmer le type.
- Page dédiée de gestion « Mes véhicules » (liste de tous les véhicules hors contexte
  post-trip/edit-trip).
- Proposition A (avatar véhicule généré à partir de `type`+`color`) — reste dans
  `docs/PROPOSITION_PHOTO_VEHICULE.md`, non traitée ici.
- Empêcher la création d'un véhicule sans `type` au niveau des Security Rules
  (`isValidVehicle()`) — le formulaire suffit à bloquer ce cas côté UI ; un durcissement des
  règles resterait un chantier séparé si jugé nécessaire.

---

## 7. Fichiers à modifier

| Fichier                                              | Changement                                                                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/edit-trip/[tripId]/page.tsx`                | Schéma complet + champs type/province au formulaire d'ajout, calcul `maxSeats`, bouton crayon + `EditVehicleDialog`, badge dans `SelectItem` |
| `src/app/post-trip/page.tsx`                         | Bouton crayon + `EditVehicleDialog` (le formulaire d'ajout est déjà complet), badge dans `SelectItem`                                        |
| `src/components/dashboard/shared/ProfileSidebar.tsx` | Badge sur la carte du véhicule principal si `!firstVehicle.type`                                                                             |

Aucun changement dans `src/lib/vehicle-schema.ts`, `src/components/EditVehicleDialog.tsx`,
`firestore.rules`, ou `src/types/db.ts` — tout le nécessaire existe déjà.

---

## 8. Estimation

| Étape                                                                                                                                         | Durée   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `edit-trip` : schéma complet + champs type/province + calcul `maxSeats`                                                                       | 45 min  |
| `edit-trip` + `post-trip` : bouton crayon + `EditVehicleDialog` branché                                                                       | 45 min  |
| Badges « À compléter » (2 `SelectItem` + `ProfileSidebar`)                                                                                    | 20 min  |
| Vérification manuelle (créer véhicule incomplet legacy simulé, corriger via edit-trip et post-trip, vérifier badge disparaît, `tsc --noEmit`) | 30 min  |
| **Total**                                                                                                                                     | **~2h** |
