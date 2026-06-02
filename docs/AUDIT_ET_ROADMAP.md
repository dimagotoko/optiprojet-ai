# OptiTrajet AI — Audit & Roadmap
> Dernière mise à jour : 2026-06-01

---

## 1. État du projet

**Stack technique :** Next.js 15 (App Router), Firebase (Auth + Firestore), Tailwind CSS, shadcn/ui, TypeScript, Zod, Genkit + Gemini, Google Maps API.

**Projet Firebase :** `studio-2194514521-a4a53`

**Commande dev :** `npm run dev` (webpack, port 9003 — Turbopack retiré car incompatible avec firebase-admin et @genkit-ai/google-genai)

---

## 2. Points critiques réglés (audit sécurité)

| # | Point | Solution | Commit |
|---|---|---|---|
| 1 | Security Rules Firestore non déployées | Création `firebase.json` + `.firebaserc` + déploiement CLI | `1f0bbcf` |
| 2 | Écriture trajets sans validation serveur | Security Rules renforcées (`isValidTrip()` : prix, places, vehicleId) | `d5df2b5` |
| 3 | Flux IA Gemini sans authentification | Vérification token Firebase via REST API dans `planTrip()` | `d71c5e8` |

---

## 3. Améliorations implémentées (post-audit)

| # | Amélioration | Fichiers modifiés |
|---|---|---|
| A1 | Messages d'erreur connexion (popup AlertDialog) | `src/app/login/page.tsx` |
| A2 | Prévention doublons de trajets + avertissement charge journalière | `src/app/post-trip/page.tsx` |
| A3 | Afficher/masquer mot de passe + indicateur de force | `src/app/login/page.tsx`, `src/app/signup/page.tsx` |
| A4 | Validation + auto-formatage code postal canadien | `src/app/signup/page.tsx` |
| A5 | Plafond prix dynamique basé sur la distance (0,20$/km) + curseur Slider | `src/app/post-trip/page.tsx`, `firestore.rules` |
| CSS1 | Débordements texte (AddressInput, TripCard, Header) | `AddressInput.tsx`, `TripCard.tsx`, `Header.tsx` |
| CSS2 | Audit UX/UI général (étapes numérotées, CTA conducteur, salutation, footer) | `page.tsx`, `trips/page.tsx`, `dashboard/page.tsx`, `Footer.tsx` |
| CSS3 | Champ date harmonieux deux lignes (JEU. / 30 juil.) | `TripSearchForm.tsx` |
| CSS4 | Icônes lucide-react (Sunrise/Sun/Sunset) sur filtres horaires | `trips/page.tsx` |
| CSS5 | Section CTA conducteur fond doux (bg-secondary/50) | `page.tsx` |

---

## 4. Bugs corrigés

| Bug | Cause | Fix |
|---|---|---|
| `TypeError: Cannot read properties of undefined (reading 'prototype')` | `buffer-equal-constant-time@1.0.1` incompatible Node.js ≥ 24 | Patch `patch-package` + `postinstall` |
| `Rendered fewer hooks than expected` (post-trip) | `useEffect` placé après `return` conditionnel | Déplacé avant les early returns |
| `Rendered fewer hooks than expected` (dashboard) | `useState`/`useEffect` greeting placés après 3 early returns | Déplacés en haut du composant |
| `Failed to load external module @genkit-ai/google-genai` | Turbopack incompatible avec genkit | Suppression `--turbopack` du script dev |
| `Unable to detect a Project Id` (firebase-admin) | `initializeApp()` sans projectId en local | `initializeApp({ projectId: 'studio-2194514521-a4a53' })` |
| Session cookie 500 | `firebase-admin` → `buffer-equal-constant-time` → `SlowBuffer` supprimé Node 24+ | Patch patch-package |

---

## 5. Problèmes connus restants

| Problème | Cause | À faire |
|---|---|---|
| Chatbot répond "Désolé" | Crédits Gemini API épuisés | Recharger sur https://ai.studio/projects |
| `POST /api/auth/session 401` | Token Firebase expiré ou trop ancien (> 5 min) | Normal si token ancien, non bloquant |

---

## 6. Roadmap — Sprints priorisés

### SPRINT 1 — Impact immédiat (UX + fonctionnel)
- [ ] **Flux de réservation complet** — bouton "Réserver" sur trip-details, page confirmation, gestion bookings
- [ ] **Dark mode toggle** — bouton header, localStorage, variables CSS déjà définies
- [ ] **Skeleton loaders** — remplacer les spinners LoadingLogo par des skeleton cards
- [ ] **Compteurs live sur la home** — "X trajets partagés · Y kg CO₂ évités · Z membres"

### SPRINT 2 — Différenciation
- [ ] **Dashboard par rôle** — VoyageurDashboard + TransporteurDashboard (plan ci-dessous)
- [ ] **Impact CO₂ personnalisé** — X trajets × km × 0.12 kg/km affiché dans le dashboard
- [ ] **Onboarding 3 étapes** — première connexion : profil → préférences → premier trajet
- [ ] **Trajets réels sur la home** — requête Firestore (3 prochains trajets) au lieu des hardcodés

### SPRINT 3 — Croissance
- [ ] **SEO — metadata dynamique** — title/description par page, og:image, sitemap.xml
- [ ] **Profil conducteur public `/u/[userId]`** — notes, bio, trajets passés
- [ ] **Partage de trajet** — Web Share API sur trip-details
- [ ] **PWA** — manifest.json + Service Worker + notifications push
- [ ] **Système de notation** — UI pour laisser une note après un trajet
- [ ] **Pagination Firestore** — `limit(20)` + "Charger plus" sur la liste des trajets

---

## 7. Plan dashboard par rôle (approuvé, pas encore codé)

### Structure des composants
```
src/components/dashboard/
├── shared/
│   ├── StatCard.tsx           (icon, label, value, subtitle, colorClass)
│   └── ProfileCard.tsx        (avatar, nom, rôle, étoiles, bouton profil)
├── voyageur/
│   ├── VoyageurDashboard.tsx
│   ├── VoyageurStats.tsx      (4 StatCards : trajets, économies, CO2, note)
│   ├── QuickSearchBar.tsx     (départ → destination + date → /trips)
│   ├── SuggestedTrips.tsx     (3 TripCards placeholder "suggérés par l'IA")
│   └── ProfileCompletion.tsx  (barre progression X%)
└── transporteur/
    ├── TransporteurDashboard.tsx
    ├── TransporteurStats.tsx  (3 StatCards : trajets offerts, taux remplissage, note)
    ├── PublishedTripRow.tsx   (jauge places remplies/restantes)
    ├── EarningsCard.tsx       (gains estimés)
    └── PendingRequests.tsx    (bookings en attente accept/refus)
```

### Données disponibles vs placeholders
| Donnée | Source | Statut |
|---|---|---|
| Trajets offerts | Firestore `trips` | Réel |
| Note moyenne | `userData.averageRating` | Réel |
| Profil completion % | Calcul sur `userData` | Réel |
| Bookings en attente | `/trips/{id}/bookings` | Réel |
| Argent économisé / CO2 | Non stocké | Placeholder |
| Taux remplissage | Non stocké | Placeholder |

---

## 8. Décisions techniques importantes

| Décision | Raison |
|---|---|
| Turbopack désactivé (`next dev` sans `--turbopack`) | firebase-admin et @genkit-ai/google-genai incompatibles |
| firebase-admin utilisé uniquement pour la session cookie (`/api/auth/session`) | Les Server Actions Trip utilisent les Security Rules Firestore à la place |
| Vérification token IA via REST API (pas firebase-admin) | Évite l'incompatibilité Turbopack dans les Server Actions |
| `patch-package` pour `buffer-equal-constant-time` | Node.js ≥ 24 a supprimé `SlowBuffer` ; le patch est appliqué via `postinstall` |
| Prix max dynamique = distance × 0,20 $/km (max 200 $) | Cohérent avec les tarifs de covoiturage québécois |
| Plafond Firestore Rules = 200 $ (filet de sécurité global) | Firestore ne peut pas calculer la distance, donc plafond statique |

---

## 9. Commandes utiles

```bash
# Développement
npm run dev                          # Serveur local port 9003

# Firebase
firebase deploy --only firestore:rules   # Déployer les Security Rules
firebase login                           # Connexion compte Firebase

# TypeScript
npx tsc --noEmit                     # Vérifier les types sans compiler

# Patch
npx patch-package buffer-equal-constant-time   # Régénérer le patch si besoin
```
