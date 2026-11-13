'use strict';
/* Rustwake — game state, saving, derived stats and the economy tick. */

G.SAVE_KEY = 'rustwake.save.v1';
G.S = null;      // the whole saved state
G.M = {};        // additive bonus pool, rebuilt by recalc()
G.F = {};        // unlock flags
G.UM = {};       // universe modifiers (multiplicative)
G.rates = {};    // net income per second, for display
G.pwr = 1;       // fraction of energy demand being met
G.dirty = true;

const UPG_IDS = ['hull', 'shield', 'weapon', 'mining', 'cargo', 'engine', 'reactor', 'scanner', 'ftl'];

G.freshState = function (seed) {
  const up = {}; for (const k of UPG_IDS) up[k] = 0;
  return {
    v: 1, seed: seed >>> 0, uni: { n: 1, mods: [], cores: 0 }, t: 0, last: Date.now(),
    res: {}, ship: { hp: 55, sh: 0, en: 60, cargo: {}, up, hullClass: 0, weapons: ['laser', null], owned: { laser: 1 }, ftl: false },
    loc: '0,0', visited: {}, known: {}, sd: {},
    colonies: {}, tech: {}, rep: {}, cur: null, queue: [],
    fleet: {}, civs: {}, arti: [], comp: {}, active: [],
    codex: { planet: {}, star: {}, species: {}, enemy: {}, res: {}, event: {}, trait: {} },
    ach: {}, stats: { kills: 0, bossKills: 0, jumps: 0, mined: 0, deaths: 0, scans: 0, events: 0, raidsWon: 0, raidsLost: 0, bases: 0, fleetLost: 0, play: 0, wormholes: 0, maxLevel: 1, erased: 0, colonized: 0 },
    mission: 0, story: { signal: 0 }, silence: { on: false, cx: 0, cy: 0, r: 0 },
    raid: { next: 900, pending: null }, timers: {},
    asc: { pts: 0, total: 0, perks: {}, count: 0 },
    cos: { paint: 'stock', trail: 'ember', own: { stock: 1, ember: 1 } },
    log: [], set: { sfx: true, music: true, autoMine: false, shake: true }
  };
};

/* ---------- save / load ---------- */
G.save = function () {
  if (!G.S) return;
  G.S.last = Date.now();
  try { localStorage.setItem(G.SAVE_KEY, JSON.stringify(G.S)); } catch (e) { /* storage full or blocked */ }
};
G.loadRaw = function () { try { const s = localStorage.getItem(G.SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
G.adopt = function (s) {
  // fill in anything a newer build added
  const f = G.freshState(s.seed);
  for (const k in f) if (s[k] == null) s[k] = f[k];
  for (const k in f.stats) if (s.stats[k] == null) s.stats[k] = f.stats[k];
  for (const k in f.codex) if (!s.codex[k]) s.codex[k] = {};
  for (const k in f.set) if (s.set[k] == null) s.set[k] = f.set[k];
  for (const k in f.ship.up) if (s.ship.up[k] == null) s.ship.up[k] = 0;
  G.S = s; G.resetUniverse(); G.dirty = true; G.recalc();
};
G.exportSave = () => btoa(unescape(encodeURIComponent(JSON.stringify(G.S))));
G.importSave = function (txt) {
  try { const s = JSON.parse(decodeURIComponent(escape(atob(txt.trim())))); if (!s || !s.seed || !s.ship) return false; G.adopt(s); G.save(); return true; } catch (e) { return false; }
};

/* ---------- log ---------- */
G.log = function (msg, cls) {
  const S = G.S; S.log.push({ m: msg, c: cls || '', t: Math.floor(S.t) });
  if (S.log.length > 80) S.log.shift();
  if (G.ui && G.ui.toast) G.ui.toast(msg, cls);
};

/* ---------- bonuses ---------- */
const ALLPROD = { mine: 1, ind: 1, sci: 1, energy: 1, credits: 1 };
const FLOOR = { cost: 0.2, heat: 0.15, jumpcost: 0.2, megacost: 0.2 };
G.mult = function (k) {
  if (G.dirty) G.recalc();
  let v = 1 + (G.M[k] || 0) + (ALLPROD[k] ? (G.M.allprod || 0) : 0);
  v = Math.max(FLOOR[k] || 0.05, v);
  const um = G.UM[k]; return um == null || um === true ? v : v * um;
};
G.compBonus = function (id) {
  const c = G.S.comp[id], d = G.COMP[id]; if (!c) return 0;
  return d.b * (1 + 0.08 * (c.lvl - 1)) * (c.lvl >= 25 ? 3 : c.lvl >= 10 ? 2 : 1) * (c.pris ? 2 : 1);
};
G.recalc = function () {
  const S = G.S, M = {}, F = {};
  G.dirty = false;
  const add = (e, s) => { for (const k in e) M[k] = (M[k] || 0) + e[k] * (s || 1); };
  for (const id in S.tech) { const t = G.TECH[id]; if (!t) continue; add(t.e); for (const u of t.u) F[u] = 1; }
  for (const r of G.REPEAT) { const l = S.rep[r.id] || 0; if (l) { M[r.k] = (M[r.k] || 0) + 0.1 * l; if (r.k2) M[r.k2] = (M[r.k2] || 0) + 0.1 * l; } }
  for (const id of S.arti) if (G.ARTI[id]) add(G.ARTI[id].e);
  for (const id of S.active) if (S.comp[id]) { const d = G.COMP[id]; M[d.k] = (M[d.k] || 0) + G.compBonus(id); }
  for (const p of G.PERKS) { const l = S.asc.perks[p.id] || 0; if (l && !p.special) { M[p.k] = (M[p.k] || 0) + p.v * l; if (p.k2) M[p.k2] = (M[p.k2] || 0) + p.v * l; } }
  // megastructures with galaxy-wide effects
  let dysonStages = 0, megaCount = 0;
  for (const sid in S.sd) {
    const m = S.sd[sid].mega; if (!m) continue;
    for (const k in m) megaCount += m[k];
    if (m.dyson) { dysonStages += m.dyson; M.allprod = (M.allprod || 0) + 0.1 * m.dyson; }
    if (m.artstar) M.sci = (M.sci || 0) + 1;
    if (m.nexus >= 3) M.allprod = (M.allprod || 0) + 2;
  }
  G.megaCount = megaCount; G.dysonStages = dysonStages;
  // diplomacy
  for (const cid in S.civs) {
    const c = S.civs[cid]; if (c.dead) continue;
    const civ = G.civById(cid); if (!civ) continue;
    if (c.rpact) M.sci = (M.sci || 0) + 0.06 * civ.tech;
    if (c.ally) { M.fleetdmg = (M.fleetdmg || 0) + 0.08 * civ.mil; M.fleethp = (M.fleethp || 0) + 0.08 * civ.mil; }
    if (c.vassal) M.credits = (M.credits || 0) + 0.1 * civ.eco;
  }
  // universe modifiers
  const UM = {};
  for (const id of S.uni.mods) { const u = G.UMOD[id]; if (u) for (const k in u.m) UM[k] = (UM[k] == null ? 1 : UM[k]) * u.m[k]; }
  UM.enemy = (UM.enemy || 1) * Math.pow(1.6, S.uni.n - 1);
  G.M = M; G.F = F; G.UM = UM;
};
G.has = f => { if (G.dirty) G.recalc(); return !!G.F[f]; };

/* ---------- resources ---------- */
G.add = function (id, n) {
  const S = G.S; if (!n) return;
  S.res[id] = Math.max(0, (S.res[id] || 0) + n);
  if (n > 0 && !S.codex.res[id]) S.codex.res[id] = 1;
};
G.get = id => G.S.res[id] || 0;
G.canAfford = function (cost) { for (const k in cost) if ((G.S.res[k] || 0) < cost[k]) return false; return true; };
G.pay = function (cost) { if (!G.canAfford(cost)) return false; for (const k in cost) G.S.res[k] -= cost[k]; return true; };
G.scaleCost = function (cost, f) { const o = {}; for (const k in cost) o[k] = Math.ceil(cost[k] * f); return o; };

/* ---------- ship ---------- */
G.shipStats = function () {
  const S = G.S, u = S.ship.up, h = G.HULLS[S.ship.hullClass], hm = h.mul;
  const st = {
    hull: 100 * Math.pow(1.18, u.hull) * hm * G.mult('shiphp') * G.um('hull'),
    shield: 40 * Math.pow(1.18, u.shield) * hm * G.mult('shipshield'),
    dmg: 6 * Math.pow(1.18, u.weapon) * hm * G.mult('shipdmg') * G.um('dmg'),
    mining: 4 * Math.pow(1.2, u.mining) * Math.pow(hm, 0.8) * G.mult('shipmine'),
    cargo: 40 * Math.pow(1.25, u.cargo) * hm * G.mult('cargo'),
    speed: Math.min(2.4, 1 + 0.06 * u.engine) * G.mult('speed'),
    energy: 100 * Math.pow(1.1, u.reactor) * G.mult('shipenergy'),
    enRegen: 1.6 * Math.pow(1.12, u.reactor) * G.mult('shipenergy'),
    scan: (175 + 24 * u.scanner) * G.mult('scan'),
    pscan: 330 + 40 * u.scanner,
    jump: (150 + 26 * u.ftl) * G.mult('jump') * G.um('jump'),
    slots: h.slots,
    drones: (G.has('drones1') ? 2 : 0) + (G.has('drones2') ? 2 : 0)
  };
  return st;
};
G.upgCost = function (id) {
  const lvl = G.S.ship.up[id], band = Math.min(Math.floor(lvl / 5), G.UPG_BANDS.length - 1), rs = G.UPG_BANDS[band];
  const amt = 28 * Math.pow(1.45, lvl) / Math.pow(4, band);
  const c = {}; c[rs[0]] = Math.ceil(amt); c[rs[1]] = Math.ceil(amt * 0.5);
  if (id === 'ftl' || id === 'scanner') { c[rs[0]] = Math.ceil(amt * 1.4); c[rs[1]] = Math.ceil(amt * 0.9); }
  return c;
};
G.buyUpg = function (id) {
  const c = G.upgCost(id); if (!G.pay(c)) return false;
  G.S.ship.up[id]++; G.dirty = true; return true;
};
G.cargoUsed = function () { let t = 0; const c = G.S.ship.cargo; for (const k in c) t += c[k]; return t; };
G.addCargo = function (id, n) {
  const S = G.S;
  if (!S.codex.res[id]) { S.codex.res[id] = 1; if (G.RES[id].t !== 'common') G.log('New resource: ' + G.RES[id].n, 'good'); }
  if (G.has('uplink') || G.RES[id].t === 'core') { G.add(id, n); return n; }
  const free = G.shipStats().cargo - G.cargoUsed();
  const take = Math.max(0, Math.min(n, free));
  if (take > 0) S.ship.cargo[id] = (S.ship.cargo[id] || 0) + take;
  return take;
};
G.bank = function () {
  const c = G.S.ship.cargo; let n = 0;
  for (const k in c) { G.add(k, c[k]); n += c[k]; delete c[k]; }
  return n;
};

/* ---------- per-system state ---------- */
G.sd = function (sid) { return G.S.sd[sid] || (G.S.sd[sid] = {}); };
G.megaStage = (sid, id) => { const d = G.S.sd[sid]; return d && d.mega && d.mega[id] || 0; };
G.sysBonus = function (sid) {
  const d = G.S.sd[sid], m = d && d.mega || {};
  return { all: m.station ? 0.25 : 0, mine: m.elevator ? 0.6 : 0, ind: m.forge ? 1.2 : 0, def: m.station ? 300 : 0, hab: !!m.planeteng, slots: m.planeteng ? 3 : 0, dyson: m.dyson || 0 };
};
G.megaCountOf = function (id) { let n = 0; for (const sid in G.S.sd) { const m = G.S.sd[sid].mega; if (m && m[id]) n++; } return n; };
G.megaCost = function (sid, id) {
  const d = G.MEGA[id], st = G.megaStage(sid, id); if (st >= d.stages.length) return null;
  const others = Math.max(0, G.megaCountOf(id) - (st > 0 ? 1 : 0));
  return G.scaleCost(d.stages[st].cost, Math.pow(1.6, others) * G.mult('megacost'));
};
G.systemColonies = function (sid) { const out = []; for (const pid in G.S.colonies) if (G.S.colonies[pid].sys === sid) out.push(G.S.colonies[pid]); return out; };
G.canBuildMega = function (sid, id) {
  const d = G.MEGA[id], st = G.megaStage(sid, id);
  if (!G.has(d.req)) return 'Not researched';
  if (st >= d.stages.length) return 'Complete';
  if (d.stages[st].req && !G.has(d.stages[st].req)) return 'Next stage not researched';
  if (!G.systemColonies(sid).length) return 'Needs a colony in this system';
  if (d.scope === 'uni' && st === 0 && G.megaCountOf(id) > 0) return 'Already under construction elsewhere';
  return null;
};
G.buildMega = function (sid, id) {
  if (G.canBuildMega(sid, id)) return false;
  const c = G.megaCost(sid, id); if (!G.pay(c)) return false;
  const d = G.sd(sid); d.mega = d.mega || {}; d.mega[id] = (d.mega[id] || 0) + 1;
  G.dirty = true;
  const md = G.MEGA[id];
  G.log(md.stages[d.mega[id] - 1].n + ' completed in ' + G.sysById(sid).name + '.', 'epic');
  if (G.onMega) G.onMega(sid, id, d.mega[id]);
  return true;
};

/* ---------- colonies ---------- */
G.colonyCount = () => Object.keys(G.S.colonies).length;
G.habThreshold = () => G.has('hab0') ? 0 : G.has('hab15') ? 15 : 40;
G.planetHab = function (p, col) {
  if (G.sysBonus(p.sys).hab) return 100;
  return Math.min(100, p.hab + (col ? (col.b.terraformer || 0) * 6 : 0));
};
G.colonyPodCost = function () { return G.scaleCost({ iron: 150, copper: 40, crystal: 50 }, Math.pow(1.1, G.colonyCount()) * G.mult('cost')); };
G.canColonize = function (p) {
  const S = G.S;
  if (S.colonies[p.id]) return 'Already yours';
  if (!G.has('colonize')) return 'Research Colonial Charter first';
  if (G.S.sd[p.sys] && G.S.sd[p.sys].erased) return 'There is nothing here';
  if (p.hab < G.habThreshold()) return 'Habitability below ' + G.habThreshold() + '% — research better life support';
  const sys = G.sysById(p.sys);
  if (sys.civ) { const c = S.civs[sys.civ]; if (c && !c.dead && !c.vassal && sys.capital) return 'This is their homeworld'; }
  return null;
};
G.colonize = function (p, free) {
  const S = G.S;
  if (!free) { if (G.canColonize(p)) return false; if (!G.pay(G.colonyPodCost())) return false; }
  S.colonies[p.id] = { pid: p.id, sys: p.sys, pop: 2.5, b: {}, auto: false, t: S.t };
  S.stats.colonized++;
  { const d = G.sd(p.sys); d.scan = (d.scan || 0) | (1 << p.idx); }
  const sys = G.sysById(p.sys);
  if (sys.civ && !free) G.relMod(sys.civ, -20, 'Colonised their space');
  const tr = p.trait && G.TRAITS[p.trait];
  if (tr && tr.vault && !free) { G.log('The vault on ' + p.name + ' opens.', 'epic'); G.giveArtifact(2); }
  G.dirty = true;
  if (!free) G.log('Colony founded on ' + p.name + '.', 'good');
  return true;
};
/* Give a colony up. Refunds half of what a pod would cost afterwards, and lowers the price of the next pod. */
G.abandonRefund = function () { const c = G.scaleCost({ iron: 150, copper: 40, crystal: 50 }, Math.pow(1.1, Math.max(0, G.colonyCount() - 1)) * G.mult('cost')); for (const k in c) c[k] = Math.floor(c[k] / 2); return c; };
G.abandonColony = function (pid) {
  const S = G.S, col = S.colonies[pid]; if (!col) return false;
  if (G.colonyCount() <= 1) return false;
  const ref = G.abandonRefund();
  delete S.colonies[pid];
  for (const k in ref) G.add(k, ref[k]);
  G.dirty = true;
  G.log('Colony on ' + G.planetById(pid).name + ' abandoned.', 'warn');
  return true;
};
G.colonySlots = function (col) {
  const p = G.planetById(col.pid), tr = p.trait && G.TRAITS[p.trait];
  return Math.max(2, p.slots + (tr && tr.eff.slots || 0) + G.sysBonus(col.sys).slots + p.moons);
};
G.bldCost = function (id, lvl) {
  const b = G.BLD[id];
  return G.scaleCost(b.cost, Math.pow(b.house ? 1.42 : 1.5, lvl) * G.mult('cost'));
};
G.canBuild = function (col, id) {
  const b = G.BLD[id], lvl = col.b[id] || 0;
  if (b.req && !G.has(b.req)) return 'Not researched';
  if (b.max && lvl >= b.max) return 'Max level';
  if (!lvl && Object.keys(col.b).length >= G.colonySlots(col)) return 'No free slots';
  if (b.ext) { const p = G.planetById(col.pid); if (!b.ext.some(r => p.res[r])) return 'Nothing to extract here'; }
  return null;
};
G.build = function (pid, id) {
  const col = G.S.colonies[pid]; if (!col || G.canBuild(col, id)) return false;
  if (!G.pay(G.bldCost(id, col.b[id] || 0))) return false;
  col.b[id] = (col.b[id] || 0) + 1; G.dirty = true; return true;
};
/* Tear a building down: frees its slot and refunds half of everything spent on its levels. */
G.demolishRefund = function (id, lvl) { const out = {}; for (let l = 0; l < lvl; l++) { const c = G.bldCost(id, l); for (const k in c) out[k] = (out[k] || 0) + c[k]; } for (const k in out) out[k] = Math.floor(out[k] / 2); return out; };
G.demolish = function (pid, id) {
  const col = G.S.colonies[pid]; if (!col || !col.b[id]) return false;
  const ref = G.demolishRefund(id, col.b[id]); delete col.b[id];
  for (const k in ref) G.add(k, ref[k]);
  G.dirty = true; return true;
};
/* Everything one colony does per second, before global energy limits. */
G.colonyCalc = function (col) {
  const p = G.planetById(col.pid), pt = G.PTYPES[p.type], tr = p.trait && G.TRAITS[p.trait], te = tr ? tr.eff : {};
  const sb = G.sysBonus(col.sys), sys = G.sysById(col.sys);
  const hab = G.planetHab(p, col);
  const b = col.b;
  let house = 4, workers = 0, robots = 0;
  for (const id in b) { const d = G.BLD[id]; if (d.house) house += d.house * b[id]; if (d.robots) robots += d.robots * b[id]; if (!d.nowork) workers += b[id]; }
  const popcap = house * (0.35 + hab / 100 * 0.9) * G.mult('popcap') * (1 + (te.pop || 0));
  const eff = workers ? G.clamp((col.pop + robots) / workers, 0.1, 1) : 1;
  const local = (1 + sb.all + (b.spaceport || 0) * 0.06) * eff;
  const out = { p, hab, popcap, workers, robots, eff, prod: {}, conv: {}, enProd: 0, enCons: 0, def: 0, slots: G.colonySlots(col), used: Object.keys(b).length };
  const mMine = G.mult('mine') * (1 + (te.mine || 0) + sb.mine), mInd = G.mult('ind') * (1 + (te.ind || 0) + sb.ind);
  const mSci = G.mult('sci') * (1 + (te.sci || 0)), mEn = G.mult('energy') * (1 + (te.energy || 0)), mCr = G.mult('credits') * (1 + (te.credits || 0));
  let sci = 0, credits = col.pop * 0.12;
  for (const id in b) {
    const d = G.BLD[id], l = b[id];
    if (d.ext) for (const r of d.ext) {
      const st = p.res[r]; if (!st) continue;
      let v = d.rate * l * st * local * mMine;
      if (r === 'crystal' || r === 'darkcrystal') v *= (1 + (te.crystalx || 0)) * G.um('crystalx');
      out.prod[r] = (out.prod[r] || 0) + v;
    }
    if (d.pw > 0) {
      let v = d.pw * l * mEn * (1 + sb.all);
      if (d.solar) v *= (p.res.energy || 1) / 3;
      if (id === 'geothermal' && (pt.glow)) v *= 2;
      if (d.dyson) v *= (1 + sb.dyson * 2);
      out.enProd += v;
    } else if (d.pw < 0) out.enCons += -d.pw * l;
    if (d.inp) out.conv[id] = l * local * mInd;
    if (d.sci) sci += d.sci * l;
    if (d.credits) credits += d.credits * l;
    if (d.def) out.def += d.def * l;
  }
  if (sci) out.prod.sci = sci * local * mSci;
  out.prod.credits = credits * mCr * (1 + sb.all);
  out.def = (out.def + sb.def) * G.mult('colonydef') * (1 + (te.def || 0)) * Math.pow(1.05, sys.level);
  return out;
};
G.rigCost = function (sid) { const n = G.S.sd[sid] && G.S.sd[sid].rigs || 0; return G.scaleCost({ steel: 100, circuits: 40 }, Math.pow(1.7, n) * G.mult('cost')); };
G.buildRig = function (sid) {
  const sys = G.sysById(sid); if (!G.has('rigs') || !sys.belts.length) return false;
  const d = G.sd(sid); if ((d.rigs || 0) >= sys.belts.length * 5) return false;
  if (!G.pay(G.rigCost(sid))) return false;
  d.rigs = (d.rigs || 0) + 1; return true;
};

/* ---------- the tick ---------- */
G.econTick = function (dt, off) {
  const S = G.S; off = off || 1;
  const tot = {}, caps = {}; let enProd = 3, enCons = 0, pop = 0, def = 0;
  for (const pid in S.colonies) {
    const col = S.colonies[pid], c = G.colonyCalc(col);
    for (const k in c.prod) tot[k] = (tot[k] || 0) + c.prod[k];
    for (const k in c.conv) caps[k] = (caps[k] || 0) + c.conv[k];
    enProd += c.enProd; enCons += c.enCons; def += c.def;
    // population
    const g = 0.012 * G.mult('popgrow') * (0.3 + c.hab / 100);
    if (col.pop < c.popcap) col.pop += (c.popcap - col.pop) * (1 - Math.exp(-g * dt * off));
    else col.pop += (c.popcap - col.pop) * (1 - Math.exp(-0.05 * dt));
    pop += col.pop;
  }
  // rigs, star lifters, dyson energy
  const mMine = G.mult('mine');
  for (const sid in S.sd) {
    const d = S.sd[sid]; if (d.erased) continue;
    if (d.rigs) { const sys = G.sysById(sid); if (sys) for (const b of sys.belts) for (const r of b.res) { if (G.RES[r].t === 'legendary' || G.RES[r].t === 'mythic') continue; tot[r] = (tot[r] || 0) + 0.12 * d.rigs * b.rich * mMine / b.res.length * (G.RES[r].t === 'rare' ? 0.15 : G.RES[r].t === 'uncommon' ? 0.5 : 1); } }
    const m = d.mega; if (!m) continue;
    if (m.dyson) enProd += 400 * Math.pow(5, m.dyson) * G.mult('energy');
    if (m.starlifter) { const v = 2500 * mMine; for (const r of ['iron', 'copper', 'silicon', 'gas']) tot[r] = (tot[r] || 0) + v; for (const r of ['titanium', 'uranium', 'platinum']) tot[r] = (tot[r] || 0) + v * 0.2; }
  }
  // diplomacy income
  for (const cid in S.civs) { const c = S.civs[cid]; if (c.dead) continue; const civ = G.civById(cid); if (!civ) continue; if (c.pact) tot.credits = (tot.credits || 0) + civ.eco * 2 * Math.pow(1.12, civ.level) * (civ.quirk.id === 'loveTrade' ? 2 : 1) * G.mult('credits'); if (c.vassal) tot.credits = (tot.credits || 0) + civ.eco * 6 * Math.pow(1.12, civ.level); }
  // energy
  const cap = 600 + enProd * 180;
  let pwr = 1;
  const net = enProd - enCons;
  if ((S.res.energy || 0) + net * dt < 0) pwr = Math.max(0.1, enProd / Math.max(1e-9, enCons));
  S.res.energy = G.clamp((S.res.energy || 0) + net * dt * off, 0, cap);
  const rates = { energy: net };
  for (const k in tot) { const v = tot[k] * pwr; rates[k] = v; G.add(k, v * dt * off); }
  // converters, upstream first
  for (const id of G.CONV_ORDER) {
    const c = caps[id]; if (!c) continue;
    const d = G.BLD[id]; let cyc = c * pwr * dt * off;
    for (const k in d.inp) cyc = Math.min(cyc, (S.res[k] || 0) / d.inp[k]);
    if (cyc <= 0) continue;
    for (const k in d.inp) { S.res[k] -= d.inp[k] * cyc; rates[k] = (rates[k] || 0) - d.inp[k] * cyc / (dt * off); }
    for (const k in d.out) {
      let v = d.out[k] * cyc;
      if (k === 'energy') { v *= G.mult('energy') / G.mult('ind'); S.res.energy = Math.min(cap, S.res.energy + v); }
      else if (k === 'sci') { v *= G.mult('sci') / G.mult('ind'); G.add('sci', v); }
      else G.add(k, v);
      rates[k] = (rates[k] || 0) + v / (dt * off);
    }
  }
  G.rates = rates; G.pwr = pwr; G.energyCap = cap; G.totalPop = pop; G.totalDef = def; G.enProd = enProd; G.enCons = enCons;
  // research
  if (S.cur) {
    const need = G.techCost(S.cur.id), take = Math.min(S.res.sci || 0, need - S.cur.p);
    S.cur.p += take; S.res.sci -= take;
    if (S.cur.p >= need - 1e-6) G.finishResearch();
  } else if (S.queue.length) G.startResearch(S.queue.shift());
};

/* ---------- research ---------- */
G.repLevel = id => G.S.rep[id] || 0;
G.techCost = function (id) {
  if (G.TECH[id]) return Math.round(22 * Math.pow(3.1, G.TECH[id].t));
  return Math.round(40000 * Math.pow(1.55, G.repLevel(id)));
};
G.techVisible = function (t) { return !t.flag || G.S.story[t.flag]; };
G.canResearch = function (id) {
  const S = G.S, t = G.TECH[id];
  if (!t) return G.REPEAT.some(r => r.id === id) && Object.keys(S.tech).length >= 30;
  if (S.tech[id]) return false;
  if (!G.techVisible(t)) return false;
  return t.req.every(r => S.tech[r]);
};
G.startResearch = function (id) {
  const S = G.S; if (!G.canResearch(id)) return false;
  if (S.cur && S.cur.id === id) return false;
  if (S.cur) { if (!S.queue.includes(id) && S.queue.length < 6) S.queue.push(id); return true; }
  S.cur = { id, p: 0 }; return true;
};
G.finishResearch = function () {
  const S = G.S, id = S.cur.id; S.cur = null;
  if (G.TECH[id]) { S.tech[id] = 1; G.log('Research complete: ' + G.TECH[id].n, 'sci'); }
  else { S.rep[id] = (S.rep[id] || 0) + 1; G.log('Research complete: ' + G.REPEAT.find(r => r.id === id).n + ' ' + S.rep[id], 'sci'); }
  G.dirty = true;
  if (G.sfx) G.sfx('tech');
  while (S.queue.length) { const n = S.queue.shift(); if (G.startResearch(n)) break; }
};

/* ---------- fleet ---------- */
G.fleetCap = function () {
  let cap = 4 + (G.M.fleetcap || 0);
  for (const pid in G.S.colonies) cap += (G.S.colonies[pid].b.shipyard || 0) * 4;
  return Math.floor(cap);
};
G.fleetUsed = function () { let n = 0; for (const k in G.S.fleet) n += G.S.fleet[k] * G.FLEET[k].cp; return n; };
G.hasShipyard = function () { for (const pid in G.S.colonies) if (G.S.colonies[pid].b.shipyard) return true; return false; };
G.buyShip = function (id, n) {
  const d = G.FLEET[id]; n = n || 1;
  if (!G.has(d.req) || !G.hasShipyard()) return false;
  if (G.fleetUsed() + d.cp * n > G.fleetCap()) return false;
  if (!G.pay(G.scaleCost(d.cost, n))) return false;
  G.S.fleet[id] = (G.S.fleet[id] || 0) + n;
  if (!G.S.codex.ship) G.S.codex.ship = {};
  G.S.codex.ship[id] = 1;
  return true;
};
G.fleetPower = function () {
  let p = 0; for (const k in G.S.fleet) { const d = G.FLEET[k]; p += G.S.fleet[k] * Math.sqrt(d.hp * G.mult('fleethp') * d.dmg * G.mult('fleetdmg')) * 2; }
  return p;
};
G.shipPower = function () { const s = G.shipStats(); return Math.sqrt((s.hull + s.shield) * s.dmg) * 2; };

/* ---------- civilisation score ---------- */
G.score = function () {
  const S = G.S; let s = 0;
  for (const pid in S.colonies) { s += 20; const b = S.colonies[pid].b; for (const k in b) s += b[k]; }
  s += Object.keys(S.tech).length * 8;
  for (const k in S.rep) s += S.rep[k] * 4;
  s += (G.megaCount || 0) * 150;
  s += Object.keys(S.visited).length * 2;
  s += S.ship.hullClass * 30 + G.fleetUsed() * 0.5 + S.arti.length * 6;
  return s;
};
G.civLevel = () => Math.floor(Math.sqrt(G.score()));
G.notoriety = function () { return 1 + G.colonyCount() * 0.03 + (G.megaCount || 0) * 0.25 + (G.dysonStages || 0) * 0.3; };

/* ---------- offline progress ---------- */
G.offline = function () {
  const S = G.S, el = (Date.now() - S.last) / 1000;
  if (el < 90 || !G.colonyCount()) return null;
  const secs = Math.min(el, 12 * 3600), eff = Math.min(1, 0.4 * G.mult('offline'));
  const before = Object.assign({}, S.res);
  const steps = 24;
  for (let i = 0; i < steps; i++) G.econTick(secs / steps, eff);
  const gain = {};
  for (const k in S.res) { const d = S.res[k] - (before[k] || 0); if (d > 0.5 && k !== 'energy') gain[k] = d; }
  return { secs: el, counted: secs, eff, gain };
};
