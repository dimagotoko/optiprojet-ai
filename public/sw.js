importScripts(
  "https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js",
);

// Service worker — installable PWA + notifications push FCM (data-only).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => e.respondWith(fetch(e.request)));

// Un service worker classique ne peut pas importer un module ES (src/firebase/config.ts) :
// la config doit être dupliquée en dur ici. Ce sont des identifiants publics
// (protégés par les Security Rules / restrictions de référent), pas des secrets.
firebase.initializeApp({
  apiKey: "AIzaSyAJcrcgJVKHpVQkI9C2Qyo711-q8x1RO1c",
  authDomain: "studio-2194514521-a4a53.firebaseapp.com",
  projectId: "studio-2194514521-a4a53",
  storageBucket: "studio-2194514521-a4a53.firebasestorage.app",
  messagingSenderId: "761287999801",
  appId: "1:761287999801:web:da2713b9e85dd1040aa8e8",
});

const messaging = firebase.messaging();

// Payload data-only (le serveur n'envoie jamais de bloc "notification") :
// c'est ce handler, et lui seul, qui décide d'afficher la notification.
messaging.onBackgroundMessage((payload) => {
  const { title, body, url, tag } = payload.data || {};
  if (!title) return;
  self.registration.showNotification(title, {
    body,
    tag,
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const client = list[0];
        if (!client) return self.clients.openWindow(url);
        // focus() d'abord (l'onglet remonte au premier plan), navigate() ensuite.
        // navigate() lève si le client n'est pas contrôlé par CE service worker
        // (cas includeUncontrolled: true) → on retombe sur openWindow().
        return client
          .focus()
          .then((c) => c.navigate(url))
          .catch(() => self.clients.openWindow(url));
      }),
  );
});
