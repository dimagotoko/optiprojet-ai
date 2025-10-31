# **App Name**: OptiTrajet AI

## Core Features:

- Authentification Utilisateur Sécurisée: Implémente Firebase Authentication pour une connexion utilisateur sécurisée via e-mail/mot de passe ou lien e-mail. Inclut le hachage des mots de passe. Stocke le rôle de l'utilisateur, le nom, l'email, la ville, le code postal, l'URL de la photo de profil, le téléphone (pour les voyageurs) / le permis de conduire (pour les transporteurs), l'ID client Stripe, la note moyenne et le nombre total de notes.
- Autocomplete d'Adresses Dynamique: Intègre l'API Google Maps Places pour fournir des suggestions d'adresses dynamiques pour les champs de départ et de destination, remplaçant les simples recherches textuelles. Utilise l'API Google Maps (ou Mapbox) pour afficher l'itinéraire réel sur une carte dans TripDetailsCard.
- Recherche de Trajets Géo-Spatiale: Remplace la simple recherche textuelle par des requêtes géo-spatiales (ex: geohash) pour trouver les trajets dans un rayon spécifique des points de départ et de destination.
- Intégration de Paiement Stripe: Crée une Intention de Paiement Stripe pour chaque réservation de trajet, stockant le paymentIntentId et le paymentStatus ('pending') dans un nouvel enregistrement de réservation. Retourne le clientSecret au frontend pour que l'utilisateur puisse compléter le paiement.
- Webhook de Confirmation de Paiement: Écoute les événements de confirmation de paiement Stripe (payment_intent.succeeded). Met à jour le paymentStatus à 'succeeded' lors de la confirmation. Envoie des notifications de confirmation (FCM/Email) au voyageur et au transporteur.
- Système de Chat en Temps Réel: Implémente un système de chat en temps réel accessible uniquement entre le transporteur et les voyageurs confirmés (paymentStatus: 'succeeded') d'un trajet spécifique, utilisant les écouteurs Firestore sur la collection chatChannels.
- Système de Notes et Avis: Permet aux utilisateurs de laisser des avis pour les trajets terminés, mettant à jour averageRating et totalRatings sur le document utilisateur du destinataire de l'avis. L'outil backend déclenche les mises à jour des notes après chaque nouvel avis.

## Style Guidelines:

- Couleur primaire : Cyan (#4DD0E1) pour une sensation propre et moderne.
- Couleur de fond : Ardoise foncée (#2D3748) pour le fond principal. Une teinte légèrement plus claire (#4A5568) pour les composants.
- Couleur d'accent : Bleu ciel (#38B2AC) comme accent secondaire et Rouge (#E53E3E) pour les erreurs/annulations.
- Police du corps et des titres : 'Inter', une police sans-serif de style grotesque, offrira une sensation propre et moderne pour les titres et le corps du texte. Remarque : seuls les Google Fonts sont actuellement pris en charge.
- Utiliser des icônes minimalistes pour la navigation et les actions clés.
- Maintenir la cohérence avec le prototype existant, en se concentrant sur un thème de mode sombre avec une hiérarchie visuelle claire.
- Transitions et animations subtiles pour améliorer l'expérience utilisateur lors de la navigation entre les écrans.