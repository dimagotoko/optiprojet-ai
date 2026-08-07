# Procédure de test — Notifications push FCM

Contexte : opt-in dans `/dashboard` (carte `NotificationOptIn`), service worker
`public/sw.js`, événements déclenchés par `booking-created` (réservation créée
→ conducteur) et `booking-status` (acceptée/refusée → voyageur).

## Prérequis — contexte sécurisé obligatoire

L'API `Notification` et les Service Workers exigent un **contexte sécurisé** :
HTTPS, ou `http://localhost`. Une IP LAN (`http://192.168.x.x:9003`) ne
fonctionnera **jamais** pour les notifications, contrairement à Maps qu'on
vient de corriger — ce n'est pas un problème de clé API ici, c'est une
restriction du navigateur. Donc :

- **Desktop** : `http://localhost:9003` ou `https://kamgo.ca`.
- **Mobile** : uniquement `https://kamgo.ca` (le téléphone ne peut pas
  atteindre le `localhost` de ton PC comme un contexte sécurisé).

## Test rapide (1 appareil, sans flux de réservation complet)

Utile pour valider que le Service Worker affiche bien une notification, sans
monter tout le scénario réservation :

1. Se connecter sur `/dashboard`, cliquer "Activer les notifications", accepter
   le prompt du navigateur.
2. Vérifier l'enregistrement : Firestore Console → `users/{uid}/fcmTokens` →
   un nouveau document doit apparaître (ou onglet Network → `POST
/api/notifications/token` → 200).
3. Copier le `token` (champ du document Firestore).
4. Firebase Console → **Messaging** → _Nouvelle campagne_ → _Notifications
   Firebase_ → dans "Envoyer un message test", coller le token → Envoyer.
5. Mettre l'onglet en arrière-plan (changer d'onglet ou minimiser) _avant_
   d'envoyer — sinon c'est le handler foreground (`onMessage` → toast) qui
   s'affiche, pas la vraie notification OS.
6. Une notification système doit apparaître ; cliquer dessus doit ramener au
   premier plan l'onglet existant (ou en ouvrir un si aucun n'est ouvert).

⚠️ Ce test valide l'affichage (SW + permission + token), pas les endpoints
`booking-created` / `booking-status` — pour ça, il faut le scénario complet
ci-dessous.

## Test complet (flux réel — 2 comptes)

Nécessite un compte **voyageur** et un compte **transporteur**, dans deux
navigateurs (ou un normal + une fenêtre de navigation privée) pour être
connecté aux deux en même temps.

1. Transporteur : publier un trajet (`/post-trip`).
2. Transporteur : activer les notifications sur `/dashboard`.
3. Voyageur : activer les notifications sur `/dashboard`.
4. Voyageur : réserver le trajet publié → déclenche
   `POST /api/notifications/booking-created`.
5. Mettre l'onglet **transporteur** en arrière-plan avant l'étape 4 → une
   notification OS "Nouvelle demande de réservation" doit apparaître.
6. Transporteur : accepter ou refuser la demande (`DemandesEnAttente`) →
   déclenche `POST /api/notifications/booking-status`.
7. Mettre l'onglet **voyageur** en arrière-plan avant l'étape 6 → notification
   OS "Réservation acceptée/refusée" chez le voyageur.
8. Cliquer sur chaque notification → doit amener sur `/dashboard`.

### Si rien n'arrive — checklist de dépannage

- Onglet DevTools → **Application** → **Service Workers** : `sw.js` doit être
  `activated and is running`. Sinon, forcer `Update` ou décocher "Bypass for
  network" puis recharger.
- Vérifier que le document `users/{uid}/fcmTokens/{token}` existe bien pour le
  destinataire (sinon `sendPushToUser` n'a personne à qui envoyer — regarder
  les logs serveur : `npm run dev` affiche les erreurs de
  `getAdminMessaging().sendEachForMulticast`).
- `booking.notifiedAt` / `statusNotifiedAt` déjà posé sur le document ? Si oui,
  l'idempotence bloque un second envoi pour le **même** booking — créer une
  nouvelle réservation pour retester.
- Rappel du gap documenté dans `TODO.md` : si l'onglet qui déclenche l'action
  (voyageur qui réserve, transporteur qui accepte) se ferme entre l'écriture
  Firestore et le `fetch(...).catch(() => {})`, la requête ne part jamais —
  ce n'est pas un bug de notification, c'est une perte connue en v1.

## Mobile — Android (Chrome)

1. Ouvrir `https://kamgo.ca` dans Chrome sur le téléphone (pas besoin
   d'installer en PWA, contrairement à iOS).
2. Se connecter, aller sur `/dashboard`, activer les notifications, accepter
   le prompt.
3. Mettre Chrome en arrière-plan (bouton Accueil, pas juste changer d'onglet).
4. Déclencher l'événement depuis l'autre compte (desktop).
5. Une notification système Android doit apparaître dans le tiroir de
   notifications.

## Mobile — iOS (Safari)

**Contrainte bloquante déjà documentée dans `TODO.md`** : sur iOS, le push web
ne fonctionne **que si le site est installé en PWA** (icône sur l'écran
d'accueil) **et lancé depuis cette icône** — jamais depuis un onglet Safari
normal. Nécessite iOS 16.4+.

1. Ouvrir `https://kamgo.ca` dans Safari.
2. Bouton **Partager** → **Sur l'écran d'accueil** → Ajouter.
3. Fermer Safari, ouvrir l'app depuis l'icône ajoutée à l'écran d'accueil (pas
   Safari).
4. Se connecter, `/dashboard`, activer les notifications, accepter le prompt
   iOS.
5. Mettre l'app en arrière-plan (bouton Accueil).
6. Déclencher l'événement depuis l'autre compte.
7. Vérifier l'apparition de la notification système iOS.

Si l'option "Activer les notifications" reste invisible ou l'app plante sur
iOS < 16.4, c'est attendu — le Web Push n'existe pas sur ces versions
(`isPushSupported()` doit renvoyer `false` et masquer le composant).
