/**
 * sw.js - Karni Pro - Professional Service Worker
 * Compatible with:
 * - GitHub Pages
 * - Firebase Authentication & Realtime Database
 * - Trusted Web Activity (TWA) / Google Play
 * - PWA Modern Specs (2025+)
 * 
 * Responsibilities ONLY:
 * - App Shell caching
 * - Offline support
 * - Cache versioning & cleanup
 * - Performance optimization
 * 
 * NEVER:
 * - Stores Firebase keys
 * - Caches Firebase Auth / Database requests
 * - Modifies Firebase logic
 */

'use strict';

// ==================== CONFIG ====================

// Change this version when you release a new update
// Old caches will be automatically deleted on activate
const CACHE_VERSION = 'karni-pro-v1';
const CACHE_NAME = CACHE_VERSION;

// App Shell - Core files required for offline functionality
// Use relative paths for GitHub Pages compatibility (./ instead of /)
const APP_SHELL = [
  '/',
  '/index.html',
  '/login.html',
  '/account-settings.html',
  '/person.html',
  '/reports.html',
  '/route.html',
  '/products.html',
  '/matjar.html',
  '/reglematjar.html',
  '/rapport.html',
  '/reset-password.html',
  '/firebase.js',
  '/lang.js',
  '/shared.js',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

// Optional assets - will be cached if exist, won't fail if missing
const OPTIONAL_ASSETS = [
  './favicon.ico',
  './favicon.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
];

// ==================== UTILS ====================

// Check if request is Firebase-related (MUST NOT CACHE)
function isFirebaseRequest(url) {
  return (
    url.includes('firebaseio.com') ||
    url.includes('firebasedatabase.app') ||
    url.includes('firebaseapp.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('firebaseinstallations.googleapis.com') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('firebasejs') ||
    url.includes('gstatic.com/firebase') ||
    url.includes('googleapis.com/identitytoolkit') ||
    url.hostname.includes('firebaseio')
  );
}

// Check if request is dynamic API (MUST NOT CACHE)
function isApiRequest(request) {
  const url = request.url;
  return (
    url.includes('/api/') ||
    url.includes('emailjs') ||
    request.method !== 'GET' ||
    request.headers.get('authorization') ||
    url.includes('chrome-extension') ||
    url.includes('extension')
  );
}

// Check if request is navigation (HTML page)
function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))
  );
}

// Check if request is static asset (CSS, JS, Images, Fonts)
function isStaticAsset(request) {
  const dest = request.destination;
  return (
    dest === 'style' ||
    dest === 'script' ||
    dest === 'image' ||
    dest === 'font' ||
    dest === 'manifest' ||
    request.url.match(/\.(css|js|png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf)$/i)
  );
}

// ==================== INSTALL ====================
// Pre-cache App Shell - runs when SW is first installed
self.addEventListener('install', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Install event`);

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache core app shell
        console.log(`[SW] Caching App Shell: ${APP_SHELL.length} files`);
        await cache.addAll(APP_SHELL);
        
        // Try to cache optional assets (don't fail if missing)
        for (const asset of OPTIONAL_ASSETS) {
          try {
            await cache.add(asset);
          } catch (e) {
            console.log(`[SW] Optional asset not found (skipped): ${asset}`);
          }
        }
        
        console.log(`[SW ${CACHE_VERSION}] App Shell cached successfully`);
        
        // Force new SW to activate immediately (important for PWA updates)
        await self.skipWaiting();
      } catch (error) {
        console.error(`[SW ${CACHE_VERSION}] Install failed:`, error);
      }
    })()
  );
});

// ==================== ACTIVATE ====================
// Clean old caches - keeps only current version
self.addEventListener('activate', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Activate event`);

  event.waitUntil(
    (async () => {
      try {
        // Get all cache names
        const cacheNames = await caches.keys();
        
        // Delete old Karni Pro caches
        const oldCaches = cacheNames.filter(
          (name) => name.startsWith('karni-pro-') && name !== CACHE_NAME
        );
        
        if (oldCaches.length > 0) {
          console.log(`[SW] Deleting old caches:`, oldCaches);
          await Promise.all(oldCaches.map((name) => caches.delete(name)));
        }
        
        // Take control of all clients immediately
        await self.clients.claim();
        
        console.log(`[SW ${CACHE_VERSION}] Activated and claimed clients`);
      } catch (error) {
        console.error(`[SW ${CACHE_VERSION}] Activate failed:`, error);
      }
    })()
  );
});

// ==================== FETCH STRATEGIES ====================

// Strategy 1: Network First (for HTML/navigation)
// Try network, fallback to cache, fallback to offline page
async function networkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, update cache in background
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log(`[SW] Network failed for ${request.url}, trying cache`);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's navigation and no cache, show offline fallback
    if (isNavigationRequest(request)) {
      return getOfflineFallback();
    }
    
    throw error;
  }
}

// Strategy 2: Cache First with background update (for static assets)
// Try cache, fallback to network, update cache in background
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background (stale-while-revalidate)
    fetch(request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        }
      })
      .catch(() => {
        // Silent fail for background update
      });
    
    return cachedResponse;
  }
  
  // No cache, try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    
    return networkResponse;
  } catch (error) {
    console.error(`[SW] Failed to fetch ${request.url}:`, error);
    throw error;
  }
}

// Offline fallback page - simple branded page
function getOfflineFallback() {
  // Try to return cached index.html or login.html as fallback
  return caches.match('./index.html').then((response) => {
    if (response) return response;
    return caches.match('./login.html');
  }).then((response) => {
    if (response) return response;
    
    // If no cached pages, return minimal offline HTML
    return new Response(
      `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Karni Pro - Offline</title>
<style>
body{font-family:'Cairo',sans-serif;background:#f0fdfa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;text-align:center}
.card{background:white;border-radius:24px;padding:32px 24px;max-width:400px;box-shadow:0 20px 50px rgba(15,118,110,0.15);border:1px solid rgba(15,118,110,0.12)}
.icon{width:64px;height:64px;background:linear-gradient(135deg,#0f766e,#14b8a6);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:white;font-size:28px}
h1{font-size:20px;color:#0f172a;margin:0 0 8px}
p{font-size:14px;color:#64748b;margin:0 0 20px;line-height:1.6}
button{background:linear-gradient(135deg,#0f766e,#14b8a6);color:white;border:none;padding:12px 24px;border-radius:12px;font-weight:700;cursor:pointer;width:100%}
</style>
</head>
<body>
<div class="card">
<div class="icon">📶</div>
<h1>لا يوجد اتصال بالإنترنت</h1>
<p>أنت غير متصل حالياً. سيتم تحميل البيانات المحفوظة عند توفر الاتصال.</p>
<button onclick="window.location.reload()">إعادة المحاولة</button>
</div>
</body>
</html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  });
}

// ==================== FETCH EVENT ====================
// Main fetch handler - routes requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Skip Firebase requests (CRITICAL - must not cache)
  if (isFirebaseRequest(url)) {
    // console.log(`[SW] Bypassing Firebase request: ${url.pathname}`);
    return;
  }

  // 3. Skip API / dynamic requests
  if (isApiRequest(request)) {
    return;
  }

  // 4. Skip chrome-extension and other schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 5. Route based on request type
  if (isNavigationRequest(request)) {
    // HTML pages: Network First -> Cache -> Offline fallback
    // Important for GitHub Pages SPA behavior
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(request)) {
    // Static assets: Cache First -> Network (with background update)
    // Best for performance (CSS, JS, Images, Fonts)
    event.respondWith(cacheFirst(request));
  } else {
    // Other requests: Try cache first, fallback to network
    // Covers manifest, etc.
    event.respondWith(cacheFirst(request));
  }
});

// ==================== MESSAGE HANDLING ====================
// Allows pages to trigger skipWaiting via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// ==================== ERROR HANDLING ====================
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

console.log(`[SW ${CACHE_VERSION}] Loaded - Ready for production`);
