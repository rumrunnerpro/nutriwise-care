/* NutriCare Service Worker — version managed here for cache busting */
const VERSION = '1.1.1';
const CACHE = `nutriwise-care-v${VERSION}`;

/* Relative paths work under any subpath (e.g. GitHub Pages /nutriwise-care/) */
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './wolfram.js',
  './notifications.js',
  './log.js',
  './foods.js',
  './medicines.js',
  './reports.js',
  './profile.js',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(event.request, clone));
        return res;
      });
    })
  );
});

/* Notification click: Taken / Snooze / Open */
self.addEventListener('notificationclick', event => {
  const { action, notification } = event;
  const data = notification.data || {};
  notification.close();

  if (action === 'taken') {
    event.waitUntil(
      broadcastToClients({ type: 'MED_TAKEN', medicineId: data.medicineId, scheduledTime: data.scheduledTime })
    );
  } else if (action === 'snooze15') {
    event.waitUntil(
      broadcastToClients({ type: 'MED_SNOOZE', medicineId: data.medicineId, scheduledTime: data.scheduledTime, minutes: 15 })
    );
  } else if (action === 'snooze30') {
    event.waitUntil(
      broadcastToClients({ type: 'MED_SNOOZE', medicineId: data.medicineId, scheduledTime: data.scheduledTime, minutes: 30 })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        for (const client of clients) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

function broadcastToClients(msg) {
  return self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage(msg));
    if (!clients.length) {
      /* Store pending action for when app reopens */
    }
  });
}

/* Version check: post message to clients when new SW activates */
self.addEventListener('message', event => {
  if (event.data?.type === 'VERSION_CHECK') {
    event.source.postMessage({ type: 'VERSION', version: VERSION });
  }
});
