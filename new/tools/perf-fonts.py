#!/usr/bin/env python3
"""One-off perf patch (kept for reference / re-run safe): self-host Poppins + Font Awesome and add a
metric-matched fallback face (PoppinsFB) so the font swap doesn't shift layout."""
import re,os
GG=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF=open(os.path.join(GG,'vendor/fonts/fontface.tpl.css')).read()  # @font-face rules; __B__ = path to ghostgames/
pages={'home/index.html':'../','games/index.html':'../','game/index.html':'../','retro/index.html':'../','privacy/index.html':'../','index.html':''}
for f,b in pages.items():
    p=os.path.join(GG,f);s=open(p).read();o=s
    head_fonts='<link rel="preload" href="%svendor/fonts/poppins-400.woff2" as="font" type="font/woff2" crossorigin>'%b
    if f in('home/index.html','index.html'):head_fonts+='<link rel="preload" href="%svendor/fonts/poppins-900.woff2" as="font" type="font/woff2" crossorigin>'%b
    style='<style id="ggfonts">'+FF.replace('__B__',b)+'</style>'
    if 'id="ggfonts"' not in s:
        m=re.search(r'<link href="https://fonts\.googleapis\.com/css2\?family=Poppins[^"]*" rel="stylesheet">',s)
        if m:
            url=m.group(0)
            keep=''
            if 'Playfair' in url and f=='index.html':
                keep='<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">'
            s=s.replace(url,head_fonts+style+keep)
            if not keep:
                s=s.replace('<link rel="preconnect" href="https://fonts.googleapis.com">\n','').replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n','')
        else:
            # no Google Fonts link (privacy page): just add the faces after <meta charset>
            s=s.replace('<meta charset="utf-8">','<meta charset="utf-8">'+style,1)
    s=s.replace('href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer"','href="%svendor/fa/css/fa-subset.min.css"'%b)
    s=re.sub(r'Poppins,(?!PoppinsFB)','Poppins,PoppinsFB,',s);s=re.sub(r'Poppins;','Poppins,PoppinsFB;',s)
    if s!=o:open(p,'w').write(s);print('patched',f)
for f in ['gg-site.css','gg-common.js','gg-auth.js','gg-online.js']:
    p=os.path.join(GG,f);s=open(p).read();o=s
    s=re.sub(r'Poppins,(?!PoppinsFB)','Poppins,PoppinsFB,',s)
    if s!=o:open(p,'w').write(s);print('patched',f)
