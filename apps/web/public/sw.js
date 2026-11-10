const STATIC_CACHE = "abqoor-static-v1";

const isCacheableStaticRequest = (request) => {
  if (request.method !== "GET" || request.mode === "navigate") return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/question-images/")) return false;

  return (
    url.pathname.startsWith("/assets/") ||
    ["font", "image", "script", "style"].includes(request.destination)
  );
};

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("abqoor-static-") && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (!isCacheableStaticRequest(event.request)) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const refresh = fetch(event.request)
        .then((response) => {
          if (response.ok && response.type !== "opaque") {
            void cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => cached);

      return cached ?? refresh;
    })
  );
});
