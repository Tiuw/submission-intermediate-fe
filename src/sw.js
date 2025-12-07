// Service Worker Configuration
const CACHE_NAME = 'story-map-v1';
const RUNTIME_CACHE = 'story-map-runtime';
const IMAGE_CACHE = 'story-map-images';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/scripts/index.js',
  '/styles/styles.css',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[Service Worker] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== IMAGE_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network First for API calls (with cache fallback for offline)
  if (url.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache GET requests with OK status
          if (request.method === 'GET' && response.ok) {
            // Clone response BEFORE using it
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page or error response
            return new Response(
              JSON.stringify({ error: true, message: 'Network unavailable' }),
              { 
                headers: { 'Content-Type': 'application/json' },
                status: 503 
              }
            );
          });
        })
    );
    return;
  }

  // Cache First for images
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          const responseToCache = response.clone();
          caches.open(IMAGE_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // Stale-While-Revalidate for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received', event);
  
  let notificationData = {
    title: 'Story Map',
    body: 'Ada cerita baru!',
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-72x72.png',
    data: {
      url: '/',
    },
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[Service Worker] Push data:', data);
      
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        image: data.image,
        data: {
          url: data.url || '/',
          storyId: data.storyId,
        },
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      data: notificationData.data,
      actions: [
        {
          action: 'open',
          title: 'Lihat Cerita',
        },
        {
          action: 'close',
          title: 'Tutup',
        },
      ],
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked', event);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if no matching client found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync event for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync', event.tag);
  
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncPendingStories());
  }
});

// Function to sync pending stories
async function syncPendingStories() {
  console.log('[Service Worker] Syncing pending stories...');
  
  try {
    // Open IndexedDB
    const db = await openDatabase();
    const tx = db.transaction('pending-stories', 'readonly');
    const store = tx.objectStore('pending-stories');
    const pendingStories = await store.getAll();
    
    if (pendingStories.length === 0) {
      console.log('[Service Worker] No pending stories to sync');
      return;
    }

    console.log(`[Service Worker] Found ${pendingStories.length} pending stories`);

    // Sync each pending story
    for (const story of pendingStories) {
      try {
        // Get auth token from clients
        const clients = await self.clients.matchAll();
        if (clients.length === 0) {
          console.log('[Service Worker] No active clients, skipping sync');
          return;
        }

        // Send message to client to perform sync
        clients[0].postMessage({
          type: 'SYNC_PENDING_STORY',
          payload: story,
        });
        
      } catch (error) {
        console.error('[Service Worker] Error syncing story:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error in background sync:', error);
    throw error;
  }
}

// Helper to open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('story-map-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
