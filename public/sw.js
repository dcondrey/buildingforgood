/* Still Here SD: small, update-safe runtime cache for the static demo. */
const CACHE_VERSION = "stillhere-v1";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const DOCUMENT_CACHE = `${CACHE_VERSION}:documents`;

self.addEventListener("install", (event) => {
  // Activate the new worker promptly; the network-first document policy below
  // still lets a newly deployed HTML shell win on the next navigation.
  self.skipWaiting();
  event.waitUntil(caches.open(DOCUMENT_CACHE).then((cache) => cache.add("./")));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("./"));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || update;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, DOCUMENT_CACHE));
    return;
  }

  if (url.pathname.includes("/generated/demo.v1.json")) {
    event.respondWith(networkFirst(request, DOCUMENT_CACHE));
    return;
  }

  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
