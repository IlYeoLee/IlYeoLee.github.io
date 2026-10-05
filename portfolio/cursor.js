// Cursor ported from lilguy.net: frosted circle that morphs around hovered controls (with a slight magnetic pull)
// + a glyph trail. Trail mixes in the letters of "Lee Il Yeoo"; near the Vibe Coding Lab ([data-cursor=pixel])
// the trail turns into small pixel-art vector graphics.
(() => {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const css = document.createElement('style');
  css.textContent = `
    *, *::before, *::after { cursor:none !important; }
    .gc { position:fixed; left:0; top:0; width:40px; height:40px; border-radius:20px; pointer-events:none; z-index:10000;
      background:rgba(42,43,44,.15); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); opacity:0;
      transition:opacity .1s, background-color .3s, border .3s, backdrop-filter .6s, -webkit-backdrop-filter .6s; }
    .gc.small { background:rgba(42,43,44,0); border:1px solid rgba(42,43,44,.25); -webkit-backdrop-filter:blur(0) brightness(.95); backdrop-filter:blur(0) brightness(.95); }
    .gc.show { opacity:1; }
    .gt { position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden; }
    .gt span { position:absolute; font:14px/1 Inter, sans-serif; color:#aaa; opacity:0; transition:opacity .15s ease-out; white-space:nowrap; }
    .gt svg { position:absolute; width:16px; height:16px; opacity:0; transition:opacity .15s ease-out; shape-rendering:crispEdges; }`;
  document.head.appendChild(css);

  const cur = document.createElement('div'); cur.className = 'gc';
  const trail = document.createElement('div'); trail.className = 'gt';
  document.body.append(trail, cur);

  // ---- glyph pools ----
  const SYMS = '⌐¬░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀∞∩∫≡±≥≤⌠⌡÷≈°∙·√ⁿ²■⊕⊗⋆★☆◇◆□▪▫△▲▽▼○●◎◉⊙⊚⊛⊜⌬⏣⏢⎔⬡⬢⬣⎊⍟✦✧✩✪✫✬✭✮✯'.split('');
  const NAME = 'LeeIlYeoo'.split('');
  const pickGlyph = () => { const r = Math.random();
    if (r < 0.03) return 'Lee Il Yeoo';
    if (r < 0.30) return NAME[Math.random() * NAME.length | 0];
    if (r < 0.45) return '⚇'; if (r < 0.55) return '©';
    return SYMS[Math.random() * SYMS.length | 0]; };
  // 8x8 pixel sprites ('#' = filled), drawn as SVG rects
  const SPRITES = [
    '.##..##.|########|########|########|.######.|..####..|...##...|........', // heart
    '...##...|...##...|.######.|########|.######.|..#..#..|.#....#.|........', // star
    '#.......|##......|###.....|####....|#####...|###.....|#.##....|...##...', // arrow cursor
    '..####..|.#....#.|#.#..#.#|#......#|#.#..#.#|#..##..#|.#....#.|..####..', // smiley
    '....##..|...##...|..##....|.######.|....##..|...##...|..##....|.##.....', // bolt
    '..#..#..|.#....#.|#......#|.#....#.|..#..#..|........|........|........', // < >
    '.######.|#......#|#.####.#|#.#..#.#|#.####.#|#......#|.######.|........', // window
    '...#....|..###...|.#####..|#######.|...#....|...#....|...#....|........', // up arrow
  ].map(s => s.split('|'));
  const COLORS = ['#ff1fa8', '#00c853', '#2962ff', '#ffb300', '#ff3d00', '#7c4dff'];
  const sprite = () => { const g = SPRITES[Math.random() * SPRITES.length | 0], c = COLORS[Math.random() * COLORS.length | 0];
    let r = ''; g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 8 8'); s.setAttribute('fill', c); s.innerHTML = r; return s; };

  // ---- morph state (same easing/timing as the original) ----
  const ease = t => { if (t <= 0) return 0; if (t >= 1) return 1; let lo = 0, hi = 1, m;
    for (let i = 0; i < 20; i++) { m = (lo + hi) / 2; const x = 3*.38*m*(1-m)*(1-m) + m*m*m; if (x < t) lo = m; else hi = m; }
    m = (lo + hi) / 2; return 3*.05*m*(1-m)*(1-m) + 3*m*m*(1-m) + m*m*m; };
  const DEF = { tx: -20, ty: -20, w: 40, h: 40, r: 20, ex: 0, ey: 0 };
  let cur0 = { ...DEF }, now = { ...DEF }, tgt = { ...DEF }, hp = 1, hovering = false, prevEl = null, last = performance.now();
  let mx = -100, my = -100, pixel = false, lastSpawn = 0;
  const restart = () => { hp = 0; cur0 = { ...now }; };
  const HOVER = 'a, button, .chip, [role=button], label';

  (function loop(t) {
    hp = Math.min(1, hp + (t - last) / 1000 * 60 / 18); last = t; const k = ease(hp);
    for (const p in now) now[p] = cur0[p] + (tgt[p] - cur0[p]) * k;
    cur.style.transform = `translate(${mx + now.tx}px, ${my + now.ty}px)`;
    cur.style.width = now.w + 'px'; cur.style.height = now.h + 'px'; cur.style.borderRadius = now.r + 'px';
    if (prevEl) { if (!hovering && hp >= 1) { prevEl.style.translate = ''; prevEl = null; } else prevEl.style.translate = `${now.ex}px ${now.ey}px`; }
    requestAnimationFrame(loop);
  })(last);

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY; cur.classList.add('show');
    const t = e.target instanceof Element ? e.target : null;
    pixel = !!(t && t.closest('[data-cursor=pixel], .lab-band, .lab-strip'));
    let el = t && t.closest(HOVER);
    if (el) { const r = el.getBoundingClientRect(); if (r.width > 360 || r.height > 120) el = null; } // big cards keep the circle
    if (el) {
      if (!hovering || el !== prevEl) { if (prevEl && prevEl !== el) prevEl.style.translate = ''; hovering = true; restart(); }
      const r = el.getBoundingClientRect(), o = { l: r.left - 7, t: r.top - 5, w: r.width + 14, h: r.height + 10 };
      const pill = parseFloat(getComputedStyle(el).borderRadius) >= r.height / 2;
      tgt = { tx: (o.l - mx) * .9 - o.w * .05, ty: (o.t - my) * .9 - o.h * .05, w: o.w, h: o.h, r: pill ? o.h / 2 : 0,
              ex: (mx - (o.l + o.w / 2)) * .1, ey: (my - (o.t + o.h / 2)) * .1 };
      prevEl = el; cur.classList.add('small'); trail.style.display = 'none';
    } else {
      if (hovering) { hovering = false; restart(); }
      tgt = { ...DEF }; cur.classList.remove('small'); trail.style.display = '';
      spawn();
    }
  }, { passive: true });
  document.documentElement.addEventListener('mouseout', e => { if (!e.relatedTarget || e.relatedTarget.tagName === 'IFRAME') cur.classList.remove('show'); });

  const rnd = (a, b) => a + Math.random() * (b - a);
  function spawn() {
    const n = performance.now(); if (n - lastSpawn < (pixel ? 24 : 10)) return; lastSpawn = n;
    const g = pixel ? sprite() : Object.assign(document.createElement('span'), { textContent: pickGlyph() });
    const x = mx + rnd(-6, 6), y = my + rnd(-6, 6);
    const rot = pixel ? (Math.random() * 4 | 0) * 90 : rnd(-180, 180), sc = pixel ? rnd(.8, 1.6) : rnd(.4, 1.25);
    g.style.left = x + 'px'; g.style.top = y + 'px'; g.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${sc})`;
    trail.appendChild(g);
    // reveal only once the cursor has moved 30px away, like the original
    const reveal = () => { if (!g.isConnected) return; if (Math.hypot(mx - x, my - y) > 30) g.style.opacity = 1; else requestAnimationFrame(reveal); };
    requestAnimationFrame(reveal);
    setTimeout(() => g.remove(), pixel ? rnd(250, 600) : rnd(100, 400));
  }
})();
