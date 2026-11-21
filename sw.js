/* Keeps the app itself available offline. Photos and recordings are stored separately by the page
   (cache "bf-media-v1"); this worker leaves that cache alone and never touches API requests. */
const SHELL = "bf-shell-v13";
const FONTS = "bf-fonts-v1";
const SHELL_FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES.map(f => new Request(f, { cache:"no-cache" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("bf-shell-") && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if(req.method !== "GET") return;
  const url = new URL(req.url);
  // App files: network first, always revalidating with the server (so updates arrive at once), cache when offline.
  if(url.origin === location.origin){
    e.respondWith(
      fetch(req, { cache:"no-cache" }).then(r => { if(r.ok){ const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); } return r; })
        .catch(() => caches.match(req, { ignoreSearch:true }).then(r => r || caches.match("index.html")))
    );
    return;
  }
  // Google Fonts: cache first.
  if(url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com"){
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if(r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }))));
  }
});
