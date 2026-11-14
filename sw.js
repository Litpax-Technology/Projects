/* Site ERP service worker
   - App files: try the network first, but if it is slow (> 2.5 s) open instantly
     from the phone's cache; the fresh copy is saved in the background.
   - Fonts & chart library (fixed versions): served from cache after the first visit.
   - API calls (Google Apps Script) are NEVER cached. */
const CACHE = 'site-erp-shell-v3';
const STATIC = 'site-erp-static-v1';
const SHELL = ['./', './index.html', './style.css', './app.js', './config.js', './manifest.json', './icon.svg'];
const STATIC_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== STATIC).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;

  // Fonts + Chart.js: cache first (these URLs never change their content)
  if (STATIC_HOSTS.indexOf(url.hostname) > -1) {
    e.respondWith(caches.open(STATIC).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (url.origin !== self.location.origin) return;            // API & everything else: untouched

  // App files: network first with a 2.5 s limit, then cache
  const network = fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  e.waitUntil(network.catch(() => {}));
  const fromCache = () => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'));
  e.respondWith(new Promise(resolve => {
    let settled = false;
    const timer = setTimeout(() => fromCache().then(hit => { if (!settled && hit) { settled = true; resolve(hit); } }), 2500);
    network.then(res => { if (!settled) { settled = true; clearTimeout(timer); resolve(res); } })
      .catch(() => fromCache().then(hit => { if (!settled) { settled = true; clearTimeout(timer); resolve(hit || Response.error()); } }));
  }));
});
