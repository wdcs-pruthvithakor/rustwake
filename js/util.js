'use strict';
/* Rustwake — shared helpers. Everything hangs off one global: G. */
var G = globalThis.G = {};

G.TAU = Math.PI * 2;
G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
G.lerp = (a, b, t) => a + (b - a) * t;
G.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* 32-bit integer hash of up to four ints. Same inputs, same output, forever. */
G.hash = function (a, b, c, d) {
  let h = 0x9e3779b9 ^ (a | 0);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= (b | 0) + 0x7f4a7c15; h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= (c | 0) + 0x165667b1; h = Math.imul(h ^ (h >>> 16), 0x27d4eb2f);
  h ^= (d | 0) + 0x9e3779b1; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return (h ^ (h >>> 16)) >>> 0;
};
G.hashStr = function (s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

/* Seeded RNG (mulberry32) with a few conveniences. */
G.RNG = function (seed) {
  let s = seed >>> 0;
  const r = {
    f() { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    range(a, b) { return a + (b - a) * r.f(); },
    i(a, b) { return a + Math.floor(r.f() * (b - a + 1)); },
    chance(p) { return r.f() < p; },
    pick(arr) { return arr[Math.floor(r.f() * arr.length)]; },
    weighted(pairs) { // [[item, weight], ...]
      let tot = 0; for (const p of pairs) tot += p[1];
      let x = r.f() * tot;
      for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; }
      return pairs[pairs.length - 1][0];
    },
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r.f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  };
  return r;
};
G.rand = G.RNG((Date.now() ^ 0x5bd1e995) >>> 0); // non-deterministic stream for moment-to-moment play

/* Number formatting for numbers that will not stay small. */
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
G.fmt = function (n) {
  if (n == null || isNaN(n)) return '0';
  const neg = n < 0; n = Math.abs(n);
  let out;
  if (n < 1000) out = n < 10 && n % 1 ? n.toFixed(1) : String(Math.floor(n));
  else {
    const e = Math.floor(Math.log10(n) / 3);
    if (e < SUF.length) { const v = n / Math.pow(1000, e); out = (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + SUF[e]; }
    else out = n.toExponential(2).replace('+', '');
  }
  return (neg ? '-' : '') + out;
};
G.fmtRate = n => (n >= 0 ? '+' : '-') + (Math.abs(n) < 10 ? Math.abs(n).toFixed(2) : G.fmt(Math.abs(n))) + '/s';
G.fmtT = function (s) {
  s = Math.max(0, Math.floor(s));
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor(s % 3600 / 60) + 'm';
  return Math.floor(s / 86400) + 'd ' + Math.floor(s % 86400 / 3600) + 'h';
};
G.pct = v => Math.round(v * 100) + '%';
G.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
G.stars = (n, max) => '<span class="stars">' + '★'.repeat(n) + '<i>' + '★'.repeat(Math.max(0, (max || 5) - n)) + '</i></span>';

/* 3D value noise, 0..1. Sampled on a cylinder it gives textures that tile horizontally. */
G.noise3 = function (seed) {
  const h = (x, y, z) => G.hash(x, y, z, seed) / 4294967296;
  const sm = t => t * t * (3 - 2 * t);
  return function (x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf),
      zf);
  };
};
G.fbm = function (n, x, y, z, oct) {
  let v = 0, a = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { v += a * n(x * f, y * f, z * f); tot += a; a *= 0.5; f *= 2.03; }
  return v / tot;
};

/* Colour helpers: '#rrggbb' <-> [r,g,b] */
G.rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
G.mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
G.rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';

/* Procedural names. */
const SY_A = ['xe', 'vey', 'kor', 'zen', 'tha', 'ul', 'mir', 'qua', 'or', 'ny', 'sol', 'dra', 'eph', 'ka', 'lu', 'om', 'ry', 'ves', 'ith', 'ar', 'bel', 'cy', 'tor', 'hal', 'ix', 'ju', 'no', 'pra', 'sy', 'ty', 'va', 'wen', 'yl', 'zu', 'ae', 'gho', 'shi', 'fen', 'ob', 'cra'];
const SY_B = ['lo', 'ra', 'na', 'ri', 'th', 'ko', 'mi', 'da', 'se', 've', 'tu', 'la', 'ro', 'xi', 'ne', 'po', 'ga', 'ze', 'ha', 'ly', 'mo', 'di', 'su', 'ke'];
const SY_C = ['ra', 'n', 'x', 's', 'th', 'ria', 'on', 'ar', 'is', 'um', 'a', 'os', 'el', 'ix', 'en', 'ur', 'ia', 'ax', 'eth', 'or'];
G.makeName = function (rng, minSyl) {
  let s = rng.pick(SY_A);
  const mid = (minSyl || 0) + (rng.chance(0.55) ? 1 : 0);
  for (let i = 0; i < mid; i++) s += rng.pick(SY_B);
  s += rng.pick(SY_C);
  return s[0].toUpperCase() + s.slice(1);
};
G.roman = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || String(n + 1);

G.hslHex = function (h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t % 1 + 1) % 1; const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; return ('0' + Math.round(v * 255).toString(16)).slice(-2); };
  return '#' + f(h + 1 / 3) + f(h) + f(h - 1 / 3);
};
