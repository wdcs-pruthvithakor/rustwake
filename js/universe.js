'use strict';
/* Rustwake — the deterministic universe. Same seed + same coordinates = same system, always.
   Nothing here is saved; only the player's changes are. */

G.CELL = 100;       // galaxy units per star cell
G.REGION = 10;      // cells per civilisation region
G.uniCache = { sys: new Map(), civ: new Map() };
G.resetUniverse = function () { G.uniCache.sys.clear(); G.uniCache.civ.clear(); G._useed = G.hash(G.S.seed, G.S.uni.n, 7717, 3); };
G.um = k => { const v = G.UM && G.UM[k]; return v == null ? 1 : v; };   // universe modifier (multiplicative, fixed per universe)
G.umFlag = k => !!(G.UM && G.UM[k]);

const ZONE = { // affinity [inner, mid, outer]
  terran: [0.1, 3, 0.2], ocean: [0.1, 2.5, 0.4], jungle: [0.4, 2.5, 0.1], savanna: [0.8, 2, 0.1], desert: [2.5, 1.2, 0.1], tundra: [0, 1, 2],
  ice: [0, 0.3, 3], volcanic: [3, 0.5, 0.1], barren: [1.5, 1, 1.5], toxic: [1.5, 1.5, 0.5], crystal: [0.5, 1, 1], gas: [0.1, 1, 3], storm: [0, 0.6, 3],
  metallic: [2, 1, 0.5], irradiated: [2.5, 0.6, 0.3], dark: [0.2, 0.6, 2], shattered: [1.5, 1, 1], exotic: [1, 1, 1], living: [0.3, 2, 0.3], machine: [1, 1, 1], hollow: [0.5, 1, 1]
};

G.cellHasStar = function (cx, cy) {
  if (cx === 0 && cy === 0) return true;
  const n = G._dn || (G._dn = G.noise3(9173));
  const dens = (0.22 + 0.62 * n(cx / 7 + 100, cy / 7 + 100, G._useed % 997)) * G.um('density');
  return G.hash(G._useed, cx, cy, 11) / 4294967296 < dens;
};
G.sysLevel = function (cx, cy) { const d = Math.hypot(cx, cy); return Math.max(1, Math.floor(d * 0.8 + 0.6)); };
G.sysId = (cx, cy) => cx + ',' + cy;
G.parseId = id => { const p = id.split(','); return [parseInt(p[0], 10), parseInt(p[1], 10)]; };

/* ---------- Civilisations ---------- */
G.civOfRegion = function (rx, ry) {
  const key = rx + ',' + ry, c = G.uniCache.civ;
  if (c.has(key)) return c.get(key);
  let civ = null;
  const rng = G.RNG(G.hash(G._useed, rx, ry, 501));
  const far = Math.hypot(rx, ry);
  if (!(rx === 0 && ry === 0) && rng.f() < Math.min(0.9, 0.42 * (G.um('civ') > 1 ? 1.6 : 1))) {
    // find a star cell for the capital
    let cap = null;
    for (let tries = 0; tries < 30 && !cap; tries++) {
      const cx = rx * G.REGION + rng.i(1, G.REGION - 2), cy = ry * G.REGION + rng.i(1, G.REGION - 2);
      if (G.cellHasStar(cx, cy) && Math.hypot(cx, cy) > 3.5) cap = { cx, cy };
    }
    if (cap) {
      const pers = rng.pick(G.PERSONALITIES);
      const hue = rng.i(0, 359);
      const boost = G.um('civ');
      const st = () => G.clamp(rng.i(1, 5) + (boost > 1 ? 1 : 0), 1, 5);
      const name = G.makeName(rng);
      const raws = ['iron', 'copper', 'silicon', 'crystal', 'gas', 'titanium', 'uranium', 'platinum', 'steel', 'circuits', 'fuel', 'rcrystal', 'alloy'];
      const sh = rng.shuffle(raws);
      civ = {
        id: 'c' + key, name: 'The ' + name, species: name + rng.pick(['ian', 'i', 'ite', 'an', 'oid', 'ar']),
        cap, capId: G.sysId(cap.cx, cap.cy), rad: rng.range(1.8, 3.4), hue, color: 'hsl(' + hue + ',75%,65%)',
        gov: rng.pick(G.GOVS), pers, quirk: rng.pick(G.QUIRKS), body: rng.pick(G.BODIES),
        tech: st(), mil: st(), eco: st(), level: Math.round(G.sysLevel(cap.cx, cap.cy) * (boost > 1 ? 1.5 : 1)),
        sells: sh.slice(0, 3), wants: sh.slice(3, 5), seed: G.hash(G._useed, rx, ry, 777), far
      };
    }
  }
  c.set(key, civ);
  return civ;
};
G.civOfCell = function (cx, cy) {
  const rx = Math.floor(cx / G.REGION), ry = Math.floor(cy / G.REGION);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const civ = G.civOfRegion(rx + dx, ry + dy);
    if (civ && Math.hypot(cx - civ.cap.cx, cy - civ.cap.cy) <= civ.rad) return civ;
  }
  return null;
};
G.civById = function (id) { const p = id.slice(1).split(','); return G.civOfRegion(parseInt(p[0], 10), parseInt(p[1], 10)); };

/* ---------- Systems ---------- */
G.sysAt = function (cx, cy) {
  const id = G.sysId(cx, cy), c = G.uniCache.sys;
  if (c.has(id)) return c.get(id);
  const s = G.cellHasStar(cx, cy) ? genSystem(cx, cy) : null;
  if (c.size > 6000) c.clear();
  c.set(id, s);
  return s;
};
G.sysById = function (id) { const p = G.parseId(id); return G.sysAt(p[0], p[1]); };
G.planetById = function (pid) { const k = pid.split(':'); const s = G.sysById(k[0]); return s ? s.planets[parseInt(k[1], 10)] : null; };

function pickRes(rng, level, n) {
  const pool = [];
  for (const id of ['iron', 'copper', 'silicon', 'crystal', 'gas', 'titanium', 'uranium', 'platinum', 'darkcrystal', 'voidgas', 'quantumore', 'stellarheart', 'ancientmatter', 'chronocrystal', 'paradox']) {
    const r = G.RES[id];
    if (r.minL > level) continue;
    const w = r.t === 'common' ? 10 : r.t === 'uncommon' ? 5 : r.t === 'rare' ? 2.2 : r.t === 'legendary' ? 0.25 : 0.06;
    pool.push([id, w]);
  }
  const out = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) { const p = rng.weighted(pool); if (!out.includes(p)) out.push(p); }
  return out;
}

function genSystem(cx, cy) {
  const home = cx === 0 && cy === 0;
  const rng = G.RNG(G.hash(G._useed, cx, cy, 1));
  const level = home ? 1 : G.sysLevel(cx, cy);
  const sys = { id: G.sysId(cx, cy), cx, cy, level, home };
  sys.x = (cx + (home ? 0.5 : rng.range(0.15, 0.85))) * G.CELL;
  sys.y = (cy + (home ? 0.5 : rng.range(0.15, 0.85))) * G.CELL;
  sys.name = G.makeName(rng);
  sys.seed = G.hash(G._useed, cx, cy, 2);
  let cls = rng.weighted(Object.keys(G.STARS).filter(k => (G.STARS[k].minL || 0) <= level).map(k => [k, G.STARS[k].w]));
  if (home) cls = 'G';
  sys.cls = cls; sys.star = G.STARS[cls];

  const civ = home ? null : G.civOfCell(cx, cy);
  sys.civ = civ ? civ.id : null;
  sys.capital = !!(civ && civ.cap.cx === cx && civ.cap.cy === cy);

  // planets
  const n = home ? 4 : cls === 'BH' || cls === 'NS' || cls === 'PU' ? rng.i(0, 3) : rng.weighted([[1, 2], [2, 4], [3, 6], [4, 6], [5, 5], [6, 3], [7, 2], [8, 1]]);
  sys.planets = [];
  let orbit = sys.star.r + rng.range(360, 480);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const zi = t < 0.34 ? 0 : t < 0.67 ? 1 : 2;
    let type = rng.weighted(Object.keys(G.PTYPES).filter(k => (G.PTYPES[k].minL || 0) <= level).map(k => [k, G.PTYPES[k].w * ZONE[k][zi]]));
    if (home) type = ['barren', 'terran', 'desert', 'gas'][i];
    const pt = G.PTYPES[type];
    const p = { id: sys.id + ':' + i, idx: i, sys: sys.id, type, name: sys.name + ' ' + G.roman(i), seed: G.hash(sys.seed, i, 5, 9) };
    p.r = pt.big ? rng.range(72, 98) : rng.range(32, 58);
    p.orbit = orbit; orbit += p.r * 2 + rng.range(240, 420);
    p.a0 = rng.range(0, G.TAU); p.spd = (rng.chance(0.9) ? 1 : -1) * 26 / Math.pow(p.orbit, 1.15);
    p.slots = Math.max(3, Math.round(3 + (p.r - 30) / 6 + rng.range(0, 3)) - (pt.big ? 6 : 0));
    p.moons = pt.big ? rng.i(1, 5) : rng.weighted([[0, 5], [1, 3], [2, 1], [3, 0.4]]);
    p.ring = pt.big ? rng.chance(0.55) : rng.chance(0.06);
    p.hab = G.clamp(Math.round(pt.hab + rng.range(-14, 14)), 0, 100);
    p.temp = Math.round((zi === 0 ? rng.range(420, 900) : zi === 1 ? rng.range(240, 340) : rng.range(40, 180)) * (sys.star.e > 1.5 ? 1.3 : 1));
    p.grav = Math.round((pt.big ? rng.range(1.6, 3.2) : rng.range(0.3, 1.9)) * 100) / 100;
    p.atm = pt.big ? 'Crushing' : !pt.atm ? 'None' : rng.pick(['Thin', 'Breathable', 'Dense', 'Corrosive', 'Inert']);
    p.res = {};
    for (const rid in pt.bias) {
      if ((G.RES[rid].minL || 0) > level + 2) continue;
      if (!rng.chance(0.85)) continue;
      p.res[rid] = G.clamp(Math.round(pt.bias[rid] * rng.range(0.45, 1.15)), 1, 5);
    }
    if (rng.chance(0.25)) { const extra = pickRes(rng, level, 1)[0]; if (extra && !p.res[extra]) p.res[extra] = rng.i(1, 2); }
    p.res.energy = G.clamp(Math.round(sys.star.e * (1.45 - t) * 2.6), 1, 5);
    const tk = Object.keys(G.TRAITS).filter(k => (G.TRAITS[k].minL || 0) <= level);
    p.trait = rng.chance(0.3) ? rng.pick(tk) : null;
    p.anomaly = rng.chance(Math.min(0.6, 0.07 * G.um('anomaly')));
    if (home && i === 1) { p.name = 'Haven'; p.hab = 78; p.slots = 9; p.res = { iron: 3, copper: 2, silicon: 2, crystal: 2, energy: 3 }; p.trait = null; p.anomaly = false; p.r = 50; }
    if (home && i === 0) { p.res = { iron: 4, silicon: 3, energy: 5 }; p.trait = 'veins'; p.anomaly = false; }
    if (home && i === 2) { p.res = { silicon: 4, copper: 3, titanium: 1, energy: 2 }; p.anomaly = false; }
    if (home && i === 3) { p.res = { gas: 5, energy: 1 }; p.anomaly = true; }
    sys.planets.push(p);
  }
  sys.radius = Math.max(2200, orbit + 300);

  // asteroid belts
  sys.belts = [];
  const nb = home ? 1 : rng.weighted([[0, 1], [1, 5], [2, 3], [3, 1]]);
  for (let b = 0; b < nb; b++) {
    let r;
    if (sys.planets.length > 1) { const k = rng.i(0, sys.planets.length - 2); r = (sys.planets[k].orbit + sys.planets[k + 1].orbit) / 2 + rng.range(-30, 30); }
    else r = sys.star.r + rng.range(600, 1700);
    const belt = { r, res: home ? ['iron', 'iron', 'crystal', 'copper', 'silicon'] : pickRes(rng, level, rng.i(2, 3)), n: rng.i(26, 46), rich: rng.range(0.8, 1.6), seed: G.hash(sys.seed, b, 31, 7) };
    sys.belts.push(belt);
  }
  if (home) sys.belts[0].r = (sys.planets[1].orbit + sys.planets[2].orbit) / 2;

  // what else is here
  if (home) sys.special = 'home';
  else if (sys.capital) sys.special = 'capital';
  else {
    const ruinsW = G.umFlag('ruins') ? 30 : 6, nestW = G.umFlag('fauna') ? 30 : 6;
    sys.special = rng.weighted([['none', 34], ['anomaly', Math.min(60, 13 * Math.sqrt(G.um('anomaly')))], ['derelict', 10], ['station', civ ? 14 : 7], ['pirate', civ ? 3 : 11], ['ruins', ruinsW], ['wormhole', level > 3 ? 3 : 0], ['lair', level >= 5 ? 5 : 0], ['nest', nestW]]);
  }
  // which faction haunts the place
  const fl = [['pirate', 10], ['creature', G.umFlag('fauna') ? 14 : 4]];
  for (const f of ['ai', 'ancient', 'dim']) if (G.FACTIONS[f].minL <= level) fl.push([f, 3]);
  sys.faction = sys.special === 'nest' ? 'creature' : sys.special === 'pirate' ? 'pirate' : sys.special === 'ruins' && level >= 18 ? 'ancient' : rng.weighted(fl);
  sys.hue = rng.i(0, 359);
  sys.hue2 = (sys.hue + rng.i(40, 160)) % 360;
  return sys;
}

/* Systems within a radius (galaxy units) of a point. */
G.systemsNear = function (x, y, rad) {
  const out = [];
  const c0x = Math.floor((x - rad) / G.CELL), c1x = Math.floor((x + rad) / G.CELL), c0y = Math.floor((y - rad) / G.CELL), c1y = Math.floor((y + rad) / G.CELL);
  for (let cx = c0x; cx <= c1x; cx++) for (let cy = c0y; cy <= c1y; cy++) {
    const s = G.sysAt(cx, cy);
    if (s && Math.hypot(s.x - x, s.y - y) <= rad) out.push(s);
  }
  return out;
};
/* Nearest star to an arbitrary cell — used to pin story locations to real systems. */
G.nearestSystem = function (cx, cy) {
  for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const s = G.sysAt(cx + dx, cy + dy); if (s) return s;
  }
  return null;
};
G.sectorName = function (cx, cy) {
  const rx = Math.floor(cx / G.REGION), ry = Math.floor(cy / G.REGION);
  if (rx === 0 && ry === 0) return 'Home Sector';
  return G.makeName(G.RNG(G.hash(G._useed, rx, ry, 4242)), 1) + ' Sector';
};
