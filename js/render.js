'use strict';
/* Rustwake — canvas rendering for the system view. Everything is drawn procedurally; there are no image assets. */

const R = G.render = { cv: null, ctx: null, W: 0, H: 0, dpr: 1, tex: new Map(), bg: null, starLayers: [], sysId: null };
const TAU = G.TAU;

R.init = function (cv) {
  R.cv = cv; R.ctx = cv.getContext('2d');
  R.resize(); window.addEventListener('resize', R.resize);
  // three tiling star layers
  for (let l = 0; l < 3; l++) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), rng = G.RNG(1234 + l * 77);
    const n = [240, 110, 44][l];
    for (let i = 0; i < n; i++) {
      const px = rng.range(0, 512), py = rng.range(0, 512), s = rng.range(0.4, 1.1) * (1 + l * 0.5), a = rng.range(0.25, 0.9);
      const tint = rng.pick(['255,255,255', '200,220,255', '255,235,200', '255,200,190']);
      x.fillStyle = 'rgba(' + tint + ',' + a + ')'; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill();
      if (l === 2 && rng.chance(0.3)) { x.fillStyle = 'rgba(' + tint + ',0.12)'; x.beginPath(); x.arc(px, py, s * 4, 0, TAU); x.fill(); }
    }
    R.starLayers.push(c);
  }
};
R.resize = function () {
  const cv = R.cv; R.dpr = Math.min(2, window.devicePixelRatio || 1);
  R.W = window.innerWidth; R.H = window.innerHeight;
  cv.width = R.W * R.dpr; cv.height = R.H * R.dpr; cv.style.width = R.W + 'px'; cv.style.height = R.H + 'px';
};

/* ---------- nebula backdrop, one per system ---------- */
function makeNebula(sys) {
  const N = 160, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data, n = G.noise3(sys.seed);
  const hsl = (h, s, l) => { // -> rgb 0..255
    h /= 360; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t % 1 + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  };
  const c1 = hsl(sys.hue, 0.7, 0.5), c2 = hsl(sys.hue2, 0.75, 0.45);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N * 3.2, v = j / N * 3.2;
    const a = G.fbm(n, u, v, 1.7, 4), b = G.fbm(n, u + 9.1, v + 3.3, 5.2, 4), w = G.fbm(n, u * 2 + a * 2, v * 2 + b * 2, 9.9, 3);
    let k1 = Math.max(0, a - 0.48) * 1.7 * w, k2 = Math.max(0, b - 0.52) * 1.8 * (1 - w * 0.6);
    // fade to nothing at the edges so the stretched image has no hard border
    const ex = Math.min(i, N - 1 - i) / (N * 0.22), ey = Math.min(j, N - 1 - j) / (N * 0.22), ed = Math.min(1, ex) * Math.min(1, ey);
    k1 *= ed; k2 *= ed;
    const o = (j * N + i) * 4;
    d[o] = Math.min(255, 5 + c1[0] * k1 + c2[0] * k2); d[o + 1] = Math.min(255, 6 + c1[1] * k1 + c2[1] * k2); d[o + 2] = Math.min(255, 12 + c1[2] * k1 + c2[2] * k2); d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* ---------- planet textures ---------- */
R.planetTex = function (p, h) {
  const key = p.id + '@' + h + '@' + G.S.seed + '.' + G.S.uni.n;
  if (R.tex.has(key)) return R.tex.get(key);
  if (R.tex.size > 60) R.tex.clear();
  const w = h * 2, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
  const pt = G.PTYPES[p.type], n = G.noise3(p.seed), pal = pt.pal.map(G.rgb);
  const rng = G.RNG(p.seed), bands = rng.range(5, 11), f = rng.range(1.1, 1.9), sea = pt.sea || 0;
  const ramp = (t, a, b) => { t = G.clamp(t, 0, 0.9999) * (b - a) + a; const i = Math.floor(t); return G.mix(pal[i], pal[Math.min(pal.length - 1, i + 1)], t - i); };
  for (let j = 0; j < h; j++) {
    const v = j / h, lat = Math.abs(v - 0.5) * 2;
    for (let i = 0; i < w; i++) {
      const th = i / w * TAU, nx = Math.cos(th) * 1.5 * f, nz = Math.sin(th) * 1.5 * f, ny = v * 3 * f;
      let col;
      if (pt.gas) {
        const turb = G.fbm(n, nx * 0.8, ny * 3, nz * 0.8, 3);
        const b = Math.sin(v * bands * Math.PI + turb * 4.5) * 0.5 + 0.5;
        const storm = G.fbm(n, nx * 3, ny * 3 + 7, nz * 3, 3);
        col = ramp(b * 0.75 + storm * 0.25, 0, 4);
        if (storm > 0.72) col = G.mix(col, pal[4], (storm - 0.72) * 3);
      } else {
        const e = G.fbm(n, nx, ny, nz, 5);
        if (sea > 0 && e < sea) {
          const dpt = e / sea; col = pt.glow ? G.mix(pal[1], pal[0], dpt * dpt) : G.mix(pal[0], pal[1], dpt * dpt);
          if (pt.glow) { const hot = G.fbm(n, nx * 4, ny * 4, nz * 4, 2); col = G.mix(col, [255, 240, 160], Math.max(0, hot - 0.55) * 2.4); }
        } else {
          const t = sea > 0 ? (e - sea) / (1 - sea) : e;
          col = sea > 0 ? ramp(Math.pow(t, 0.8), 2, 4) : ramp((t - 0.25) * 1.9, 0, 4);
          const det = G.fbm(n, nx * 5, ny * 5, nz * 5, 2); col = G.mix(col, [0, 0, 0], (0.5 - det) * 0.35);
        }
        if (pt.crater) { const cr = n(nx * 4.2 + 30, ny * 4.2, nz * 4.2); if (cr > 0.74) col = G.mix(col, [0, 0, 0], 0.35); else if (cr > 0.7) col = G.mix(col, [255, 255, 255], 0.18); }
        if (pt.facet) { const q = Math.floor(e * 9) / 9, sp = n(nx * 12, ny * 12, nz * 12); col = ramp(q * 1.3 - 0.1, 0, 4); if (sp > 0.82) col = [255, 255, 255]; }
        if (pt.grid) { const gx = i % 9 === 0 || j % 9 === 0, lit = n(nx * 6, ny * 6, nz * 6) > 0.5; if (gx) col = G.mix(col, pal[3], lit ? 0.9 : 0.25); else if (lit && (i + j) % 5 === 0) col = pal[4]; }
        // polar caps and clouds on worlds with weather
        if (pt.atm && !pt.glow && sea > 0) {
          if (lat > 0.84 - e * 0.12) col = G.mix(col, [245, 250, 255], 0.85);
          const cl = G.fbm(n, nx * 1.7 + 50, ny * 2.6, nz * 1.7, 4); if (cl > 0.56) col = G.mix(col, [255, 255, 255], Math.min(0.85, (cl - 0.56) * 5));
        }
        if (p.type === 'ice' || p.type === 'tundra') { if (lat > 0.7) col = G.mix(col, [255, 255, 255], (lat - 0.7) * 2.5); }
      }
      const o = (j * w + i) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  R.tex.set(key, c);
  return c;
};
/* Draw a planet as a lit, slowly rotating sphere. light: angle toward the star. */
R.drawPlanet = function (ctx, p, x, y, r, light, time, texH) {
  const pt = G.PTYPES[p.type], tex = R.planetTex(p, texH || 96);
  const lx = Math.cos(light), ly = Math.sin(light);
  if (pt.atm) { // atmosphere halo
    const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.28); const c = G.rgb(pt.atm);
    g.addColorStop(0, G.rgba(c, 0.5)); g.addColorStop(1, G.rgba(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.28, 0, TAU); ctx.fill();
  }
  const ringCol = pt.atm ? G.rgb(pt.atm) : [200, 190, 170];
  const drawRing = front => {
    if (!p.ring) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35); ctx.scale(1, 0.3);
    for (let k = 0; k < 4; k++) { ctx.strokeStyle = G.rgba(ringCol, 0.5 - k * 0.09); ctx.lineWidth = r * 0.09; ctx.beginPath(); ctx.arc(0, 0, r * (1.5 + k * 0.14), front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke(); }
    ctx.restore();
  };
  drawRing(false);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  const tw = r * 4, off = ((time * (pt.gas ? 0.012 : 0.006) * (p.spd < 0 ? -1 : 1)) % 1 + 1) % 1 * tw;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tex, x - r - off, y - r, tw, r * 2);
  ctx.drawImage(tex, x - r - off + tw, y - r, tw, r * 2);
  // limb darkening
  let g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.55)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // terminator: a dark disc pushed away from the light
  g = ctx.createRadialGradient(x + lx * r * 0.55, y + ly * r * 0.55, r * 0.5, x + lx * r * 0.2, y + ly * r * 0.2, r * 1.55);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.42, 'rgba(0,0,8,0.55)'); g.addColorStop(0.8, 'rgba(0,0,8,0.95)'); g.addColorStop(1, 'rgba(0,0,8,0.97)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // sun glint
  g = ctx.createRadialGradient(x + lx * r * 0.5, y + ly * r * 0.5, 0, x + lx * r * 0.5, y + ly * r * 0.5, r * 0.8);
  g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  if (pt.glow) { // molten worlds glow on the night side
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22;
    ctx.drawImage(tex, x - r - off, y - r, tw, r * 2); ctx.drawImage(tex, x - r - off + tw, y - r, tw, r * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  if (pt.atm) { ctx.strokeStyle = G.rgba(G.rgb(pt.atm), 0.55); ctx.lineWidth = Math.max(1, r * 0.04); ctx.beginPath(); ctx.arc(x, y, r - ctx.lineWidth / 2, light - 1.4, light + 1.4); ctx.stroke(); }
  drawRing(true);
};
/* Standalone portrait for UI panels. */
R.portrait = function (cv, p) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const rng = G.RNG(p.seed);
  for (let i = 0; i < 50; i++) { ctx.fillStyle = 'rgba(255,255,255,' + rng.range(0.1, 0.7) + ')'; ctx.fillRect(rng.range(0, W), rng.range(0, H), 1, 1); }
  const big = G.PTYPES[p.type].big, r = Math.min(W, H) * (big ? 0.34 : 0.3) * (p.ring ? 0.8 : 1);
  R.drawPlanet(ctx, p, W / 2, H / 2, r, -2.4, G.S.t * 3, 160);
  for (let m = 0; m < p.moons; m++) { const a = rng.range(0, TAU) + G.S.t * 0.05 * (m + 1), d = r * (1.5 + m * 0.3); ctx.fillStyle = '#b8b0a8'; ctx.beginPath(); ctx.arc(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d * 0.45, 2.5 + rng.range(0, 2), 0, TAU); ctx.fill(); }
};

/* ---------- stars ---------- */
function glow(ctx, x, y, r, col, a) {
  const c = G.rgb(col), g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, G.rgba(c, a)); g.addColorStop(0.4, G.rgba(c, a * 0.35)); g.addColorStop(1, G.rgba(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function sun(ctx, x, y, r, col, t) {
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, r * 5.5, col, 0.22);
  glow(ctx, x, y, r * 2.6, col, 0.5);
  // slow rays
  ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU + t * 0.03 * (i % 2 ? 1 : -1), len = r * (2.4 + Math.sin(t * 0.5 + i * 1.7) * 0.5);
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len); const c = G.rgb(col);
    g.addColorStop(0, G.rgba(c, 0.22)); g.addColorStop(1, G.rgba(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(Math.cos(a + 1.5) * r * 0.5, Math.sin(a + 1.5) * r * 0.5); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.lineTo(Math.cos(a - 1.5) * r * 0.5, Math.sin(a - 1.5) * r * 0.5); ctx.fill();
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  const c = G.rgb(col), g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, G.rgba(G.mix(c, [255, 255, 255], 0.45), 1)); g.addColorStop(1, G.rgba(c, 1));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  // granulation flicker
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + t * 0.07, d = r * (0.3 + 0.45 * ((i * 37 % 10) / 10)); glow(ctx, x + Math.cos(a) * d, y + Math.sin(a * 1.3) * d, r * 0.4, '#ffffff', 0.1 + 0.06 * Math.sin(t + i)); }
  ctx.globalCompositeOperation = 'source-over';
}
R.drawStar = function (ctx, sys, x, y, r, t) {
  const col = sys.star.c;
  switch (sys.cls) {
    case 'BH': {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y, r * 4, '#ff9a4a', 0.25);
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.4); ctx.scale(1, 0.32);
      for (let k = 0; k < 14; k++) { ctx.strokeStyle = 'rgba(' + (255) + ',' + (140 + k * 8) + ',' + (60 + k * 10) + ',' + (0.5 - k * 0.03) + ')'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(0, 0, r * (1.25 + k * 0.13), t * (0.5 - k * 0.02), t * (0.5 - k * 0.02) + TAU * 0.92); ctx.stroke(); }
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,170,0.9)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.arc(x, y, r * 0.64, 0, TAU); ctx.stroke();
      break;
    }
    case 'NS': case 'PU': {
      ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (sys.cls === 'PU' ? 3 : 0.6));
      for (const s of [1, -1]) { const g = ctx.createLinearGradient(0, 0, s * r * 12, 0); const c = G.rgb(col); g.addColorStop(0, G.rgba(c, 0.8)); g.addColorStop(1, G.rgba(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(s * r * 12, -r * 1.1); ctx.lineTo(s * r * 12, r * 1.1); ctx.lineTo(0, r * 0.2); ctx.fill(); }
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
      sun(ctx, x, y, r, col, t); break;
    }
    case 'BIN': {
      const a = t * 0.12, d = r * 1.1;
      sun(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.8, '#ffd9a0', t);
      sun(ctx, x - Math.cos(a) * d, y - Math.sin(a) * d, r * 0.55, '#9fc0ff', t + 9); break;
    }
    case 'NEG': {
      sun(ctx, x, y, r, col, t);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = r * 0.25; ctx.beginPath(); ctx.arc(x, y, r * (1.5 + 0.1 * Math.sin(t)), 0, TAU); ctx.stroke();
      break;
    }
    default: sun(ctx, x, y, r, col, t);
  }
};

/* ---------- ships ---------- */
// outlines, nose toward +x, unit scale
const SHAPES = {
  0: [[1, 0.1], [0.5, 0.45], [-0.3, 0.55], [-0.9, 0.9], [-0.7, 0.2], [-1, 0], [-0.7, -0.25], [-0.8, -0.6], [-0.2, -0.5], [0.4, -0.35], [1, -0.15]],
  1: [[1.1, 0], [0.4, 0.4], [0.1, 0.9], [-0.6, 0.9], [-0.5, 0.35], [-1, 0.3], [-1, -0.3], [-0.5, -0.35], [-0.6, -0.9], [0.1, -0.9], [0.4, -0.4]],
  2: [[1.3, 0], [0.2, 0.35], [-0.2, 1], [-0.9, 1.05], [-0.6, 0.3], [-1.1, 0.25], [-1.1, -0.25], [-0.6, -0.3], [-0.9, -1.05], [-0.2, -1], [0.2, -0.35]],
  3: [[1.4, 0], [0.7, 0.3], [0.3, 0.3], [0.1, 0.8], [-0.9, 0.95], [-0.8, 0.4], [-1.2, 0.3], [-1.2, -0.3], [-0.8, -0.4], [-0.9, -0.95], [0.1, -0.8], [0.3, -0.3], [0.7, -0.3]],
  4: [[1.5, 0], [1, 0.25], [0.5, 0.25], [0.3, 0.7], [-0.4, 0.75], [-0.6, 1.1], [-1.1, 1.05], [-0.9, 0.4], [-1.3, 0.3], [-1.3, -0.3], [-0.9, -0.4], [-1.1, -1.05], [-0.6, -1.1], [-0.4, -0.75], [0.3, -0.7], [0.5, -0.25], [1, -0.25]],
  5: [[1.6, 0], [1.1, 0.2], [0.9, 0.5], [0.2, 0.55], [0, 1], [-0.9, 1.15], [-1.2, 0.8], [-0.9, 0.4], [-1.4, 0.35], [-1.4, -0.35], [-0.9, -0.4], [-1.2, -0.8], [-0.9, -1.15], [0, -1], [0.2, -0.55], [0.9, -0.5], [1.1, -0.2]],
  6: [[1.5, 0], [1.2, 0.5], [0.6, 0.95], [-0.1, 1.15], [-0.9, 1], [-1.3, 0.55], [-1.5, 0], [-1.3, -0.55], [-0.9, -1], [-0.1, -1.15], [0.6, -0.95], [1.2, -0.5]],
  10: [[1, 0], [-0.8, 0.7], [-0.4, 0], [-0.8, -0.7]],
  11: [[1.2, 0], [0, 0.4], [-0.6, 0.9], [-0.9, 0.3], [-0.9, -0.3], [-0.6, -0.9], [0, -0.4]],
  12: [[1.3, 0], [0.5, 0.35], [-0.2, 0.4], [-0.5, 0.85], [-1, 0.8], [-1, -0.8], [-0.5, -0.85], [-0.2, -0.4], [0.5, -0.35]],
  13: [[1.4, 0], [0.8, 0.4], [0, 0.45], [-0.3, 0.9], [-1.1, 0.9], [-1.2, 0.3], [-1.2, -0.3], [-1.1, -0.9], [-0.3, -0.9], [0, -0.45], [0.8, -0.4]],
  14: [[1.2, 0.2], [1.2, -0.2], [0.6, -0.5], [-1.2, -0.75], [-1.3, 0.75], [0.6, 0.5]],
  15: [[1.5, 0], [0.9, 0.35], [0.4, 0.35], [0.2, 0.7], [-1.2, 0.8], [-1.4, 0.3], [-1.4, -0.3], [-1.2, -0.8], [0.2, -0.7], [0.4, -0.35], [0.9, -0.35]],
  16: [[1.6, 0], [1.1, 0.3], [0.6, 0.35], [0.5, 0.75], [-0.5, 0.9], [-0.7, 1.2], [-1.3, 1.1], [-1.5, 0.4], [-1.5, -0.4], [-1.3, -1.1], [-0.7, -1.2], [-0.5, -0.9], [0.5, -0.75], [0.6, -0.35], [1.1, -0.3]],
  20: [[1.2, 0], [-0.2, 0.3], [-0.9, 0.9], [-0.5, 0.1], [-0.9, 0], [-0.5, -0.1], [-0.9, -0.9], [-0.2, -0.3]],
  21: [[1, 0.3], [0.3, 0.9], [-0.9, 0.8], [-0.6, 0.2], [-1, 0], [-0.6, -0.2], [-0.9, -0.8], [0.3, -0.9], [1, -0.3], [0.6, 0]],
  22: [[1.1, 0], [0.3, 0.3], [0.3, 0.9], [-0.2, 0.9], [-0.3, 0.4], [-1, 0.5], [-1, -0.5], [-0.3, -0.4], [-0.2, -0.9], [0.3, -0.9], [0.3, -0.3]],
  23: [[1.3, 0], [0.9, 0.5], [0.2, 0.5], [0, 1], [-1, 1.1], [-0.7, 0.4], [-1.3, 0.5], [-1.1, 0], [-1.3, -0.5], [-0.7, -0.4], [-1, -1.1], [0, -1], [0.2, -0.5], [0.9, -0.5]],
  40: [[1.1, 0], [0, 0.8], [-1.1, 0], [0, -0.8]],
  41: [[1, 0], [0.5, 0.87], [-0.5, 0.87], [-1, 0], [-0.5, -0.87], [0.5, -0.87]],
  42: [[1.3, 0.3], [0.5, 0.9], [-1.1, 0.9], [-1.1, -0.9], [0.5, -0.9], [1.3, -0.3]],
  43: [[1, 0.4], [0.4, 1], [-0.4, 1], [-1, 0.4], [-1, -0.4], [-0.4, -1], [0.4, -1], [1, -0.4]],
  50: [[1.3, 0], [-0.3, 0.3], [-1, 0.9], [-0.6, 0], [-1, -0.9], [-0.3, -0.3]],
  51: [[1.4, 0], [0.4, 0.3], [0, 0.9], [-0.9, 1], [-0.5, 0.3], [-1.1, 0], [-0.5, -0.3], [-0.9, -1], [0, -0.9], [0.4, -0.3]],
  52: [[1.5, 0], [0.9, 0.3], [0.5, 0.8], [-0.3, 0.6], [-0.7, 1.2], [-1.3, 0.9], [-1, 0.2], [-1.4, 0], [-1, -0.2], [-1.3, -0.9], [-0.7, -1.2], [-0.3, -0.6], [0.5, -0.8], [0.9, -0.3]],
  60: [[1.3, 0], [0.2, 0.5], [-1.1, 0.35], [-1.1, -0.35], [0.2, -0.5]],
  61: [[1.6, 0], [0.4, 0.4], [-1.4, 0.3], [-1.4, -0.3], [0.4, -0.4]],
  70: [[1.2, 0], [0.2, 0.2], [0, 1], [-0.4, 0.2], [-1.2, 0.5], [-0.7, 0], [-1.2, -0.5], [-0.4, -0.2], [0, -1], [0.2, -0.2]],
  80: [[1, 0], [0, 1], [-1, 0], [0, -1]],
  81: [[1, 0], [0.3, 0.3], [0, 1], [-0.3, 0.3], [-1, 0], [-0.3, -0.3], [0, -1], [0.3, -0.3]],
  90: [[1, 0.4], [0.4, 1], [-0.4, 1], [-1, 0.4], [-1, -0.4], [-0.4, -1], [0.4, -1], [1, -0.4]],
  92: [[1, 0], [0.5, 0.5], [0.9, 0.9], [0, 0.7], [-0.9, 0.9], [-0.5, 0.5], [-1, 0], [-0.5, -0.5], [-0.9, -0.9], [0, -0.7], [0.9, -0.9], [0.5, -0.5]]
};
function poly(ctx, pts, r) { ctx.beginPath(); ctx.moveTo(pts[0][0] * r, pts[0][1] * r); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * r, pts[i][1] * r); ctx.closePath(); }
R.drawShip = function (ctx, shape, x, y, ang, r, col, opts) {
  opts = opts || {};
  const t = opts.t || 0, c = G.rgb(col);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  if (shape >= 30 && shape < 40 || shape === 71 || shape === 91) { // living things
    const n = shape === 30 ? 3 : shape === 33 || shape === 71 ? 9 : 6;
    ctx.strokeStyle = G.rgba(c, 0.8); ctx.lineWidth = Math.max(1, r * 0.12); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 1.8 + Math.PI, w = Math.sin(t * 5 + i) * 0.3;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      ctx.quadraticCurveTo(Math.cos(a + w) * r * 1.4, Math.sin(a + w) * r * 1.4, Math.cos(a - w) * r * 2.1, Math.sin(a - w) * r * 2.1); ctx.stroke();
    }
    const g = ctx.createRadialGradient(r * 0.2, -r * 0.2, 0, 0, 0, r);
    g.addColorStop(0, G.rgba(G.mix(c, [255, 255, 255], 0.6), 0.95)); g.addColorStop(1, G.rgba(G.mix(c, [0, 0, 0], 0.5), 0.9));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * (shape === 32 ? 1.2 : 1), r * (shape === 32 ? 1.3 : 0.85 + 0.06 * Math.sin(t * 4)), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a0a12'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.45, s * r * 0.3, r * 0.13, 0, TAU); ctx.fill(); }
    if (shape === 91) { ctx.strokeStyle = G.rgba(c, 0.5); ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * 1.3) * r * 0.5, Math.sin(k * 1.3) * r * 0.5, r * 0.25, 0, TAU); ctx.stroke(); } }
    ctx.restore(); return;
  }
  const pts = SHAPES[shape] || SHAPES[0];
  // engine glow
  if (opts.thrust !== 0 && shape < 90) {
    ctx.globalCompositeOperation = 'lighter';
    const fl = r * (0.9 + 0.5 * (opts.thrust || 0.6) + Math.sin(t * 40) * 0.12);
    const g = ctx.createRadialGradient(-r * 1.05, 0, 0, -r * 1.05, 0, fl);
    const tc = opts.trail ? G.rgb(opts.trail) : [255, 190, 110];
    g.addColorStop(0, opts.thrust > 1 ? 'rgba(255,255,255,0.95)' : G.rgba(G.mix(tc, [255, 255, 255], 0.35), 0.9)); g.addColorStop(1, G.rgba(tc, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-r * 1.2, 0, fl, fl * 0.45, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (shape === 80 || shape === 81) { // the Silence: holes in the picture
    poly(ctx, pts, r); ctx.fillStyle = '#000'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(t * 3)) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
    poly(ctx, pts, r * 1.25); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke();
    ctx.restore(); return;
  }
  if (shape === 70) ctx.globalAlpha = 0.55 + 0.4 * Math.sin(t * 9);
  poly(ctx, pts, r);
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, G.rgba(G.mix(c, [40, 44, 56], 0.55), 1)); g.addColorStop(0.5, G.rgba(G.mix(c, [20, 22, 30], 0.72), 1)); g.addColorStop(1, G.rgba(G.mix(c, [5, 6, 10], 0.85), 1));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = G.rgba(c, 0.95); ctx.lineWidth = Math.max(1, r * 0.07); ctx.lineJoin = 'round'; ctx.stroke();
  // spine and cockpit
  ctx.strokeStyle = G.rgba(c, 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.6, 0); ctx.stroke();
  if (shape < 90) { ctx.fillStyle = opts.rust ? '#ffcf8a' : '#c8f0ff'; ctx.beginPath(); ctx.ellipse(r * 0.3, 0, r * 0.22, r * 0.12, 0, 0, TAU); ctx.fill(); }
  else { ctx.fillStyle = G.rgba(c, 0.5 + 0.4 * Math.sin(t * 3)); ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.fill(); }
  if (opts.lights) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < opts.lights; i++) for (const sd of [-1, 1]) {
      const lx = r * (0.35 - i * 0.26), ly = sd * r * (0.28 + i * 0.07), on = 0.55 + 0.45 * Math.sin(t * 4 + i * 1.3);
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.2); g.addColorStop(0, 'rgba(255,255,255,' + on + ')'); g.addColorStop(0.4, G.rgba(c, on * 0.7)); g.addColorStop(1, G.rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, r * 0.2, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (opts.rust) { ctx.fillStyle = 'rgba(160,80,40,0.55)'; ctx.fillRect(-r * 0.5, r * 0.1, r * 0.35, r * 0.2); ctx.fillRect(r * 0.05, -r * 0.3, r * 0.25, r * 0.12); }
  ctx.restore();
};

/* ---------- system change ---------- */
R.newSystem = function (sys) { R.bg = makeNebula(sys); R.sysId = sys.id; };

/* ---------- frame ---------- */
const OBJ_COL = { station: '#8ad4ff', anomaly: '#ff8cf0', derelict: '#c8c0b0', ruins: '#ffe08a', wormhole: '#b89bff', signal: '#ffffff', stargate: '#9fe0ff' };
R.draw = function () {
  const ctx = R.ctx, F = G.flight, sys = F.sys, S = G.S; if (!sys) return;
  const W = R.W, H = R.H, cam = F.cam, z = cam.zoom, t = S.t;
  ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  const shx = cam.shake ? G.rand.range(-1, 1) * cam.shake : 0, shy = cam.shake ? G.rand.range(-1, 1) * cam.shake : 0;
  const X = x => (x - cam.x) * z + W / 2 + shx, Y = y => (y - cam.y) * z + H / 2 + shy;
  // backdrop
  ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H);
  if (!F.erased) {
    if (R.bg) { const bs = Math.max(W, H) * 1.7, bx = W / 2 - bs / 2 - cam.x * 0.02, by = H / 2 - bs / 2 - cam.y * 0.02; ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.9; ctx.drawImage(R.bg, bx, by, bs, bs); ctx.globalAlpha = 1; }
    for (let l = 0; l < 3; l++) {
      const pf = [0.04, 0.09, 0.18][l], ox = ((-cam.x * pf) % 512 + 512) % 512, oy = ((-cam.y * pf) % 512 + 512) % 512;
      for (let px = ox - 512; px < W; px += 512) for (let py = oy - 512; py < H; py += 512) ctx.drawImage(R.starLayers[l], px, py);
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; for (let i = 0; i < 40; i++) ctx.fillRect(G.rand.range(0, W), G.rand.range(0, H), 1, 1);
  }
  const s = F.ship;
  if (!F.erased) {
    // orbits
    ctx.lineWidth = 1;
    for (const p of sys.planets) { ctx.strokeStyle = S.colonies[p.id] ? 'rgba(125,255,176,0.16)' : 'rgba(160,190,255,0.07)'; ctx.beginPath(); ctx.arc(X(0), Y(0), p.orbit * z, 0, TAU); ctx.stroke(); }
    // megastructure: dyson
    const dy = G.megaStage(sys.id, 'dyson');
    R.drawStar(ctx, sys, X(0), Y(0), sys.star.r * z, t);
    if (dy) drawDyson(ctx, X(0), Y(0), sys.star.r * z, dy, t);
    if (G.megaStage(sys.id, 'starlifter')) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const a = t * 0.1 + i * 2.1, r1 = sys.star.r * z, r2 = r1 * 3; const g = ctx.createLinearGradient(X(0) + Math.cos(a) * r1, Y(0) + Math.sin(a) * r1, X(0) + Math.cos(a) * r2, Y(0) + Math.sin(a) * r2); g.addColorStop(0, 'rgba(255,220,150,0.7)'); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.strokeStyle = g; ctx.lineWidth = 5 * z; ctx.beginPath(); ctx.moveTo(X(0) + Math.cos(a) * r1, Y(0) + Math.sin(a) * r1); ctx.lineTo(X(0) + Math.cos(a) * r2, Y(0) + Math.sin(a) * r2); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; }
    // asteroids
    for (const r of F.roids) {
      const x = X(r.x), y = Y(r.y), rr = r.r * z * (0.55 + 0.45 * r.amt / r.max); if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
      const c = G.rgb(G.RES[r.res].c);
      ctx.save(); ctx.translate(x, y); ctx.rotate(r.rot);
      ctx.beginPath(); for (let i = 0; i < r.pts.length; i++) { const a = i / r.pts.length * TAU, d = rr * r.pts[i]; if (i) ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); else ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d); } ctx.closePath();
      const g = ctx.createLinearGradient(-rr, -rr, rr, rr); g.addColorStop(0, '#6e665e'); g.addColorStop(1, '#221f1c'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      // ore veins
      ctx.fillStyle = G.rgba(c, 0.9); for (let i = 0; i < 3; i++) { const a = i * 2.2 + r.pts[i] * 5, d = rr * 0.42; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(1.2, rr * 0.14), 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // planets
    const sd = S.sd[sys.id] || {};
    for (const p of sys.planets) {
      const pp = G.planetPos(p), x = X(pp[0]), y = Y(pp[1]), rr = p.r * z;
      if (x < -rr * 3 || y < -rr * 3 || x > W + rr * 3 || y > H + rr * 3) continue;
      const light = Math.atan2(-pp[1], -pp[0]);
      R.drawPlanet(ctx, p, x, y, rr, light, t);
      const mr = G.RNG(p.seed);
      for (let m = 0; m < p.moons; m++) { const a = mr.range(0, TAU) + t * 0.08 / (m + 1), d = rr * (1.7 + m * 0.45); ctx.fillStyle = '#9a948c'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(1.5, 4 * z), 0, TAU); ctx.fill(); }
      const scanned = (sd.scan || 0) & (1 << p.idx), col = S.colonies[p.id];
      if (col) { // orbital traffic and a ring that says "ours"
        ctx.strokeStyle = 'rgba(125,255,176,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 8; ctx.beginPath(); ctx.arc(x, y, rr + 14 * z + 4, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        for (let k = 0; k < 3; k++) { const a = t * 0.5 + k * 2.1; ctx.fillStyle = '#c8ffe0'; ctx.fillRect(x + Math.cos(a) * (rr + 14 * z + 4) - 1.5, y + Math.sin(a) * (rr + 14 * z + 4) - 1.5, 3, 3); }
      }
      ctx.font = '500 12px "DM Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = col ? '#7dffb0' : scanned ? 'rgba(220,230,255,0.85)' : 'rgba(220,230,255,0.4)';
      ctx.fillText(scanned ? p.name : '· unscanned ·', x, y + rr + 22 + (col ? 12 : 0));
      if (scanned && p.anomaly && !(sd.pdone & (1 << p.idx))) { ctx.fillStyle = '#ff8cf0'; ctx.fillText('◆ anomaly', x, y + rr + 36 + (col ? 12 : 0)); }
    }
    // points of interest
    for (const o of F.objs) drawObj(ctx, o, X(o.x), Y(o.y), z, t);
  }
  // loot
  for (const p of F.pods) { const x = X(p.x), y = Y(p.y), c = G.RES[p.res].c; ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, 12 * z + 4, c, 0.6); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = c; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2); ctx.fillRect(-3, -3, 6, 6); ctx.restore(); }
  // mining beams
  ctx.globalCompositeOperation = 'lighter';
  if (F.mineBeam) beam(ctx, X(s.x), Y(s.y), X(F.mineBeam.x), Y(F.mineBeam.y), G.RES[F.mineBeam.res].c, 3 + Math.sin(t * 30), 1);
  for (let i = 0; i < F.droneBeams.length; i++) { const r = F.droneBeams[i], a = t * 1.5 + i * 2, dx = r.x + Math.cos(a) * (r.r + 26), dyy = r.y + Math.sin(a) * (r.r + 26); beam(ctx, X(dx), Y(dyy), X(r.x), Y(r.y), '#ffd76a', 1.4, 0.8); ctx.fillStyle = '#ffd76a'; ctx.fillRect(X(dx) - 2.5, Y(dyy) - 2.5, 5, 5); }
  ctx.globalCompositeOperation = 'source-over';
  // ships
  for (const e of F.ents) {
    const x = X(e.x), y = Y(e.y); if (x < -80 || y < -80 || x > W + 80 || y > H + 80) continue;
    const col = e.team === 0 ? (e.def.isDrone ? '#9fe0ff' : '#7dc8ff') : (e.def.col || '#ff6a6a');
    R.drawShip(ctx, e.def.shape, x, y, e.def.struct ? t * 0.1 : e.ang, e.r * z, e.hitFlash > 0 ? '#ffffff' : col, { t: t + e.t, thrust: e.def.struct ? 0 : 0.6 });
    if (e.maxSh > 0 && e.sh > 0) { ctx.strokeStyle = 'rgba(120,200,255,' + (0.25 + (e.shFlash > 0 ? 0.6 : 0)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, e.r * z * 1.5 + 3, 0, TAU); ctx.stroke(); }
    if (e.team === 1 && (e.hp < e.maxHp || e.def.boss || F.focus === e)) {
      const bw = Math.max(26, e.r * z * 2), by = y - e.r * z * 1.6 - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x - bw / 2, by, bw * G.clamp(e.hp / e.maxHp, 0, 1), 4);
      if (e.maxSh) { ctx.fillStyle = '#6ee7ff'; ctx.fillRect(x - bw / 2, by - 4, bw * G.clamp(e.sh / e.maxSh, 0, 1), 2); }
      if (e.def.boss || e.def.struct) { ctx.font = '500 11px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd0d0'; ctx.fillText(e.def.n + ' · L' + e.level, x, by - 8); }
    }
    if (F.focus === e) { ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 1.5; const q = e.r * z * 1.7 + 6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x, y, q, k * Math.PI / 2 + t + 0.2, k * Math.PI / 2 + t + 1.1); ctx.stroke(); } }
  }
  // the player
  if (!F.dead) {
    const x = X(s.x), y = Y(s.y), hc = S.ship.hullClass, rr = (15 + hc * 3) * z;
    R.drawShip(ctx, G.HULLS[hc].shape, x, y, s.ang, rr, G.paintColor(), { t, thrust: s.thrust || 0, rust: hc === 0 && S.cos.paint === 'stock', lights: hc, trail: G.trailColor() });
    const st = G.shipStats();
    if (S.ship.sh > 1) { const a = 0.18 + 0.3 * (S.ship.sh / st.shield) + (s.shFlash > 0 ? 0.4 : 0); ctx.strokeStyle = 'rgba(110,231,255,' + Math.min(0.9, a) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rr * 1.7 + 4, 0, TAU); ctx.stroke(); }
    if (F.inv > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t * 20)) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rr * 2.2, 0, TAU); ctx.stroke(); }
    if (s.shFlash > 0) s.shFlash -= 0.016;
    // companions tag along
    let ci = 0; for (const id of S.active) { const cd = G.COMP[id]; if (!cd) continue; const a = t * 1.3 + ci * 2.2, d = rr * 2.2 + 16; R.drawComp(ctx, cd, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 6 + (S.comp[id].lvl >= 10 ? 2 : 0), t, S.comp[id].pris); ci++; }
    if (F.input.moveTo) { const mx = X(F.input.moveTo.x), my = Y(F.input.moveTo.y); ctx.strokeStyle = 'rgba(159,216,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx, my, 8 + 3 * Math.sin(t * 6), 0, TAU); ctx.stroke(); }
  }
  // projectiles and beams
  ctx.globalCompositeOperation = 'lighter';
  for (const sh of F.shots) { const x = X(sh.x), y = Y(sh.y); glow(ctx, x, y, (sh.type === 'plasma' ? 13 : 8) * z + 3, sh.col, 0.9); ctx.strokeStyle = sh.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sh.vx * 0.03 * z, y - sh.vy * 0.03 * z); ctx.stroke(); }
  for (const b of F.beams) beam(ctx, X(b.x1), Y(b.y1), X(b.x2), Y(b.y2), b.col, b.w, b.life / b.max);
  for (const p of F.parts) {
    const x = X(p.x), y = Y(p.y), a = p.life / p.max;
    if (p.ring) { ctx.strokeStyle = G.rgba(G.rgb(p.col), a * 0.8); ctx.lineWidth = 3 * a + 0.5; ctx.beginPath(); ctx.arc(x, y, p.size * z * (1 - a) * 0.5 + 2, 0, TAU); ctx.stroke(); }
    else { ctx.fillStyle = G.rgba(G.rgb(p.col), a); const sz = p.size * z * (0.4 + a * 0.6) + 0.5; ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = '500 12px "DM Mono", monospace'; ctx.textAlign = 'center';
  for (const tx of F.texts) { ctx.fillStyle = tx.col; ctx.globalAlpha = Math.min(1, tx.life * 2); ctx.fillText(tx.txt, X(tx.x), Y(tx.y)); }
  ctx.globalAlpha = 1;
  // objective marker: a ring on the target, or an arrow at the screen edge pointing to it
  const wp = G.waypoint && !F.dead ? G.waypoint() : null;
  if (wp) {
    const x = X(wp.x), y = Y(wp.y), on = x > 40 && y > 90 && x < W - 40 && y < H - 90;
    ctx.font = '500 12px "DM Mono", monospace'; ctx.textAlign = 'center';
    if (on) {
      const q = (t * 0.9) % 1; ctx.strokeStyle = 'rgba(255,215,106,' + (1 - q) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 26 + q * 26, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffd76a'; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x - 7, y - 46); ctx.lineTo(x + 7, y - 46); ctx.fill(); ctx.fillText(wp.l, x, y - 54);
    } else {
      const a = Math.atan2(y - H / 2, x - W / 2), ex = W / 2 + Math.cos(a) * (W / 2 - 70), ey = H / 2 + Math.sin(a) * (H / 2 - 120);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = '#ffd76a'; const k = 1 + 0.15 * Math.sin(t * 6); ctx.beginPath(); ctx.moveTo(18 * k, 0); ctx.lineTo(-8, 11); ctx.lineTo(-2, 0); ctx.lineTo(-8, -11); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ffd76a'; ctx.fillText(wp.l + ' · ' + G.fmt(Math.hypot(wp.x - s.x, wp.y - s.y)), G.clamp(ex - Math.cos(a) * 20, 110, W - 110), ey - Math.sin(a) * 30 + 4);
    }
  }
  // off-screen threat arrows
  for (const e of F.ents) { if (e.team !== 1 || e.sleep) continue; const x = X(e.x), y = Y(e.y); if (x > 0 && y > 0 && x < W && y < H) continue; const a = Math.atan2(y - H / 2, x - W / 2), d = Math.min(W, H) / 2 - 30; ctx.save(); ctx.translate(W / 2 + Math.cos(a) * d * (W / Math.min(W, H)) * 0.92, H / 2 + Math.sin(a) * d * (H / Math.min(W, H)) * 0.92); ctx.rotate(a); ctx.fillStyle = e.def.boss ? '#ffd24a' : 'rgba(255,90,90,0.85)'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, 7); ctx.lineTo(-6, -7); ctx.fill(); ctx.restore(); }
  // screen-space effects
  const st = G.shipStats(), hpf = S.ship.hp / st.hull;
  if (hpf < 0.35 || F.burn) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7); const a = F.burn ? 0.5 : (0.35 - hpf) * 1.6 * (0.7 + 0.3 * Math.sin(t * 6)); g.addColorStop(0, 'rgba(255,40,20,0)'); g.addColorStop(1, 'rgba(255,' + (F.burn ? 120 : 40) + ',20,' + a + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (F.warp > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(190,220,255,' + F.warp * 0.7 + ')'; ctx.lineWidth = 1.5; const rng = G.RNG(99); for (let i = 0; i < 90; i++) { const a = rng.range(0, TAU), d0 = rng.range(40, Math.max(W, H) * 0.7), l = d0 * F.warp * 0.9; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * d0, H / 2 + Math.sin(a) * d0); ctx.lineTo(W / 2 + Math.cos(a) * (d0 + l), H / 2 + Math.sin(a) * (d0 + l)); ctx.stroke(); } ctx.fillStyle = 'rgba(210,230,255,' + Math.pow(F.warp, 3) + ')'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  if (F.dead) { ctx.fillStyle = 'rgba(20,0,0,0.55)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = '#ff6a6a'; ctx.font = '500 34px "DM Mono", monospace'; ctx.fillText('SHIP LOST', W / 2, H / 2 - 10); ctx.font = '400 14px "DM Mono", monospace'; ctx.fillStyle = '#ffc0c0'; ctx.fillText(F.deathMsg || '', W / 2, H / 2 + 20); ctx.fillText('Rebuilding at home…', W / 2, H / 2 + 44); }
};
function beam(ctx, x1, y1, x2, y2, col, w, a) {
  const c = G.rgb(col);
  ctx.strokeStyle = G.rgba(c, 0.35 * a); ctx.lineWidth = w * 3.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = G.rgba(G.mix(c, [255, 255, 255], 0.6), a); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function drawDyson(ctx, x, y, r, stage, t) {
  ctx.save(); ctx.translate(x, y);
  const rr = r * 1.9;
  if (stage < 4) { // collectors, then a swarm
    const n = [0, 16, 40, 90][stage]; ctx.fillStyle = '#ffe9a8';
    for (let i = 0; i < n; i++) { const ring = i % 3, a = i / n * TAU * 3 + t * (0.12 - ring * 0.03), d = rr * (0.9 + ring * 0.16); ctx.save(); ctx.rotate(ring * 0.5); ctx.scale(1, 0.5 + ring * 0.2); ctx.fillRect(Math.cos(a) * d - 2, Math.sin(a) * d - 2, 4, 4); ctx.restore(); }
  } else { // lattice shell
    const seg = 28, cover = stage >= 5 ? 1 : 0.6;
    ctx.strokeStyle = 'rgba(255,225,150,0.75)'; ctx.lineWidth = Math.max(1, r * 0.03);
    for (let k = 0; k < 5; k++) { ctx.save(); ctx.rotate(k * 0.63 + t * 0.01); ctx.scale(1, 0.25 + k * 0.18); ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU * cover); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = 'rgba(255,215,130,' + (stage >= 5 ? 0.16 : 0.07) + ')'; ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill();
    for (let i = 0; i < seg; i++) { const a = i / seg * TAU + t * 0.02; ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.fillRect(Math.cos(a) * rr - 2, Math.sin(a) * rr - 2, 4, 4); }
    if (stage >= 6) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 0, rr * 6, 0); g.addColorStop(0, 'rgba(160,220,255,0.8)'); g.addColorStop(1, 'rgba(160,220,255,0)'); ctx.fillStyle = g; ctx.fillRect(rr * 0.9, -r * 0.2, rr * 6, r * 0.4); ctx.globalCompositeOperation = 'source-over'; }
  }
  ctx.restore();
}
function drawObj(ctx, o, x, y, z, t) {
  const col = OBJ_COL[o.type] || '#fff', r = o.r * z;
  ctx.save(); ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, r * 2.6, col, 0.25 + 0.1 * Math.sin(t * 2)); ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = col; ctx.fillStyle = 'rgba(14,18,28,0.95)'; ctx.lineWidth = Math.max(1.2, 2 * z);
  switch (o.type) {
    case 'station': {
      ctx.rotate(t * 0.15);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(Math.cos(a) * r - 3, Math.sin(a) * r - 3, 6, 6); ctx.fillStyle = 'rgba(14,18,28,0.95)'; }
      break;
    }
    case 'anomaly': {
      for (let k = 0; k < 3; k++) { ctx.save(); ctx.rotate(t * (0.6 + k * 0.3) * (k % 2 ? -1 : 1)); ctx.strokeStyle = G.rgba(G.rgb(col), 0.9 - k * 0.25); ctx.beginPath(); ctx.ellipse(0, 0, r * (0.5 + k * 0.3), r * (0.25 + k * 0.2), 0, 0, TAU); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); break;
    }
    case 'derelict': { ctx.rotate(0.6 + t * 0.03); poly(ctx, SHAPES[13], r * 0.8); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r); ctx.lineTo(r * 0.15, r); ctx.stroke(); break; }
    case 'ruins': { ctx.rotate(t * 0.05); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.rect(r * 0.5, -r * 0.12, r * 0.55, r * 0.24); ctx.fill(); ctx.stroke(); ctx.restore(); } ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, TAU); ctx.stroke(); break; }
    case 'wormhole': case 'stargate': {
      if (o.type === 'stargate') { ctx.lineWidth = 5 * z + 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) { ctx.strokeStyle = G.rgba(G.rgb(col), 0.6 - k * 0.08); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * (0.9 - k * 0.14), t * (1 + k * 0.4), t * (1 + k * 0.4) + 4.4); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fill(); break;
    }
    case 'signal': { for (let k = 0; k < 3; k++) { const q = ((t * 0.6 + k / 3) % 1); ctx.strokeStyle = 'rgba(255,255,255,' + (1 - q) + ')'; ctx.beginPath(); ctx.arc(0, 0, r * q * 2.2, 0, TAU); ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.fillRect(-3, -3, 6, 6); break; }
  }
  ctx.restore();
  ctx.font = '500 12px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.fillText(o.name, x, y + r + 20);
}

/* ---------- small portraits ---------- */
R.drawComp = function (ctx, cd, x, y, r, t, pris) {
  const c = G.rgb(cd.col), bob = Math.sin(t * 3 + cd.shape) * r * 0.15;
  ctx.save(); ctx.translate(x, y + bob);
  if (pris) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, r * 2.6, 'hsl(' + ((t * 80) % 360) + ',90%,70%)'.replace(/hsl.*/, '#ffffff'), 0.5); ctx.globalCompositeOperation = 'source-over'; }
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.2);
  g.addColorStop(0, G.rgba(G.mix(c, [255, 255, 255], 0.6), 1)); g.addColorStop(1, G.rgba(G.mix(c, [0, 0, 0], 0.35), 1));
  ctx.fillStyle = g; ctx.strokeStyle = G.rgba(c, 1); ctx.lineWidth = Math.max(1, r * 0.1);
  switch (cd.shape) {
    case 0: ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.quadraticCurveTo(0, -r * 1.2, -r * 1.2, -r * 0.2); ctx.lineTo(-r * 1.8, 0); ctx.lineTo(-r * 1.2, r * 0.2); ctx.quadraticCurveTo(0, r * 1.2, r * 1.3, 0); ctx.fill(); break;
    case 1: ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); ctx.fill(); for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.5, s * r * 0.7); ctx.lineTo(k * r * 0.7, s * r * 1.3); ctx.stroke(); } break;
    case 2: ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.9, r * 0.8, 0, 0, TAU); ctx.fill(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.3, -r * 0.5); ctx.lineTo(s * r * 0.9, -r * 1.4); ctx.lineTo(s * r * 0.9, -r * 0.3); ctx.fill(); } break;
    case 3: ctx.beginPath(); ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6); ctx.fill(); ctx.stroke(); break;
    case 4: ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.9, 0, 0, TAU); ctx.fill(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.9, -r * 0.1, r * 0.7, r * (0.5 + 0.3 * Math.sin(t * 12)), s * 0.5, 0, TAU); ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1; } break;
    case 5: ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * 0.6, 0, 0, TAU); ctx.fill(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 1.1, s * r * 0.2); ctx.lineTo(r * 1.7, s * r * 0.6); ctx.stroke(); } break;
    default: ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, r * 1.8, cd.col, 0.8); ctx.globalCompositeOperation = 'source-over'; ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#0a0a12'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.25 * s + r * 0.15, -r * 0.1, Math.max(0.8, r * 0.14), 0, TAU); ctx.fill(); }
  ctx.restore();
};
R.compIcon = function (cv, id) { const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); const c = G.S.comp[id]; R.drawComp(ctx, G.COMP[id], cv.width / 2, cv.height / 2, cv.width * 0.24, G.S.t, c && c.pris); };
/* A procedural alien face from a civilisation's seed. */
R.alien = function (cv, civ) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, rng = G.RNG(civ.seed), h = civ.hue;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, H * 0.4, 5, W / 2, H / 2, W * 0.8); bg.addColorStop(0, 'hsla(' + h + ',50%,22%,1)'); bg.addColorStop(1, 'hsla(' + h + ',60%,5%,1)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.52, hw = W * rng.range(0.2, 0.32), hh = H * rng.range(0.24, 0.36), body = civ.body;
  const skin = 'hsl(' + ((h + rng.i(-30, 30) + 360) % 360) + ',' + rng.i(35, 70) + '%,' + rng.i(38, 60) + '%)', dark = 'hsl(' + h + ',40%,18%)';
  ctx.fillStyle = skin; ctx.strokeStyle = dark; ctx.lineWidth = 2;
  // shoulders
  ctx.beginPath(); ctx.ellipse(cx, H * 1.02, W * 0.42, H * 0.24, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // appendages behind the head
  const napp = rng.i(2, 5);
  for (let i = 0; i < napp; i++) for (const s of [-1, 1]) {
    const a = -Math.PI / 2 + s * (0.25 + i * 0.32), len = hh * rng.range(0.5, 1.2);
    ctx.beginPath();
    if (body === 'cephalopod' || body === 'aquatic' || body === 'fungal') { ctx.moveTo(cx + Math.cos(a) * hw * 0.8, cy + Math.sin(a) * hh * 0.8); ctx.quadraticCurveTo(cx + Math.cos(a) * (hw + len), cy + Math.sin(a) * (hh + len * 0.4), cx + Math.cos(a + s * 0.5) * (hw + len), cy + Math.sin(a + s * 0.5) * (hh + len)); ctx.lineWidth = 5; ctx.strokeStyle = skin; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = dark; }
    else if (body === 'insectoid' || body === 'avian' || body === 'reptilian') { ctx.moveTo(cx + Math.cos(a) * hw * 0.7, cy + Math.sin(a) * hh * 0.7); ctx.lineTo(cx + Math.cos(a) * (hw + len * 0.7), cy + Math.sin(a) * (hh + len * 0.7)); ctx.lineTo(cx + Math.cos(a + s * 0.25) * hw * 0.9, cy + Math.sin(a + s * 0.25) * hh * 0.9); ctx.fill(); ctx.stroke(); }
    else if (body === 'crystalline' || body === 'mechanical') { ctx.save(); ctx.translate(cx + Math.cos(a) * hw, cy + Math.sin(a) * hh); ctx.rotate(a); ctx.fillRect(0, -4, len * 0.7, 8); ctx.strokeRect(0, -4, len * 0.7, 8); ctx.restore(); }
  }
  // head
  ctx.beginPath();
  if (body === 'crystalline' || body === 'mechanical') { const n = body === 'mechanical' ? 4 : rng.i(5, 7); for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2 + (n === 4 ? Math.PI / 4 : 0), px = cx + Math.cos(a) * hw * 1.1, py = cy + Math.sin(a) * hh * 1.05; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); }
  else ctx.ellipse(cx, cy, hw, hh, 0, 0, TAU);
  ctx.fill(); ctx.stroke();
  if (body === 'gaseous' || body === 'energy') { ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx, cy, hw * 2, '#ffffff', 0.35); ctx.globalCompositeOperation = 'source-over'; }
  // markings
  ctx.fillStyle = 'hsla(' + ((h + 180) % 360) + ',60%,60%,0.35)';
  for (let i = 0; i < rng.i(0, 4); i++) { const y = cy - hh * 0.7 + i * hh * 0.2; ctx.fillRect(cx - hw * 0.5, y, hw, 2); }
  // eyes
  const eyes = rng.pick([1, 2, 2, 2, 3, 4, 6]), ey = cy - hh * rng.range(0, 0.25), ec = 'hsl(' + ((h + rng.i(120, 240)) % 360) + ',90%,65%)';
  const eye = (x, y, r) => { ctx.fillStyle = '#05050a'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r, 0, 0, TAU); ctx.fill(); ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.18, 0, TAU); ctx.fill(); };
  const er = hw * rng.range(0.14, 0.24);
  if (eyes === 1) eye(cx, ey, er * 1.6);
  else if (eyes === 3) { eye(cx - hw * 0.45, ey, er); eye(cx + hw * 0.45, ey, er); eye(cx, ey - hh * 0.35, er * 0.8); }
  else for (let i = 0; i < eyes / 2; i++) { const yy = ey + i * er * 2.2, xx = hw * (0.45 - i * 0.1); eye(cx - xx, yy, er * (1 - i * 0.2)); eye(cx + xx, yy, er * (1 - i * 0.2)); }
  // mouth
  ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.beginPath();
  const my = cy + hh * 0.55, mk = rng.i(0, 2);
  if (mk === 0) { ctx.moveTo(cx - hw * 0.3, my); ctx.quadraticCurveTo(cx, my + hh * 0.1, cx + hw * 0.3, my); }
  else if (mk === 1) { for (let i = -2; i <= 2; i++) { ctx.moveTo(cx + i * hw * 0.12, my - 3); ctx.lineTo(cx + i * hw * 0.12, my + 5); } }
  else { ctx.moveTo(cx - hw * 0.15, my); ctx.lineTo(cx, my + hh * 0.14); ctx.lineTo(cx + hw * 0.15, my); }
  ctx.stroke();
};

/* ---------- minimap ---------- */
R.minimap = function (cv) {
  const ctx = cv.getContext('2d'), F = G.flight, sys = F.sys, N = cv.width; if (!sys) return;
  ctx.clearRect(0, 0, N, N);
  const sc = N / 2 / (sys.radius + 300), X = x => N / 2 + x * sc, Y = y => N / 2 + y * sc;
  ctx.fillStyle = 'rgba(4,6,12,0.82)'; ctx.beginPath(); ctx.arc(N / 2, N / 2, N / 2 - 1, 0, TAU); ctx.fill();
  if (!F.erased) {
    ctx.strokeStyle = 'rgba(160,190,255,0.14)'; ctx.lineWidth = 1;
    for (const p of sys.planets) { ctx.beginPath(); ctx.arc(N / 2, N / 2, p.orbit * sc, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgba(190,170,150,0.5)'; for (const r of F.roids) ctx.fillRect(X(r.x), Y(r.y), 1.5, 1.5);
    ctx.fillStyle = sys.cls === 'BH' ? '#ff9a4a' : sys.star.c; ctx.beginPath(); ctx.arc(N / 2, N / 2, Math.max(3, sys.star.r * sc), 0, TAU); ctx.fill();
    for (const p of sys.planets) { const pp = G.planetPos(p); ctx.fillStyle = G.S.colonies[p.id] ? '#7dffb0' : G.PTYPES[p.type].pal[2]; ctx.beginPath(); ctx.arc(X(pp[0]), Y(pp[1]), Math.max(2.5, p.r * sc), 0, TAU); ctx.fill(); }
    for (const o of F.objs) { ctx.fillStyle = OBJ_COL[o.type] || '#fff'; ctx.save(); ctx.translate(X(o.x), Y(o.y)); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore(); }
  }
  for (const e of F.ents) { ctx.fillStyle = e.team === 0 ? '#7dc8ff' : e.def.boss || e.def.struct ? '#ffd24a' : '#ff5a5a'; const q = e.def.boss || e.def.struct ? 5 : 3; ctx.fillRect(X(e.x) - q / 2, Y(e.y) - q / 2, q, q); }
  const s = F.ship; ctx.save(); ctx.translate(X(s.x), Y(s.y)); ctx.rotate(s.ang); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, 4); ctx.lineTo(-4, -4); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(140,180,255,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(N / 2, N / 2, N / 2 - 1, 0, TAU); ctx.stroke();
};
