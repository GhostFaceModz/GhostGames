#!/usr/bin/env node
/* GhostGames static page builder.
   Re-run whenever gg-data.js (or the premium header in home/index.html) changes:
     node ghostgames/tools/build-pages.mjs
   Generates:
     ghostgames/g/<id>/index.html  one pre-rendered, SEO-friendly page per game (premium styling/top bar)
     sitemap.xml + robots.txt      at the repo root (= https://ghostgames.app/), offline games excluded
   The premium header, side menu, footer and base CSS are copied out of home/index.html so the game pages
   always match the premium home. Play buttons use the normal GG.openGame() behaviour at runtime
   (embedded player / new tab / new-tab prompt / own page), with a plain link as the no-JS fallback. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GG = path.resolve(HERE, '..');            // ghostgames/
const REPO = path.resolve(GG, '..');            // repo root, served at https://ghostgames.app/
const ORIGIN = 'https://ghostgames.app';
const SITE = ORIGIN + '/ghostgames/';
/* self-hosted Poppins (+ metric-matched PoppinsFB fallback) and Font Awesome: no third-party render-blocking CSS */
const FONTFACE = fs.readFileSync(path.join(GG, 'vendor/fonts/fontface.tpl.css'), 'utf8');

/* ---------- data ---------- */
const ctx = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(GG, 'gg-data.js'), 'utf8'), ctx);
const GAMES = ctx.window.GG_GAMES;
if (!Array.isArray(GAMES) || !GAMES.length) throw new Error('gg-data.js: no GG_GAMES');
const BY = Object.fromEntries(GAMES.map(g => [g.id, g]));
const off = g => g.status === 'offline';

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clip = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const t = s.slice(0, n - 1); return t.slice(0, t.lastIndexOf(' ')).replace(/[,;:.\-–—]+$/, '') + '…'; };
const firstSentence = s => (String(s).match(/^.*?[.!?](\s|$)/) || [s])[0].trim();
const dev = g => (g.devices || ['pc']);
const mobile = g => dev(g).includes('mobile');
const LABEL = {'Classic Shooter': 'Classics'};
const catLabel = c => LABEL[c] || c;
const pageUrl = g => SITE + 'g/' + g.id + '/';
const coverAbs = g => SITE + 'covers/' + g.id + '.webp';
const hasSm = g => fs.existsSync(path.join(GG, 'covers/sm', g.id + '.webp'));

/* generic controls by category, used only when a game has none in gg-data.js (kept deliberately generic) */
const GENERIC = {
  'Zombies': [['W A S D', 'Move'], ['Mouse', 'Aim / look'], ['Left click', 'Shoot'], ['Esc', 'Pause / release mouse']],
  'FPS': [['W A S D', 'Move'], ['Mouse', 'Aim / look'], ['Left click', 'Shoot'], ['Space', 'Jump'], ['Esc', 'Menu / release mouse']],
  'Classic Shooter': [['W A S D', 'Move'], ['Mouse', 'Aim / look'], ['Left click', 'Shoot'], ['Esc', 'Menu / release mouse']],
  'Open World': [['W A S D', 'Move'], ['Mouse', 'Look'], ['Esc', 'Pause / menu']],
  'Retro': [['Arrow keys', 'D-pad'], ['Enter', 'Start'], ['Z / X', 'Face buttons'], ['Esc', 'Menu']],
  'Strategy': [['Left click', 'Select / command'], ['Right click', 'Context action'], ['Esc', 'Menu']],
  'Co-op': [['W A S D', 'Move'], ['Mouse', 'Look / interact'], ['Esc', 'Menu']],
  '_': [['Mouse / keyboard', 'Follow the in-game prompts'], ['Esc', 'Menu / release mouse']]
};
const controlsFor = g => (g.controls && g.controls.length) ? g.controls : (GENERIC[g.category] || GENERIC._);

function playMode(g) {
  const t = (g.tags || []).map(x => x.toLowerCase()); const m = [];
  if (t.some(x => /single/.test(x))) m.push('SinglePlayer');
  if (t.some(x => /multi/.test(x))) m.push('MultiPlayer');
  if (t.some(x => /co-?op/.test(x)) || g.category === 'Co-op') m.push('CoOp');
  return m.length ? m : undefined;
}
function howPlays(g) {
  if (off(g)) return 'Unavailable right now';
  if (g.external) return 'Opens in a new tab';
  if (g.newTabPrompt) return 'Plays best in its own tab';
  if (g.page) return 'GhostGames full-page player';
  return 'Embedded GhostGames player';
}
function statusInfo(g) {
  if (off(g)) return {k: 'off', l: 'Down'};
  if (g.status === 'issues') return {k: 'iss', l: 'Issues'};
  return {k: 'on', l: 'Online'};
}
function similar(g, n = 8) {
  const live = GAMES.filter(x => x !== g && !off(x));
  const shared = x => (x.tags || []).filter(t => (g.tags || []).includes(t)).length;
  const same = live.filter(x => x.category === g.category).sort((a, b) => shared(b) - shared(a) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.order || 0) - (b.order || 0));
  const rest = live.filter(x => x.category !== g.category && shared(x) > 0).sort((a, b) => shared(b) - shared(a) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.order || 0) - (b.order || 0));
  return same.concat(rest).slice(0, n);
}

/* ---------- premium chrome lifted from home/index.html ---------- */
const HOME = fs.readFileSync(path.join(GG, 'home/index.html'), 'utf8');
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('marker not found: ' + a + ' … ' + b); return s.slice(i, j); };
const rel2 = s => s.replace(/(href|src)="\.\/"/g, '$1="../../home/"').replace(/(href|src)="\.\.\//g, '$1="../../');
let baseCss = cut(HOME, '<style>', '</style>').slice(7);
baseCss = baseCss.replace(/\/\* loader \*\/[\s\S]*?(?=\/\* sticky glass nav \*\/)/, '');
const HEADER = rel2(cut(HOME, '<header class="nav" id="nav">', '<section class="hero"'));
const FOOTER = rel2(cut(HOME, '<div class="footwrap">', '<script src="../gg-data.js">'));

const PAGE_CSS = `
body{background:radial-gradient(1200px 600px at 75% -10%,rgba(40,160,210,.13),transparent 60%),#05070c}
.gp{width:100%;max-width:1240px;margin:0 auto;padding:0 4% 24px}
.crumb{display:flex;align-items:center;gap:8px;font-size:13px;color:#7e8796;padding:26px 0 20px;flex-wrap:wrap}
.crumb a{color:#a9aeb5;display:inline-flex;align-items:center;min-height:32px}.crumb a:hover{color:#fff}
.dh{display:grid;grid-template-columns:minmax(240px,340px) 1fr;gap:44px;align-items:start}
.dcover{position:relative;aspect-ratio:3/4;border-radius:22px;overflow:hidden;background:linear-gradient(160deg,var(--c1),var(--c2));box-shadow:0 30px 70px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.12);margin:0;cursor:pointer}
.dcover.off{cursor:default;filter:grayscale(.85) brightness(.6)}
.dcover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform 4.5s ease}
.dcover:not(.off):hover img{transform:scale(1.08)}
.dcover .vig{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 60%,rgba(0,0,0,.55));pointer-events:none}
.dinfo .kick{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pill{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#7fdcf2}
.pill.w{color:#0c0f16;background:rgba(255,255,255,.92);border-color:transparent;letter-spacing:.06em}
.pill.dv{color:#c4cad6;letter-spacing:.04em}.pill i{color:#5fe3ff}
.pill.st i{width:7px;height:7px;border-radius:50%;background:#22c55e}.pill.st.iss i{background:#f59e0b}.pill.st.off i{background:#ef4444}.pill.st{color:#dfe5ee;letter-spacing:.04em}
.dinfo h1{margin:14px 0 10px;font-size:clamp(30px,4.4vw,56px);font-weight:900;letter-spacing:-.02em;line-height:1.05;text-shadow:0 8px 40px rgba(0,0,0,.55)}
.dinfo .lead{color:#c4cad6;font-size:16px;line-height:1.6;max-width:640px}
.down{margin-top:16px;padding:14px 16px;border-radius:14px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#fecaca;font-size:14px;line-height:1.55;max-width:640px}.down b{color:#fff}
.acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px;align-items:center}
.acts .play[aria-disabled="true"]{filter:grayscale(1) brightness(.7);cursor:not-allowed}
.acts .ggfav{width:48px;height:48px;border-radius:14px;font-size:17px}
.gmodes{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.gmodes .ghost-btn{height:42px;font-size:13px}.gmodes b{color:#5fe3ff}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:22px;max-width:640px}
.facts div{padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)}
.facts dt{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7e8796}.facts dd{margin-top:4px;font-size:13.5px;font-weight:600;color:#e9eef6}
.dtags{display:flex;gap:6px;flex-wrap:wrap;margin-top:18px}
.dtags a{min-height:32px;display:inline-flex;align-items:center;padding:0 12px;border-radius:999px;border:1px dashed rgba(255,255,255,.18);color:rgba(255,255,255,.82);font-size:12px;font-weight:500}.dtags a:hover{border-style:solid;border-color:rgba(95,227,255,.6);color:#fff}
.panels{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:44px}
.panel{padding:22px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01))}
.panel.wide{grid-column:1/-1}
.panel h2{font-size:15px;font-weight:700;margin-bottom:14px}.panel h2 i{color:#5fe3ff;margin-right:8px}
.panel p{color:#c3c8d0;font-size:14px;line-height:1.7}
.ctl{display:grid;grid-template-columns:auto 1fr;gap:10px 16px;align-items:center;font-size:13.5px;color:#c3c8d0}
kbd{display:inline-block;padding:5px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.16);border-bottom-width:2px;background:rgba(255,255,255,.05);font:600 12px Poppins,PoppinsFB,sans-serif;color:#fff;white-space:nowrap}
.tips{list-style:none;display:grid;gap:10px}.tips li{position:relative;padding-left:18px;font-size:13.5px;line-height:1.6;color:#c3c8d0}.tips li::before{content:"";position:absolute;left:2px;top:9px;width:6px;height:6px;border-radius:50%;background:#5fe3ff;box-shadow:0 0 8px rgba(95,227,255,.6)}
.note{font-size:12px;color:#7e8796;margin-top:12px}
.dshot{margin:18px 0 0;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.1);background:#000}.dshot img{display:block;width:100%;height:auto;max-height:560px;object-fit:contain;background:#000}.dshot figcaption{padding:10px 16px;font-size:12px;color:#7e8796;background:rgba(10,14,22,.9)}
.more{margin-top:44px}.more .shelf-head,.more .rail{padding-left:0;padding-right:0}
.more .shelf-head a{min-height:32px;display:inline-flex;align-items:center}
.gp .footwrap{padding:0}
@media (max-width:900px){.dh{grid-template-columns:1fr;gap:24px}.dcover{max-width:300px;width:100%;margin:0 auto}.panels{grid-template-columns:1fr}}
@media (max-width:700px){.gp{padding:0 16px 16px}.crumb{padding:16px 0 14px}.dcover{max-width:220px}.dinfo h1{font-size:30px}.acts .play{flex:1 1 auto;justify-content:center}.panel{padding:18px}.facts{grid-template-columns:1fr 1fr}}
`;

/* ---------- page ---------- */
function page(g) {
  const st = statusInfo(g), isOff = off(g), canon = pageUrl(g);
  const shortTitle = g.title.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const title = isOff ? `${g.title} is currently down | GhostGames` : `Play ${g.title} free in your browser | GhostGames`;
  const desc = clip(isOff
    ? `${g.title} on GhostGames is currently down. ${g.blurb || firstSentence(g.description)} Browse similar browser games that work right now.`
    : `${g.blurb || ''} ${firstSentence(g.description)} Play ${shortTitle} free in your browser on GhostGames, no installs.`.replace(/\s+/g, ' ').trim(), 158);
  const plat = mobile(g) ? 'PC and mobile' : 'PC (keyboard and mouse)';
  const sim = similar(g);
  const BASE = '../../';
  const local = /^\//.test(g.url);
  const playLbl = isOff ? 'Currently down' : g.external ? 'Play in new tab' : 'Play now';
  const playIco = isOff ? 'fa-power-off' : g.external ? 'fa-arrow-up-right-from-square' : 'fa-play';
  const playAttrs = isOff ? 'role="link" aria-disabled="true"' : `href="${esc(g.url)}"${local ? '' : ' target="_blank" rel="noopener nofollow"'}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'VideoGame', name: g.title, url: canon,
    description: g.description, image: coverAbs(g), genre: g.category, keywords: (g.tags || []).join(', '),
    gamePlatform: ['Web browser', 'PC'].concat(mobile(g) ? ['Mobile'] : []),
    applicationCategory: 'Game', operatingSystem: 'Any (runs in a web browser)', isAccessibleForFree: true,
    playMode: playMode(g),
    screenshot: g.screenshot ? SITE + g.screenshot.src : undefined,
    inLanguage: 'en'
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'GhostGames', item: SITE + 'home/'},
      {'@type': 'ListItem', position: 2, name: 'All games', item: SITE + 'games/'},
      {'@type': 'ListItem', position: 3, name: catLabel(g.category), item: SITE + 'games/?cat=' + encodeURIComponent(g.category)},
      {'@type': 'ListItem', position: 4, name: g.title, item: canon}]
  }];
  const imgSrcset = hasSm(g) ? ` srcset="${BASE}covers/sm/${g.id}.webp 192w, ${BASE}covers/${g.id}.webp 384w" sizes="(max-width:700px) 220px, 340px"` : '';
  const simCard = x => `<a class="pcard" href="../${x.id}/" data-id="${esc(x.id)}" aria-label="${esc(x.title)}"><div class="shot"><img src="${BASE}covers/${hasSm(x) ? 'sm/' : ''}${x.id}.webp" alt="" loading="lazy" decoding="async" width="${hasSm(x) ? 192 : 384}" height="${hasSm(x) ? 320 : 640}">${x.badge ? `<span class="chip">${esc(x.badge)}</span>` : ''}<div class="grad"></div><div class="info"><b>${esc(x.title)}</b><div class="dchips"><span>${esc(catLabel(x.category))}</span>${mobile(x) ? '<span>Mobile</span>' : '<span>PC</span>'}</div></div></div></a>`;
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="website"><meta property="og:site_name" content="GhostGames">
<meta property="og:title" content="${esc(isOff ? g.title + ' (currently down) | GhostGames' : g.title + ' | Play free in your browser')}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${coverAbs(g)}"><meta property="og:image:width" content="384"><meta property="og:image:height" content="640"><meta property="og:image:alt" content="${esc(g.title)} cover art">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(g.title)} | GhostGames"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${coverAbs(g)}">
<meta name="theme-color" content="#7c3aed">
<link rel="icon" type="image/png" sizes="192x192" href="${BASE}icons/icon-192.png"><link rel="manifest" href="${BASE}manifest.json"><link rel="apple-touch-icon" href="${BASE}icons/apple-touch-icon.png">
<link rel="preload" as="image" href="${BASE}covers/${g.id}.webp"${imgSrcset ? ` imagesrcset="${BASE}covers/sm/${g.id}.webp 192w, ${BASE}covers/${g.id}.webp 384w" imagesizes="(max-width:700px) 220px, 340px"` : ''} fetchpriority="high">
<link rel="preload" href="${BASE}vendor/fonts/poppins-400.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="${BASE}vendor/fonts/poppins-900.woff2" as="font" type="font/woff2" crossorigin>
<style id="ggfonts">${FONTFACE.replaceAll('__B__', BASE)}</style>
<link rel="stylesheet" href="${BASE}vendor/fa/css/all.min.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>${baseCss}${PAGE_CSS}</style>
</head>
<body data-game="${esc(g.id)}">
<a class="skip" href="#main">Skip to content</a>
${HEADER}
<main class="gp" id="main" tabindex="-1">
<nav class="crumb" aria-label="Breadcrumb"><a href="${BASE}home/">Home</a><span aria-hidden="true">/</span><a href="${BASE}games/">All games</a><span aria-hidden="true">/</span><a href="${BASE}games/?cat=${encodeURIComponent(g.category)}">${esc(catLabel(g.category))}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(g.title)}</span></nav>
<section class="dh">
<figure class="dcover${isOff ? ' off' : ''}" id="dCover" style="--c1:#1e293b;--c2:#05070c"><img src="${BASE}covers/${g.id}.webp"${imgSrcset} width="384" height="640" alt="${esc(g.title)} cover art" fetchpriority="high" decoding="async"><span class="vig"></span></figure>
<div class="dinfo">
<div class="kick"><span class="pill">${esc(g.category)}</span>${g.badge && !isOff ? `<span class="pill w">${esc(g.badge)}</span>` : ''}<span class="pill st ${st.k}" title="${esc(st.k === 'on' ? 'Online' : st.l + (g.note ? ': ' + g.note : ''))}"><i aria-hidden="true"></i>${st.l}</span><span class="pill dv"><i class="fa-solid fa-desktop" aria-hidden="true"></i>${mobile(g) ? '<i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>' : ''}${mobile(g) ? 'PC + Mobile' : 'PC only'}</span>${g.controller ? '<span class="pill dv"><i class="fa-solid fa-gamepad" aria-hidden="true"></i>Controller</span>' : ''}</div>
<h1>${esc(g.title)}</h1>
<p class="lead">${esc(g.blurb || firstSentence(g.description))}</p>
${isOff ? `<div class="down" role="status"><b>Currently down.</b> ${esc(g.note || 'The host is unavailable')}. We'll bring it back when a working link exists. Try one of the games below in the meantime.</div>` : ''}
<div class="acts"><a class="play" id="dPlay" ${playAttrs}><i class="fa-solid ${playIco}" aria-hidden="true"></i> ${playLbl}</a><button type="button" class="ggfav" data-fav="${esc(g.id)}" aria-pressed="false" aria-label="Add ${esc(g.title)} to favourites"><i class="fa-regular fa-heart" aria-hidden="true"></i></button>${!isOff && !g.external && !g.crop && !g.page ? `<a class="ghost-btn" href="${esc(g.url)}" target="_blank" rel="noopener nofollow"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open in new tab</a>` : ''}</div>
${g.modes && !isOff ? `<div class="gmodes" role="group" aria-label="Play options">${g.modes.map(m => `<a class="ghost-btn gmode" href="${esc(m.url)}" data-url="${esc(m.url)}"><i class="fa-solid ${esc(m.icon || 'fa-play')}" aria-hidden="true"></i><b>${esc(m.kick)}</b> ${esc(m.label)}</a>`).join('')}</div>` : ''}
<dl class="facts"><div><dt>Category</dt><dd>${esc(catLabel(g.category))}</dd></div><div><dt>Device</dt><dd>${esc(plat)}</dd></div><div><dt>Status</dt><dd>${st.l}${g.note && st.k !== 'on' ? '' : ''}</dd></div><div><dt>How it plays</dt><dd>${esc(howPlays(g))}</dd></div></dl>
<div class="dtags">${(g.tags || []).map(t => `<a href="${BASE}games/?tags=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>
</div>
</section>
<section class="panels">
<div class="panel wide"><h2><i class="fa-solid fa-circle-info" aria-hidden="true"></i>About ${esc(g.title)}</h2><p>${esc(g.description)}</p>${g.screenshot ? `<figure class="dshot"><img src="${BASE}${esc(g.screenshot.src)}" width="${g.screenshot.w}" height="${g.screenshot.h}" loading="lazy" decoding="async" alt="${esc(g.title)} screenshot"><figcaption>${esc(g.title)} running in the browser</figcaption></figure>` : ''}</div>
<div class="panel"><h2><i class="fa-solid fa-keyboard" aria-hidden="true"></i>Controls</h2><div class="ctl">${controlsFor(g).map(c => `<kbd>${esc(c[0])}</kbd><span>${esc(c[1])}</span>`).join('')}</div>${g.controls && g.controls.length ? '' : '<p class="note">General controls for this kind of game; check the in-game menu for exact bindings.</p>'}${g.controller ? '<p class="note"><i class="fa-solid fa-gamepad" aria-hidden="true"></i> Controllers are supported.</p>' : ''}${!mobile(g) ? '<p class="note">Needs a keyboard and mouse, so it won\'t play properly on phones or tablets.</p>' : ''}</div>
<div class="panel"><h2><i class="fa-solid fa-lightbulb" aria-hidden="true"></i>Tips</h2><ul class="tips">${(g.tips || []).map(t => `<li>${esc(t)}</li>`).join('') || '<li>Click inside the game to give it keyboard and mouse focus. Press Esc to release the mouse.</li>'}</ul></div>
<div class="panel wide" id="trouble"><h2><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i>Game not loading?</h2><ul class="tips"><li>Reload the game: a fresh start fixes most stuck loading screens.</li><li>Chrome or Edge on PC work best. Turn off ad blockers and privacy shields for this site.</li><li>Click inside the game to give it keyboard and mouse focus. Press Esc to release the mouse.</li></ul></div>
</section>
${sim.length ? `<section class="shelf more" aria-labelledby="moreH"><div class="shelf-head"><h2 id="moreH">More like this</h2><a href="${BASE}games/?cat=${encodeURIComponent(g.category)}">More ${esc(catLabel(g.category))}</a></div><div class="rail-wrap"><div class="rail">${sim.map(simCard).join('')}</div></div></section>` : ''}
${FOOTER.replace('<div class="footwrap">', '<div class="footwrap" style="margin-top:40px">')}
<script src="${BASE}gg-data.js" defer></script>
<script src="${BASE}gg-common.js" defer></script>
<script src="${BASE}gg-page.js" defer></script>
<script src="${BASE}gg-online.js" defer></script>
<script src="${BASE}gg-config.js" defer></script>
<script src="${BASE}gg-auth.js" defer></script>
</body>
</html>
`;
}

/* ---------- write ---------- */
const outDir = path.join(GG, 'g');
const keep = new Set(GAMES.map(g => g.id));
if (fs.existsSync(outDir)) for (const d of fs.readdirSync(outDir)) if (!keep.has(d)) fs.rmSync(path.join(outDir, d), {recursive: true, force: true});
for (const g of GAMES) {
  fs.mkdirSync(path.join(outDir, g.id), {recursive: true});
  fs.writeFileSync(path.join(outDir, g.id, 'index.html'), page(g));
}

/* sitemap: main pages + every game that isn't offline */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  [SITE, '1.0', 'daily'], [SITE + 'home/', '0.9', 'daily'], [SITE + 'games/', '0.9', 'daily'], [SITE + 'retro/', '0.5', 'monthly'], [SITE + 'privacy/', '0.2', 'yearly']
].concat(GAMES.filter(g => !off(g)).map(g => [pageUrl(g), g.featured ? '0.8' : '0.7', 'weekly']));
fs.writeFileSync(path.join(REPO, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p, c]) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>${c}</changefreq><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(REPO, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /ghostgames/shots/

Sitemap: ${ORIGIN}/sitemap.xml
`);
console.log(`built ${GAMES.length} game pages (${GAMES.filter(off).length} offline, kept out of sitemap); sitemap.xml has ${urls.length} URLs`);
