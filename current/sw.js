// 只快取同網域的畫面檔，讓離線時還打得開。API 請求在別的網域，這裡完全不碰。
// 規則：先連網路，連不上才用快取，所以改版後不會卡在舊版。
const CACHE = 'opp-shell-v193-20261125';
const SHELL = ['./', 'index.html', 'css/app.css?v193', 'js/app.js?v193', 'js/adapter.js?v193', 'js/mock.js?v193', 'js/demo.js?v193', 'js/bot_face.js?v193', 'js/bot_voice.js?v193', 'manifest.webmanifest', 'icons/icon.svg?v=20261124d', 'icons/icon-192.png?v=20261124d'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('opp-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  const key = u.origin + u.pathname + (u.searchParams.has('k') ? '' : u.search);   // 金鑰 ?k= 不存進快取；?v23 這種版本號保留
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); } return res; })   // no-cache：每次向伺服器確認新版
    .catch(() => caches.match(key, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
