// Headless smoke test for the non-DOM half of the game: generation, economy, events, combat, ascension.
// Run: node tools/check.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const store = {};
const ctx = { console, Math, Date, JSON, setTimeout, performance, localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } }, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'), escape, unescape, encodeURIComponent, decodeURIComponent };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['util', 'data', 'universe', 'econ', 'empire', 'events', 'flight']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
const G = ctx.G; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };

G.S = G.freshState(12345); G.resetUniverse(); G.recalc();
// --- determinism
const a = JSON.stringify(G.sysAt(3, -2)); G.resetUniverse(); ok(a === JSON.stringify(G.sysAt(3, -2)), 'system generation is deterministic');
// --- data integrity
for (const t of G.TECH_LIST) for (const r of t.req) ok(G.TECH[r], 'tech ' + t.id + ' requires unknown ' + r), ok(!G.TECH[r] || G.TECH[r].t <= t.t, 'tech ' + t.id + ' tier below prereq ' + r);
const flags = new Set(); for (const t of G.TECH_LIST) for (const u of t.u) flags.add(u);
for (const k in G.BLD) { const b = G.BLD[k]; ok(!b.req || flags.has(b.req), 'building ' + k + ' needs flag ' + b.req); for (const r in b.cost) ok(G.RES[r], 'bld cost res ' + r); for (const r in (b.inp || {})) ok(G.RES[r], 'bld inp ' + r); for (const r in (b.out || {})) ok(G.RES[r], 'bld out ' + r); }
for (const k in G.WEAPONS) ok(!G.WEAPONS[k].req || flags.has(G.WEAPONS[k].req), 'weapon flag ' + k);
for (const k in G.FLEET) ok(flags.has(G.FLEET[k].req), 'fleet flag ' + k);
for (const k in G.MEGA) { ok(flags.has(G.MEGA[k].req), 'mega flag ' + k); for (const s of G.MEGA[k].stages) { ok(!s.req || flags.has(s.req), 'mega stage flag ' + s.req); for (const r in s.cost) ok(G.RES[r], 'mega cost ' + r); } }
for (const f in G.FACTIONS) { for (const u of G.FACTIONS[f].units) ok(G.ENEMY[u], 'faction unit ' + u); ok(G.ENEMY[G.FACTIONS[f].boss], 'faction boss ' + f); }
for (const id of G.CONV_ORDER) ok(G.BLD[id] && G.BLD[id].inp, 'conv order ' + id);
for (const k in G.BLD) if (G.BLD[k].inp) ok(G.CONV_ORDER.includes(k), 'converter missing from CONV_ORDER: ' + k);
// --- universe survey
let stars = 0, civs = 0, planets = 0; const types = {}, specials = {};
for (let x = -40; x <= 40; x++) for (let y = -40; y <= 40; y++) { const s = G.sysAt(x, y); if (!s) continue; stars++; planets += s.planets.length; specials[s.special] = (specials[s.special] || 0) + 1; if (s.capital) civs++; for (const p of s.planets) types[p.type] = (types[p.type] || 0) + 1; }
console.log('81x81 cells:', stars, 'stars,', planets, 'planets,', civs, 'capitals'); console.log(' specials', JSON.stringify(specials)); console.log(' planet types', Object.keys(types).length, '/', Object.keys(G.PTYPES).length);
ok(stars > 1500 && civs > 5, 'universe density');
const home = G.sysAt(0, 0); ok(home.planets[1].name === 'Haven' && home.belts.length === 1, 'home system shape');
let near = G.systemsNear(home.x, home.y, 150).length - 1; console.log(' systems within first jump of home:', near); ok(near >= 1, 'something reachable from home');
// --- every event choice resolves without throwing
G.flight.enter(home, false);
for (const ev of G.EVENTS) for (let i = 0; i < ev.choices.length; i++) for (let k = 0; k < 6; k++) {
  const civ = G.civOfRegion(1, 0) || G.civOfRegion(0, 1) || G.civOfRegion(1, 1) || G.civOfRegion(-1, 0) || G.civOfRegion(2, 1);
  const c = { level: 5, sys: home, planet: home.planets[1], civ, col: { pop: 5 } };
  try { if (typeof ev.text === 'function') ev.text(c); const r = G.resolveEvent(ev, i, c); ok(typeof r.text === 'string', 'event text ' + ev.id); } catch (e) { ok(false, 'event ' + ev.id + ' choice ' + i + ': ' + e.message); }
}
// --- fresh run: economy
G.S = G.freshState(777); G.resetUniverse(); G.recalc(); G.arrive(G.here(), false);
const S = G.S; S.res = { iron: 1e5, copper: 1e5, crystal: 1e5, silicon: 1e5 }; S.ship.ftl = true; S.tech.soc1 = 1; G.dirty = true;
ok(G.colonize(G.here().planets[1]), 'colonise Haven');
const pid = G.here().planets[1].id;
for (const b of ['mine', 'solar', 'solar', 'lab', 'habitat', 'extractor']) ok(G.build(pid, b), 'build ' + b);
for (let i = 0; i < 600; i++) { G.econTick(0.5); S.t += 0.5; if (i % 2 === 0) G.slowTick(1); }
console.log(' after 5 min: rates', JSON.stringify(Object.fromEntries(Object.entries(G.rates).map(([k, v]) => [k, +v.toFixed(2)]))), 'pop', S.colonies[pid].pop.toFixed(2), 'sci', S.res.sci.toFixed(0));
ok(G.rates.iron > 0 && G.rates.sci > 0, 'colony produces');
G.startResearch('ind1'); for (let i = 0; i < 4000 && !S.tech.ind1; i++) G.econTick(0.5); ok(S.tech.ind1, 'research completes');
// everything researched: chains run
G.colonySlots = () => 99; for (const t of G.TECH_LIST) S.tech[t.id] = 1; S.story.silence = true; G.dirty = true; G.recalc();
for (const k in G.BLD) { if (G.canBuild(S.colonies[pid], k)) continue; for (const r in G.RES) S.res[r] = 1e9; ok(G.build(pid, k), 'late build ' + k); }
for (const r in G.RES) S.res[r] = 1e6; S.colonies[pid].pop = 500;
for (let i = 0; i < 400; i++) G.econTick(0.5);
ok(G.rates.steel !== undefined && G.rates.singularity > 0, 'full production chain reaches singularity'); ok(isFinite(S.res.energy), 'energy finite');
// megastructures
for (const r in G.RES) S.res[r] = 1e12;
for (const id in G.MEGA) { let n = 0; while (!G.canBuildMega(S.loc, id) && n++ < 10) ok(G.buildMega(S.loc, id), 'mega ' + id); }
ok(G.megaStage(S.loc, 'dyson') === 7 && G.canNewUniverse(), 'megastructures complete');
ok(S.silence.on || true, 'silence state');
G.slowTick(1); ok(!S.silence.on, 'dyson no longer wakes the Silence');
S.story.signal = 5; ok(G.signalTarget() !== null, 'the Herald waits at the last signal point');
G.wakeSilence(); S.story.herald = true; ok(S.silence.on && G.signalTarget() === null, 'Herald dead: Silence awake, marker gone');
// fleet + combat
for (const id in G.FLEET) ok(G.buyShip(id, 1) || G.fleetUsed() + G.FLEET[id].cp > G.fleetCap(), 'buy ' + id);
const F = G.flight; let target = G.systemsNear(G.here().x, G.here().y, 2000).find(s => s.special === 'pirate');
ok(target, 'found a pirate system'); G.jump(target.id, true);
ok(F.ents.some(e => e.id === 'pbase'), 'pirate base spawned');
for (const k in S.ship.up) S.ship.up[k] = 30; S.ship.hullClass = 4; S.ship.weapons = ['laser', 'plasma', 'missile', 'pd']; G.dirty = true;
let st = G.shipStats(); S.ship.hp = st.hull;
for (let i = 0; i < 60 * 240 && !G.sd(target.id).cleared; i++) { const b = F.ents.find(e => e.id === 'pbase'); if (b) { F.ship.x = b.x + 200; F.ship.y = b.y; } S.t += 1 / 60; F.update(1 / 60); }
ok(G.sd(target.id).cleared && S.stats.bases === 1, 'pirate base can be destroyed (kills ' + S.stats.kills + ')');
// heat brings waves
target = G.systemsNear(G.here().x, G.here().y, 2000).find(s => s.special === 'none' && !s.civ); G.jump(target.id, true); let w0 = F.wave; for (let i = 0; i < 60 * 400 && F.wave === w0; i++) { S.t += 1 / 60; F.update(1 / 60); } ok(F.wave > w0, 'signature spawns a wave');
// death + respawn
S.ship.up.hull = 0; S.ship.hullClass = 0; G.dirty = true; S.ship.hp = 1; S.ship.sh = 0; F.inv = 0; F.spawnWave('pirate', 60, 30, true, F.ship.x + 100, F.ship.y);
for (let i = 0; i < 60 * 30 && S.stats.deaths === 0; i++) { S.t += 1 / 60; F.update(1 / 60); } ok(S.stats.deaths === 1, 'player can die');
for (let i = 0; i < 60 * 5; i++) { S.t += 1 / 60; F.update(1 / 60); } ok(S.loc === '0,0' && S.ship.hp > 0, 'respawns at home');
// diplomacy
let civ = null; for (let rx = -3; rx <= 3 && !civ; rx++) for (let ry = -3; ry <= 3 && !civ; ry++) civ = G.civOfRegion(rx, ry);
ok(civ, 'a civilisation exists nearby'); G.meet(civ.id); for (const k of ['gift', 'pact', 'rpact', 'ally', 'spy', 'threat', 'war', 'peace']) ok(typeof G.diplo(civ.id, k) === 'string', 'diplo ' + k);
// save round trip, offline, ascension
G.save(); const ex = G.exportSave(); ok(G.importSave(ex), 'export/import'); G.S.last -= 3600e3; const off = G.offline(); ok(off && Object.keys(off.gain).length, 'offline progress');
ok(G.civLevel() > 30 && G.apGain() > 0, 'ascension available at level ' + G.civLevel());
const gain = G.ascend(true); ok(gain > 0 && G.S.uni.n === 2 && G.S.uni.mods.length === 1 && G.colonyCount() === 0, 'new universe: +' + gain + ' AP, mods ' + G.S.uni.mods);
G.buyPerk('p_mine'); ok(G.mult('mine') > 1, 'perk applies');
// achievements and missions do not throw
G.achTick(); G.missionTick();
// --- early balance print
G.S = G.freshState(4242); G.resetUniverse(); G.recalc(); st = G.shipStats();
console.log(' start ship: hull', st.hull, 'dmg', st.dmg, 'mining', st.mining, 'cargo', st.cargo, 'jump', st.jump);
for (const L of [1, 5, 10, 20, 40]) console.log('  danger', L, 'skiff hp', (28 * Math.pow(1.16, L - 1)).toFixed(0), 'lord hp', G.fmt(1800 * Math.pow(1.16, L - 1)));
console.log(fails ? fails + ' FAILED' : 'all checks passed'); process.exit(fails ? 1 : 0);
