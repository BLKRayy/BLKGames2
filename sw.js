const CACHE_NAME = "blk-arcade-cache-v1";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  if (url.searchParams.get("recent") === "1") {
    e.respondWith(
      caches.match(e.request).then(res => {
        return (
          res ||
          fetch(e.request).then(networkRes => {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(e.request, networkRes.clone());
            });
            return networkRes;
          })
        );
      })
    );
  }
});
