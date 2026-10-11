// Service worker de la PWA. Los datos vienen siempre de Supabase y la sesión
// de Clerk: acá sólo se cachean los archivos estáticos y una página para
// cuando no hay conexión. Las páginas no se cachean porque dependen de la
// sesión del usuario.

// Cambiar la versión descarta los caches viejos al activarse.
const VERSION = "v1";
const CACHE = `habitos-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Supabase, Clerk y cualquier otro origen pasan de largo.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Páginas: siempre de la red; sin conexión, la página offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // JS/CSS/fuentes de Next: el nombre lleva un hash, nunca cambian.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
