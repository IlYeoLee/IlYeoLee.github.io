// Original ring cursor (everyelse.com port: ring stretches with scroll velocity, tilts with movement)
// + a glyph trail ported from lilguy.net. The trail spells "Lee Il Yeoo" one letter at a time; near the
// Vibe Coding Lab ([data-cursor=pixel], .lab-band, .lab-strip) it turns into small pixel-art vector graphics.
(() => {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const css = document.createElement('style');
  css.textContent = `
    #cursor { position:fixed; top:0; left:0; z-index:10000; pointer-events:none; will-change:transform; mix-blend-mode:difference; opacity:0; transition:opacity .2s; }
    #cursor i { display:block; width:36px; height:var(--stretch-h,36px); border-radius:var(--stretch-r,9999px); transform:translate(-18px,-18px); border:4px solid #fff; transition:border-width .1s ease-out; }
    #cursor.on i, #cursor.down i { border-width:8px; }
    *, *::before, *::after { cursor:none !important; }
    .pstage .dev, .pstage .dev *, .pvimeo, .pvimeo * { cursor:pointer !important; }
    .gt { position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden; }
    .gt span { position:absolute; font:14px/1 Inter, sans-serif; color:#aaa; opacity:0; transition:opacity .15s ease-out; white-space:nowrap; }
    .gt svg { position:absolute; width:16px; height:16px; opacity:0; transition:opacity .15s ease-out; shape-rendering:crispEdges; }`;
  document.head.appendChild(css);
  const cur = document.createElement('div'); cur.id = 'cursor'; cur.innerHTML = '<i></i>';
  const trail = document.createElement('div'); trail.className = 'gt';
  document.body.append(trail, cur);

  // ---- ring cursor (unchanged behaviour) ----
  let tx=0, ty=0, x=0, y=0, shown=false, lastWheel=-1e9, vel=0, lastPos=null, lastT=performance.now(), h=36, pvx=0, pvy=0, rx=0, ry=0;
  addEventListener('mousemove', e=>{ if(hideIn(e)) return; if(!shown){ x=e.clientX; y=e.clientY; shown=true; } pvx=e.clientX-tx; pvy=e.clientY-ty; tx=e.clientX; ty=e.clientY; cur.style.opacity=1;
    cur.classList.toggle('on', !!e.target.closest('a, button, .work, .thumb, .tip')); }, {passive:true});
  document.addEventListener('mouseleave', ()=>{ cur.style.opacity=0; shown=false; });
  // embedded sites/prototypes swallow mouse events (cross-origin), so hide the ring as soon as the pointer reaches them
  const EMBED='iframe, .pstage .dev, .pvimeo';
  const hideIn=e=>{ if(e.target instanceof Element && e.target.closest(EMBED)){ cur.style.opacity=0; trail.style.visibility='hidden'; shown=false; return true; } trail.style.visibility=''; return false; };
  document.addEventListener('pointerover', hideIn, {passive:true});
  document.documentElement.addEventListener('mouseout', e=>{ if(!e.relatedTarget || e.relatedTarget.tagName==='IFRAME'){ cur.style.opacity=0; shown=false; } });
  document.addEventListener('pointerdown', ()=>cur.classList.add('down'), {passive:true});
  document.addEventListener('pointerup', ()=>cur.classList.remove('down'), {passive:true});
  document.addEventListener('wheel', ()=>{ lastWheel=performance.now(); }, {passive:true});
  document.addEventListener('scroll', e=>{ const el=e.target===document?document.documentElement:e.target; const pos=el===document.documentElement?scrollY:el.scrollTop; const now=performance.now();
    if(lastPos!==null && now-lastWheel<200) vel=(pos-lastPos)/Math.max(now-lastT,1); lastPos=pos; lastT=now; }, {passive:true, capture:true});
  (function loop(){
    x+=(tx-x)*0.5; y+=(ty-y)*0.5;
    rx+=((-pvy*0.6)-rx)*0.2; ry+=((pvx*0.6)-ry)*0.2; pvx*=0.8; pvy*=0.8;
    cur.style.transform=`translate3d(${x}px,${y}px,0) perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    vel*=0.85; const target=36+44*Math.min(0.35*Math.abs(vel),1); h+=(target-h)*0.25; const a=(h-36)/44;
    cur.style.setProperty('--stretch-h', h.toFixed(2)+'px'); cur.style.setProperty('--stretch-r', (9999-9983*a).toFixed(2)+'px');
    requestAnimationFrame(loop);
  })();

  // ---- glyph pools ----
  const SYMS = '⌐¬░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀∞∩∫≡±≥≤⌠⌡÷≈°∙·√ⁿ²■⊕⊗⋆★☆◇◆□▪▫△▲▽▼○●◎◉⊙⊚⊛⊜⌬⏣⏢⎔⬡⬢⬣⎊⍟✦✧✩✪✫✬✭✮✯'.split('');
  const NAME = 'LeeIlYeoo'.split('');
  let ni = 0; // name letters come out one at a time, in order, scattered among the symbols
  const pickGlyph = () => { const r = Math.random();
    if (r < 0.25) return NAME[ni++ % NAME.length];
    if (r < 0.40) return '⚇'; if (r < 0.50) return '©';
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

  // ---- trail (only on movement) ----
  let mx = -100, my = -100, pixel = false, lastSpawn = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY;
    pixel = !!(e.target instanceof Element && e.target.closest('[data-cursor=pixel], .lab-band, .lab-strip')); spawn(); }, { passive: true });

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
