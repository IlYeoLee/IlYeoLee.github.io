#!/usr/bin/env python3
"""Collect Korean text blocks (index.html + projects.html) into i18n.json: key = normalized text, value = English innerHTML.
Run after any content change; new keys are added with "" -> fill them. Stale keys are removed."""
import re, json, os, html
HERE=os.path.dirname(os.path.abspath(__file__))
KO=re.compile(r'[가-힣]')
SEL=[r'<p class="pt">(.*?)</p>', r'<p class="pb">(.*?)</p>', r'<p class="desc">(.*?)</p>', r'<p class="plabel">(.*?)</p>',
     r'<div class="ptext">(.*?)</div>', r'<div class="meta">\s*<p>(.*?)</p>\s*<p>(.*?)</p>', r'<p data-en="[^"]*" data-ko="([^"]*)"']
def norm(inner):  # same as runtime: textContent, collapse whitespace
    t=re.sub(r'<br\s*/?>',' ',inner); t=re.sub(r'<[^>]+>','',t); t=html.unescape(t)
    return ' '.join(t.split())
def collect(h):
    keys=[]
    for pat in SEL:
        for m in re.finditer(pat, h, re.S):
            for g in m.groups():
                if g and KO.search(g):
                    k=norm(g)
                    if k and k not in keys: keys.append(k)
    return keys
idx=open(os.path.join(HERE,'index.html')).read(); prj=open(os.path.join(HERE,'projects.html')).read()
keys=[]
for k in collect(idx)+collect(prj):
    if k not in keys: keys.append(k)
path=os.path.join(HERE,'i18n.json'); d=json.load(open(path)) if os.path.exists(path) else {}
added=[k for k in keys if k not in d]
for k in added: d[k]=""
d={k:v for k,v in d.items() if k in keys}
json.dump(d, open(path,'w'), ensure_ascii=False, indent=1)
missing=[k for k,v in d.items() if not v]
print(f'{len(keys)} korean blocks, {len(added)} new, {len(missing)} untranslated'); [print(' -', k[:80]) for k in missing]
