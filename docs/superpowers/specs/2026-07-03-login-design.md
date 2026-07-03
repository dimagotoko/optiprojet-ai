# Login Page — Design Polish

**Date:** 2026-07-03  
**Fichier cible:** `src/app/login/page.tsx`

---

## Objectif

Remplacer le fond blanc neutre actuel par un fond sombre immersif avec card flottante proéminente, pour donner à la page login une identité visuelle forte cohérente avec le dark mode de l'application.

---

## Design retenu

### Fond de page

- Couleur de base : `#0f172a` (slate-950)
- Grille de points : `radial-gradient` cyan à 18% d'opacité, espacement 24×24px
- Lueur cyan top-right : blob radial `rgba(6,182,212,0.15)` flou, 500px, coin supérieur droit
- Lignes de route : SVG `<line>` en tirets `40 20` au bas de la page, `opacity: 0.06`, couleur `#06b6d4`
- Implémentation : classe CSS sur le wrapper ou via `globals.css`, pas de dépendance externe

### Card

- Fond : `#ffffff`
- Border-radius : `rounded-2xl` (16px)
- Shadow : `shadow-2xl` + ombre noire supplémentaire `0 25px 80px rgba(0,0,0,0.5)`
- Largeur max : `max-w-sm` (380px), centré, `mx-auto`
- Padding : `p-8` (32px) en haut/côtés, `pb-7` en bas

### En-tête de card

1. **Logo row** : composant `<Logo />` (SVG voiture) dans un `<div>` carré `w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-cyan-700 shadow-md` avec `text-white`, à côté du texte **"OptiTrajet"** en `font-extrabold text-lg text-slate-900`
2. **Tagline** : `"Covoiturage intelligent au Québec"` en `text-xs text-slate-400 italic`
3. **Séparateur** : `<Separator />` shadcn/ui ou `border-b border-slate-100`
4. **Titre section** : `"Connexion"` en `font-bold text-sm text-slate-800`

### Champs de formulaire

- Labels : `text-xs font-semibold text-gray-700`
- Input : fond `bg-slate-50`, bordure `border border-slate-200 rounded-lg`, hauteur `h-10`, focus ring `ring-2 ring-cyan-700/20 border-cyan-700`
- Input mot de passe : `pr-10` pour le bouton eye, toggle show/hide conservé (déjà fonctionnel)
- "Mot de passe oublié?" : lien `text-xs text-cyan-700` aligné à droite du label

### Bouton de soumission

- `w-full h-[42px] rounded-lg font-bold text-sm`
- Fond : `bg-gradient-to-r from-[#0891b2] to-[#06b6d4]`
- Shadow : `shadow-[0_4px_14px_rgba(6,182,212,0.35)]`
- État loading : conserver `LoadingLogo` existant

### Pied de card

- `"Vous n'avez pas de compte?"` + lien `"Inscrivez-vous"` en `text-cyan-700 font-semibold`
- Taille : `text-xs text-slate-500`, centré, `mt-5`

---

## Contraintes techniques

- Toute la logique existante (auth, redirect, AlertDialog, Suspense) est conservée sans modification.
- Pas de nouvelle dépendance — uniquement Tailwind classes et les composants shadcn/ui déjà présents.
- Le fond (dot grid + lueur) est implémenté via `style={{ backgroundImage: '...' }}` inline sur le wrapper (Tailwind ne supporte pas les `radial-gradient` arbitraires sans extension de config). Les lignes de route sont un `<svg>` positionné en `absolute` au bas du wrapper.
- Compatible dark mode : le fond sombre est le même en light et dark (la page login n'a pas de variante claire).

---

## Fichiers modifiés

| Fichier                  | Changement                                                             |
| ------------------------ | ---------------------------------------------------------------------- |
| `src/app/login/page.tsx` | Refonte du JSX de `LoginPageInternal` — wrapper fond + card redesignée |

Aucun autre fichier modifié.
