/* GhostGames pre-rendered game pages (g/<id>/): premium side menu + login button, Play wiring.
   Play uses the shared GG.openGame() so embed / new tab / new-tab prompt / own-page games behave exactly
   like everywhere else; the Play link's href is only the no-JS fallback. */
(function(){
'use strict';
var GG=window.GG;if(!GG)return;
var $=function(id){return document.getElementById(id)};
var id=document.body.getAttribute('data-game'),g=GG.BY[id];
function mod(e){return e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey}
function play(e){if(!g||g.off){if(e)e.preventDefault();return}if(e){if(mod(e))return;e.preventDefault()}GG.openGame(g)}
if(g){
 var p=$('dPlay');if(p)p.addEventListener('click',play);
 var c=$('dCover');if(c&&!g.off){c.setAttribute('role','button');c.setAttribute('tabindex','0');c.setAttribute('aria-label','Play '+g.title);c.addEventListener('click',function(){play()});c.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();play()}})}
 [].forEach.call(document.querySelectorAll('.gmode'),function(b){b.addEventListener('click',function(e){if(mod(e))return;e.preventDefault();GG.openGame(Object.assign({},g,{url:b.getAttribute('data-url')}))})});
 var t=$('trouble');if(t&&GG.helpHtml){t.innerHTML='<h2><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i>Game not loading?</h2>'+GG.helpHtml(g,false)}
}
GG.syncHearts();
document.addEventListener('gg:fav',function(){GG.syncHearts()});
var nav=$('nav');function onScroll(){if(nav)nav.classList.toggle('scrolled',scrollY>12)}window.addEventListener('scroll',onScroll,{passive:true});onScroll();
/* "Play now" stub used by the side menu */
var np=$('navPlay');if(np)np.addEventListener('click',function(e){e.preventDefault();if(g&&!g.off)play();else location.href=GG.BASE+'games/'});

/* premium side menu (same behaviour as home/) */
(function(){
 var btn=$('ggMenuBtn'),side=$('ggSide');if(!btn||!side)return;
 function open(){side.hidden=false;requestAnimationFrame(function(){side.classList.add('open')});btn.setAttribute('aria-expanded','true');document.documentElement.style.overflow='hidden'}
 function close(){side.classList.remove('open');btn.setAttribute('aria-expanded','false');document.documentElement.style.overflow='';setTimeout(function(){if(!side.classList.contains('open'))side.hidden=true},320)}
 btn.addEventListener('click',function(e){e.stopPropagation();side.classList.contains('open')?close():open()});
 side.addEventListener('click',function(e){if(e.target.getAttribute('data-close')||e.target.closest('#ggSideX'))close();if(e.target.closest('[data-suggest],[data-profile]'))close()});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&side.classList.contains('open'))close()});
 var gd=$('ggSideGotd');if(gd)gd.addEventListener('click',function(){close();var x=GG.gotd&&GG.gotd();if(x)GG.openGame(x)});
 var sp=$('ggSidePlay');if(sp)sp.addEventListener('click',function(){close();if(np)np.click()});
 var gBtn=$('ggGenreBtn'),gDrop=$('ggGenreDrop');
 if(gBtn&&gDrop)gBtn.addEventListener('click',function(){var on=gBtn.getAttribute('aria-expanded')==='true';gBtn.setAttribute('aria-expanded',on?'false':'true');
  if(on){gDrop.classList.remove('open');setTimeout(function(){if(gBtn.getAttribute('aria-expanded')!=='true')gDrop.hidden=true},340)}else{gDrop.hidden=false;requestAnimationFrame(function(){gDrop.classList.add('open')})}});
 var hp=$('ggSideHelp');if(hp)hp.addEventListener('click',function(){close();var t=$('trouble');if(t)t.scrollIntoView({behavior:GG.RM?'auto':'smooth',block:'start'})});
 var sl=$('ggSideLogin');if(sl)sl.addEventListener('click',function(){close();GG.accountClick&&GG.accountClick()});
})();
var nl=$('navLogin');if(nl)nl.addEventListener('click',function(){GG.accountClick&&GG.accountClick()});
})();
