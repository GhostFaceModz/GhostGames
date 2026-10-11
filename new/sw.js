/* GhostGames app-shell service worker. Scope = this folder (start_url/scope come from where it is served,
   so the same file works on Render /ghostgames/ and GitHub Pages /GhostGames/new/).
   Caches ONLY our own shell (pages, JS/CSS, manifest, icons) and covers. Never touches third-party game hosts,
   ROMs, the retro emulator page, or play/ (play/gta-v/ has its own isolation worker with a more specific scope). */
const V='gg-shell-v1',CV='gg-covers-v1',SCOPE=self.registration.scope;
const SHELL=['','games/','game/','retro/','gg-common.js','gg-data.js','gg-site.css','manifest.json','icons/icon-192.png','icons/icon-512.png'].map(p=>new URL(p,SCOPE).href);
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>/^gg-/.test(k)&&k!==V&&k!==CV).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const u=new URL(r.url);if(u.origin!==self.location.origin||!r.url.startsWith(SCOPE))return;
 const rel=r.url.slice(SCOPE.length).split(/[?#]/)[0];
 if(/^(play|shots)\//.test(rel)||/^retro\/(roms\/|player\.html)/.test(rel)||rel==='sw.js')return;
 if(/^(covers|icons)\//.test(rel)){ /* cache-first: covers/icons are immutable per release */
  e.respondWith(caches.open(CV).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}))));return}
 if(r.mode!=='navigate'&&!/\.(js|css|json|html)$/.test(rel))return;
 /* network-first for pages + shell assets, offline fallback to cache (game/?id=… falls back to the game/ shell) */
 e.respondWith(fetch(r).then(res=>{if(res.ok&&!u.search){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res})
  .catch(()=>caches.open(V).then(c=>c.match(r,{ignoreSearch:true}).then(m=>m||c.match(SCOPE)))));
});
