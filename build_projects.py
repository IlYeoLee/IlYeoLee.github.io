#!/usr/bin/env python3
"""Scrape Adobe Portfolio project pages into local HTML fragments + images.
Usage: python3 build_projects.py   (writes projects.html, img/<slug>/*)"""
import re, html, os, sys, hashlib, urllib.request, subprocess, glob
from concurrent.futures import ThreadPoolExecutor

BASE = 'https://star1004da0036.myportfolio.com'
PROJECTS = [  # slug on myportfolio, local key
    ('hotcake', 'hotcake'), ('spurt', 'spurt'),
    ('spot-my-ballpark-seat-view-service', 'spot'), ('family-widget-service', 'bbibbi'),
]
HERE = os.path.dirname(os.path.abspath(__file__))

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=60).read()

def best(srcset, want=1920):
    """pick the <=want width url from a srcset string"""
    cands = re.findall(r'(https://cdn\.myportfolio\.com/\S+?)\s+(\d+)w', srcset)
    cands = [(int(w), u) for u, w in cands]
    ok = [c for c in cands if c[0] <= want] or cands
    return max(ok)[1] if ok else None

def clean_text(inner):
    t = re.sub(r'<script.*?</script>', '', inner, flags=re.S)
    t = re.sub(r'<span[^>]*data-class-network="bold"[^>]*>', '<b>', t)
    t = re.sub(r'<(/?)span[^>]*>', lambda m: '</b>' if m.group(1) else '', t)  # ponytail: every closing span -> </b>; browsers ignore stray </b>
    t = re.sub(r'<div[^>]*>', '<p>', t); t = t.replace('</div>', '</p>')
    t = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>', r'<a href="\1" target="_blank" rel="noopener">', t)
    t = re.sub(r'<(?!/?(p|b|br|a|i|u)\b)[^>]+>', '', t)
    t = re.sub(r'<p>(\s|<br\s*/?>|&nbsp;|​)*</p>', '', t)
    t = t.replace('​', '')
    return t.strip()

def parse(page):
    body = page.split('js-project-modules', 1)[1]
    chunks = re.split(r'<div class="project-module module ', body)[1:]
    out = []
    for c in chunks:
        kind = c.split(' ', 1)[0]
        if kind == 'image':
            m = re.search(r'data-srcset="([^"]+)"', c)
            if m: out.append(('img', best(m.group(1))))
        elif kind == 'text':
            m = re.search(r'<div class="rich-text[^"]*">(.*?)</div>\s*</div>', c, re.S)
            if m:
                t = clean_text(m.group(1))
                if re.sub(r'<[^>]+>', '', t).strip(): out.append(('text', t))
        elif kind == 'embed':
            m = re.search(r'<iframe[^>]*src="([^"]+)"', c)
            if m: out.append(('embed', html.unescape(m.group(1))))
        elif kind == 'media_collection':
            items = re.split(r'grid__item-container', c)[1:]
            urls = []
            for it in items:
                m = re.search(r'srcset="([^"]+)"', it)
                if m: urls.append(best(m.group(1)))
            if urls: out.append(('grid', urls))
        elif kind == 'video':
            m = re.search(r'<source[^>]*src="([^"]+)"', c) or re.search(r'data-src="([^"]+\.mp4[^"]*)"', c)
            if m: out.append(('video', html.unescape(m.group(1))))
    return out

def dl(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 1000: return
    open(path, 'wb').write(fetch(url))

def build():
    frags = []
    jobs = []
    for slug, key in PROJECTS:
        page = fetch(f'{BASE}/{slug}').decode('utf-8', 'ignore')
        mods = parse(page)
        d = os.path.join(HERE, 'img', key); os.makedirs(d, exist_ok=True)
        parts = []
        n = 0
        def local(url):
            nonlocal n
            n += 1
            ext = re.search(r'\.(jpg|jpeg|png|gif|webp)', url).group(1)
            name = f'{n:02d}.{ext}'
            jobs.append((url, os.path.join(d, name)))
            return f'img/{key}/{name}'
        for kind, v in mods:
            if kind == 'img': parts.append(f'<img loading="lazy" src="{local(v)}" alt="">')
            elif kind == 'text': parts.append(f'<div class="ptext">{v}</div>')
            elif kind == 'embed':
                parts.append(f'<div class="pembed"><iframe src="{html.escape(v)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>')
            elif kind == 'video': parts.append(f'<video src="{html.escape(v)}" autoplay muted loop playsinline></video>')
            elif kind == 'grid':
                cells = ''.join(f'<img loading="lazy" src="{local(u)}" alt="">' for u in v)
                parts.append(f'<div class="pgrid cols-{min(len(v),4)}">{cells}</div>')
        frags.append(f'<template id="proj-{key}">\n' + '\n'.join(parts) + '\n</template>')
        print(key, len(mods), 'modules', n, 'images', file=sys.stderr)
    with ThreadPoolExecutor(8) as ex: list(ex.map(lambda j: dl(*j), jobs))
    # COMONG: local slides (images + video posters), downscaled
    d = os.path.join(HERE, 'img', 'comong'); os.makedirs(d, exist_ok=True)
    src_img = os.path.expanduser('~/Downloads/COMONG_export/images')
    src_vid = os.path.expanduser('~/Downloads/COMONG_export/videos')
    slides = {}
    for f in glob.glob(f'{src_img}/*.png'): slides[int(os.path.basename(f)[:2])] = ('img', f)
    for f in glob.glob(f'{src_vid}/*.mp4'): slides[int(os.path.basename(f)[:2])] = ('vid', f)
    parts = []
    for k in sorted(slides):
        kind, f = slides[k]; out = os.path.join(d, f'{k:02d}.jpg')
        if not os.path.exists(out):
            if kind == 'img': subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '1920', f, '--out', out], capture_output=True)
            else: subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '1', '-i', f, '-frames:v', '1', '-vf', 'scale=1920:-1', '-q:v', '3', out], capture_output=True)
        parts.append(f'<img loading="lazy" src="img/comong/{k:02d}.jpg" alt="">')
    frags.append('<template id="proj-comong">\n' + '\n'.join(parts) + '\n</template>')
    open(os.path.join(HERE, 'projects.html'), 'w').write('\n'.join(frags))
    print('wrote projects.html', file=sys.stderr)

if __name__ == '__main__':
    build()
