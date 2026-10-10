// Jelly chips — port of React Bits "Jelly Radio" (springs on x / scaleX / scaleY, neighbours pushed with a stagger).
// Applies to every .chip on the page (event delegation, so chips added later work too).
// Filter row (#chips): the active chip stays swollen, hover previews. Other chip groups: hover swells, leave settles.
(() => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const CFG = { swell: 0.12, barge: 4, shrink: 0.04, bounce: 0.25, stiffness: 580, stagger: 0.022 };
  const css = document.createElement('style');
  css.textContent = `.chip{transition:background .2s,color .2s,border-color .2s !important;transform-origin:50% 50%;will-change:transform}
    .chip:active{transform:none} a.chip{display:inline-block}
    #works-grid .work > img, #works-grid .work .hv-wrap, .index .thumb, .lab-card{transform-origin:50% 50%;will-change:transform}
    @media (hover:hover){ .work:hover .hv-wrap img, .work:hover .hv-wrap video, .index .thumb:hover img{transform:none !important} }`;
  document.head.appendChild(css);

  const spring = (k, m, b) => ({ k, m, c: 2 * Math.sqrt(k * m) * (1 - b) });
  const S = new WeakMap();
  const st = el => { let s = S.get(el); if (!s) { s = { x: { p: 0, v: 0, t: 0 }, sx: { p: 1, v: 0, t: 1 }, sy: { p: 1, v: 0, t: 1 }, run: false }; S.set(el, s); } return s; };
  const set = (el, prop, t, sp, delay) => { const q = st(el)[prop]; q.t = t; q.sp = sp; q.start = performance.now() + delay * 1000; kick(el); };
  function kick(el) {
    const s = st(el); if (s.run) return; s.run = true; let last = performance.now();
    const step = now => {
      const dt = Math.min(0.034, (now - last) / 1000) / 4; last = now; let moving = false;
      for (const key of ['x', 'sx', 'sy']) {
        const q = s[key]; if (!q.sp) continue;
        if (now < q.start) { moving = true; continue; }
        for (let i = 0; i < 4; i++) { const a = (-q.sp.k * (q.p - q.t) - q.sp.c * q.v) / q.sp.m; q.v += a * dt; q.p += q.v * dt; }  // 4 substeps keep the stiff spring stable
        if (Math.abs(q.v) > 0.002 || Math.abs(q.p - q.t) > 0.0005) moving = true; else { q.p = q.t; q.v = 0; }
      }
      el.style.transform = `translateX(${s.x.p.toFixed(2)}px) scale(${s.sx.p.toFixed(4)},${s.sy.p.toFixed(4)})`;
      if (moving) requestAnimationFrame(step); else s.run = false;
    };
    requestAnimationFrame(step);
  }
  const group = el => [...el.parentElement.children].filter(c => c.matches('.chip') && c.offsetParent !== null);
  function apply(chips, sel) {
    const w = sel >= 0 ? chips[sel].offsetWidth : 0, push = sel >= 0 ? (w * CFG.swell) / 2 + CFG.barge : 0;
    chips.forEach((el, i) => {
      const far = sel >= 0 ? Math.abs(i - sel) : 0, dir = sel >= 0 ? Math.sign(i - sel) : 0;
      const sc = sel < 0 ? 1 : i === sel ? 1 + CFG.swell : 1 - CFG.shrink;
      const k = CFG.stiffness * (1 - 0.12 * Math.min(far, 3)), d = far * CFG.stagger;
      set(el, 'x', dir * push, spring(k, 0.9, CFG.bounce), d);
      set(el, 'sx', sc, spring(k * 1.24, 0.8, Math.min(0.85, CFG.bounce + 0.3)), d);      // x squash rings faster → jelly
      set(el, 'sy', sc, spring(k * 0.86, 0.95, CFG.bounce), d + 0.05);
    });
  }
  const rest = chips => { const on = chips.findIndex(c => c.classList.contains('on')); apply(chips, chips[0].closest('#chips') ? on : -1); };
  const chipOf = e => e.target instanceof Element ? e.target.closest('.chip') : null;

  document.addEventListener('pointerover', e => { const c = chipOf(e); if (!c || c.contains(e.relatedTarget)) return; const g = group(c); apply(g, g.indexOf(c)); });
  document.addEventListener('pointerout', e => { const c = chipOf(e); if (!c || c.contains(e.relatedTarget)) return; rest(group(c)); });
  document.addEventListener('pointerdown', e => { const c = chipOf(e); if (!c) return; const sp = spring(900, 0.6, 0.2); set(c, 'sx', 0.94, sp, 0); set(c, 'sy', 0.94, sp, 0); });
  document.addEventListener('pointerup', e => { const c = chipOf(e); if (!c) return; requestAnimationFrame(() => { const g = group(c); matchMedia('(hover:hover)').matches ? apply(g, g.indexOf(c)) : rest(g); }); });
  // thumbnails: same jelly springs, one element at a time (swell on enter, squash back on leave, press on down)
  const TH = '#works-grid .work > img, #works-grid .work .hv-wrap, .index .thumb, .lab-card';
  const thumbOf = e => e.target instanceof Element ? e.target.closest(TH) : null;
  const swell = (el, k) => { const sp = spring(380, 0.9, 0.3); set(el, 'sx', k, spring(380 * 1.24, 0.8, 0.55), 0); set(el, 'sy', k, sp, 0.04); set(el, 'x', 0, sp, 0); };
  // grow exactly until the edges meet the neighbours (gap goes to 0, never overlaps)
  const grow = t => { const box = t.closest('.work, .thumb, .lab-card') || t, host = box.parentElement.closest('.other-row, .grid, .index, .lab-track') || box.parentElement;
    const gap = parseFloat(getComputedStyle(host).columnGap) || parseFloat(getComputedStyle(host).gap) || 7; return 1 + gap * 1.6 / t.offsetWidth; };  // each side grows ~0.8 gap; spring overshoot fills the rest, so edges just touch
  document.addEventListener('pointerover', e => { const t = thumbOf(e); if (t && !t.contains(e.relatedTarget)) swell(t, grow(t)); });
  document.addEventListener('pointerout', e => { const t = thumbOf(e); if (t && !t.contains(e.relatedTarget)) swell(t, 1); });
  document.addEventListener('pointerdown', e => { const t = thumbOf(e); if (t) swell(t, 0.975); });
  document.addEventListener('pointerup', e => { const t = thumbOf(e); if (t) swell(t, matchMedia('(hover:hover)').matches ? grow(t) : 1); });
  // filter row: active chip swollen from the start
  const row = document.getElementById('chips'); if (row) requestAnimationFrame(() => rest(group(row.querySelector('.chip'))));
})();
