'use strict';
/* Rustwake — travel, diplomacy, raids, the Silence, collections, missions, achievements, ascension. */

/* ---------- travel ---------- */
G.here = () => G.sysById(G.S.loc);
G.anchored = function (cx, cy) { for (const a of G.anchorList()) if (Math.hypot(a[0] - cx, a[1] - cy) <= 8) return true; return false; };
G.anchorList = function () {
  if (G._anchors && !G._anchorsDirty) return G._anchors;
  const out = []; for (const sid in G.S.sd) { const m = G.S.sd[sid].mega; if (m && m.anchor) out.push(G.parseId(sid)); }
  G._anchors = out; G._anchorsDirty = false; return out;
};
G.isErased = function (cx, cy) {
  const si = G.S.silence; if (!si.on) return false;
  if (cx === 0 && cy === 0 && si.r < 9999) { /* home can go too */ }
  return Math.hypot(cx - si.cx, cy - si.cy) < si.r && !G.anchored(cx, cy);
};
G.jumpCost = function (sys) {
  const a = G.here(), st = G.shipStats();
  if (G.megaStage(a.id, 'stargate') && G.megaStage(sys.id, 'stargate')) return 0;
  return Math.min(st.energy * 0.9, Math.hypot(sys.x - a.x, sys.y - a.y) * 0.28 * G.mult('jumpcost'));
};
G.canJump = function (sys) {
  const S = G.S, a = G.here(), st = G.shipStats();
  if (sys.id === S.loc) return 'You are here';
  if (!S.ship.ftl) return 'FTL drive is broken';
  const gate = G.megaStage(a.id, 'stargate') && G.megaStage(sys.id, 'stargate');
  if (!gate && Math.hypot(sys.x - a.x, sys.y - a.y) > st.jump) return 'Out of jump range';
  if (G.isErased(sys.cx, sys.cy) && !S.tech.trn2) return 'There is nothing there to jump to';
  if (S.ship.en < G.jumpCost(sys)) return 'Not enough energy (' + Math.ceil(G.jumpCost(sys)) + ' needed)';
  if (G.flight && G.flight.hostileNear(650)) return 'Hostiles too close to spool the drive';
  return null;
};
G.reveal = function (sys) {
  const st = G.shipStats(); let obs = 0;
  for (const pid in G.S.colonies) obs += G.S.colonies[pid].b.observatory || 0;
  for (const s of G.systemsNear(sys.x, sys.y, st.scan + Math.min(300, obs * 4))) G.S.known[s.id] = 1;
};
G.jump = function (sid, free) {
  const S = G.S, sys = G.sysById(sid);
  if (!free) { if (G.canJump(sys)) return false; S.ship.en -= G.jumpCost(sys); }
  S.loc = sid; S.stats.jumps++;
  G.arrive(sys, true);
  return true;
};
G.arrive = function (sys, jumped) {
  const S = G.S, first = !S.visited[sys.id];
  S.visited[sys.id] = 1; S.known[sys.id] = 1;
  G.reveal(sys);
  if (!S.codex.star[sys.cls]) { S.codex.star[sys.cls] = 1; if (first && !sys.home) G.log('New star type catalogued: ' + sys.star.n, 'sci'); }
  if (sys.level > S.stats.maxLevel) S.stats.maxLevel = sys.level;
  if (first && !sys.home) { G.add('sci', 4 + sys.level * 2); G.compXP(3 + sys.level); }
  if (sys.civ) G.meet(sys.civ);
  if (G.flight) G.flight.enter(sys, jumped);
  if (jumped && G.sfx) G.sfx('jump');
  // arrival events
  if (jumped && first && !sys.home && G.rand.chance(0.14 * Math.min(3, G.mult('anomaly')))) { const ev = G.pickEvent('jump', sys.level); if (ev) G.queueEvent(ev, { level: sys.level, sys }); }
  if (sys.civ) { const cs = G.S.civs[sys.civ], civ = G.civById(sys.civ); if (cs && !cs.dead && civ.quirk.id === 'isolation' && !cs.pact && !cs.vassal && jumped) G.relMod(sys.civ, -3, 'Trespassing'); }
  G.dirty = true;
  G.save();
};

/* ---------- rewards / collections ---------- */
G.lootScale = L => Math.pow(1.16, Math.max(0, L - 1)) * G.mult('loot');
G.giveArtifact = function (maxRar, silent) {
  const S = G.S, L = S.stats.maxLevel;
  const cap = Math.min(4, Math.max(maxRar || 1, 1 + Math.floor(L / 12)));
  const pool = G.ARTI_LIST.filter(a => !S.arti.includes(a.id) && a.rar <= cap).map(a => [a, [0, 60, 26, 9, 2][a.rar]]);
  if (!pool.length) { const c = 500 * G.lootScale(L); G.add('credits', c); return null; }
  const a = G.rand.weighted(pool);
  S.arti.push(a.id); G.dirty = true;
  if (!silent) G.log('Artifact found: ' + a.n + ' — ' + a.d, 'epic');
  if (G.sfx) G.sfx('epic');
  return a;
};
G.compSlots = () => 1 + (G.has('comp2') ? 1 : 0) + (G.has('comp3') ? 1 : 0);
G.giveCompanion = function () {
  const S = G.S;
  const un = G.COMP_LIST.filter(c => !S.comp[c.id]);
  if (un.length && G.rand.chance(0.8)) {
    const c = G.rand.pick(un); S.comp[c.id] = { lvl: 1, xp: 0, pris: G.rand.chance(0.04) };
    if (S.active.length < G.compSlots()) S.active.push(c.id);
    G.dirty = true; G.log('A ' + (S.comp[c.id].pris ? 'PRISMATIC ' : '') + c.n + ' has adopted your ship.', 'epic');
    return c;
  }
  const own = Object.keys(S.comp); if (!own.length) return null;
  const id = G.rand.pick(own), c = S.comp[id];
  if (!c.pris && G.rand.chance(0.15)) { c.pris = true; G.log('Your ' + G.COMP[id].n + ' met another of its kind and came back… prismatic.', 'epic'); }
  else { c.xp += 40 * Math.pow(1.3, c.lvl); G.log('Your ' + G.COMP[id].n + ' made a friend and learned something.', 'good'); G.compXP(0); }
  G.dirty = true; return G.COMP[id];
};
G.compNeed = lvl => 20 * Math.pow(1.32, lvl);
G.compXP = function (n) {
  const S = G.S; n *= G.mult('xp');
  for (const id of S.active) {
    const c = S.comp[id]; if (!c) continue;
    c.xp += n;
    while (c.xp >= G.compNeed(c.lvl)) { c.xp -= G.compNeed(c.lvl); c.lvl++; G.dirty = true; if (c.lvl === 10 || c.lvl === 25) G.log(G.COMP[id].n + ' evolved!', 'epic'); }
  }
};
G.compName = function (id) { const c = G.S.comp[id], d = G.COMP[id]; return (c.pris ? 'Prismatic ' : '') + (c.lvl >= 25 ? 'Elder ' : c.lvl >= 10 ? 'Greater ' : '') + d.n; };

/* ---------- diplomacy ---------- */
G.civState = function (cid) {
  const S = G.S; if (S.civs[cid]) return S.civs[cid];
  const civ = G.civById(cid), rng = G.RNG(civ.seed);
  return S.civs[cid] = { rel: civ.pers.base + rng.i(-10, 10), mods: [], met: false };
};
G.meet = function (cid) {
  const c = G.civState(cid); if (c.met) return;
  const civ = G.civById(cid); c.met = true; G.S.codex.species[cid] = { n: civ.species, hue: civ.hue, body: civ.body };
  G.add('sci', 20 * G.lootScale(civ.level));
  G.log('First contact: ' + civ.name + ' (' + civ.gov + ', ' + civ.pers.n + ').', 'epic');
  G.queueEvent(G.EVENT.firstcontact, { level: civ.level, civ });
};
G.relMod = function (cid, v, why) {
  const c = G.civState(cid); if (c.dead) return;
  if (v > 0) v *= G.mult('diplo');
  c.rel = G.clamp(c.rel + v, -100, 100);
  if (why) { c.mods.unshift({ n: why, v: Math.round(v) }); if (c.mods.length > 7) c.mods.pop(); }
};
G.attitude = function (c) {
  if (c.dead) return ['Extinct', '#777'];
  if (c.vassal) return ['Vassal', '#ffd76a'];
  if (c.war) return ['At War', '#ff4a5c'];
  if (c.ally) return ['Allied', '#6affb0'];
  const r = c.rel;
  return r <= -60 ? ['Enemy', '#ff4a5c'] : r <= -25 ? ['Hostile', '#ff8a5c'] : r < 25 ? ['Neutral', '#cfd6e6'] : r < 65 ? ['Friendly', '#9dff8a'] : ['Devoted', '#6affb0'];
};
G.civPower = civ => 70 * civ.mil * Math.pow(1.16, civ.level) * G.um('enemy');
G.myPower = () => G.shipPower() + G.fleetPower();
G.civHostile = function (cid) { const c = G.S.civs[cid]; return !!(c && !c.dead && !c.vassal && (c.war || c.rel <= -60)); };
G.giftCost = civ => Math.round(150 * Math.pow(1.14, civ.level));
G.diplo = function (cid, act) {
  const S = G.S, c = G.civState(cid), civ = G.civById(cid);
  if (c.dead) return 'They are gone.';
  switch (act) {
    case 'gift': if (!G.pay({ credits: G.giftCost(civ) })) return 'Not enough credits.'; G.relMod(cid, 8, 'Gift'); return 'They accept the gift.';
    case 'pact': if (!G.has('pacts')) return 'You cannot make yourself understood. Research Xenolinguistics.'; if (c.war) return 'Not while at war.'; if (c.rel < 15) return 'They decline. (Needs relation 15)'; c.pact = true; G.relMod(cid, 10, 'Trade agreement'); G.dirty = true; return 'Trade agreement signed.';
    case 'rpact': if (!c.pact) return 'Sign a trade agreement first.'; if (c.rel < 40) return 'They decline. (Needs relation 40)'; if (!G.pay({ credits: G.giftCost(civ) * 4 })) return 'Not enough credits.'; c.rpact = true; G.relMod(cid, 5, 'Research exchange'); G.dirty = true; return 'Research exchange begun.';
    case 'ally': if (!G.has('alliance')) return 'Research Galactic Federation.'; if (c.rel < 70) return 'They are not ready. (Needs relation 70)'; c.ally = true; c.war = false; G.relMod(cid, 15, 'Alliance'); G.dirty = true; return 'Alliance formed. Their admirals now answer your calls.';
    case 'spy': {
      if (!G.has('spy')) return 'Research Espionage.';
      if ((c.spyT || 0) > S.t) return 'Your agents need ' + G.fmtT(c.spyT - S.t) + ' to re-establish cover.';
      c.spyT = S.t + 150;
      if (G.rand.chance(0.7 - civ.tech * 0.07)) { const n = 80 * G.lootScale(civ.level) * civ.tech; G.add('sci', n); return 'Your agents return with ' + G.fmt(n) + ' research.'; }
      G.relMod(cid, -18, 'Caught spying'); return 'Your agents were caught.';
    }
    case 'threat': {
      if ((c.thrT || 0) > S.t) return 'They are still weighing your last threat.';
      c.thrT = S.t + 200;
      if (G.myPower() > G.civPower(civ) * 1.2) { const n = 400 * G.lootScale(civ.level) * civ.eco; G.add('credits', n); G.relMod(cid, -12, 'Threatened'); return 'They pay ' + G.fmt(n) + ' credits to make you leave.'; }
      G.relMod(cid, -25, 'Empty threat'); if (civ.pers.war >= 0.6) { G.declareWar(cid, true); return 'They laugh. Then they declare war.'; } return 'They are not impressed.';
    }
    case 'war': if (c.war) return 'Already at war.'; if (c.ally) { c.ally = false; for (const o in S.civs) if (o !== cid) G.relMod(o, -15, 'Betrayed an ally'); } G.declareWar(cid, false); return 'War declared.';
    case 'peace': {
      if (!c.war) return 'You are not at war.';
      const cost = G.giftCost(civ) * 6;
      if (G.myPower() > G.civPower(civ) * 2) { c.war = false; c.rel = -30; return 'Outgunned, they accept peace.'; }
      if (!G.pay({ credits: cost })) return 'They want ' + G.fmt(cost) + ' credits in reparations.';
      c.war = false; c.rel = -40; return 'Peace, for a price.';
    }
  }
  return '';
};
G.declareWar = function (cid, byThem) {
  const c = G.civState(cid), civ = G.civById(cid);
  c.war = true; c.pact = false; c.rpact = false; c.ally = false; c.rel = -100; G.dirty = true;
  G.log(byThem ? civ.name + ' have declared war on you.' : 'You are at war with ' + civ.name + '.', 'bad');
};
G.conquer = function (cid) {
  const c = G.civState(cid), civ = G.civById(cid);
  c.war = false; c.vassal = true; c.rel = -20; c.pact = false; G.dirty = true;
  G.add('credits', 3000 * G.lootScale(civ.level));
  G.log(civ.name + ' surrender. They are your vassals now.', 'epic');
  G.giveArtifact(2);
};
G.tradePrice = function (civ, res, selling) {
  const v = G.RES[res].v;
  return selling ? v * (civ.wants.includes(res) ? 2.2 : 0.7) : v * (civ.sells.includes(res) ? 1.1 : 3);
};
G.tradeSell = function (cid, res, n) {
  const civ = G.civById(cid); n = Math.min(Math.floor(n), Math.floor(G.get(res))); if (!(n > 0)) return 0;
  const cr = n * G.tradePrice(civ, res, true) * G.mult('credits');
  G.add(res, -n); G.add('credits', cr); if (cr > 200) G.relMod(cid, 0.5); return cr;
};
G.tradeBuy = function (cid, res, n) {
  const civ = G.civById(cid), price = G.tradePrice(civ, res, false);
  n = Math.min(Math.floor(n), Math.floor(G.get('credits') / price)); if (!(n > 0)) return 0;
  G.add('credits', -n * price); G.add(res, n); return n;
};
G.civTick = function () { // every ~15s
  const S = G.S; let robots = 0;
  for (const pid in S.colonies) robots += S.colonies[pid].b.robotfactory || 0;
  for (const cid in S.civs) {
    const c = S.civs[cid]; if (c.dead || !c.met || c.vassal) continue;
    const civ = G.civById(cid); if (!civ) continue;
    if (!c.war) c.rel += Math.sign(civ.pers.base - c.rel) * 0.3 + (c.pact ? 0.25 : 0) + (c.ally ? 0.4 : 0);
    const q = civ.quirk.id;
    if (q === 'hateAI' && robots) c.rel -= 0.4;
    if (q === 'loveStrong' && G.myPower() > G.civPower(civ)) c.rel += 0.4;
    if (q === 'loveScience' && S.cur) c.rel += 0.25;
    if (q === 'lovePets') c.rel += 0.08 * Object.keys(S.comp).length;
    if (q === 'hateExpand') c.rel -= 0.06 * Math.floor(G.colonyCount() / 10);
    if (q === 'hateMega') c.rel -= 0.25 * (G.megaCount || 0);
    if (q === 'remember' && S.silence.on) c.rel += 0.5;
    c.rel = G.clamp(c.rel, -100, 100);
    if (!c.war && !c.ally && c.rel <= -75 && civ.pers.war >= 0.6 && G.rand.chance(0.12)) G.declareWar(cid, true);
  }
};

/* ---------- raids ---------- */
G.raidTick = function () { // once a second
  const S = G.S, r = S.raid, ids = Object.keys(S.colonies);
  if (!ids.length) { r.next = S.t + 600; return; }
  if (r.pending) {
    if (S.t < r.pending.t) return;
    const pd = r.pending; r.pending = null;
    const col = S.colonies[pd.pid]; if (!col) return;
    const p = G.planetById(pd.pid), sys = G.sysById(col.sys);
    if (S.loc === col.sys && G.flight) { G.flight.spawnRaid(pd.fac, sys.level, pd.power); G.log('The raid has arrived at ' + p.name + '. Defend it!', 'bad'); return; }
    const def = G.colonyCalc(col).def;
    if (def >= pd.power * G.rand.range(0.8, 1.2)) { S.stats.raidsWon++; const cr = 40 * G.lootScale(sys.level); G.add('credits', cr); G.log(p.name + ' defences repelled the raid. Salvage: ' + G.fmt(cr) + ' credits.', 'good'); }
    else G.raidLoss(col, p);
    return;
  }
  if (S.t < r.next) return;
  const pid = G.rand.pick(ids), col = S.colonies[pid], sys = G.sysById(col.sys), p = G.planetById(pid);
  let fac = sys.faction === 'creature' ? 'creature' : 'pirate', who = 'Pirates';
  const wars = Object.keys(S.civs).filter(c => S.civs[c].war && !S.civs[c].dead);
  if (wars.length && G.rand.chance(0.6)) { fac = 'empire'; who = G.civById(G.rand.pick(wars)).name; }
  else if (S.silence.on && G.rand.chance(0.2)) { fac = 'silence'; who = 'Something quiet'; }
  else if (G.megaCount > 2 && sys.level >= 8 && G.rand.chance(0.3)) { fac = 'ai'; who = 'Rogue machines'; }
  const power = 30 * Math.pow(1.16, sys.level) * G.notoriety() * G.um('enemy') * (1 + S.stats.raidsWon * 0.03);
  r.pending = { pid, t: S.t + 80, fac, power };
  r.next = S.t + (420 + G.rand.range(0, 320)) / (G.um('raids') * Math.sqrt(G.notoriety()));
  G.log(who + ' will raid ' + p.name + ' (' + sys.name + ') in 80s. Raid strength ' + G.fmt(power) + ' vs defence ' + G.fmt(G.colonyCalc(col).def) + '.', 'bad');
  if (G.sfx) G.sfx('alarm');
};
/* A percentage loss that cannot exceed two minutes of that resource's income: painful early, never ruinous late. */
G.capLoss = function (id, frac) {
  const have = G.S.res[id] || 0;
  return Math.max(0, Math.min(have * frac, Math.max(id === 'credits' ? 50 : 20, 120 * Math.max(0, G.rates[id] || 0))));
};
G.raidLoss = function (col, p) {
  const S = G.S; S.stats.raidsLost++;
  const ids = Object.keys(col.b); let lost = [];
  for (let i = 0; i < 2 && ids.length; i++) { const id = G.rand.pick(ids); if (col.b[id] > 1) { col.b[id]--; lost.push(G.BLD[id].n); } }
  col.pop *= 0.7;
  for (const k of ['iron', 'copper', 'silicon', 'crystal', 'steel', 'circuits', 'credits']) S.res[k] = (S.res[k] || 0) - G.capLoss(k, 0.06);
  G.log(p.name + ' was raided. ' + (lost.length ? 'Damaged: ' + lost.join(', ') + '. ' : '') + 'A third of the population is gone and some basic stock was taken (at most 6%, never more than two minutes of income).', 'bad');
  G.dirty = true;
};

/* ---------- the Silence ---------- */
G.wakeSilence = function () {
  const S = G.S; if (S.silence.on || S.silence.defeated) return;
  const rng = G.RNG(G.hash(S.seed, S.uni.n, 666, 1)), a = rng.range(0, G.TAU);
  const here = G.here(); const d = 26;
  S.silence = { on: true, cx: Math.round(here.cx + Math.cos(a) * d), cy: Math.round(here.cy + Math.sin(a) * d), r: 2 };
  S.story.silence = true;
  G.log('Something has started removing stars. Check the galaxy map.', 'bad');
};
G.silenceTick = function (dt) { // once a second
  const S = G.S, si = S.silence; if (!si.on) return;
  si.r += dt / 210 * (1 + 0.15 * (S.uni.n - 1));
  for (const pid in S.colonies) {
    const col = S.colonies[pid], c = G.parseId(col.sys);
    if (G.isErased(c[0], c[1])) {
      const p = G.planetById(pid); delete S.colonies[pid]; S.stats.erased++; G.sd(col.sys).erased = 1; G.dirty = true;
      G.log(p.name + ' is gone. Not destroyed. Gone. It is hard to remember there was ever a planet there.', 'bad');
    }
  }
};
G.silenceOrigin = function () { const si = G.S.silence; return G.nearestSystem(si.cx, si.cy); };
G.defeatSilence = function () {
  const S = G.S; S.silence.on = false; S.silence.defeated = true; S.silence.r = 0;
  for (const sid in S.sd) delete S.sd[sid].erased;
  G.log('The Silence stops. The stars it took are back, and nobody but you remembers they were gone.', 'epic');
  G.giveArtifact(4);
};

/* ---------- story: the signal ---------- */
const SIGNAL_DIST = [3, 6, 10, 15, 21];
G.signalTarget = function () {
  const S = G.S, k = S.story.signal; if (k >= SIGNAL_DIST.length || !S.ship.ftl) return null;
  const rng = G.RNG(G.hash(S.seed, S.uni.n, 4040, k)), a = rng.range(0, G.TAU);
  return G.nearestSystem(Math.round(Math.cos(a) * SIGNAL_DIST[k]), Math.round(Math.sin(a) * SIGNAL_DIST[k]));
};

/* ---------- events ---------- */
G.eventQueue = [];
G.queueEvent = function (ev, ctx) { if (ev) G.eventQueue.push({ ev, ctx: ctx || {} }); };
G.pickEvent = function (where, level) {
  const S = G.S;
  const pool = G.EVENTS.filter(e => e.where.includes(where) && (e.minL || 0) <= level && !(e.once && S.codex.event[e.id]));
  if (!pool.length) return null;
  // prefer unseen events
  const unseen = pool.filter(e => !S.codex.event[e.id]);
  return G.rand.pick(unseen.length && G.rand.chance(0.7) ? unseen : pool);
};
G.resolveEvent = function (ev, ci, ctx) {
  const S = G.S, ch = ev.choices[ci], L = ctx.level || 1, sc = G.lootScale(L);
  const lines = [];
  const X = {
    ctx, L, lines,
    res(id, base) { const n = Math.ceil(base * sc); G.add(id, n); lines.push('+' + G.fmt(n) + ' ' + G.RES[id].n); },
    flat(id, n) { G.add(id, n); lines.push('+' + G.fmt(n) + ' ' + G.RES[id].n); },
    lose(id, frac) { const n = Math.floor(id === 'credits' ? Math.min(G.get(id) * frac, Math.max(G.capLoss(id, frac), 300 * sc)) : G.get(id) * frac); if (n > 0) { G.add(id, -n); lines.push('−' + G.fmt(n) + ' ' + G.RES[id].n); } },
    credits(b) { X.res('credits', b); }, sci(b) { X.res('sci', b); },
    rare() {
      const opts = ['titanium', 'uranium', 'platinum', 'darkcrystal', 'voidgas', 'quantumore'].filter(r => G.RES[r].minL <= L + 6);
      const id = opts.length ? G.rand.pick(opts) : 'crystal'; X.res(id, 14 / Math.sqrt(G.RES[id].v));
    },
    legend() { const id = G.rand.pick(['stellarheart', 'ancientmatter', 'chronocrystal']); X.flat(id, 1 + (G.rand.chance(0.3) ? 1 : 0)); },
    hurt(f) { const st = G.shipStats(); S.ship.sh = 0; S.ship.hp = Math.max(1, S.ship.hp - st.hull * f); lines.push('Hull damaged'); },
    heal() { const st = G.shipStats(); S.ship.hp = st.hull; S.ship.sh = st.shield; S.ship.en = st.energy; lines.push('Ship fully restored'); },
    fight(fac, budget, boss) { ctx.fight = { fac, budget, boss }; lines.push('Hostiles incoming!'); },
    arti(r) { const a = G.giveArtifact(r, true); lines.push(a ? 'Artifact: ' + a.n + ' — ' + a.d : 'A handful of credits'); },
    comp() { const c = G.giveCompanion(); if (c) lines.push('Companion: ' + c.n); },
    rel(v, why) { if (ctx.civ) { G.relMod(ctx.civ.id, v, why || 'Encounter'); lines.push('Relations ' + (v > 0 ? '+' : '') + v); } },
    relAll(v, why) { for (const cid in S.civs) if (S.civs[cid].met) G.relMod(cid, v, why); lines.push('Relations with everyone ' + (v > 0 ? '+' : '') + v); },
    tech(f) { if (S.cur) { S.cur.p += G.techCost(S.cur.id) * f; lines.push('Research leaps forward'); } else X.sci(40); },
    heat(v) { if (G.flight) G.flight.heat = G.clamp(G.flight.heat + v, 0, 99); lines.push(v > 0 ? 'Your signature spikes' : 'Your signature fades'); },
    energy(f) { const st = G.shipStats(); S.ship.en = G.clamp(S.ship.en + st.energy * f, 0, st.energy); lines.push(f > 0 ? 'Energy restored' : 'Energy drained'); },
    pop(f) { if (ctx.col) { ctx.col.pop *= 1 + f; lines.push('Population ' + (f > 0 ? '+' : '') + Math.round(f * 100) + '%'); } },
    xp(n) { G.compXP(n * (1 + L)); lines.push('Companions gain experience'); },
    upg(id) { S.ship.up[id]++; G.dirty = true; lines.push(G.UPG[id].n + ' improved for free'); },
    signal() { S.story.signal++; if (S.story.signal >= SIGNAL_DIST.length) G.wakeSilence(); },
    flag(k) { S.story[k] = true; },
    wormhole() { ctx.wormhole = true; lines.push('The ship is pulled through'); }
  };
  const outs = typeof ch.out === 'function' ? [{ w: 1, t: '', f: ch.out }] : ch.out;
  const o = G.rand.weighted(outs.map(x => [x, x.w || 1]));
  if (o.f) o.f(X);
  if (!S.codex.event[ev.id]) S.codex.event[ev.id] = 1;
  S.stats.events++;
  G.dirty = true;
  return { text: typeof o.t === 'function' ? o.t(ctx) : o.t, lines, ctx };
};

/* ---------- missions ---------- */
const anyCol = f => { for (const pid in G.S.colonies) if (f(G.S.colonies[pid])) return true; return false; };
const megaAny = (id, st) => { for (const sid in G.S.sd) { const m = G.S.sd[sid].mega; if (m && (m[id] || 0) >= (st || 1)) return true; } return false; };
G.megaAny = megaAny;
G.MISSIONS = [
  { t: 'Scrape together a repair', d: () => G.touch ? 'Follow the yellow marker to a rock and hold MINE. When the marker points back to the Waystation, fly there and tap the prompt to dock: that banks your cargo. Bank 30 Iron and 12 Crystal.' : 'Follow the yellow marker to a rock and hold SPACE to mine it. When the marker points back to the Waystation, fly there and press E to dock: that banks your cargo. Bank 30 Iron and 12 Crystal.',
    w: () => { const F = G.flight, c = G.S.ship.cargo; if (G.S.loc !== '0,0') return null; const nI = 30 - G.get('iron') - (c.iron || 0), nC = 12 - G.get('crystal') - (c.crystal || 0); if ((nI <= 0 && nC <= 0) || G.cargoUsed() >= G.shipStats().cargo * 0.98) { const o = F.objs.find(x => x.type === 'station'); return o && { x: o.x, y: o.y, l: 'Dock to bank cargo' }; } return G.nearRock(nI > 0 ? 'iron' : 'crystal'); }, c: () => G.S.ship.ftl || (G.get('iron') >= 30 && G.get('crystal') >= 12), p: () => Math.min(30, Math.floor(G.get('iron'))) + '/30 iron, ' + Math.min(12, Math.floor(G.get('crystal'))) + '/12 crystal banked' },
  { t: 'Repair the FTL drive', d: () => 'Open the Ship panel (' + (G.touch ? 'MENU, then Ship' : 'press 2') + ') and repair the drive.', c: () => G.S.ship.ftl, r: { credits: 60 } },
  { t: 'Scan the neighbours', d: 'Fly close to three planets to scan them (follow the marker). Scanning earns research, which is what you spend on technology.',
    w: () => { const F = G.flight, sys = F.sys, sd = G.S.sd[sys.id] || {}; let b = null, bd = 1e12; for (const p of sys.planets) { if ((sd.scan || 0) & (1 << p.idx)) continue; const pp = G.planetPos(p), d = Math.hypot(pp[0] - F.ship.x, pp[1] - F.ship.y); if (d < bd) { bd = d; b = { x: pp[0], y: pp[1], l: 'Scan this planet' }; } } return b; }, c: () => G.S.stats.scans >= 3, p: () => G.S.stats.scans + '/3 scanned', r: { sci: 12 } },
  { t: 'Colonial Charter', d: () => 'Open Research (' + (G.touch ? 'MENU, then Research' : 'press 4') + '), pick Colonial Charter in the Society row and research it. If you are short of research, scan more planets.', c: () => G.S.tech.soc1 },
  { t: 'A place to stand', d: 'Fly to Haven (the blue-green world, follow the marker), orbit it and found a colony. The colony pod costs iron, copper and crystal, so mine and bank those first.',
    w: () => { if (G.S.loc !== '0,0') return null; const p = G.here().planets[1], pp = G.planetPos(p); return { x: pp[0], y: pp[1], l: 'Haven: found a colony here' }; }, c: () => G.colonyCount() >= 1, r: { iron: 120, crystal: 40 } },
  { t: 'Ore and light', d: 'Build a Mine and a Solar Farm on your colony. Buildings without energy run slowly.', c: () => anyCol(c => c.b.mine && c.b.solar), r: { copper: 60 } },
  { t: 'Start thinking', d: 'Build a Laboratory. Research is what turns a camp into a civilisation.', c: () => anyCol(c => c.b.lab), r: { sci: 30 } },
  { t: 'Leave home', d: 'Open the galaxy map (M), pick a star inside the ring and jump. Lingering in wild systems raises your signature until something comes looking.', c: () => G.S.stats.jumps >= 1, r: { credits: 150 } },
  { t: 'There is a signal', d: 'Something is transmitting. The map marks its source. Go and look.', c: () => G.S.story.signal >= 1, r: { sci: 80 } },
  { t: 'Steel', d: 'Research Ore Processing, build a Smelter, and stockpile 50 Steel.', c: () => G.get('steel') >= 50, p: () => Math.floor(G.get('steel')) + '/50', r: { credits: 300 } },
  { t: 'Less rust', d: 'Buy five ship upgrades in the Ship panel.', c: () => { let n = 0; for (const k in G.S.ship.up) n += G.S.ship.up[k]; return n >= 5; }, r: { crystal: 150 } },
  { t: 'Clean house', d: 'Find a pirate base (red marker in a system) and destroy it. Bring weapons.', c: () => G.S.stats.bases >= 1, r: { credits: 1200 } },
  { t: 'Not alone', d: 'Find another civilisation. Their territory shows on the map as coloured haze.', c: () => Object.keys(G.S.codex.species).length >= 1, r: { sci: 300 } },
  { t: 'Three worlds', d: 'Hold three colonies.', c: () => G.colonyCount() >= 3, p: () => G.colonyCount() + '/3', r: { steel: 300 } },
  { t: 'A real ship', d: 'Refit to the Prospector hull in the Ship panel.', c: () => G.S.ship.hullClass >= 1, r: { circuits: 200 } },
  { t: 'Company', d: 'Build a Shipyard and three Corvettes. They fly with you and fight beside you.', c: () => (G.S.fleet.corvette || 0) >= 3, p: () => (G.S.fleet.corvette || 0) + '/3', r: { credits: 3000 } },
  { t: 'Deeper', d: 'Follow the signal to its third source.', c: () => G.S.story.signal >= 3, p: () => G.S.story.signal + '/3', r: { sci: 3000 } },
  { t: 'Better metal', d: 'Stockpile 100 Advanced Alloy.', c: () => G.get('alloy') >= 100, r: { titanium: 400 } },
  { t: 'Big game', d: 'Kill a boss. Lairs are marked with a skull on the survey map.', c: () => G.S.stats.bossKills >= 1, r: { credits: 20000 } },
  { t: 'Ten worlds', d: 'Hold ten colonies. AI Governors help.', c: () => G.colonyCount() >= 10, p: () => G.colonyCount() + '/10', r: { alloy: 500 } },
  { t: 'Build upward', d: 'Build an Orbital Station.', c: () => megaAny('station'), r: { nano: 100 } },
  { t: 'The source', d: 'Follow the signal to its end.', c: () => G.S.story.signal >= 5, p: () => G.S.story.signal + '/5', r: { sci: 200000 } },
  { t: 'Cage a star', d: 'Begin a Dyson structure.', c: () => megaAny('dyson'), r: { qcrystal: 2000 } },
  { t: 'God Complex', d: 'Complete a Dyson Sphere (stage five).', c: () => megaAny('dyson', 5), r: { exotic: 2000 } },
  { t: 'Hold it still', d: 'Research Reality Anchors and build one before the Silence reaches something you love.', c: () => megaAny('anchor'), r: { qmatter: 5000 } },
  { t: 'Answer it', d: 'Research Null Weaponry, jump into the erased region and destroy what sits at its centre.', c: () => G.S.silence.defeated, r: { singularity: 20 } },
  { t: 'A way out', d: 'Build the Aperture.', c: () => megaAny('aperture', 3) },
  { t: 'Leave', d: 'Open Ascension (0) and create a new universe. Or stay. There is no end here either.', c: () => false }
];
G.nearRock = function (res) {
  const F = G.flight; let b = null, bd = 1e12;
  for (const r of F.roids) { if (r.res !== res) continue; const d = Math.hypot(r.x - F.ship.x, r.y - F.ship.y); if (d < bd) { bd = d; b = r; } }
  return b && { x: b.x, y: b.y, l: 'Mine ' + G.RES[res].n.toLowerCase() };
};
G.waypoint = function () { const m = G.MISSIONS[G.S.mission]; if (!m || !m.w || !G.started) return null; try { return m.w(); } catch (e) { return null; } };
G.missionTick = function () {
  const S = G.S; let guard = 0;
  while (S.mission < G.MISSIONS.length && guard++ < 10) {
    const m = G.MISSIONS[S.mission]; if (!m.c()) break;
    S.mission++;
    let rw = '';
    if (m.r) { const L = S.stats.maxLevel; for (const k in m.r) { G.add(k, m.r[k]); rw += ' +' + G.fmt(m.r[k]) + ' ' + G.RES[k].n; } }
    G.log('Objective complete: ' + m.t + (rw ? ' —' + rw : ''), 'good');
    if (G.sfx) G.sfx('good');
  }
};

/* ---------- achievements ---------- */
const st = () => G.S.stats;
G.ACH = [
  ['first', 'First Light', 'Repair your FTL drive.', () => G.S.ship.ftl],
  ['contact', 'First Contact', 'Meet an alien civilisation.', () => Object.keys(G.S.codex.species).length >= 1],
  ['safe', 'This Seems Safe', 'Enter a black hole system.', () => G.S.codex.star.BH],
  ['oops', 'Oops', 'Lose your entire fleet in one battle.', () => G.S.story.oops],
  ['settler', 'Settler', 'Found a colony.', () => G.colonyCount() >= 1],
  ['greedy', 'Greedy', 'Control 100 planets.', () => G.colonyCount() >= 100],
  ['landlord', 'Landlord', 'Control 25 planets.', () => G.colonyCount() >= 25],
  ['collector', 'Collector', 'Discover 20 species.', () => Object.keys(G.S.codex.species).length >= 20],
  ['census', 'Xenologist', 'Discover 100 species.', () => Object.keys(G.S.codex.species).length >= 100],
  ['god', 'God Complex', 'Build your first Dyson Sphere.', () => megaAny('dyson', 5)],
  ['why', 'Why?', 'Reach universe #10.', () => G.S.uni.n >= 10],
  ['noend', 'There Is No End', 'Reach a danger level 1,000 system.', () => st().maxLevel >= 1000],
  ['far', 'Far From Home', 'Reach a danger level 50 system.', () => st().maxLevel >= 50],
  ['farther', 'Farther', 'Reach a danger level 200 system.', () => st().maxLevel >= 200],
  ['blood', 'First Blood', 'Destroy a hostile ship.', () => st().kills >= 1],
  ['thousand', 'Scrapyard', 'Destroy 1,000 hostile ships.', () => st().kills >= 1000],
  ['million', 'Extinction Event', 'Destroy 100,000 hostile ships.', () => st().kills >= 100000],
  ['boss', 'Bigger Fish', 'Kill a boss.', () => st().bossKills >= 1],
  ['boss25', 'Apex', 'Kill 25 bosses.', () => st().bossKills >= 25],
  ['die', 'Rapid Unplanned Disassembly', 'Die.', () => st().deaths >= 1],
  ['die50', 'Slow Learner', 'Die 50 times.', () => st().deaths >= 50],
  ['jump100', 'Frequent Flyer', 'Jump 100 times.', () => st().jumps >= 100],
  ['jump5k', 'No Fixed Address', 'Jump 5,000 times.', () => st().jumps >= 5000],
  ['worm', 'Shortcut', 'Go through a wormhole.', () => st().wormholes >= 1],
  ['base', 'Pest Control', 'Destroy a pirate base.', () => st().bases >= 1],
  ['base20', 'The Law Out Here', 'Destroy 20 pirate bases.', () => st().bases >= 20],
  ['pet', 'It Followed Me Home', 'Gain a companion.', () => Object.keys(G.S.comp).length >= 1],
  ['zoo', 'Menagerie', 'Collect every companion.', () => Object.keys(G.S.comp).length >= G.COMP_LIST.length],
  ['pris', 'Shiny', 'Own a prismatic companion.', () => Object.values(G.S.comp).some(c => c.pris)],
  ['relic', 'Curio Cabinet', 'Hold 10 artifacts.', () => G.S.arti.length >= 10],
  ['museum', 'Museum', 'Hold every artifact.', () => G.S.arti.length >= G.ARTI_LIST.length],
  ['ally', 'Friends In High Places', 'Form an alliance.', () => Object.values(G.S.civs).some(c => c.ally)],
  ['vassal', 'Kneel', 'Conquer a civilisation.', () => Object.values(G.S.civs).some(c => c.vassal)],
  ['raid', 'Not Today', 'Repel 10 raids.', () => st().raidsWon >= 10],
  ['tech30', 'Enlightened', 'Research 30 technologies.', () => Object.keys(G.S.tech).length >= 30],
  ['techall', 'Nothing Left To Learn', 'Research every visible technology.', () => G.TECH_LIST.every(t => G.S.tech[t.id])],
  ['legend', 'That Shouldn\'t Exist', 'Find a legendary resource.', () => G.S.codex.res.stellarheart || G.S.codex.res.ancientmatter || G.S.codex.res.chronocrystal],
  ['paradox', '????', 'Find the thing that shouldn\'t exist.', () => G.S.codex.res.paradox],
  ['hull3', 'Proper Warship', 'Refit to a Frigate hull.', () => G.S.ship.hullClass >= 3],
  ['hull6', 'Worldship', 'Refit to the Worldship hull.', () => G.S.ship.hullClass >= 6],
  ['fleet', 'Armada', 'Use 200 fleet command.', () => G.fleetUsed() >= 200],
  ['gate', 'Doorways', 'Build two Stargates.', () => G.megaCountOf('stargate') >= 2],
  ['heard', 'It Heard You', 'Wake the Silence.', () => G.S.story.silence],
  ['gone', 'Was There A Planet Here?', 'Lose a colony to the Silence.', () => st().erased >= 1],
  ['quiet', 'Louder', 'Defeat the Silence.', () => G.S.silence.defeated],
  ['asc', 'Again', 'Ascend.', () => G.S.asc.count >= 1],
  ['asc10', 'And Again', 'Ascend 10 times.', () => G.S.asc.count >= 10],
  ['uni', 'Somewhere Else', 'Create a new universe.', () => G.S.uni.n >= 2],
  ['planets', 'Cartographer', 'Catalogue every planet type.', () => Object.keys(G.S.codex.planet).length >= Object.keys(G.PTYPES).length],
  ['stars', 'Stargazer', 'Catalogue every star type.', () => Object.keys(G.S.codex.star).length >= Object.keys(G.STARS).length],
  ['rich', 'Liquid', 'Hold a billion credits.', () => G.get('credits') >= 1e9],
  ['pop', 'Crowded', 'Reach a total population of one trillion.', () => (G.totalPop || 0) >= 1e6]
].map(a => ({ id: a[0], n: a[1], d: a[2], c: a[3] }));
G.achTick = function () {
  const S = G.S;
  for (const a of G.ACH) if (!S.ach[a.id]) { let ok = false; try { ok = a.c(); } catch (e) { /* ignore */ } if (ok) { S.ach[a.id] = 1; G.log('Achievement: ' + a.n + ' — ' + a.d, 'epic'); } }
};

/* ---------- ascension ---------- */
G.apGain = function () {
  const L = G.civLevel(); if (L < 30) return 0;
  return Math.floor(Math.pow(L / 30, 2) * 3 * G.mult('ap') * (G.S.silence.defeated ? 1.5 : 1) * Math.pow(1.5, G.S.uni.n - 1));
};
G.perkCost = function (id) { const p = G.PERK[id], l = G.S.asc.perks[id] || 0; return Math.ceil((l + 1) * (p.cmul || 1)); };
G.buyPerk = function (id) {
  const S = G.S, p = G.PERK[id], l = S.asc.perks[id] || 0;
  if (l >= p.max) return false; const c = G.perkCost(id); if (S.asc.pts < c) return false;
  S.asc.pts -= c; S.asc.perks[id] = l + 1; G.dirty = true; return true;
};
G.canNewUniverse = () => megaAny('aperture', 3);
G.rollMods = function (seed, n) {
  if (n <= 1) return [];
  const rng = G.RNG(G.hash(seed, n, 9090, 5)), cnt = Math.min(3, 1 + Math.floor((n - 2) / 3));
  return rng.shuffle(G.UMODS.map(u => u.id)).slice(0, cnt);
};
G.ascend = function (newUni) {
  const O = G.S, gain = G.apGain() + (newUni ? 10 * O.uni.n : 0);
  const S = G.freshState(G.hash(O.seed, O.asc.count + 1, 31337, O.uni.n));
  S.asc = O.asc; S.asc.pts += gain; S.asc.total += gain; S.asc.count++;
  S.uni = { n: O.uni.n + (newUni ? 1 : 0), mods: O.uni.mods, cores: O.uni.cores + (newUni ? 1 : 0) };
  if (newUni) S.uni.mods = G.rollMods(S.seed, S.uni.n);
  S.cos = O.cos; S.ach = O.ach; S.codex = O.codex; S.comp = O.comp; S.active = O.active; S.set = O.set;
  S.stats = O.stats; S.stats.maxLevel = 1;
  const keep = (S.asc.perks.p_arti || 0) * 2;
  S.arti = O.arti.slice().sort((a, b) => G.ARTI[b].rar - G.ARTI[a].rar).slice(0, keep);
  S.ship.ftl = true; S.ship.hp = 100;
  const pt = S.asc.perks.p_tech || 0;
  if (pt) for (const t of G.TECH_LIST) if (t.t < pt && !t.flag) S.tech[t.id] = 1;
  const ps = S.asc.perks.p_ship || 0;
  if (ps) for (const k in S.ship.up) S.ship.up[k] = ps * 3;
  S.res = { iron: 200, crystal: 80, copper: 80, credits: 200 * S.asc.count };
  G.S = S; G.resetUniverse(); G.dirty = true; G.recalc();
  if (S.asc.perks.p_colony) {
    S.tech.soc1 = 1; const p = G.sysAt(0, 0).planets[1]; G.colonize(p, true);
    Object.assign(S.colonies[p.id].b, { mine: 3, solar: 3, lab: 2, habitat: 2, extractor: 1 }); S.colonies[p.id].pop = 6;
  }
  if (G.umFlag('silence')) G.wakeSilence();
  G.dirty = true; G.recalc();
  const st = G.shipStats(); S.ship.hp = st.hull; S.ship.sh = st.shield; S.ship.en = st.energy;
  G.arrive(G.here(), false);
  G.log(newUni ? 'Universe #' + S.uni.n + '. Different rules. Same you.' : 'You begin again, remembering more than you should.', 'epic');
  G.save();
  return gain;
};

/* ---------- once-a-second housekeeping ---------- */
G.slowTick = function (dt) {
  const S = G.S, T = S.timers;
  S.stats.play += dt;
  G.raidTick(); G.silenceTick(dt); G.missionTick();
  if ((T.civ || 0) <= S.t) { T.civ = S.t + 15; G.civTick(); }
  if ((T.ach || 0) <= S.t) { T.ach = S.t + 3; G.achTick(); G.cosTick(); }
  if ((T.gov || 0) <= S.t) { T.gov = S.t + 4; G.governorTick(); }
  if ((T.probe || 0) <= S.t) { T.probe = S.t + 45; G.probeTick(); }
  if ((T.colev || 0) <= S.t) { T.colev = S.t + 240 + G.rand.range(0, 240); if (G.colonyCount() && S.t > 300) { const ids = Object.keys(S.colonies), col = S.colonies[G.rand.pick(ids)], sys = G.sysById(col.sys); const ev = G.pickEvent('colony', sys.level); if (ev) G.queueEvent(ev, { level: sys.level, col, planet: G.planetById(col.pid), sys }); } }
  if (!S.silence.on && !S.silence.defeated && megaAny('dyson', 3)) G.wakeSilence();
};
/* AI Governor. Each colony gets one decision at a time, in this order:
   1. fix an energy shortage, 2. house workers, 3. extract what the planet has / research / credits,
   4. converters, but only if the inputs have spare supply that would not be drained.
   It never rebuilds something you demolished and never touches paused buildings. */
G.govPlan = function (pid) {
  const S = G.S, col = S.colonies[pid], c = G.colonyCalc(col), p = c.p, ban = col.ban || {}, off = col.off || {}, B = G.BLD;
  const lvl = id => col.b[id] || 0;
  const avail = id => B[id] && !G.canBuild(col, id) && !ban[id] && !off[id];
  const cheap = id => { const cs = G.bldCost(id, lvl(id)); for (const k in cs) if (cs[k] > 0.25 * G.get(k)) return false; return true; };
  const netE = (G.enProd || 0) - (G.enCons || 0), sup = G.supply || {}, dem = G.demand || {};
  const spare = k => (sup[k] || 0) - (dem[k] || 0);
  // can one more level of converter `id` run without starving its inputs?
  const fed = id => { const d = B[id]; for (const k in d.inp) { const need = d.inp[k] * (c.local || 1) * (c.mInd || 1); if (spare(k) - need < Math.max(0.3 * need, 0.4 * (sup[k] || 0))) return false; } return true; };
  const eOk = id => !(B[id].pw < 0) || netE + B[id].pw >= 0.5;
  const choose = (list, why) => { let best = null, bv = Infinity, wait = null; for (const [id, w] of list) { if (!avail(id)) continue; const v = (lvl(id) + 1 + (lvl(id) ? 0 : 4 * c.used / c.slots)) / w; if (v >= bv) continue; if (!cheap(id)) { if (!wait) wait = id; continue; } bv = v; best = id; } return best ? { id: best, why } : wait ? { wait: 'Saving up for ' + B[wait].n + ' (' + why + ')' } : null; };
  // 1. energy
  if (netE < Math.max(1, 0.1 * (G.enProd || 0)) || G.pwr < 0.999) {
    const list = [['solar', (p.res.energy || 1) / 3], ['geothermal', 3 * (G.PTYPES[p.type].glow ? 2 : 1)]];
    if (fed('fusion')) list.push(['fusion', 8]); if (fed('qreactor')) list.push(['qreactor', 20]);
    if (S.sd[col.sys] && S.sd[col.sys].mega && S.sd[col.sys].mega.dyson) list.push(['dysoncol', 30]);
    const r = choose(list, 'energy is short'); if (r) return r;
  }
  // 2. workers
  if (c.popcap + c.robots < c.workers + 2) {
    const r = choose([['habitat', 1], ['city', 3], ['arcology', 12]].filter(x => eOk(x[0])), 'more housing for workers'); if (r) return r;
  }
  if (col.pop + c.robots < c.workers + 1) return { wait: 'Waiting for population to grow into new jobs' };
  // 3. production
  const list = [];
  for (const id in B) { const d = B[id]; if (!d.ext || !eOk(id)) continue; let w = 0; for (const r of d.ext) w = Math.max(w, p.res[r] || 0); if (w) list.push([id, w]); }
  for (const [id, w] of [['lab', lvl('rescenter') ? 0 : 2], ['rescenter', 4], ['tradehub', 1]]) if (w && eOk(id)) list.push([id, w]);
  if (c.used >= 4 && lvl('spaceport') < c.used && eOk('spaceport')) list.push(['spaceport', 1.2]);
  if (c.hab < 60 && eOk('terraformer')) list.push(['terraformer', 1]);
  if (S.stats.raidsLost > 0 || G.sysById(col.sys).level >= 6) for (const id of ['missileplat', 'shieldgen', 'orbitaldef']) if (eOk(id)) list.push([id, 0.6]);
  // 4. converters with spare input
  for (const id of G.CONV_ORDER) { const d = B[id]; if (d.cat !== 'Energy' && eOk(id) && fed(id)) list.push([id, 1.5]); }
  const r = choose(list, 'growing output'); if (r) return r;
  return { wait: netE < 0.5 ? 'Needs more energy, but cannot afford a power building' : 'Nothing useful to build right now' };
};
G.governorTick = function () {
  if (!G.has('governor')) return;
  const S = G.S; let budget = 3;
  for (const pid in S.colonies) {
    const col = S.colonies[pid]; if (!col.auto) continue;
    const plan = G.govPlan(pid);
    if (plan.id) {
      if (G.build(pid, plan.id)) { col.gov = 'Built ' + G.BLD[plan.id].n + ' ' + col.b[plan.id] + ' (' + plan.why + ')'; G.econTick(0.001); if (--budget <= 0) return; }
    } else col.gov = plan.wait;
  }
};
G.probeTick = function () {
  if (!G.has('probes') || G.S.set.probes !== true) return;
  const S = G.S, th = G.habThreshold(), gone = S.gone || {}; let done = 0;
  for (const sid in S.visited) {
    const sys = G.sysById(sid); if (!sys || sys.civ || (S.sd[sid] && S.sd[sid].erased) || G.isErased(sys.cx, sys.cy)) continue;
    for (const p of sys.planets) if (!S.colonies[p.id] && !gone[p.id] && p.hab >= Math.max(th, 30) && Object.keys(p.res).some(r => r !== 'energy')) {
      G.colonize(p, true); S.colonies[p.id].auto = S.set.govNew === true && G.has('governor'); G.log('Probes founded a colony on ' + p.name + '. (Turn probes off in Colonies or Settings.)', 'good');
      if (++done >= 1) return;
    }
  }
};
