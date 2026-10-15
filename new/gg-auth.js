/* GhostGames accounts: Supabase Auth (Discord; Google behind GG_CONFIG.GG_AUTH_GOOGLE) + sync of
   favourites / recently played / votes. Falls back to localStorage-only if the tables aren't there. */
(function(){
var C=window.GG_CONFIG||{},GG=window.GG;if(!C.SUPABASE_URL||!GG)return;
var sb=null,user=null,tablesOk=null,els=[],modal,ready;
var DISCORD_SVG='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8.3 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm7.4 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>';
var GOOGLE_SVG='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z"/></svg>';
function css(){var s=document.createElement('style');s.textContent=
'.ggau{font-family:inherit;position:relative}.ggfw{position:fixed;top:20px;right:18px;z-index:450;display:flex;gap:8px;align-items:center}'+'.ggkf{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 13px;border-radius:14px;color:#cfd8e6;font-size:13.5px;font-weight:500;text-decoration:none;border:1px solid transparent}.ggkf i{color:#ff5e5b}.ggkf:hover{color:#fff;border-color:rgba(255,255,255,.12);background:rgba(6,8,14,.55)}'+'.ggkm{display:none;margin-top:10px}.ggkm .ggkf{width:100%;justify-content:center;height:46px;font-size:15px;border-color:rgba(255,255,255,.10)}'+'@media (max-width:1080px){.ggfw{display:none}.ggkm{display:block}}'+
'.ggau.mn{display:none;margin-top:10px}'+
'@media (max-width:1080px){.ggau.fx{display:none}.ggau.mn{display:block}}'+
'.ggau .lb{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(6,8,14,.55);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);color:#fff;font:500 14px inherit;font-family:inherit;cursor:pointer}'+
'.ggau.mn .lb{width:100%;justify-content:center;height:46px;font-size:15px}'+
'.ggau .lb:hover{border-color:rgba(120,225,255,.5)}.ggau .lb:focus-visible{outline:2px solid rgba(120,225,255,.7);outline-offset:2px}'+
'.ggau .av{width:28px;height:28px;border-radius:50%;object-fit:cover;background:#0a101a;flex:0 0 auto;box-shadow:0 0 0 1px rgba(95,227,255,.35)}.ggau .un{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
'.ggau .dd{position:absolute;right:0;top:calc(100% + 8px);min-width:190px;padding:6px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(11,15,22,.985),rgba(7,10,16,.99));box-shadow:0 18px 40px rgba(0,0,0,.5);display:none;z-index:5}'+
'.ggau.mn .dd{position:static;margin-top:6px}.ggau.open .dd{display:block}'+
'.ggau .dd a,.ggau .dd button{display:flex;gap:10px;align-items:center;width:100%;padding:10px 12px;border:0;border-radius:10px;background:none;color:#dfe5ee;font:500 14px inherit;font-family:inherit;text-decoration:none;cursor:pointer;text-align:left}'+
'.ggau .dd a:hover,.ggau .dd button:hover{background:rgba(255,255,255,.06);color:#fff}'+
'.ggam{position:fixed;inset:0;z-index:2600;display:none;place-items:center;background:rgba(0,0,0,.6);padding:16px}.ggam.open{display:grid}'+
'.ggam .bx{position:relative;width:min(360px,100%);padding:26px 22px 20px;border-radius:22px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,#0d121b,#080b12);color:#e9eef6;text-align:center;font-family:Poppins,system-ui,sans-serif}'+
'.ggam .ggam-ghost{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;box-shadow:0 0 0 2px rgba(95,227,255,.4),0 0 28px rgba(95,227,255,.35);background:#0a101a}.ggam h2{margin:0 0 6px;font-size:20px}.ggam p{margin:0 0 18px;color:#9aa6b8;font-size:13.5px;line-height:1.5}'+
'.ggam .pb{display:flex;gap:10px;align-items:center;justify-content:center;width:100%;height:46px;border-radius:14px;border:0;font:600 15px Poppins,system-ui,sans-serif;cursor:pointer;margin-top:10px}'+
'.ggam .pd{background:#5865F2;color:#fff}.ggam .pd:hover{background:#4752c4}.ggam .pg{background:#fff;color:#1f1f1f}'+
'.ggam .x{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font-size:18px;cursor:pointer}'+
'.ggam [hidden]{display:none!important}.ggam .er{color:#fca5a5;font-size:12.5px;margin-top:10px;min-height:1em}';document.head.appendChild(s)}
function esc(t){return GG.esc?GG.esc(t):String(t)}
function meta(){var m=(user&&user.user_metadata)||{};return{name:(m.custom_claims&&m.custom_claims.global_name)||m.full_name||m.name||m.user_name||(user&&user.email||'Player').split('@')[0],av:m.avatar_url||m.picture||''}}
function ghostAv(){return (GG.BASE||'')+'icons/icon-192.png'}
function render(){els.forEach(function(el){
 if(!user){el.classList.remove('open');el.innerHTML='<button type="button" class="lb ggli"><img class="av" alt="" src="'+esc(ghostAv())+'"><span>Log in</span></button>';return}
 var m=meta();el.innerHTML='<button type="button" class="lb ggme" aria-haspopup="menu" aria-expanded="false"><img class="av" alt="" src="'+esc(m.av||ghostAv())+'" referrerpolicy="no-referrer"><span class="un">'+esc(m.name)+'</span><i class="fa-solid fa-chevron-down" aria-hidden="true" style="font-size:11px;opacity:.7"></i></button>'+
 '<div class="dd" role="menu"><a role="menuitem" href="'+GG.BASE+'games/?fav=1"><i class="fa-solid fa-heart" aria-hidden="true"></i>My favourites</a><button type="button" role="menuitem" class="gglo"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>Log out</button></div>'})}
function mount(){css();
 var fw=document.createElement('div');fw.className='ggfw';fw.innerHTML='<a class="ggkf" href="https://ko-fi.com/ghostgamesapp" target="_blank" rel="noopener"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i><span>Support</span></a>';document.body.appendChild(fw);var fx=document.createElement('div');fx.className='ggau fx';fw.appendChild(fx);els.push(fx);
 var nm=document.getElementById('navmenu');if(nm){var kw=document.createElement('div');kw.className='ggkm';kw.innerHTML='<a class="ggkf" href="https://ko-fi.com/ghostgamesapp" target="_blank" rel="noopener"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i><span>Support</span></a>';nm.appendChild(kw);var mn=document.createElement('div');mn.className='ggau mn';nm.appendChild(mn);els.push(mn)}
 render();
 document.addEventListener('click',function(e){var t=e.target;
  if(t.closest('.ggli')){e.preventDefault();var nv=document.getElementById('nav'),bg=document.getElementById('burger');if(nv&&nv.classList.contains('open')){nv.classList.remove('open');if(bg)bg.setAttribute('aria-expanded','false')}openModal();return}
  var me=t.closest('.ggme');if(me){var w=me.parentNode,o=w.classList.toggle('open');me.setAttribute('aria-expanded',o);return}
  if(t.closest('.gglo')){logout();return}
  els.forEach(function(el){if(!el.contains(t))el.classList.remove('open')})});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(modal&&modal.classList.contains('open'))closeModal();els.forEach(function(el){el.classList.remove('open')})}})}
function openModal(){if(!modal){modal=document.createElement('div');modal.className='ggam';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','ggamH');
 modal.innerHTML='<div class="bx"><button type="button" class="x" aria-label="Close">×</button><img class="ggam-ghost" src="'+esc(ghostAv())+'" alt=""><h2 id="ggamH">Log in to GhostGames</h2><p>Sync your favourites, recently played games and ratings across devices.</p>'+
 '<button type="button" class="pb pd" data-p="discord">'+DISCORD_SVG+'Continue with Discord</button>'+
 '<button type="button" class="pb pg" data-p="google"'+(C.GG_AUTH_GOOGLE===true?'':' hidden')+'>'+GOOGLE_SVG+'Continue with Google</button><div class="er" role="alert"></div></div>';
 document.body.appendChild(modal);
 modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.x'))closeModal();var b=e.target.closest('[data-p]');if(b)login(b.getAttribute('data-p'),b)})}
 modal.classList.add('open');setTimeout(function(){modal.querySelector('.pd').focus()},20)}
function closeModal(){if(modal)modal.classList.remove('open')}
function client(){return ready||(ready=import('https://esm.sh/@supabase/supabase-js@2').then(function(m){
 sb=m.createClient(C.SUPABASE_URL,C.SUPABASE_KEY,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'gg-auth'}});return sb}))}
function cleanUrl(){var u=new URL(location.href),ch=false;['code','error','error_code','error_description','state'].forEach(function(k){if(u.searchParams.has(k)){u.searchParams.delete(k);ch=true}});
 if(/access_token|error_description/.test(u.hash)){u.hash='';ch=true}if(ch)history.replaceState(history.state,'',u.pathname+u.search+u.hash)}
function login(p,btn){if(p==='google'&&C.GG_AUTH_GOOGLE!==true)return;btn.disabled=true;var er=modal.querySelector('.er');er.textContent='';
 /* Always return to premium home (allow-listed under site). Avoid per-page URLs so the classic
    intro gate cannot strip ?code= when bouncing index → home/. */
 var u=new URL((GG.BASE||'/')+'home/',location.href);u.search='';u.hash='';
 client().then(function(sb){return sb.auth.signInWithOAuth({provider:p,options:{redirectTo:u.href}})})
 .then(function(r){if(r&&r.error)throw r.error}).catch(function(e){btn.disabled=false;er.textContent='Couldn\'t start login: '+(e&&e.message||e)})}
function logout(){client().then(function(sb){return sb.auth.signOut()}).then(function(){user=null;render();GG.toast&&GG.toast('Logged out. Your data stays on this device.')})}
/* ---------- sync ---------- */
function missing(e){return e&&(e.code==='42P01'||e.code==='PGRST205'||e.code==='PGRST204'||/does not exist|schema cache/i.test(e.message||''))}
function T(n){return sb.from(n)}
function merge(){if(!user)return;var uid=user.id;
 Promise.all([T('favourites').select('game_id,created_at'),T('recent').select('game_id,played_at'),T('votes').select('game_id,dir')]).then(function(r){
  var bad=r.filter(function(x){return x.error});if(bad.length){tablesOk=false;if(!bad.every(function(x){return missing(x.error)}))console.warn('[gg-auth] sync error',bad[0].error);return}
  tablesOk=true;var BY=GG.BY,lf=GG.get('gg:favs',[]),lr=GG.get('gg:recent',[]),lv=GG.get('gg:votes',{});
  /* favourites: union */
  var rf=r[0].data.map(function(x){return x.game_id}),fav=lf.slice();rf.forEach(function(id){if(fav.indexOf(id)<0)fav.push(id)});
  /* recent: newest per game, keep 20 */
  var m={};lr.forEach(function(x){m[x.id]=Math.max(m[x.id]||0,x.t)});r[1].data.forEach(function(x){var t=Date.parse(x.played_at);m[x.game_id]=Math.max(m[x.game_id]||0,t)});
  var rec=Object.keys(m).map(function(id){return{id:id,t:m[id]}}).sort(function(a,b){return b.t-a.t}).slice(0,20);
  /* votes: account wins on conflict */
  var vt=Object.assign({},lv);r[2].data.forEach(function(x){vt[x.game_id]=x.dir});
  GG.set('gg:favs',fav);GG.set('gg:recent',rec);GG.set('gg:votes',vt);
  var up=[];
  var nf=fav.filter(function(id){return rf.indexOf(id)<0});if(nf.length)up.push(T('favourites').upsert(nf.map(function(id){return{user_id:uid,game_id:id}}),{ignoreDuplicates:true}));
  if(rec.length)up.push(T('recent').upsert(rec.map(function(x){return{user_id:uid,game_id:x.id,played_at:new Date(x.t).toISOString()}})));
  var rv={};r[2].data.forEach(function(x){rv[x.game_id]=1});var nv=Object.keys(lv).filter(function(id){return !rv[id]});if(nv.length)up.push(T('votes').upsert(nv.map(function(id){return{user_id:uid,game_id:id,dir:lv[id]}}),{ignoreDuplicates:true}));
  var mm=meta();up.push(T('profiles').upsert({id:uid,username:mm.name,avatar_url:mm.av||null,updated_at:new Date().toISOString()}));
  Promise.all(up).catch(function(){});
  try{GG.syncHearts()}catch(e){}
  document.dispatchEvent(new CustomEvent('gg:fav',{detail:{sync:1}}));document.dispatchEvent(new CustomEvent('gg:recent',{detail:{sync:1}}));
 }).catch(function(e){tablesOk=false;console.warn('[gg-auth] sync unavailable',e)})}
function hooks(){
 document.addEventListener('gg:fav',function(e){var d=e.detail||{};if(!user||!tablesOk||d.sync||!d.id)return;
  if(d.on)T('favourites').upsert({user_id:user.id,game_id:d.id},{ignoreDuplicates:true}).then(function(){});else T('favourites').delete().eq('user_id',user.id).eq('game_id',d.id).then(function(){})});
 document.addEventListener('gg:recent',function(e){if(!user||!tablesOk||(e.detail&&e.detail.sync))return;var r=GG.get('gg:recent',[])[0];if(r)T('recent').upsert({user_id:user.id,game_id:r.id,played_at:new Date(r.t).toISOString()}).then(function(){})});
 document.addEventListener('gg:vote',function(e){var d=e.detail;if(!user||!tablesOk||!d)return;T('votes').upsert({user_id:user.id,game_id:d.id,dir:d.dir},{ignoreDuplicates:true}).then(function(){})})}
function start(){mount();hooks();
 var cb=/[?&](code|error_description)=/.test(location.search)||/access_token=/.test(location.hash);
 var stored=false;try{stored=!!localStorage.getItem('gg-auth')}catch(e){}
 if(!cb&&!stored)return; /* don't load supabase-js for anonymous visitors until they click Log in */
 boot()}
function boot(){client().then(function(sb){
 sb.auth.onAuthStateChange(function(ev,s){var was=user&&user.id;user=s&&s.user||null;render();
  if(user&&was!==user.id){merge();if(ev==='SIGNED_IN'&&!was&&/[?&]code=/.test(location.search)){GG.toast&&GG.toast('Logged in as '+meta().name+'.')}}
  if(ev==='SIGNED_IN'||ev==='INITIAL_SESSION')cleanUrl()});
 }).catch(function(e){console.warn('[gg-auth] supabase-js failed to load',e)})}
var _open=openModal;openModal=function(){_open();if(!sb)boot()};
window.GGAuth={user:function(){return user},tablesOk:function(){return tablesOk},open:function(){openModal()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
