#!/usr/bin/env node
/* Builds vendor/fa/css/fa-subset.min.css: Font Awesome 6.4.0 core rules + only the icon classes that GhostGames
   actually references (scanned from every page/script and the icon fields in gg-data.js).
   Re-run after adding new icons:  node ghostgames/tools/fa-subset.mjs  (build-pages.mjs runs it too). */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const GG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FULL = fs.readFileSync(path.join(GG, 'vendor/fa/css/all.min.css'), 'utf8');
const used = new Set();
function scan(dir) {
  for (const f of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (!/^(vendor|shots|covers|screens|icons|node_modules|g)$/.test(f.name)) scan(p); continue; }
    if (!/\.(html|js|mjs)$/.test(f.name)) continue;
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/fa-[a-z0-9]+(?:-[a-z0-9]+)*/g)) used.add(m[0]);
  }
}
scan(GG);
let kept = 0, dropped = 0;
const out = FULL.replace(/((?:\.fa-[a-z0-9-]+:{1,2}before,?)+)\{content:"[^"]*"\}/g, (rule, sels) => {
  const keep = sels.split(',').filter(Boolean).filter(s => used.has(s.replace(/:{1,2}before$/, '').slice(1)));
  if (!keep.length) { dropped++; return ''; }
  kept++; return keep.join(',') + rule.slice(sels.length);
}).replace(/url\(\.\.\/webfonts\//g, 'url(__FA__');
fs.writeFileSync(path.join(GG, 'vendor/fa/css/fa-subset.tpl.css'), out);
fs.writeFileSync(path.join(GG, 'vendor/fa/css/fa-subset.min.css'), out.replace(/__FA__/g, '../webfonts/'));
console.log(`fa-subset: kept ${kept} icon rules, dropped ${dropped}; ${(out.length / 1024).toFixed(1)} KB (full ${(FULL.length / 1024).toFixed(1)} KB)`);
