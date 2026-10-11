/* GhostGames shared runtime: storage (recent/favourites/plays), live status, player modal,
   card renderer, Discord button, suggest-a-game modal. Static only: localStorage/sessionStorage. */
(function(){
'use strict';
var S=document.currentScript,BASE=S.src.replace(/[^\/]*$/,'');
var TW={"red-600":"#dc2626","red-700":"#b91c1c","red-900":"#7f1d1d","indigo-600":"#4f46e5","indigo-950":"#1e1b4b","slate-900":"#0f172a","amber-600":"#d97706","amber-700":"#b45309","amber-800":"#92400e","amber-900":"#78350f","stone-700":"#44403c","stone-900":"#1c1917","stone-950":"#0c0a09","yellow-500":"#eab308","yellow-600":"#ca8a04","orange-600":"#ea580c","orange-950":"#431407","neutral-700":"#404040","neutral-900":"#171717","emerald-600":"#059669","emerald-700":"#047857","emerald-950":"#022c22","gray-900":"#111827","blue-600":"#2563eb","blue-700":"#1d4ed8","blue-950":"#172554","cyan-600":"#0891b2","cyan-950":"#083344","teal-600":"#0d9488","teal-950":"#042f2e","green-600":"#16a34a","violet-600":"#7c3aed","purple-950":"#3b0764","pink-600":"#db2777","rose-950":"#4c0519","zinc-900":"#18181b","black":"#000000","fuchsia-600":"#c026d3","sky-600":"#0284c7"};
var GAMES=window.GG_GAMES||[],BY={};
GAMES.forEach(function(g){var m=/from-(\S+)/.exec(g.color),n=/to-(\S+)/.exec(g.color);g.c1=TW[m&&m[1]]||'#1e293b';g.c2=TW[n&&n[1]]||'#05070c';g.cover=BASE+'covers/'+g.id+'.webp';g.off=g.status==='offline';BY[g.id]=g});
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- storage ---- */
function get(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function recent(){return get('gg:recent',[]).filter(function(r){return BY[r.id]})}
function record(id){var r=recent().filter(function(x){return x.id!==id});r.unshift({id:id,t:Date.now()});set('gg:recent',r.slice(0,20));var p=get('gg:plays',{});p[id]=(p[id]||0)+1;set('gg:plays',p);hitPlay(id);document.dispatchEvent(new CustomEvent('gg:recent'))}
function plays(id){return get('gg:plays',{})[id]||0}
function favs(){return get('gg:favs',[]).filter(function(id){return BY[id]})}
function isFav(id){return favs().indexOf(id)>=0}
function toggleFav(id){var f=favs(),i=f.indexOf(id);if(i>=0)f.splice(i,1);else f.unshift(id);set('gg:favs',f);syncHearts();document.dispatchEvent(new CustomEvent('gg:fav',{detail:{id:id,on:i<0}}));return i<0}
function heart(id,cls){var on=isFav(id);return '<button type="button" class="ggfav '+(cls||'')+(on?' on':'')+'" data-fav="'+id+'" aria-pressed="'+on+'" aria-label="'+(on?'Remove ':'Add ')+esc(BY[id].title)+(on?' from':' to')+' favourites"><i class="fa-'+(on?'solid':'regular')+' fa-heart" aria-hidden="true"></i></button>'}
function syncHearts(){Array.prototype.forEach.call(document.querySelectorAll('[data-fav]'),function(b){var id=b.getAttribute('data-fav'),on=isFav(id);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',(on?'Remove ':'Add ')+BY[id].title+(on?' from':' to')+' favourites');var i=b.querySelector('i');if(i)i.className='fa-'+(on?'solid':'regular')+' fa-heart'})}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-fav]');if(!b)return;e.preventDefault();e.stopPropagation();toggleFav(b.getAttribute('data-fav'))},true);

/* ---- status: verified static status from gg-data.js (online / issues / offline). The old favicon ping was
   dropped: it could never prove a game works, only spam console errors, and a failed ping must not override
   the verified status anyway. ---- */
var ST={on:'Online',iss:'Issues',off:'Down'};
function stStatic(g){var k=g.off?'off':g.status==='issues'?'iss':'on';return {k:k,l:ST[k]}}
function probe(g,cb){cb(stStatic(g))}
function stTitle(g,s){return s.k==='on'?'Online':(s.l+(g.note?': '+g.note:''))}
function stHtml(g){var s=stStatic(g);return '<span class="ggst '+s.k+'" data-st="'+g.id+'" title="'+esc(stTitle(g,s))+'"><i aria-hidden="true"></i><em>'+s.l+'</em></span>'}
function applyStatus(root){Array.prototype.forEach.call((root||document).querySelectorAll('[data-st]'),function(el){var g=BY[el.getAttribute('data-st')];if(!g)return;probe(g,function(s){el.className='ggst '+s.k;el.querySelector('em').textContent=s.l;el.title=stTitle(g,s)})})}

/* ---- card renderer (grid + detail "similar" rows) ---- */
function devHtml(g){var d=g.devices||['pc'];return '<span class="dev" title="'+(d.indexOf('mobile')>=0?'PC and mobile':'PC only')+'"><i class="fa-solid fa-desktop" aria-hidden="true"></i>'+(d.indexOf('mobile')>=0?'<i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>':'')+'<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">'+(d.indexOf('mobile')>=0?'Plays on PC and mobile':'PC only')+'</span></span>'+padHtml(g)}
function padHtml(g){return g.controller?'<span class="ggpad" title="Controller supported"><i class="fa-solid fa-gamepad" aria-hidden="true"></i><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Controller supported</span></span>':''}
function sm(g){return BASE+'covers/sm/'+g.id+'.webp'}
function imgAttrs(g,sizes,eager){return 'src="'+g.cover+'" srcset="'+sm(g)+' 192w, '+g.cover+' 384w" sizes="'+sizes+'" width="384" height="640" decoding="async"'+(eager?(eager==='high'?' fetchpriority="high"':''):' loading="lazy"')}
function card(g){
 var T=esc(g.title.replace(/\s*\(.*?\)\s*/g,' ').trim());
 var state=g.off?'<i class="fa-solid fa-power-off"></i>UNAVAILABLE':g.external?'<i class="fa-solid fa-arrow-up-right-from-square"></i>OPEN IN NEW TAB':'<i class="fa-solid fa-play"></i>PLAY NOW';
 var lbl=g.off?g.title+' (down, unavailable)':(g.external?'Play '+g.title+' (opens in new tab)':'Play '+g.title);
 return '<div class="card'+(g.off?' off':'')+'" data-id="'+g.id+'" style="--c1:'+g.c1+';--c2:'+g.c2+'">'+
  '<span class="art"><i class="fa-solid '+g.icon+' fi"></i></span><img class="cov" alt="" '+imgAttrs(g,'(max-width:700px) 48vw, 260px')+' onerror="this.remove()"><span class="grade"></span><span class="vig"></span><span class="scan"></span><span class="shine"></span><span class="fill"></span>'+
  '<span class="cat">'+esc(g.category)+'</span>'+(g.off?'<span class="chip">Down</span>':(g.badge?'<span class="chip">'+esc(g.badge)+'</span>':''))+
  (g.off?'':'<span class="ctp" aria-hidden="true"><span class="eq"><b></b><b></b><b></b><b></b></span>Click to play</span>')+
  '<span class="meta"><span class="ico"><i class="fa-solid '+g.icon+'"></i>'+stHtml(g)+devHtml(g)+'</span><span class="ttl">'+T+'</span><span class="ggps" data-ps="'+g.id+'">'+psHtml(g.id)+'</span><span class="blurb">'+esc(g.blurb||'')+'</span><span class="play">'+state+'</span></span>'+
  '<button type="button" class="hit" aria-label="'+esc(lbl)+'"'+(g.off?' aria-disabled="true" title="'+esc(g.note||'Offline')+'"':'')+'></button>'+
  '<span class="side">'+heart(g.id)+'<a class="info" href="'+BASE+'game/?id='+g.id+'" aria-label="Details: '+esc(g.title)+'"><i class="fa-solid fa-circle-info" aria-hidden="true"></i></a></span>'+
  '<span class="edge"></span></div>';
}
function bindCards(root){root.addEventListener('click',function(e){if(e.target.closest('.side'))return;var c=e.target.closest('.card');if(!c)return;var g=BY[c.getAttribute('data-id')];if(g&&!g.off)openGame(g)})}

/* ---- injected CSS for shared widgets ---- */
var css='.modal{position:fixed;inset:0;z-index:2000;display:none;background:rgba(2,3,6,.78);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}.modal.open{display:flex;flex-direction:column}'+
'.mbar{position:relative;z-index:5;flex:0 0 auto;display:flex;align-items:center;gap:12px;height:60px;padding:0 14px 0 20px;background:linear-gradient(180deg,rgba(14,18,28,.96),rgba(9,12,19,.96));border-bottom:1px solid rgba(255,255,255,.09);box-shadow:0 10px 30px rgba(0,0,0,.4);font-family:Poppins,sans-serif;color:#fff}'+
'.mbar .mi{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(150deg,var(--c1),var(--c2));box-shadow:inset 0 0 0 1px rgba(255,255,255,.15);flex:0 0 auto}.mbar .mt{min-width:0;flex:1}.mbar .mt b{display:block;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mbar .mt span{display:block;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7fdcf2}'+
'.mb{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:500 13px Poppins,sans-serif;cursor:pointer;white-space:nowrap;text-decoration:none}.mb:hover{background:rgba(255,255,255,.1)}.mb:focus-visible,.ggfav:focus-visible{outline:2px solid #5fe3ff;outline-offset:2px}.mclose{width:38px;padding:0;font-size:16px}'+
'.mstage{position:relative;flex:1 1 auto;margin:14px;border-radius:16px;overflow:hidden;background:#000;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 30px 80px rgba(0,0,0,.6)}.mstage iframe{position:absolute;inset:0;width:100%;height:100%;border:0;z-index:1}.mload{position:absolute;inset:0;display:grid;place-items:center;color:#8a93a3;font:13px Poppins,sans-serif;z-index:0}'+
'.mfb{position:absolute;inset:0;z-index:3;display:none;place-items:center;background:rgba(5,7,12,.92);text-align:center;padding:24px;color:#fff;font-family:Poppins,sans-serif}.mfb.show{display:grid}.mfb h3{font-size:20px;font-weight:700;margin-bottom:8px}.mfb p{color:#9aa3b2;font-size:13px;max-width:380px;margin:0 auto 18px;line-height:1.6}.mfb .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.mfb .btn,.sg .btn{height:44px;padding:0 22px;border-radius:13px;font-size:14px;font-weight:500}'+
'.ggfav{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;cursor:pointer;font-size:15px;transition:background .2s,color .2s,transform .2s}.ggfav:hover{background:rgba(255,255,255,.1)}.ggfav.on{color:#ff5a7a;border-color:rgba(255,90,122,.45);background:rgba(255,90,122,.10)}'+
'.ggst em{font-style:normal}.ggst{display:inline-flex;align-items:center;gap:6px;font:500 10px Poppins,sans-serif;letter-spacing:.04em;color:rgba(255,255,255,.82);white-space:nowrap}.ggst i{position:relative;width:7px;height:7px;border-radius:50%;background:#22c55e;color:#22c55e;flex:0 0 auto}.ggst i::after{content:"";position:absolute;inset:0;border-radius:50%;background:currentColor;opacity:.55;animation:ggpulse 2s ease-out infinite}.ggst.on i{background:#22c55e;color:#22c55e}.ggst.iss i{background:#f59e0b;color:#f59e0b}.ggst.off i{background:#ef4444;color:#ef4444}@keyframes ggpulse{0%{transform:scale(1);opacity:.55}70%,100%{transform:scale(2.4);opacity:0}}@media (prefers-reduced-motion:reduce){.ggst i::after{animation:none;opacity:0}}'+
'.sg .sgbox{position:relative;margin:auto;width:min(480px,calc(100% - 28px));max-height:calc(100% - 28px);overflow:auto;padding:26px 24px 22px;border-radius:22px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(11,15,22,.985),rgba(7,10,16,.99));box-shadow:0 26px 60px rgba(0,0,0,.6);color:#fff;font-family:Poppins,sans-serif}'+
'.sg h2{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:-.005em}.sg .sgsub{color:#a9aeb5;font-size:13px;margin:6px 0 18px;line-height:1.5}.sg label{display:block;font-size:12px;font-weight:600;margin:12px 0 6px;color:#dfe5ee}.sg label em{font-style:normal;font-weight:400;color:#7e8796}'+
'.sg input,.sg textarea{width:100%;padding:11px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035);color:#fff;font:400 14px Poppins,sans-serif}.sg textarea{min-height:84px;resize:vertical}.sg input:focus-visible,.sg textarea:focus-visible{outline:2px solid rgba(120,225,255,.85);outline-offset:1px}'+
'.sg .err{display:none;color:#ff8a9e;font-size:11.5px;margin-top:5px}.sg .bad .err{display:block}.sg .bad input{border-color:rgba(255,120,140,.6)}.sg .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}'+
'.sg .acts{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}.sg .msg{margin-top:14px;font-size:13px;line-height:1.5;color:#a9aeb5}.sg .msg a{color:#5fe3ff}.sg .msg.ok{color:#7ff0c0}.sg .sgx{position:absolute;right:14px;top:14px}'+
'.mhelp{position:absolute;inset:0;z-index:4;display:none;align-items:center;justify-content:center;background:rgba(2,3,6,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:14px;font-family:Poppins,sans-serif;color:#fff}.mhelp.open{display:flex}.mhbox{position:relative;width:min(440px,100%);max-height:100%;overflow:auto;padding:22px 20px 18px;border-radius:20px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(11,15,22,.985),rgba(7,10,16,.99));box-shadow:0 26px 60px rgba(0,0,0,.6)}.mhbox h3{font-size:17px;font-weight:800;text-transform:uppercase;margin-bottom:4px;padding-right:44px}.mhbox .mhx{position:absolute;right:12px;top:12px}'+
'.ggtr{list-style:none;display:grid;gap:11px;margin:12px 0 0;padding:0}.ggtr li{position:relative;padding-left:26px;font-size:13px;line-height:1.55;color:#c3c8d0}.ggtr li>i{position:absolute;left:0;top:3px;width:16px;text-align:center;color:#5fe3ff;font-size:12px}.ggtr li b{color:#fff;font-weight:600}.ggtr li.warn>i{color:#f59e0b}.ggtr li.bad>i{color:#ef4444}.ggtr .mb{height:32px;padding:0 12px;font-size:12px;margin:7px 8px 0 0;border-radius:10px}.ggtr .mb.dcb{border-color:rgba(88,101,242,.55);background:rgba(88,101,242,.16)}.ggtr .mb.dcb:hover{background:rgba(88,101,242,.28)}'+
'.mchip{position:absolute;left:50%;bottom:16px;z-index:3;transform:translateX(-50%);display:none;align-items:center;gap:4px;padding:4px 4px 4px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(9,12,19,.92);box-shadow:0 10px 30px rgba(0,0,0,.45);font:500 12px Poppins,sans-serif;color:#dfe5ee;white-space:nowrap}.mchip.show{display:inline-flex}.mchip button{background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:5px 6px;border-radius:999px}.mchip .mcgo{color:#5fe3ff}.mchip button:hover{background:rgba(255,255,255,.08)}.mchip button:focus-visible{outline:2px solid #5fe3ff}'+
'@media (max-width:700px){.mbar{height:56px;padding:0 10px 0 12px;gap:8px}.mbar .mi{display:none}.mnt{width:38px;padding:0}.mnt em{display:none}.mstage{margin:0;border-radius:0}}'+
'.ggps{display:flex;gap:10px;font:500 10.5px Poppins,sans-serif;color:rgba(255,255,255,.7);min-height:0;margin-top:2px}.ggps:empty{display:none}.ggps i{font-size:8.5px;margin-right:4px;color:#5fe3ff}'+
'.ggpad{position:relative;display:inline-flex;align-items:center;margin-left:8px;font-size:11px;color:#5fe3ff}'+
'.ggrate{display:inline-flex;gap:8px}.ggv{min-width:38px;padding:0 11px;gap:6px}.ggv span:empty{display:none}.ggv.on{border-color:rgba(95,227,255,.55);background:rgba(95,227,255,.14);color:#bff6ff}.ggv:disabled{cursor:default;opacity:.92}.ggv:disabled:not(.on){opacity:.5}'+
'.mrate .ggv{height:38px}'+
'.ggtoast{position:fixed;left:50%;bottom:26px;z-index:3000;transform:translate(-50%,20px);opacity:0;pointer-events:none;max-width:calc(100% - 32px);padding:11px 18px;border-radius:999px;background:rgba(8,12,20,.96);border:1px solid rgba(95,227,255,.4);color:#e9f6ff;font:600 13px Poppins,sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.6);transition:opacity .25s,transform .25s}.ggtoast.show{opacity:1;transform:translate(-50%,0)}'+
'.ggdock{position:fixed;left:18px;bottom:22px;z-index:450;display:flex;flex-direction:column;align-items:flex-start;gap:8px;max-width:calc(100% - 110px);pointer-events:none}.ggdock>*{pointer-events:auto}'+
'.gginst{display:inline-flex;align-items:center;border-radius:999px;background:rgba(10,14,22,.88);border:1px solid rgba(255,255,255,.14);box-shadow:0 10px 26px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}.gginst button{background:none;border:0;color:#e9eef6;cursor:pointer;font:600 12px Poppins,sans-serif;height:34px}.gginst .ggib{display:inline-flex;align-items:center;gap:7px;padding:0 6px 0 14px}.gginst .ggib i{color:#5fe3ff}.gginst .ggix{width:30px;color:#8b93a1}.gginst button:hover{color:#fff}'+
'@media (max-width:700px){.mrate{display:none}.ggdock{left:12px;bottom:14px}}'+
'@media (prefers-reduced-motion:reduce){.ggfav{transition:none}.ggtoast{transition:none}}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* ---- player modal ---- */
var modal,mStage,mFb,cur=null,lastFocus=null,fbT=0,frame=null;
var ALLOW='autoplay *; fullscreen *; gamepad *; pointer-lock *; keyboard-map *; clipboard-read *; clipboard-write *; microphone *; camera *; accelerometer *; gyroscope *; screen-wake-lock *; web-share *; cross-origin-isolated *; focus-without-user-activation *';
function $(id){return document.getElementById(id)}
function ensureModal(){
 if(modal)return;var d=document.createElement('div');d.className='modal';d.id='modal';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','mTitle');
 d.innerHTML='<div class="mbar"><div class="mi" id="mIcon"></div><div class="mt"><b id="mTitle">Game</b><span id="mCat"></span></div><span id="mFavWrap"></span><span id="mRateWrap" class="mrate"></span>'+
 '<button type="button" class="mb mnt" id="mNew" aria-label="Open in new tab"><i class="fa-solid fa-arrow-up-right-from-square"></i><em style="font-style:normal">Open in new tab</em></button>'+
 '<button type="button" class="mb mnt" id="mHelp" aria-label="Game not loading? Help" aria-haspopup="dialog"><i class="fa-solid fa-circle-question"></i><em style="font-style:normal">Help</em></button>'+
 '<button type="button" class="mb mnt" id="mRestart" aria-label="Restart" style="display:none"><i class="fa-solid fa-rotate-right"></i><em style="font-style:normal">Restart</em></button><button type="button" id="mFocusTrap" tabindex="-1" aria-hidden="true" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"></button>'+
 '<button type="button" class="mb mclose" id="mClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>'+
 '<div class="mstage" id="mStage"><div class="mload"><span><i class="fa-solid fa-circle-notch fa-spin"></i>&nbsp; Loading game…</span></div>'+
 '<div class="mfb" id="mFb"><div><h3>This game blocks embedding</h3><p>The host won\'t let it run inside this page. It plays fine in its own tab.</p><div class="row"><button type="button" class="btn" id="mFbNew"><span>Open in new tab</span></button><button type="button" class="mb" id="mFbWait">Keep waiting</button></div></div></div>'+
 '<div class="mchip" id="mChip" role="status"><button type="button" class="mcgo" id="mChipGo"><i class="fa-solid fa-circle-question"></i>&nbsp; Game not loading?</button><button type="button" id="mChipX" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button></div>'+
 '<div class="mhelp" id="mHelpP" role="dialog" aria-modal="true" aria-labelledby="mHelpT"><div class="mhbox"><button type="button" class="mb mclose mhx" id="mHelpX" aria-label="Close help"><i class="fa-solid fa-xmark"></i></button><h3 id="mHelpT">Game not loading?</h3><div id="mHelpB"></div></div></div></div>';
 document.body.appendChild(d);modal=d;mStage=$('mStage');mFb=$('mFb');
 $('mClose').addEventListener('click',closeGame);$('mRestart').addEventListener('click',function(){if(cur)openGame(cur)});
 window.addEventListener('blur',function(){if(!cropS)return;setTimeout(function(){if(!cropS||document.activeElement!==frame)return;if(cropS.i<cropS.c.steps.length-1){cropS.i++;cropLayout();if(cropS.i<cropS.c.steps.length-1)$('mFocusTrap').focus();else{try{frame.focus()}catch(e){}}cropHint()}},350)});
 window.addEventListener('resize',function(){if(cropS)cropLayout()});$('mNew').addEventListener('click',newTab);$('mFbNew').addEventListener('click',newTab);
 $('mFbWait').addEventListener('click',function(){mFb.classList.remove('show')});
 $('mHelp').addEventListener('click',openHelp);$('mChipGo').addEventListener('click',openHelp);$('mHelpX').addEventListener('click',closeHelp);
 $('mChipX').addEventListener('click',function(){hideChip();try{sessionStorage.setItem('gg:nochip','1')}catch(e){}});
 $('mHelpP').addEventListener('click',function(e){if(e.target===$('mHelpP'))closeHelp();var a=e.target.closest('[data-h]');if(!a)return;var k=a.getAttribute('data-h');if(k==='reload'){closeHelp();if(cur)openGame(cur)}else if(k==='new'){newTab()}});
 window.addEventListener('blur',function(){setTimeout(function(){if(frame&&document.activeElement===frame){touched=true;hideChip()}},0)});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal.classList.contains('open')&&!(rp&&rp.classList.contains('open'))){e.stopImmediatePropagation();if($('mHelpP').classList.contains('open'))closeHelp();else closeGame()}},true);
 modal.addEventListener('keydown',function(e){if(e.key!=='Tab')return;var hp=$('mHelpP').classList.contains('open');var f=[].slice.call(modal.querySelectorAll(hp?'#mHelpP button,#mHelpP a':'.mbar button')).concat(frame&&!hp?[frame]:[]);var i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}});
}
var cropS=null,hintT=0;
function cropHint(){var h=$('mHint');if(!h){h=document.createElement('div');h.id='mHint';h.setAttribute('role','status');h.style.cssText='position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:4;pointer-events:none;max-width:calc(100% - 24px);padding:8px 14px;border-radius:999px;background:rgba(5,8,14,.86);border:1px solid rgba(120,225,255,.35);color:#e9f6ff;font:600 12.5px Poppins,sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.5);transition:opacity .4s'}mStage.appendChild(h);
 if(!cropS){h.style.opacity=0;return}var last=cropS.i===cropS.c.steps.length-1,touch=matchMedia('(pointer:coarse)').matches;
 h.textContent=last?(touch?(cropS.c.hintTouch||cropS.c.hint):cropS.c.hint)||'Click the game, then press Start':'Tap the highlighted button to continue';h.style.opacity=1;clearTimeout(hintT);if(last)hintT=setTimeout(function(){h.style.opacity=0},12000)}
function cropLayout(){var c=cropS.c,r=c.steps[cropS.i],W=mStage.clientWidth,H=mStage.clientHeight,k=Math.min(W/r[2],H/r[3]),w=r[2]*k,h=r[3]*k,cl=cropS.clip;
 cl.style.cssText='position:absolute;overflow:hidden;background:#000;z-index:1;left:'+((W-w)/2)+'px;top:'+((H-h)/2)+'px;width:'+w+'px;height:'+h+'px';
 frame.style.cssText='position:absolute;left:0;top:0;right:auto;bottom:auto;border:0;width:'+c.vw+'px;height:'+c.vh+'px;transform-origin:0 0;transform:translate('+(-r[0]*k)+'px,'+(-r[1]*k)+'px) scale('+k+')'}
function newTab(){if(cur)window.open(cur.url,'_blank','noopener')}

/* ---- troubleshooting help ---- */
var chipT=0,touched=false;
function isMob(){return window.matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)}
function helpHtml(g,live){var pcOnly=(g.devices||[]).indexOf('mobile')<0,st=g.status,L=[];
 function li(ic,t,c){L.push('<li'+(c?' class="'+c+'"':'')+'><i class="fa-solid '+ic+'" aria-hidden="true"></i>'+t+'</li>')}
 if(st==='offline'||st==='issues')li('fa-triangle-exclamation','<b>'+(st==='offline'?'This game\'s host is down right now.':'This game\'s host is having problems right now.')+'</b> It\'s not your device. Try again later.',st==='offline'?'bad':'warn');
 if(pcOnly)li('fa-desktop','<b>PC only.</b> '+esc(g.title)+' needs a keyboard and mouse'+(live&&isMob()?'. You\'re on a phone or tablet, so it may not load or play here. Try it on a PC.':'. It won\'t play properly on phones or tablets.'),live&&isMob()?'warn':'');
 li('fa-rotate-right','<b>Reload the game.</b> A fresh start fixes most stuck loading screens.'+(live?'<br><button type="button" class="mb" data-h="reload"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i>'+(g.crop?'Restart':'Reload game')+'</button>':''));
 li('fa-globe','<b>Try a different browser.</b> Chrome or Edge on PC work best. Safari and iOS can struggle with WebAssembly games. Turn off ad blockers and privacy shields for this site.');
 if(!g.crop&&!g.external)li('fa-arrow-up-right-from-square','<b>Open it in a new tab.</b> Some games run better outside the player.<br>'+(live?'<button type="button" class="mb" data-h="new">':'<a class="mb" href="'+esc(g.url)+'" target="_blank" rel="noopener">')+'<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>Open in new tab'+(live?'</button>':'</a>'));
 li('fa-computer-mouse','<b>Click inside the game</b> to give it keyboard and mouse focus. Press <b>Esc</b> to release the mouse.');
 li('fa-flag','<b>Still broken?</b> Report it and we\'ll take a look.<br><button type="button" class="mb" data-report="'+g.id+'"><i class="fa-solid fa-flag" aria-hidden="true"></i>Report a broken game</button>');
 li('fa-brands fa-discord','<b>Still stuck?</b> Ask in our Discord and we\'ll help.<br><a class="mb dcb" href="'+DISCORD+'" target="_blank" rel="noopener"><i class="fa-brands fa-discord" aria-hidden="true"></i>Join our Discord for help</a>');
 return '<ul class="ggtr">'+L.join('').replace('fa-solid fa-brands','fa-brands')+'</ul>'}
function hideChip(){clearTimeout(chipT);var c=$('mChip');if(c)c.classList.remove('show')}
function openHelp(){if(!cur)return;hideChip();$('mHelpB').innerHTML=helpHtml(cur,true);$('mHelpP').classList.add('open');$('mHelpX').focus()}
function closeHelp(){$('mHelpP').classList.remove('open');$('mHelp').focus()}
function openGame(g){
 if(typeof g==='string')g=BY[g];if(!g||g.off)return;record(g.id);
 if(g.external){window.open(g.url,'_blank','noopener');return}
 if(g.page){location.href=g.url;return}
 ensureModal();cur=g;lastFocus=document.activeElement;
 $('mTitle').textContent=g.title;$('mCat').textContent=g.category;$('mFavWrap').innerHTML=heart(g.id,'mfav');$('mRateWrap').innerHTML=rateHtml(g.id);need([g],['u','d']);
 $('mIcon').innerHTML='<i class="fa-solid '+g.icon+'"></i>';$('mIcon').style.setProperty('--c1',g.c1);$('mIcon').style.setProperty('--c2',g.c2);
 mFb.classList.remove('show');if(frame)frame.remove();if(cropS){cropS.clip.remove();cropS=null}
 $('mNew').style.display=g.crop?'none':'';$('mRestart').style.display=g.crop?'':'none';
 frame=document.createElement('iframe');frame.id='gameIframe';frame.title=g.title;frame.setAttribute('allow',ALLOW);frame.setAttribute('allowfullscreen','');frame.setAttribute('referrerpolicy','no-referrer-when-downgrade');
 var loaded=false;frame.addEventListener('load',function(){loaded=true;if(/^\/(?!\/)/.test(g.url)&&modal.classList.contains('open')){try{frame.focus()}catch(e){}}});frame.src=g.url;
 if(g.crop){frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-pointer-lock');frame.setAttribute('scrolling','no');var cl=document.createElement('div');cl.className='mcrop';cl.appendChild(frame);mStage.appendChild(cl);cropS={c:g.crop,i:0,clip:cl};cropLayout();cropHint()}else mStage.appendChild(frame);
 clearTimeout(fbT);fbT=setTimeout(function(){if(!loaded)mFb.classList.add('show')},9000);
 hideChip();$('mHelpP').classList.remove('open');touched=false;var nc=false;try{nc=sessionStorage.getItem('gg:nochip')==='1'}catch(e){}
 if(!nc)chipT=setTimeout(function(){if(cur===g&&!touched&&!$('mHelpP').classList.contains('open')&&!mFb.classList.contains('show'))$('mChip').classList.add('show')},15000);
 modal.classList.add('open');document.documentElement.style.overflow='hidden';$('mClose').focus();if(cropS){cropLayout();requestAnimationFrame(function(){if(cropS)cropLayout()})}
}
function closeGame(){if(!modal||!modal.classList.contains('open'))return;clearTimeout(fbT);hideChip();$('mHelpP').classList.remove('open');if(frame){frame.remove();frame=null}if(cropS){cropS.clip.remove();cropS=null}if($('mHint'))$('mHint').style.opacity=0;modal.classList.remove('open');document.documentElement.style.overflow='';cur=null;if(lastFocus&&lastFocus.focus)lastFocus.focus()}

/* ---- Discord floating button (stacked above the GitHub one) ---- */
var DISCORD='https://discord.gg/zenclipsdaily-arc-raiders-store-bloodstrike-1408818003591827539';
function syncPulse(){var b=document.querySelectorAll('.wa');b.forEach(function(e){e.classList.add('nosync')});void document.body.offsetWidth;b.forEach(function(e){e.classList.remove('nosync')})}
function discord(){var gh=document.querySelector('.wa:not(.dc)');if(!gh||document.querySelector('.wa.dc'))return;var a=document.createElement('a');a.className='wa dc';a.href=DISCORD;a.target='_blank';a.rel='noopener';a.setAttribute('aria-label','Discord');
 a.innerHTML='<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>';
 gh.parentNode.insertBefore(a,gh)}

/* ---- Suggest a game (FormSubmit AJAX, mailto fallback) ---- */
var FS='https://formsubmit.co/ajax/zanebarker1331@gmail.com',sg=null,sgLast=null;
function mailto(d){return 'mailto:zanebarker1331@gmail.com?subject='+encodeURIComponent('GhostGames suggestion')+'&body='+encodeURIComponent('Game: '+(d.name||'')+'\nURL: '+(d.url||'')+'\nNote: '+(d.note||'')+'\nFrom: '+(d.email||''))}
function openSuggest(){
 if(!sg){sg=document.createElement('div');sg.className='modal sg';sg.id='suggest';sg.setAttribute('role','dialog');sg.setAttribute('aria-modal','true');sg.setAttribute('aria-labelledby','sgT');
  sg.innerHTML='<form class="sgbox" id="sgForm" novalidate><button type="button" class="mb mclose sgx" id="sgClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button><h2 id="sgT">Suggest a game</h2><p class="sgsub">Know a browser port we should add? Send it over and we\'ll check it out.</p>'+
  '<div class="f"><label for="sgName">Game name</label><input id="sgName" name="name" required maxlength="120" autocomplete="off"><div class="err">Please enter the game\'s name.</div></div>'+
  '<div class="f"><label for="sgUrl">Link to play it</label><input id="sgUrl" name="url" type="url" required placeholder="https://" maxlength="500"><div class="err">Please enter a full link starting with https://</div></div>'+
  '<div class="f"><label for="sgNote">Note <em>(optional)</em></label><textarea id="sgNote" name="note" maxlength="1000"></textarea></div>'+
  '<div class="f"><label for="sgEmail">Your email <em>(optional, only if you want a reply)</em></label><input id="sgEmail" name="email" type="email" maxlength="200" autocomplete="email"><div class="err">That email doesn\'t look right.</div></div>'+
  '<div class="hp" aria-hidden="true"><label>Leave this empty<input name="_honey" id="sgHoney" tabindex="-1" autocomplete="off"></label></div>'+
  '<div class="acts"><button type="submit" class="btn" id="sgSend"><span>Send suggestion</span></button><button type="button" class="mb" id="sgCancel">Cancel</button></div><div class="msg" id="sgMsg" role="status" aria-live="polite"></div></form>';
  document.body.appendChild(sg);
  var close=function(){sg.classList.remove('open');document.documentElement.style.overflow='';if(sgLast&&sgLast.focus)sgLast.focus()};
  $('sgClose').addEventListener('click',close);$('sgCancel').addEventListener('click',close);
  sg.addEventListener('click',function(e){if(e.target===sg)close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&sg.classList.contains('open'))close()});
  $('sgForm').addEventListener('input',function(e){var f=e.target.closest('.f');if(f&&e.target.checkValidity())f.classList.remove('bad')});
  $('sgForm').addEventListener('submit',function(e){
   e.preventDefault();var bad=null;['sgName','sgUrl','sgEmail'].forEach(function(id){var el=$(id),v=el.value.trim();var ok=el.checkValidity()&&(id!=='sgUrl'||/^https?:\/\/\S+\.\S+/.test(v))&&(id!=='sgName'||v.length>0);el.closest('.f').classList.toggle('bad',!ok);if(!ok&&!bad)bad=el});
   if(bad){bad.focus();$('sgMsg').className='msg';$('sgMsg').textContent='Please fix the highlighted fields.';return}
   var d={name:$('sgName').value.trim(),url:$('sgUrl').value.trim(),note:$('sgNote').value.trim(),email:$('sgEmail').value.trim(),_subject:'GhostGames suggestion',_honey:$('sgHoney').value,_template:'table',_captcha:'false'};
   var btn=$('sgSend');btn.disabled=true;$('sgMsg').className='msg';$('sgMsg').textContent='Sending…';
   fetch(FS,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(d)}).then(function(r){return r.json().then(function(j){if(!r.ok||String(j.success)!=='true')throw 0;return j})})
   .then(function(){$('sgMsg').className='msg ok';$('sgMsg').textContent='Thanks! Your suggestion was sent.';$('sgForm').reset()})
   .catch(function(){$('sgMsg').className='msg';$('sgMsg').innerHTML='Couldn\'t send right now. <a href="'+esc(mailto(d))+'">Email it instead</a>.'})
   .then(function(){btn.disabled=false});
  });
 }
 sgLast=document.activeElement;sg.classList.add('open');document.documentElement.style.overflow='hidden';$('sgName').focus();
}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-suggest]');if(t){e.preventDefault();openSuggest()}});

function stars(a,b){function f(el,n,blur,a0,a1){if(!el)return;var s=[];for(var i=0;i<n;i++){s.push((Math.random()*100).toFixed(2)+'vw '+(Math.random()*100).toFixed(2)+'vh '+blur+'px 0 rgba(255,255,255,'+(a0+Math.random()*(a1-a0)).toFixed(3)+')')}el.style.boxShadow=s.join(',')}f(a,150,0,.05,.30);f(b,18,1.2,.35,.70)}
function burger(nav,btn){function close(){nav.classList.remove('open');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Open menu')}
 btn.addEventListener('click',function(e){e.stopPropagation();var o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o?'true':'false');btn.setAttribute('aria-label',o?'Close menu':'Open menu')});
 document.addEventListener('click',function(e){if(nav.classList.contains('open')&&!nav.contains(e.target))close()});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){close();btn.focus()}});
 window.addEventListener('resize',function(){if(innerWidth>1080)close()});return close}


/* ---- shared counters: plays + thumbs up/down via Abacus (free, no account, CORS; 30 req / 10 s per visitor IP).
   Values are cached in localStorage for 20 min and fetched through a throttled queue. ---- */
var CNT='https://abacus.jasoncameron.dev',NS='ghostgames-gfz',CTTL=20*60000,cq=[],cBusy=0,cWin=[],cPend={};
function cAll(){return get('gg:cnt',{})}
function cnt(k){var c=cAll()[k];return c?c.v:null}
function cSet(k,v){var a=cAll();a[k]={v:v,t:Date.now()};set('gg:cnt',a);document.dispatchEvent(new CustomEvent('gg:cnt',{detail:{k:k,v:v}}))}
function cPump(){
 if(!cq.length||cBusy>=4)return;var now=Date.now();cWin=cWin.filter(function(t){return now-t<10500});
 if(cWin.length>=24){clearTimeout(cPump.t);cPump.t=setTimeout(cPump,10600-(now-cWin[0]));return}
 var j=cq.shift();cWin.push(now);cBusy++;
 fetch(CNT+'/'+j.op+'/'+NS+'/'+j.k,{cache:'no-store',credentials:'omit'}).then(function(r){if(r.status===404)return{value:0};if(r.status===429)throw 'rl';if(!r.ok)throw 0;return r.json()})
 .then(function(d){var v=+d.value||0;cSet(j.k,v);if(j.cb)j.cb(v)})
 .catch(function(e){if(e==='rl'&&!j.r){j.r=1;cq.unshift(j);for(var i=0;i<24;i++)cWin.push(Date.now())}else if(j.cb)j.cb(null)})
 .then(function(){cBusy--;delete cPend[j.op+j.k];cPump()});
 cPump()}
function cReq(op,k,cb,front){if(cPend[op+k]&&op==='get')return;cPend[op+k]=1;var j={op:op,k:k,cb:cb};if(front)cq.unshift(j);else cq.push(j);cPump()}
/* request plays/up/down for a list of games (skips fresh cache and offline games). Plays first, then ratings. */
function need(list,what){var a=cAll(),now=Date.now();(what||['p','u','d']).forEach(function(w){(list||GAMES).forEach(function(g){if(!g||g.off)return;var k=w+'-'+g.id,c=a[k];if(!c||now-c.t>CTTL)cReq('get',k)})})}
function fmt(n){return n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':n>=1e4?Math.round(n/1e3)+'k':n>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,'')+'k':String(n)}
function pcount(id){return cnt('p-'+id)}
function score(id){var u=cnt('u-'+id)||0,d=cnt('d-'+id)||0;return (u+1)/(u+d+2)+u*1e-6}
function psHtml(id){var p=cnt('p-'+id),u=cnt('u-'+id);if(p==null&&u==null)return '';
 return (p!=null?'<span title="Plays on GhostGames (all visitors)"><i class="fa-solid fa-play" aria-hidden="true"></i>'+fmt(p)+' '+(p===1?'play':'plays')+'</span>':'')+(u?'<span title="Thumbs up"><i class="fa-solid fa-thumbs-up" aria-hidden="true"></i>'+fmt(u)+'</span>':'')}
function hitPlay(id){var h=get('gg:hitT',{});if(h[id]&&Date.now()-h[id]<30*60000)return;h[id]=Date.now();set('gg:hitT',h);cReq('hit','p-'+id,null,true)}
/* ratings: one vote per game per device (localStorage); counters are shared */
function myVote(id){return get('gg:votes',{})[id]||null}
function vote(id,dir){if(!BY[id]||myVote(id)||(dir!=='u'&&dir!=='d'))return false;var v=get('gg:votes',{});v[id]=dir;set('gg:votes',v);
 var k=dir+'-'+id;cSet(k,(cnt(k)||0)+1);cReq('hit',k,null,true);toast(dir==='u'?'Thanks! Thumbs up recorded.':'Thanks for the feedback.');return true}
function rateHtml(id,cls){var m=myVote(id),u=cnt('u-'+id),d=cnt('d-'+id);
 function b(dir,ic,lbl,n){var on=m===dir;return '<button type="button" class="mb ggv'+(on?' on':'')+'" data-vote="'+dir+'" data-vid="'+id+'" aria-pressed="'+on+'"'+(m?' disabled':'')+' aria-label="'+lbl+(n!=null?' ('+n+')':'')+'" title="'+(m?(on?'You rated this':'You already rated this'):lbl)+'"><i class="fa-'+(on?'solid':'regular')+' '+ic+'" aria-hidden="true"></i><span>'+(n!=null?fmt(n):'')+'</span></button>'}
 return '<span class="ggrate '+(cls||'')+'" data-rate="'+id+'">'+b('u','fa-thumbs-up','Thumbs up',u)+b('d','fa-thumbs-down','Thumbs down',d)+'</span>'}
function syncCounts(id){Array.prototype.forEach.call(document.querySelectorAll('[data-ps="'+id+'"]'),function(el){el.innerHTML=psHtml(id)});
 Array.prototype.forEach.call(document.querySelectorAll('[data-rate="'+id+'"]'),function(el){var t=document.createElement('div');t.innerHTML=rateHtml(id,el.className.replace('ggrate','').trim());el.innerHTML=t.firstChild.innerHTML})}
document.addEventListener('gg:cnt',function(e){var id=e.detail.k.slice(2);if(BY[id])syncCounts(id)});
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-vote]');if(!b)return;e.preventDefault();e.stopPropagation();vote(b.getAttribute('data-vid'),b.getAttribute('data-vote'))},true);

/* ---- toast ---- */
var toastEl=null,toastT=0;
function toast(msg){if(!toastEl){toastEl=document.createElement('div');toastEl.className='ggtoast';toastEl.setAttribute('role','status');toastEl.setAttribute('aria-live','polite');document.body.appendChild(toastEl)}
 toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('show')},3600)}

/* ---- game of the day: deterministic per UTC date among online, embeddable games ---- */
function gotdPool(mob){if(mob==null)mob=isMob();return GAMES.filter(function(g){return !g.off&&g.status!=='issues'&&!g.external&&!g.page&&g.id!=='retro-player'&&(!mob||(g.devices||[]).indexOf('mobile')>=0)}).sort(function(a,b){return a.id<b.id?-1:1})}
function gotd(d){d=d||new Date();var day=Math.floor(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())/864e5),x=(day*2654435761)>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x=(x^(x>>>13))>>>0;var p=gotdPool();return p.length?p[x%p.length]:null}

/* ---- report a broken game (FormSubmit AJAX, same inbox as Suggest a game) ---- */
var rp=null,rpG=null,rpLast=null;
function devInfo(){var ua=navigator.userAgent,os=/Windows/.test(ua)?'Windows':/Android/.test(ua)?'Android':/iPhone|iPad|iPod/.test(ua)?'iOS':/Mac OS X/.test(ua)?'macOS':/CrOS/.test(ua)?'ChromeOS':/Linux/.test(ua)?'Linux':'Other';
 var br=/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Other';
 return {browser:br,os:os,device:(isMob()?'Mobile/touch':'Desktop')+', '+innerWidth+'x'+innerHeight+' @'+(window.devicePixelRatio||1)+'x',ua:ua}}
function absUrl(u){try{return new URL(u,location.href).href}catch(e){return u}}
function openReport(id){var g=BY[id];if(!g)return;rpG=g;
 if(!rp){rp=document.createElement('div');rp.className='modal sg';rp.id='report';rp.setAttribute('role','dialog');rp.setAttribute('aria-modal','true');rp.setAttribute('aria-labelledby','rpT');
  rp.innerHTML='<form class="sgbox" id="rpForm" novalidate><button type="button" class="mb mclose sgx" id="rpClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button><h2 id="rpT">Report a broken game</h2><p class="sgsub" id="rpSub"></p>'+
  '<div class="f"><label for="rpNote">What happened? <em>(optional)</em></label><textarea id="rpNote" maxlength="1000" placeholder="e.g. stuck on loading, black screen, controls don\'t work"></textarea></div>'+
  '<p class="sgsub" style="margin:4px 0 0;font-size:11.5px">We\'ll also send the game, page link and your browser/device so we can reproduce it. Nothing else.</p>'+
  '<div class="hp" aria-hidden="true"><label>Leave this empty<input id="rpHoney" tabindex="-1" autocomplete="off"></label></div>'+
  '<div class="acts"><button type="submit" class="btn" id="rpSend"><span>Send report</span></button><button type="button" class="mb" id="rpCancel">Cancel</button></div><div class="msg" id="rpMsg" role="status" aria-live="polite"></div></form>';
  document.body.appendChild(rp);
  var close=function(){rp.classList.remove('open');if(!(modal&&modal.classList.contains('open')))document.documentElement.style.overflow='';if(rpLast&&rpLast.focus)rpLast.focus()};rp._close=close;
  $('rpClose').addEventListener('click',close);$('rpCancel').addEventListener('click',close);rp.addEventListener('click',function(e){if(e.target===rp)close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&rp.classList.contains('open')){e.stopImmediatePropagation();close()}},true);
  $('rpForm').addEventListener('submit',function(e){e.preventDefault();var g=rpG,di=devInfo();
   var d={_subject:'GhostGames broken game report: '+g.title,game:g.title,game_id:g.id,game_url:absUrl(g.url),page:location.href,browser:di.browser+' on '+di.os,device:di.device,user_agent:di.ua,note:$('rpNote').value.trim()||'(none)',_honey:$('rpHoney').value,_template:'table',_captcha:'false'};
   var btn=$('rpSend');btn.disabled=true;$('rpMsg').className='msg';$('rpMsg').textContent='Sending…';
   fetch(FS,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(d)}).then(function(r){return r.json().then(function(j){if(!r.ok||String(j.success)!=='true')throw 0;return j})})
   .then(function(){$('rpForm').reset();$('rpMsg').textContent='';close();toast('Thanks! Report sent for '+g.title+'.')})
   .catch(function(){var mt='mailto:zanebarker1331@gmail.com?subject='+encodeURIComponent(d._subject)+'&body='+encodeURIComponent('Game: '+d.game+' ('+d.game_id+')\nGame URL: '+d.game_url+'\nPage: '+d.page+'\nBrowser: '+d.browser+'\nDevice: '+d.device+'\nNote: '+d.note);$('rpMsg').className='msg';$('rpMsg').innerHTML='Couldn\'t send right now. <a href="'+esc(mt)+'">Email it instead</a>.'})
   .then(function(){btn.disabled=false})});
 }
 $('rpSub').innerHTML='Tell us what\'s wrong with <b style="color:#fff">'+esc(g.title)+'</b> and we\'ll check it.';$('rpMsg').textContent='';
 rpLast=document.activeElement;rp.classList.add('open');document.documentElement.style.overflow='hidden';$('rpNote').focus()}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-report]');if(t){e.preventDefault();e.stopPropagation();openReport(t.getAttribute('data-report'))}},true);

/* ---- installable app: service worker (site shell + covers only) and an unobtrusive Install button ---- */
var dock=null;function getDock(){if(!dock){dock=document.createElement('div');dock.className='ggdock';document.body.appendChild(dock)}return dock}
if('serviceWorker' in navigator&&window.isSecureContext&&location.pathname.indexOf(new URL(BASE).pathname+'play/')!==0){
 window.addEventListener('load',function(){navigator.serviceWorker.register(BASE+'sw.js',{scope:BASE}).catch(function(){})})}
var deferredInstall=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;if(get('gg:noinstall',0)||document.getElementById('ggInst'))return;
 var w=document.createElement('div');w.className='gginst';w.id='ggInst';w.innerHTML='<button type="button" class="ggib"><i class="fa-solid fa-download" aria-hidden="true"></i>Install app</button><button type="button" class="ggix" aria-label="Hide install button"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
 getDock().insertBefore(w,getDock().firstChild);
 w.querySelector('.ggib').addEventListener('click',function(){if(!deferredInstall)return;deferredInstall.prompt();deferredInstall.userChoice.then(function(c){if(c&&c.outcome==='accepted')w.remove();deferredInstall=null})});
 w.querySelector('.ggix').addEventListener('click',function(){set('gg:noinstall',1);w.remove()})});
window.addEventListener('appinstalled',function(){var w=document.getElementById('ggInst');if(w)w.remove();toast('GhostGames installed.')});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){discord();syncPulse()});else discord();
(window.requestAnimationFrame||setTimeout)(syncPulse);
window.GG={BASE:BASE,GAMES:GAMES,BY:BY,esc:esc,RM:RM,recent:recent,record:record,plays:plays,favs:favs,isFav:isFav,toggleFav:toggleFav,heart:heart,
 probe:probe,stHtml:stHtml,applyStatus:applyStatus,card:card,bindCards:bindCards,openGame:openGame,closeGame:closeGame,openSuggest:openSuggest,stars:stars,burger:burger,DISCORD:DISCORD,helpHtml:helpHtml,
 need:need,cnt:cnt,pcount:pcount,score:score,psHtml:psHtml,rateHtml:rateHtml,vote:vote,myVote:myVote,fmt:fmt,toast:toast,gotd:gotd,gotdPool:gotdPool,openReport:openReport,getDock:getDock,imgAttrs:imgAttrs,padHtml:padHtml,sm:sm};
})();
