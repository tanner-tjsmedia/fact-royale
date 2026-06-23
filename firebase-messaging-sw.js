/* =====================================================
   FACT ROYALE — Firebase Messaging Service Worker
   Handles background push notifications.
   This file must live at the site root so its scope
   covers the full origin (fact-royale.com).
   ===================================================== */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyBIsusWIMcFpGKeZeP3CemHiKOizby2Zro',
  authDomain:        'fact-royale.firebaseapp.com',
  projectId:         'fact-royale',
  storageBucket:     'fact-royale.firebasestorage.app',
  messagingSenderId: '79646023605',
  appId:             '1:79646023605:web:7693871d043af940fd03fc'
});

const messaging = firebase.messaging();

// ── Background message handler ─────────────────────────
// Fires when a push arrives and the site is not in the foreground.
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const title = n.title || '♛ Fact Royale';
  const body  = n.body  || "Today's quiz is live. Don't miss it.";

  self.registration.showNotification(title, {
    body,
    icon:             '/icons/icon-192.png',
    badge:            '/icons/icon-192.png',
    tag:              'fact-royale-daily',   // replaces previous if unread
    renotify:         false,
    requireInteraction: false,
    data: { url: 'https://fact-royale.com' }
  });
});

// ── Notification click handler ─────────────────────────
// Opens the site (or focuses an existing tab) when user taps the notification.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || 'https://fact-royale.com';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.startsWith('https://fact-royale.com') && 'focus' in win) {
          return win.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
