const CACHE_NAME = "shahasher-cache-v2";
const CORE_ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icons/sha-256.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((staleKey) => caches.delete(staleKey))
      )
    )
  );
  self.clients.claim();
});

const offlineFallback = () => caches.match("index.html");

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    (async () => {
      if (event.request.mode === "navigate") {
        try {
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch {
          const cachedPage =
            (await caches.match(event.request, { ignoreSearch: true })) ||
            (await offlineFallback());
          return (
            cachedPage ||
            new Response("Offline content unavailable", {
              status: 503,
              statusText: "Offline"
            })
          );
        }
      }

      const cached = await caches.match(event.request);
      if (cached) {
        return cached;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        if (event.request.destination === "document") {
          const fallback = await offlineFallback();
          if (fallback) {
            return fallback;
          }
        }
        return new Response("Offline content unavailable", {
          status: 503,
          statusText: "Offline"
        });
      }
    })()
  );
});
