/* GhostGames: adds COOP/COEP to this folder's pages so the embedded GTA V port (which needs SharedArrayBuffer) is cross-origin isolated.
   Scope is this folder only; the rest of GhostGames is unaffected. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.mode!=='navigate')return;
 e.respondWith(fetch(r).then(res=>{if(res.status===0)return res;const h=new Headers(res.headers);
  h.set('Cross-Origin-Opener-Policy','same-origin');h.set('Cross-Origin-Embedder-Policy','credentialless');h.set('Cross-Origin-Resource-Policy','cross-origin');
  return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h})}).catch(()=>fetch(r)));
});
