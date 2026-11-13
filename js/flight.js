'use strict';
/* Rustwake — the real-time layer: flying, mining, fighting inside one star system. */

// Structures behave like stationary enemies.
Object.assign(G.ENEMY, {
  pbase: { id: 'pbase', n: 'Pirate Base', fac: 'pirate', th: 12, hp: 520, sh: 160, arm: 0.3, dmg: 9, w: 'missile', range: 720, rate: 1.4, spd: 0, r: 46, large: 1, struct: 1, shape: 90, col: '#ff5c5c' },
  nest: { id: 'nest', n: 'Brood Nest', fac: 'creature', th: 10, hp: 700, sh: 0, arm: 0.2, dmg: 4, w: 'drone', range: 800, rate: 3.2, spd: 0, r: 44, large: 1, struct: 1, shape: 91, col: '#b4ff6a' },
  citadel: { id: 'citadel', n: 'Citadel', fac: 'empire', th: 30, hp: 3000, sh: 2000, arm: 0.5, dmg: 24, w: 'rail', range: 900, rate: 1.2, spd: 0, r: 60, large: 1, struct: 1, boss: 1, shape: 92, col: '#c08aff' },
  edrone: { id: 'edrone', n: 'Attack Drone', fac: 'pirate', th: 0.3, hp: 8, sh: 0, arm: 0, dmg: 2, w: 'laser', range: 220, rate: 0.5, spd: 1.7, r: 6, fast: 1, isDrone: 1, shape: 10, col: '#ffb0a0' }
});

const F = G.flight = {
  sys: null, ship: { isPlayer: true, team: 0, x: 0, y: 0, vx: 0, vy: 0, ang: 0, r: 15 },
  ents: [], shots: [], parts: [], beams: [], texts: [], pods: [], roids: [], objs: [],
  heat: 0, wave: 0, raid: false, time: 0, inv: 0, wcd: [], near: null, focus: null, dead: 0, warp: 0,
  cam: { x: 0, y: 0, zoom: 0.85, shake: 0 }, input: { x: 0, y: 0, boost: false, mine: false, moveTo: null },
  mineBeam: null, droneBeams: [], cargoFull: -99, safe: true, burn: 0, lastHit: -99, abilityCd: 0
};

G.planetPos = function (p) { const a = p.a0 + p.spd * G.S.t * 0.5; return [Math.cos(a) * p.orbit, Math.sin(a) * p.orbit]; };

const eMult = L => Math.pow(1.16, Math.max(0, L - 1)) * G.um('enemy');

function makeEnemy(id, x, y, level, elite) {
  const d = G.ENEMY[id], m = eMult(level) * (elite || 1);
  const e = {
    def: d, id, team: 1, x, y, vx: 0, vy: 0, ang: G.rand.range(0, G.TAU), r: d.r * (elite > 1.5 ? 1.2 : 1),
    hp: d.hp * m * G.um('hull'), sh: d.sh * m, arm: d.arm, dmg: d.dmg * m * G.um('dmg'), w: d.w, range: d.range, rate: d.rate, spd: d.spd,
    fast: d.fast, large: d.large, cd: G.rand.range(0.3, 1.5), level, lastHit: -99, t: G.rand.range(0, 10), strafe: G.rand.chance(0.5) ? 1 : -1, kids: 0
  };
  e.maxHp = e.hp; e.maxSh = e.sh;
  if (!G.S.codex.enemy[id] && !d.isDrone) G.S.codex.enemy[id] = 1;
  return e;
}
F.spawnWave = function (fac, level, budget, boss, cx, cy, spread) {
  const f = G.FACTIONS[fac] || G.FACTIONS.pirate;
  const s = F.ship, a0 = G.rand.range(0, G.TAU);
  const ox = cx == null ? s.x + Math.cos(a0) * 1050 : cx, oy = cy == null ? s.y + Math.sin(a0) * 1050 : cy;
  const list = [];
  if (boss) { list.push(f.boss); budget -= G.ENEMY[f.boss].th * 0.4; }
  let guard = 0;
  while (budget > 0.5 && list.length < 14 && guard++ < 60) {
    const opts = f.units.filter(u => G.ENEMY[u].th <= budget + 0.5);
    if (!opts.length) break;
    const u = G.rand.pick(opts); list.push(u); budget -= G.ENEMY[u].th;
  }
  const elite = budget > 3 ? 1 + budget / (list.length * 3 + 1) : 1; // leftover threat makes the wave tougher instead of bigger
  for (const id of list) {
    const e = makeEnemy(id, ox + G.rand.range(-1, 1) * (spread || 160), oy + G.rand.range(-1, 1) * (spread || 160), level, elite);
    F.ents.push(e);
  }
  return list.length;
};
F.spawnRaid = function (fac, level, power) {
  F.raid = true;
  F.spawnWave(fac, level, 5 + G.notoriety() * 3, G.notoriety() > 2.5);
};
F.hostileNear = function (rad) {
  const s = F.ship;
  for (const e of F.ents) if (e.team === 1 && !e.def.struct && Math.hypot(e.x - s.x, e.y - s.y) < rad) return true;
  return false;
};
F.hostileCount = function () { let n = 0; for (const e of F.ents) if (e.team === 1 && !e.def.struct) n++; return n; };

const WDEF = { laser: [0.5, 400], plasma: [1, 380], missile: [1.8, 620], rail: [1.5, 800], drone: [5, 650], null: [0.9, 460] };
function spawnEscorts() {
  const S = G.S, s = F.ship; let slot = 0;
  for (const id in S.fleet) {
    const n = S.fleet[id]; if (!n) continue;
    const d = G.FLEET[id], sprites = Math.min(n, id === 'drone' ? 4 : 3), rep = n / sprites, wd = WDEF[d.w];
    for (let i = 0; i < sprites; i++) {
      const a = slot * 2.4, rr = 70 + slot * 14; slot++;
      const e = {
        def: d, id, team: 0, fleetId: id, rep, x: s.x + Math.cos(a) * rr, y: s.y + Math.sin(a) * rr, vx: 0, vy: 0, ang: 0, r: d.r,
        hp: d.hp * rep * G.mult('fleethp') * G.um('hull'), sh: 0, arm: d.arm || 0, dmg: d.dmg * rep * G.mult('fleetdmg') * G.um('dmg') * wd[0],
        w: d.w, range: wd[1], rate: wd[0], spd: d.spd * 1.25, fast: d.fast, large: d.large, cd: G.rand.range(0, 1), lastHit: -99, t: 0, strafe: 1, slotA: a, slotR: rr, kids: 0
      };
      e.maxHp = e.hp; e.maxSh = 0; F.ents.push(e);
    }
  }
}

/* New hulls join straight away when it is quiet, otherwise as soon as the fight ends. */
F.refreshEscorts = function () {
  if (F.hostileCount()) { F.pendingEscorts = true; return false; }
  F.pendingEscorts = false; F.ents = F.ents.filter(e => !e.fleetId); spawnEscorts(); return true;
};
/* ---------- entering a system ---------- */
F.enter = function (sys, jumped) {
  const S = G.S, s = F.ship, sd = G.sd(sys.id);
  F.sys = sys; F.ents = []; F.shots = []; F.parts = []; F.beams = []; F.texts = []; F.pods = []; F.roids = []; F.objs = [];
  F.heat = 0; F.wave = 0; F.raid = false; F.near = null; F.focus = null; F.mineBeam = null; F.dead = 0; F.burn = 0;
  F.input.moveTo = null;
  const rng = G.RNG(sys.seed ^ 0xabcdef);
  const erased = G.isErased(sys.cx, sys.cy);
  F.erased = erased;
  // asteroids
  if (!erased) for (const b of sys.belts) {
    const br = G.RNG(b.seed);
    for (let i = 0; i < b.n; i++) {
      const a = br.range(0, G.TAU), rr = b.r + br.range(-95, 95), r = br.range(13, 34), res = br.pick(b.res), tier = G.RES[res].t;
      const k = tier === 'common' ? 1 : tier === 'uncommon' ? 0.45 : tier === 'rare' ? 0.16 : tier === 'legendary' ? 0.012 : 0.004;
      const amt = Math.max(1, Math.round((14 + r) * b.rich * Math.pow(1.09, sys.level) * k));
      const pts = []; const np = br.i(7, 11);
      for (let j = 0; j < np; j++) pts.push(br.range(0.72, 1.08));
      F.roids.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, r, res, amt, max: amt, pts, rot: br.range(0, G.TAU), spin: br.range(-0.3, 0.3) });
    }
  }
  // points of interest
  const oa = rng.range(0, G.TAU), or = sys.planets.length > 1 ? (sys.planets[0].orbit + sys.planets[1].orbit) / 2 : sys.star.r + 700;
  const ox = Math.cos(oa) * or, oy = Math.sin(oa) * or;
  const obj = (type, name, extra) => { const o = Object.assign({ type, name, x: ox, y: oy, r: 34, t: 0 }, extra || {}); F.objs.push(o); return o; };
  const hostileCiv = sys.civ && G.civHostile(sys.civ);
  if (!erased) switch (sys.special) {
    case 'home': obj('station', 'Waystation'); break;
    case 'station': obj('station', 'Trade Station'); break;
    case 'capital': {
      const cs = G.civState(sys.civ);
      if (!cs.dead) { obj('station', G.civById(sys.civ).name.replace('The ', '') + ' Capital', { civ: sys.civ }); if (cs.war) F.ents.push(makeEnemy('citadel', ox + 200, oy + 120, sys.level, 1)); }
      break;
    }
    case 'anomaly': if (!sd.done) obj('anomaly', 'Anomaly'); break;
    case 'derelict': if (!sd.done) obj('derelict', 'Derelict'); break;
    case 'ruins': if (!sd.done) obj('ruins', 'Ruins'); break;
    case 'wormhole': if (!sd.done || G.has('wormhole')) obj('wormhole', 'Wormhole'); break;
    case 'pirate': if (!sd.cleared) { F.ents.push(makeEnemy('pbase', ox, oy, sys.level, 1)); F.spawnWave('pirate', sys.level, 3 + sys.level * 0.1, false, ox, oy, 260); } break;
    case 'nest': if (!sd.cleared) { F.ents.push(makeEnemy('nest', ox, oy, sys.level, 1)); F.spawnWave('creature', sys.level, 3, false, ox, oy, 260); } break;
    case 'lair': if (!sd.cleared) { F.spawnWave(sys.faction, sys.level, 2, true, ox, oy, 200); for (const e of F.ents) e.sleep = true; } break;
  }
  if (sd.mega && sd.mega.stargate) F.objs.push({ type: 'stargate', name: 'Stargate', x: -ox * 0.8, y: -oy * 0.8, r: 60, t: 0 });
  const st = G.signalTarget();
  if (st && st.id === sys.id) F.objs.push({ type: 'signal', name: 'Signal Source', x: -ox, y: -oy, r: 30, t: 0 });
  if (hostileCiv && !sys.capital) F.spawnWave('empire', sys.level, 4 + sys.level * 0.1, false, ox, oy, 300);
  if (S.silence.on) {
    const org = G.silenceOrigin();
    if (org && org.id === sys.id) { F.spawnWave('silence', Math.max(sys.level, 30), 14, true, 0, sys.star.r + 500, 300); }
    else if (erased) F.spawnWave('silence', Math.max(sys.level, 30), 10, false);
  }
  // where the ship appears
  if (sys.home && !jumped) { s.x = ox + 120; s.y = oy + 60; }
  else { const a = G.rand.range(0, G.TAU), d = Math.min(sys.radius * 0.6, or + 500); s.x = Math.cos(a) * d; s.y = Math.sin(a) * d; }
  s.vx = 0; s.vy = 0;
  F.cam.x = s.x; F.cam.y = s.y;
  F.warp = jumped ? 1 : 0; F.inv = jumped ? 2.5 : 0;
  spawnEscorts();
  F.safe = isSafe();
  if (G.render) G.render.newSystem(sys);
};
function isSafe() {
  const sys = F.sys, S = G.S;
  if (F.erased) return false;
  if (sys.home) return true;
  if (G.systemColonies(sys.id).length) return true;
  if (sys.civ && !G.civHostile(sys.civ) && sys.special !== 'pirate') return true;
  return false;
}

/* ---------- damage ---------- */
function floatText(x, y, txt, col) { if (F.texts.length < 40) F.texts.push({ x, y, txt, col, life: 1 }); }
function burst(x, y, n, col, spd, life, size) {
  for (let i = 0; i < n && F.parts.length < 700; i++) {
    const a = G.rand.range(0, G.TAU), v = G.rand.range(0.2, 1) * spd;
    F.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * G.rand.range(0.5, 1), max: life, col, size: size * G.rand.range(0.5, 1.2) });
  }
}
F.burst = burst;
function explode(x, y, r, col) {
  burst(x, y, Math.min(60, 10 + r), col, 220 + r * 3, 0.9, 3.5);
  burst(x, y, Math.min(30, 6 + r / 2), '#ffffff', 120 + r, 0.5, 2.5);
  F.parts.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, col, size: r * 2.4, ring: 1 });
  if (G.S.set.shake) F.cam.shake = Math.min(18, F.cam.shake + r / 4);
  if (G.sfx) G.sfx(r > 30 ? 'boom2' : 'boom');
}
function hit(t, dmg, type, team) {
  if (t.dead) return;
  const S = G.S, P = t.isPlayer;
  if (P && (F.inv > 0 || F.dead)) return;
  if (!P && t.def.fac === 'silence' && team === 0) dmg *= 0.34 * (1 + (G.M.vsSilence || 0));
  let sh = P ? S.ship.sh : t.sh, hp = P ? S.ship.hp : t.hp;
  if (type !== 'null' && sh > 0) {
    const m = type === 'laser' ? 1.5 : type === 'plasma' ? 0.6 : 1, d = dmg * m;
    if (sh >= d) { sh -= d; dmg = 0; } else { dmg -= sh / m; sh = 0; }
    t.shFlash = 0.25;
  }
  if (dmg > 0) {
    let arm = P ? 0 : (t.arm || 0);
    if (type === 'plasma') { arm = 0; dmg *= 1.3; } else if (type === 'rail') arm *= 0.5; else if (type === 'laser') arm = Math.min(0.9, arm * 1.3);
    if (type === 'missile') dmg *= t.fast ? 0.5 : 1.4;
    if (type === 'drone') dmg *= t.large ? 1.6 : 0.9;
    dmg *= 1 - arm; hp -= dmg;
    if (dmg > 0 && F.texts.length < 26 && (P || G.rand.chance(0.35))) floatText(t.x + G.rand.range(-10, 10), t.y - t.r, G.fmt(dmg), P ? '#ff6a6a' : '#ffe9a8');
    t.hitFlash = 0.12;
  }
  t.lastHit = F.time;
  if (P) { S.ship.sh = sh; S.ship.hp = hp; F.lastHit = F.time; if (hp <= 0) playerDie(); else if (G.S.set.shake) F.cam.shake = Math.min(10, F.cam.shake + 2); }
  else { t.sh = sh; t.hp = hp; t.sleep = false; if (hp <= 0) kill(t); }
}
function kill(e) {
  if (e.dead) return; e.dead = true;
  const S = G.S, d = e.def;
  if (e.owner) e.owner.kids = Math.max(0, (e.owner.kids || 0) - 1);
  explode(e.x, e.y, e.r, d.col || '#9fd0ff');
  if (e.team === 0) {
    if (e.fleetId) {
      const lost = Math.min(S.fleet[e.fleetId] || 0, Math.max(1, Math.round(e.rep * 0.6)));
      S.fleet[e.fleetId] -= lost; S.stats.fleetLost += lost;
      G.log('Lost ' + lost + ' ' + G.FLEET[e.fleetId].n + (lost > 1 ? 's' : '') + '.', 'bad');
      if (G.fleetUsed() === 0 && S.stats.fleetLost >= 5) S.story.oops = true;
    }
    return;
  }
  if (d.isDrone) return;
  const L = e.level, sc = G.lootScale(L);
  S.stats.kills++;
  G.add('credits', 4 * d.th * sc);
  G.compXP(1 + d.th * (1 + L * 0.2));
  const drops = d.boss ? 6 : d.struct ? 5 : G.rand.chance(0.6) ? 1 : 0;
  const pool = F.sys.belts.length ? F.sys.belts[0].res : ['iron', 'copper'];
  for (let i = 0; i < drops; i++) {
    const res = G.rand.chance(0.5) ? G.rand.pick(pool) : G.rand.pick(['iron', 'copper', 'silicon', 'crystal', 'steel', 'circuits'].filter(r => S.codex.res[r] || r === 'iron'));
    const amt = Math.max(1, Math.round((4 + d.th * 3) * Math.pow(1.09, L) / Math.sqrt(G.RES[res].v)));
    const a = G.rand.range(0, G.TAU);
    F.pods.push({ x: e.x, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, res, amt, life: 40 });
  }
  if (d.split && !e.child) for (let i = 0; i < 2; i++) { const c = makeEnemy(e.id, e.x + G.rand.range(-30, 30), e.y + G.rand.range(-30, 30), L, 0.45); c.child = true; c.r *= 0.7; F.ents.push(c); }
  if (d.boss) {
    S.stats.bossKills++;
    G.log(d.n + ' destroyed.', 'epic');
    if (G.rand.chance(Math.min(0.9, 0.4 * G.um('arti')))) G.giveArtifact(2);
    if (L >= 28 && G.rand.chance(0.45)) { const id = G.rand.pick(['stellarheart', 'ancientmatter', 'chronocrystal']); F.pods.push({ x: e.x, y: e.y, vx: 0, vy: 0, res: id, amt: 1 + (G.rand.chance(0.3) ? 1 : 0), life: 90 }); }
    if (L >= 55 && G.rand.chance(0.25)) F.pods.push({ x: e.x, y: e.y, vx: 0, vy: 0, res: 'paradox', amt: 1, life: 90 });
    if (G.rand.chance(0.12)) G.giveCompanion();
    if (e.id === 'eraser' && G.S.silence.on) { const org = G.silenceOrigin(); if (org && org.id === F.sys.id) G.defeatSilence(); }
  }
  if (d.struct) {
    const sd = G.sd(F.sys.id);
    if (e.id === 'pbase') { sd.cleared = 1; S.stats.bases++; G.add('credits', 150 * sc); G.log('Pirate base destroyed. This system is quiet now.', 'good'); for (const cid in S.civs) { const civ = G.civById(cid); if (civ && civ.quirk.id === 'hatePirates' && S.civs[cid].met) G.relMod(cid, 6, 'Destroyed a pirate base'); } }
    if (e.id === 'nest') { sd.cleared = 1; G.log('Brood nest destroyed.', 'good'); if (G.rand.chance(0.3)) G.giveCompanion(); }
    if (e.id === 'citadel') G.conquer(F.sys.civ);
  }
  if (F.sys.special === 'lair' && d.boss) G.sd(F.sys.id).cleared = 1;
  if (F.focus === e) F.focus = null;
}
function playerDie() {
  const S = G.S, s = F.ship;
  explode(s.x, s.y, 60, '#ffb060');
  S.stats.deaths++; F.dead = 3; S.ship.hp = 0;
  const lostCargo = G.cargoUsed(); S.ship.cargo = {};
  const lostCr = G.capLoss('credits', 0.1); S.res.credits = (S.res.credits || 0) - lostCr;
  F.deathMsg = 'Lost ' + G.fmt(lostCargo) + ' cargo and ' + G.fmt(lostCr) + ' credits.';
  if (F.raid) { const cols = G.systemColonies(F.sys.id); if (cols.length) G.raidLoss(cols[0], G.planetById(cols[0].pid)); F.raid = false; }
  G.log('Your ship was destroyed. ' + F.deathMsg, 'bad');
}
function respawn() {
  const S = G.S; let target = '0,0';
  if (G.isErased(0, 0)) { const ids = Object.keys(S.colonies); if (ids.length) target = S.colonies[ids[0]].sys; }
  const st = G.shipStats(); S.ship.hp = st.hull * 0.5; S.ship.sh = 0; S.ship.en = st.energy * 0.5;
  S.loc = target; F.dead = 0;
  G.arrive(G.sysById(target), false);
  F.inv = 3;
}

/* ---------- firing ---------- */
const WCOL = { laser: '#ff5a5a', plasma: '#7dffb0', missile: '#ffcf6a', rail: '#b0e0ff', null: '#ffffff', drone: '#ffb0a0', pd: '#ffe08a', bite: '#ffffff' };
function fire(src, tgt, type, dmg, team, col) {
  const dx = tgt.x - src.x, dy = tgt.y - src.y, d = Math.hypot(dx, dy) || 1;
  if (type === 'laser' || type === 'null' || type === 'rail' || type === 'bite') {
    if (type !== 'bite') F.beams.push({ x1: src.x, y1: src.y, x2: tgt.x, y2: tgt.y, col: col || WCOL[type], life: type === 'rail' ? 0.22 : 0.1, max: type === 'rail' ? 0.22 : 0.1, w: type === 'rail' ? 3 : type === 'null' ? 4 : 2 });
    hit(tgt, dmg, type === 'bite' ? 'rail' : type, team);
    if (src.isPlayer && G.sfx) G.sfx(type === 'rail' ? 'rail' : 'laser');
  } else if (type === 'plasma') {
    const sp = 460, lead = d / sp;
    const ax = tgt.x + (tgt.vx || 0) * lead * 0.8 - src.x, ay = tgt.y + (tgt.vy || 0) * lead * 0.8 - src.y, al = Math.hypot(ax, ay) || 1;
    F.shots.push({ x: src.x, y: src.y, vx: ax / al * sp, vy: ay / al * sp, dmg, type, team, life: 1.5, r: 6, col: col || WCOL.plasma });
    if (src.isPlayer && G.sfx) G.sfx('plasma');
  } else if (type === 'missile') {
    const a = Math.atan2(dy, dx) + G.rand.range(-0.5, 0.5);
    F.shots.push({ x: src.x, y: src.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg, type, team, life: 4.5, r: 5, col: col || WCOL.missile, tgt, homing: 1 });
    if (src.isPlayer && G.sfx) G.sfx('missile');
  } else if (type === 'drone') {
    if ((src.kids || 0) >= 4) return;
    src.kids = (src.kids || 0) + 1;
    const e = makeEnemy('edrone', src.x, src.y, src.level || F.sys.level, 1);
    e.team = team; e.dmg = dmg * 0.25; e.hp = Math.max(4, (src.maxHp || 100) * 0.04); e.maxHp = e.hp; e.life = 13; e.owner = src; e.dtype = 'drone';
    if (team === 0) e.def = Object.assign({}, G.ENEMY.edrone, { col: '#9fe0ff' });
    F.ents.push(e);
  }
}
function nearestFoe(x, y, team, range, pdOnly) {
  let best = null, bd = range;
  for (const e of F.ents) {
    if (e.team === team || e.dead || e.sleep) continue;
    if (pdOnly && !e.def.isDrone) continue;
    const d = Math.hypot(e.x - x, e.y - y) - e.r; if (d < bd) { bd = d; best = e; }
  }
  if (team === 1 && !F.dead) { const s = F.ship, d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
  return best;
}

/* ---------- main update ---------- */
F.update = function (dt) {
  const S = G.S, s = F.ship, st = G.shipStats(), sys = F.sys;
  F.time += dt;
  if (F.warp > 0) F.warp = Math.max(0, F.warp - dt * 1.4);
  if (F.inv > 0) F.inv -= dt;
  if (F.cam.shake > 0) F.cam.shake = Math.max(0, F.cam.shake - dt * 30);
  if (F.abilityCd > 0) F.abilityCd -= dt;
  if (F.dead > 0) { F.dead -= dt; if (F.dead <= 0) respawn(); updateFx(dt); return; }

  // ---- ship movement
  const inp = F.input; let ix = inp.x, iy = inp.y;
  if (!ix && !iy && inp.moveTo) {
    const dx = inp.moveTo.x - s.x, dy = inp.moveTo.y - s.y, d = Math.hypot(dx, dy);
    if (d < 40) inp.moveTo = null; else { ix = dx / d; iy = dy / d; }
  } else if (ix || iy) { inp.moveTo = null; const l = Math.hypot(ix, iy); ix /= l; iy /= l; }
  let acc = 520 * st.speed;
  const boosting = inp.boost && (ix || iy) && S.ship.en > 1;
  if (boosting) { acc *= 2.1; S.ship.en -= 9 * dt; }
  s.vx += ix * acc * dt; s.vy += iy * acc * dt;
  const drag = Math.exp(-1.6 * dt); s.vx *= drag; s.vy *= drag;
  // black hole pulls
  const dStar = Math.hypot(s.x, s.y) || 1;
  if (sys.cls === 'BH' && !F.erased) { const g = Math.min(900, 1.6e8 / (dStar * dStar)); s.vx -= s.x / dStar * g * dt; s.vy -= s.y / dStar * g * dt; }
  s.x += s.vx * dt; s.y += s.vy * dt;
  if (ix || iy) { const ta = Math.atan2(iy, ix); let da = ta - s.ang; while (da > Math.PI) da -= G.TAU; while (da < -Math.PI) da += G.TAU; s.ang += da * Math.min(1, dt * 9); }
  s.thrust = (ix || iy) ? (boosting ? 2 : 1) : 0;
  if (s.thrust && F.parts.length < 600) { const ba = s.ang + Math.PI + G.rand.range(-0.25, 0.25), v = 160 + 120 * s.thrust; F.parts.push({ x: s.x - Math.cos(s.ang) * 14, y: s.y - Math.sin(s.ang) * 14, vx: Math.cos(ba) * v + s.vx * 0.3, vy: Math.sin(ba) * v + s.vy * 0.3, life: 0.35, max: 0.35, col: boosting ? '#ffffff' : G.trailColor(), size: boosting ? 3.6 : 3 }); }
  // keep inside the system
  const lim = sys.radius + 600; if (dStar > lim) { s.x *= lim / dStar; s.y *= lim / dStar; }
  // star burns
  F.burn = 0;
  if (!F.erased) {
    if (sys.cls === 'BH') { if (dStar < sys.star.r * 0.55) { S.ship.hp = 0; playerDie(); return; } }
    else if (dStar < sys.star.r + 40) { F.burn = 1; S.ship.sh = 0; S.ship.hp -= st.hull * 0.14 * dt; F.lastHit = F.time; if (S.ship.hp <= 0) { playerDie(); return; } }
  }
  // ---- regen
  S.ship.en = Math.min(st.energy, S.ship.en + st.enRegen * dt);
  if (F.time - F.lastHit > 3.5) S.ship.sh = Math.min(st.shield, S.ship.sh + st.shield * 0.12 * dt);
  if (S.ship.hp > st.hull) S.ship.hp = st.hull;
  if (F.safe && F.time - F.lastHit > 6 && !F.hostileCount()) S.ship.hp = Math.min(st.hull, S.ship.hp + st.hull * 0.02 * dt);

  // ---- scanning planets
  const sd = G.sd(sys.id); let near = null, nd = 1e9;
  if (!F.erased) for (const p of sys.planets) {
    const pp = G.planetPos(p), d = Math.hypot(pp[0] - s.x, pp[1] - s.y);
    if (!((sd.scan || 0) & (1 << p.idx)) && d < st.pscan + p.r) {
      sd.scan = (sd.scan || 0) | (1 << p.idx); S.stats.scans++;
      const sci = 4 + sys.level * 1.5; G.add('sci', sci);
      if (!S.codex.planet[p.type]) { S.codex.planet[p.type] = 1; G.log('New planet type catalogued: ' + G.PTYPES[p.type].n, 'sci'); }
      if (p.trait) S.codex.trait[p.trait] = 1;
      floatText(pp[0], pp[1] - p.r - 20, 'SCANNED +' + G.fmt(sci) + ' research', '#b89bff');
      G.compXP(2); if (G.sfx) G.sfx('scan');
    }
    if (d < p.r + 120 && d < nd) { nd = d; near = { kind: 'planet', ref: p, x: pp[0], y: pp[1] }; }
  }
  for (const o of F.objs) { o.t += dt; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < o.r + 110 && d - 200 < nd) { nd = d - 200; near = { kind: 'obj', ref: o, x: o.x, y: o.y }; } }
  F.near = near;

  // ---- mining
  F.mineBeam = null; F.droneBeams.length = 0;
  const hostile = F.hostileNear(900);
  const wantMine = inp.mine || (S.set.autoMine && !hostile);
  const rate = st.mining;
  const cargoRoom = G.has('uplink') ? Infinity : st.cargo - G.cargoUsed();
  let mining = false;
  if (F.roids.length) {
    // nearest rocks, once
    let cand = [];
    for (const r of F.roids) { const d = Math.hypot(r.x - s.x, r.y - s.y) - r.r; if (d < 560) cand.push([d, r]); }
    cand.sort((a, b) => a[0] - b[0]);
    const mineRock = (r, amount, drone) => {
      const want = Math.min(amount, r.amt), got = G.addCargo(r.res, want);
      r.amt -= got; S.stats.mined += got;
      if (got < want - 1e-9) F.cargoFull = F.time;
      if (got > 0) {
        if (G.rand.chance(0.25)) F.parts.push({ x: r.x + G.rand.range(-r.r, r.r) * 0.6, y: r.y + G.rand.range(-r.r, r.r) * 0.6, vx: G.rand.range(-60, 60), vy: G.rand.range(-60, 60), life: 0.5, max: 0.5, col: G.RES[r.res].c, size: 2.5 });
        // lucky strike
        if (G.rand.chance(0.0035 * got * G.mult('rare'))) {
          const opts = ['titanium', 'uranium', 'platinum', 'darkcrystal', 'voidgas', 'quantumore'].filter(id => G.RES[id].minL <= sys.level + 4);
          if (opts.length) { const id = G.rand.pick(opts); F.pods.push({ x: r.x, y: r.y, vx: G.rand.range(-50, 50), vy: G.rand.range(-50, 50), res: id, amt: Math.max(1, Math.round(6 * Math.pow(1.09, sys.level) / Math.sqrt(G.RES[id].v))), life: 40 }); floatText(r.x, r.y - r.r, 'LUCKY STRIKE', G.RES[id].c); }
        }
      }
      if (r.amt <= 0.001) { r.gone = true; burst(r.x, r.y, 16, G.RES[r.res].c, 140, 0.7, 3); burst(r.x, r.y, 10, '#8a8078', 100, 0.8, 4); if (G.sfx) G.sfx('rock'); }
    };
    let ci = 0;
    if (wantMine && cand.length && cand[0][0] < 290 && cargoRoom > 0) { const r = cand[0][1]; mineRock(r, rate * dt); F.mineBeam = r; mining = true; ci = 1; if (G.sfx) G.sfx('mine'); }
    if (st.drones && cargoRoom > 0) for (let i = 0; i < st.drones && ci + i < cand.length; i++) { const r = cand[ci + i][1]; if (r.gone) continue; mineRock(r, rate * 0.35 * dt, true); F.droneBeams.push(r); }
    if (cand.some(c => c[1].gone)) F.roids = F.roids.filter(r => !r.gone);
    for (const r of F.roids) r.rot += r.spin * dt;
  }

  // ---- player weapons
  const ws = S.ship.weapons;
  for (let i = 0; i < st.slots; i++) {
    const wid = ws[i]; if (!wid) continue; const w = G.WEAPONS[wid];
    F.wcd[i] = (F.wcd[i] || 0) - dt; if (F.wcd[i] > 0) continue;
    if (w.type === 'pd') {
      let done = false;
      for (const sh of F.shots) if (sh.team === 1 && sh.homing && Math.hypot(sh.x - s.x, sh.y - s.y) < w.range) { sh.life = 0; burst(sh.x, sh.y, 5, '#ffe08a', 80, 0.3, 2); F.beams.push({ x1: s.x, y1: s.y, x2: sh.x, y2: sh.y, col: WCOL.pd, life: 0.07, max: 0.07, w: 1.2 }); done = true; break; }
      if (!done) { const t = nearestFoe(s.x, s.y, 0, w.range, true) || nearestFoe(s.x, s.y, 0, w.range); if (t) { fire(s, t, 'laser', st.dmg * w.f * w.rate * (t.def && t.def.isDrone ? 4 : 1), 0, WCOL.pd); done = true; } }
      if (done) F.wcd[i] = w.rate;
      continue;
    }
    let t = F.focus && !F.focus.dead && Math.hypot(F.focus.x - s.x, F.focus.y - s.y) - F.focus.r < w.range ? F.focus : nearestFoe(s.x, s.y, 0, w.range);
    if (!t) continue;
    F.wcd[i] = w.rate;
    s.level = sys.level;
    fire(s, t, w.type, st.dmg * w.f * w.rate, 0, wid === 'lance' ? '#ffb0ff' : null);
  }

  // ---- entities
  for (const e of F.ents) {
    if (e.dead) continue;
    e.t += dt; if (e.hitFlash > 0) e.hitFlash -= dt; if (e.shFlash > 0) e.shFlash -= dt;
    if (e.life != null) { e.life -= dt; if (e.life <= 0) { e.dead = true; if (e.owner) e.owner.kids = Math.max(0, (e.owner.kids || 0) - 1); burst(e.x, e.y, 4, '#888', 50, 0.3, 2); continue; } }
    if (e.maxSh && F.time - e.lastHit > 4) e.sh = Math.min(e.maxSh, e.sh + e.maxSh * 0.05 * dt);
    if (e.sleep) { if (Math.hypot(s.x - e.x, s.y - e.y) < 650) { e.sleep = false; for (const o of F.ents) o.sleep = false; G.log(e.def.n + ' stirs.', 'bad'); } else continue; }
    const tgt = nearestFoe(e.x, e.y, e.team, e.team === 1 ? 2600 : 950);
    let tx, ty, want = 0;
    if (tgt) {
      const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const ideal = e.w === 'bite' ? 0 : e.range * 0.7;
      if (d > ideal + 40) { tx = ux; ty = uy; want = 1; } else if (d < ideal * 0.55) { tx = -ux; ty = -uy; want = 0.8; } else { tx = -uy * e.strafe; ty = ux * e.strafe; want = 0.6; }
      if (e.team === 0 && e.fleetId) { const ds = Math.hypot(e.x - s.x, e.y - s.y); if (ds > 900) { tx = (s.x - e.x) / ds; ty = (s.y - e.y) / ds; want = 1; } }
      e.cd -= dt;
      if (e.cd <= 0 && d - (tgt.r || 0) <= e.range) { e.cd = e.rate * G.rand.range(0.85, 1.15); fire(e, tgt, e.dtype ? 'laser' : e.w, e.dmg, e.team, e.dtype ? null : (e.team === 0 ? '#7dc8ff' : null)); if (e.dtype && tgt.large) hit(tgt, e.dmg * 0.6, 'drone', e.team); }
      if (e.def.blink && e.t > 4) { e.t = 0; burst(e.x, e.y, 10, e.def.col, 120, 0.4, 3); const a = G.rand.range(0, G.TAU); e.x = tgt.x + Math.cos(a) * 260; e.y = tgt.y + Math.sin(a) * 260; burst(e.x, e.y, 10, e.def.col, 120, 0.4, 3); }
      const ta = Math.atan2(dy, dx); let da = ta - e.ang; while (da > Math.PI) da -= G.TAU; while (da < -Math.PI) da += G.TAU; e.ang += da * Math.min(1, dt * 5);
    } else if (e.team === 0) {
      // hold formation around the player
      const a = e.slotA != null ? e.slotA + F.time * 0.15 : e.t, rr = e.slotR || 90;
      const gx = s.x + Math.cos(a) * rr, gy = s.y + Math.sin(a) * rr, dx = gx - e.x, dy = gy - e.y, d = Math.hypot(dx, dy) || 1;
      if (d > 14) { tx = dx / d; ty = dy / d; want = Math.min(1.6, d / 120); e.ang = Math.atan2(dy, dx); }
    } else if (e.def.spd) {
      // idle hostiles drift toward the player slowly: nowhere is safe for long
      const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy) || 1; tx = dx / d; ty = dy / d; want = 0.5;
    }
    if (want && e.spd) {
      const a = 420 * e.spd; e.vx += tx * a * want * dt; e.vy += ty * a * want * dt;
    }
    const dg = Math.exp(-1.5 * dt); e.vx *= dg; e.vy *= dg; e.x += e.vx * dt; e.y += e.vy * dt;
  }
  // separate overlapping ships a little
  for (let i = 0; i < F.ents.length; i++) { const a = F.ents[i]; if (a.dead || !a.spd) continue; for (let j = i + 1; j < F.ents.length; j++) { const b = F.ents[j]; if (b.dead || !b.spd) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r; if (d < m && d > 0.01) { const p = (m - d) / d * 0.5; a.x -= dx * p * 0.5; a.y -= dy * p * 0.5; b.x += dx * p * 0.5; b.y += dy * p * 0.5; } } }

  // ---- projectiles
  for (const sh of F.shots) {
    sh.life -= dt; if (sh.life <= 0) continue;
    if (sh.homing) {
      if (!sh.tgt || sh.tgt.dead || (sh.tgt.isPlayer && F.dead)) sh.tgt = nearestFoe(sh.x, sh.y, sh.team, 700);
      if (sh.tgt) { const dx = sh.tgt.x - sh.x, dy = sh.tgt.y - sh.y, d = Math.hypot(dx, dy) || 1; sh.vx += dx / d * 900 * dt; sh.vy += dy / d * 900 * dt; const v = Math.hypot(sh.vx, sh.vy), mx = 360; if (v > mx) { sh.vx *= mx / v; sh.vy *= mx / v; } }
      if (G.rand.chance(0.5) && F.parts.length < 600) F.parts.push({ x: sh.x, y: sh.y, vx: 0, vy: 0, life: 0.3, max: 0.3, col: '#aaa', size: 2 });
    }
    sh.x += sh.vx * dt; sh.y += sh.vy * dt;
    // collisions
    if (sh.team === 1 && !F.dead && Math.hypot(sh.x - s.x, sh.y - s.y) < s.r + sh.r) { hit(s, sh.dmg, sh.type, 1); sh.life = 0; burst(sh.x, sh.y, 6, sh.col, 90, 0.3, 2.5); continue; }
    for (const e of F.ents) { if (e.dead || e.team === sh.team) continue; if (Math.hypot(sh.x - e.x, sh.y - e.y) < e.r + sh.r) { if (sh.homing && e.def.pd && G.rand.chance(0.5)) { /* shot down */ } else hit(e, sh.dmg, sh.type, sh.team); sh.life = 0; burst(sh.x, sh.y, 6, sh.col, 90, 0.3, 2.5); break; } }
  }
  if (F.shots.length) F.shots = F.shots.filter(x => x.life > 0);
  if (F.ents.some(e => e.dead)) F.ents = F.ents.filter(e => !e.dead);

  // ---- loot pods
  for (const p of F.pods) {
    p.life -= dt; const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < 230) { p.vx += dx / d * 900 * dt; p.vy += dy / d * 900 * dt; }
    p.vx *= Math.exp(-1.2 * dt); p.vy *= Math.exp(-1.2 * dt); p.x += p.vx * dt; p.y += p.vy * dt;
    if (d < 26) { const got = G.addCargo(p.res, p.amt); if (got > 0) { floatText(s.x, s.y - 26, '+' + G.fmt(got) + ' ' + G.RES[p.res].n, G.RES[p.res].c); if (G.sfx) G.sfx('pick'); p.life = 0; } else { F.cargoFull = F.time; p.vx -= dx / d * 200; p.vy -= dy / d * 200; } }
  }
  if (F.pods.length) F.pods = F.pods.filter(p => p.life > 0);

  // ---- signature: staying put in wild space gets you found
  F.safe = isSafe();
  const hc = F.hostileCount();
  if (!F.safe) {
    const cleared = sd.cleared ? 0.35 : 1;
    F.heat += dt * (0.8 + (mining ? 0.9 : 0)) * (1 + sys.level * 0.01) * G.mult('heat') * cleared * (hc ? 0.35 : 1) * (F.erased ? 4 : 1);
    if (F.heat >= 100) {
      F.heat = 0; F.wave++;
      const fac = F.erased ? 'silence' : sys.civ && G.civHostile(sys.civ) ? 'empire' : sys.faction;
      F.spawnWave(fac, sys.level, 1.2 + F.wave * 2.2 + sys.level * 0.12, F.wave % 5 === 0);
      G.log('You have been found. ' + G.FACTIONS[fac].n + ' inbound (wave ' + F.wave + ').', 'bad');
      if (G.sfx) G.sfx('alarm');
    }
  } else F.heat = Math.max(0, F.heat - dt * 6);
  if (F.pendingEscorts && !hc) F.refreshEscorts();
  if (F.raid && !hc) {
    F.raid = false; S.stats.raidsWon++;
    const cr = 80 * G.lootScale(sys.level); G.add('credits', cr); G.log('Raid defeated. Bounty: ' + G.fmt(cr) + ' credits.', 'good');
  }
  updateFx(dt);
  // camera
  const c = F.cam; c.x += (s.x + s.vx * 0.25 - c.x) * Math.min(1, dt * 5); c.y += (s.y + s.vy * 0.25 - c.y) * Math.min(1, dt * 5);
};
function updateFx(dt) {
  for (const p of F.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.ring) { p.vx *= 0.97; p.vy *= 0.97; } }
  if (F.parts.length) F.parts = F.parts.filter(p => p.life > 0);
  for (const b of F.beams) b.life -= dt;
  if (F.beams.length) F.beams = F.beams.filter(b => b.life > 0);
  for (const t of F.texts) { t.life -= dt; t.y -= 30 * dt; }
  if (F.texts.length) F.texts = F.texts.filter(t => t.life > 0);
}

/* Q: overcharge nova. Big burst around the ship, long cooldown, costs energy. */
F.ability = function () {
  const S = G.S, st = G.shipStats(), s = F.ship;
  if (F.abilityCd > 0 || F.dead || S.ship.en < 25) return false;
  S.ship.en -= 25; F.abilityCd = 18;
  F.parts.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.5, max: 0.5, col: '#9fe0ff', size: 760, ring: 1 });
  burst(s.x, s.y, 40, '#9fe0ff', 500, 0.6, 3);
  for (const e of F.ents.slice()) if (e.team === 1 && Math.hypot(e.x - s.x, e.y - s.y) < 380 + e.r) hit(e, st.dmg * 7, 'plasma', 0);
  for (const sh of F.shots) if (sh.team === 1 && Math.hypot(sh.x - s.x, sh.y - s.y) < 380) sh.life = 0;
  if (G.sfx) G.sfx('boom2');
  return true;
};
/* Click in the world: focus an enemy, or fly there. */
F.click = function (wx, wy) {
  for (const e of F.ents) if (e.team === 1 && Math.hypot(e.x - wx, e.y - wy) < e.r + 16) { F.focus = e; return; }
  F.input.moveTo = { x: wx, y: wy };
};
