// TradePro Alpha Service Worker
const CACHE_NAME = 'tradepro-alpha-v3.1.0';
const STATIC_CACHE = 'tradepro-static-v3.1.0';
const DYNAMIC_CACHE = 'tradepro-dynamic-v3.1.0';
const API_CACHE = 'tradepro-api-v3.1.0';

// Cache strategies
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  DYNAMIC: 'network-first',
  API: 'stale-while-revalidate'
};

// Files to cache on install
const STATIC_FILES = [
  '/',
  '/index.html',
  '/news.html',
  '/css/styles.css',
  '/css/modern-styles.css',
  '/css/premium-styles.css',
  '/js/script.js',
  '/js/advanced-chart.js',
  '/manifest.json',
  // Add icon files
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/stocks',
  '/api/news/market'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticFile(request)) {
    event.respondWith(handleStaticRequest(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isHTMLRequest(request)) {
    event.respondWith(handleHTMLRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Check if request is for static files
function isStaticFile(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Check if request is for HTML
function isHTMLRequest(request) {
  return request.headers.get('accept').includes('text/html');
}

// Handle static file requests (Cache First)
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving static file from cache', request.url);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Static request failed', error);
    return new Response('Static file not available', { status: 404 });
  }
}

// Handle API requests (Stale While Revalidate)
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Only cache specific API endpoints
  if (!API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    return fetch(request);
  }
  
  try {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Fetch from network in background
    const networkPromise = fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => {
      // Network failed, return cached if available
      return cachedResponse;
    });
    
    // Return cached response immediately if available
    if (cachedResponse) {
      console.log('Service Worker: Serving API from cache', request.url);
      // Update cache in background
      networkPromise.catch(() => {});
      return cachedResponse;
    }
    
    // No cache, wait for network
    return await networkPromise;
  } catch (error) {
    console.error('Service Worker: API request failed', error);
    return new Response('API not available', { status: 503 });
  }
}

// Handle HTML requests (Network First)
async function handleHTMLRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', request.url);
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to index.html for SPA routing
    if (request.url.includes(self.location.origin)) {
      const indexResponse = await cache.match('/index.html');
      if (indexResponse) {
        return indexResponse;
      }
    }
    
    return new Response('Page not available offline', { 
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle dynamic requests (Network First)
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Resource not available', { status: 404 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'stock-subscription') {
    event.waitUntil(syncStockSubscriptions());
  } else if (event.tag === 'portfolio-update') {
    event.waitUntil(syncPortfolioUpdates());
  }
});

// Sync stock subscriptions when back online
async function syncStockSubscriptions() {
  try {
    const subscriptions = await getStoredSubscriptions();
    if (subscriptions.length > 0) {
      await fetch('/api/stocks/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: subscriptions })
      });
      console.log('Service Worker: Stock subscriptions synced');
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync subscriptions', error);
  }
}

// Sync portfolio updates when back online
async function syncPortfolioUpdates() {
  try {
    const updates = await getStoredPortfolioUpdates();
    for (const update of updates) {
      await fetch('/api/portfolio/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      });
    }
    console.log('Service Worker: Portfolio updates synced');
  } catch (error) {
    console.error('Service Worker: Failed to sync portfolio', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'New market data available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Market',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'TradePro Alpha';
  }
  
  event.waitUntil(
    self.registration.showNotification('TradePro Alpha', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/?view=market')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for offline storage
async function getStoredSubscriptions() {
  try {
    const result = await new Promise((resolve) => {
      const request = indexedDB.open('TradeProDB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['subscriptions'], 'readonly');
        const store = transaction.objectStore('subscriptions');
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => resolve([]);
      };
      request.onerror = () => resolve([]);
    });
    return result.map(item => item.symbol);
  } catch (error) {
    console.error('Service Worker: Failed to get subscriptions', error);
    return [];
  }
}

async function getStoredPortfolioUpdates() {
  try {
    const result = await new Promise((resolve) => {
      const request = indexedDB.open('TradeProDB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['portfolio'], 'readonly');
        const store = transaction.objectStore('portfolio');
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => resolve([]);
      };
      request.onerror = () => resolve([]);
    });
    return result;
  } catch (error) {
    console.error('Service Worker: Failed to get portfolio updates', error);
    return [];
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker: Loaded successfully');

