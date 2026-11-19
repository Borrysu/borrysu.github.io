const V='kk-v28';
const SHELL=['./','manifest.json','apple-touch-icon.png?v=20261116f','icon-192.png?v=20261116f'];
const LAZY=['chart.min.js','supabase.js'];
// install never blocks or fails because of one slow file; the big libraries are fetched lazily by the page itself
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));});
// a new version takes over at once and drops every older cache (the page reloads itself on controllerchange; never navigate clients from here: activation would wait on a navigation that waits on activation)
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const withTimeout=(p,ms)=>new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('timeout')),ms);p.then(v=>{clearTimeout(t);res(v);},e=>{clearTimeout(t);rej(e);});});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return; // never touch API / websocket traffic
  const isPage=r.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('index.html');
  if(isPage){ // network first (4s cap) so a new deploy shows up, but a slow network falls back to the cached shell instead of a blank page
    e.respondWith(withTimeout(fetch(r),4000).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put('./',cp));return res;}).catch(()=>caches.match('./').then(h=>h||fetch(r))));
    return;
  }
  // libraries and icons: cache first, fill on first use
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})));
});
