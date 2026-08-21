/* Still Here SD: small, update-safe runtime cache for the static demo. */
// v2: navigations and the artifact revalidate past the HTTP cache
// ("no-cache"), so a GitHub Pages max-age=600 index.html can no longer pin a
// returning visitor to a previous deploy's hashed assets.
const CACHE_VERSION = "stillhere-v2";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const DOCUMENT_CACHE = `${CACHE_VERSION}:documents`;

self.addEventListener("install", (event) => {
  // Activate the new worker promptly; the network-first document policy below
  // still lets a newly deployed HTML shell win on the next navigation.
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(DOCUMENT_CACHE)
      .then((cache) => cache.add(new Request("./", { cache: "reload" }))),
  );
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
    // "no-cache" forces conditional revalidation with the server instead of
    // trusting the browser HTTP cache; offline still falls through to cache.
    // Fetch by URL: copying a navigation-mode Request with init can reject.
    const response = await fetch(request.url, { cache: "no-cache" });
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
