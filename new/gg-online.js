/* GhostGames "online now" pill. Free, no account: Abacus counters bucketed per minute.
   Each visitor (per browser profile, deduped across tabs via localStorage) hits the key for the current
   UTC minute once; we show max(current, previous minute). Approximates "visitors active in the last ~60-120 s".
   Counting runs for EVERY visitor; the pill itself is only displayed to the owner account (cosmetic, client-side). */
(function(){
var API='https://abacus.jasoncameron.dev',NS='ghostgames-gfz',el,last=null,OWNER='zanebarker1331@gmail.com';
/* hide any #ggOnline before first paint / auth resolves (no flash for non-owners) */
(function(){var s=document.createElement('style');s.id='ggOnHide';s.textContent='#ggOnline:not(.ggown),.ggon:not(.ggown){display:none!important}';(document.head||document.documentElement).appendChild(s)})();
function email(){var u=null;try{if(window.GGAuth&&GGAuth.user)u=GGAuth.user()}catch(e){}
 if(!u){try{var j=JSON.parse(localStorage.getItem('gg-auth')||'null');u=j&&(j.user||(j.currentSession&&j.currentSession.user))||null}catch(e){}}
 return u&&u.email?String(u.email).toLowerCase():''}
function gate(){var on=email()===OWNER;if(el){el.classList.toggle('ggown',on);if(on)el.removeAttribute('hidden');else el.setAttribute('hidden','')}}
function css(){if(document.getElementById('ggOnCss'))return;var s=document.createElement('style');s.id='ggOnCss';
 s.textContent='.ggon{display:inline-flex;align-items:center;gap:7px;font:600 12px Poppins,system-ui,sans-serif;color:#dfe9f5;background:rgba(10,14,22,.78);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 11px;line-height:1;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}'+
 '.ggon i{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:ggonp 2s infinite}'+
 '.ggon.fix{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:60;pointer-events:none}'+
 '@keyframes ggonp{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 7px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}'+
 '@media (prefers-reduced-motion:reduce){.ggon i{animation:none}}';document.head.appendChild(s)}
function mount(){css();el=document.getElementById('ggOnline');
 if(!el){el=document.createElement('div');el.id='ggOnline';el.className='fix';document.body.appendChild(el)}
 el.classList.add('ggon');el.setAttribute('role','status');el.setAttribute('title','Visitors on GhostGames in the last minute or so (approximate)');
 if(!el.innerHTML)el.innerHTML='<i aria-hidden="true"></i><span>… online</span>';gate()}
function show(n){last=n;if(el)el.querySelector('span').textContent=(n<1?1:n)+' online'}
function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function f(op,k){return fetch(API+'/'+op+'/'+NS+'/'+k,{cache:'no-store',credentials:'omit'}).then(function(r){if(r.status===404)return{value:0};if(!r.ok)throw 0;return r.json()}).then(function(d){return +d.value||0})}
function tick(){if(document.hidden)return;var m=Math.floor(Date.now()/60000),cur='on-'+m,prev='on-'+(m-1);
 var mine=lsg('gg:onB')===String(m);if(!mine)lss('gg:onB',String(m));
 Promise.all([f(mine?'get':'hit',cur),f('get',prev)]).then(function(v){show(Math.max(v[0],v[1]))}).catch(function(){})}
function start(){mount();tick();setInterval(tick,20000);setInterval(gate,5000);document.addEventListener('gg:auth',gate);window.addEventListener('storage',function(e){if(!e.key||e.key==='gg-auth')gate()});document.addEventListener('visibilitychange',function(){if(!document.hidden)tick()})}
window.GGOnline={tick:tick,gate:gate,get:function(){return last}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
