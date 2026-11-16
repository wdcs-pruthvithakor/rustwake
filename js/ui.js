'use strict';
/* Rustwake — HUD, panels and dialogs. Panels are plain HTML strings re-rendered on a timer;
   every button carries data-a (action) and the handler is a single delegated pointerdown. */

const UI = G.ui = { panel: null, arg: null, tab: {}, dlg: null, el: {}, msg: '' };
const $ = id => document.getElementById(id);
const fmt = G.fmt, esc = G.esc;

/* ---------- little HTML helpers ---------- */
const ri = id => { const r = G.RES[id]; return '<i class="ri t-' + r.t + '" style="--c:' + r.c + '" title="' + r.n + '"></i>'; };
const rname = id => ri(id) + '<span style="color:' + G.RES[id].c + '">' + G.RES[id].n + '</span>';
function costHTML(c) {
  let h = ''; for (const k in c) h += '<span class="cost' + (G.get(k) >= c[k] ? '' : ' no') + '" title="' + G.RES[k].n + ' — you have ' + fmt(G.get(k)) + '">' + ri(k) + fmt(c[k]) + '<u>' + G.RES[k].n + '</u></span>';
  return h || '<span class="cost">free</span>';
}
function btn(label, a, data, dis, cls) {
  let d = ''; if (data) for (const k in data) d += ' data-' + k + '="' + esc(data[k]) + '"';
  return '<button class="b ' + (cls || '') + '" data-a="' + a + '"' + d + (dis ? ' disabled title="' + esc(typeof dis === 'string' ? dis : '') + '"' : '') + '>' + label + '</button>';
}
const bar = (f, col, txt) => '<div class="bar"><div style="width:' + G.clamp(f * 100, 0, 100) + '%;background:' + col + '"></div><span>' + (txt || '') + '</span></div>';
const kv = (k, v) => '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>';
const tabsHTML = (name, list) => '<div class="tabs">' + list.map(t => '<button class="tab' + ((UI.tab[name] || list[0][0]) === t[0] ? ' on' : '') + '" data-a="tab" data-p="' + name + '" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
const curTab = (name, def) => UI.tab[name] || def;

/* ---------- init ---------- */
UI.init = function () {
  for (const id of ['hud', 'loc', 'resbar', 'civ', 'shipbox', 'mission', 'toasts', 'prompt', 'nav', 'mini', 'panel', 'ptitle', 'pbody', 'dialog', 'dbody', 'mapinfo', 'title', 'alert']) UI.el[id] = $(id);
  const NAV = [['map', 'M', 'Galaxy'], ['ship', '2', 'Ship'], ['colonies', '3', 'Colonies'], ['research', '4', 'Research'], ['fleet', '5', 'Fleet'], ['diplo', '6', 'Diplomacy'], ['mega', '7', 'Megastructures'], ['codex', '8', 'Codex'], ['empire', '9', 'Empire'], ['asc', '0', 'Ascension'], ['guide', 'H', 'Guide'], ['settings', 'Esc', 'Settings']];
  UI.el.nav.innerHTML = NAV.map(n => '<button class="navb" data-a="open" data-p="' + n[0] + '"><kbd>' + n[1] + '</kbd>' + n[2] + '</button>').join('');
  // Actions fire on click, not on press, so dragging a list on a touch screen never buys anything by accident.
  // While a finger or button is down (or a list is still scrolling) panels are not re-rendered underneath it.
  const rel = () => setTimeout(() => { UI.pressing = false; }, 0);
  document.addEventListener('pointerdown', () => { UI.pressing = true; }, true);
  document.addEventListener('pointerup', rel, true); document.addEventListener('pointercancel', rel, true);
  document.addEventListener('scroll', () => { UI.scrolled = Date.now(); }, true);
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-a]'); if (!t || t.disabled) return;
    if (G.audioStart) G.audioStart();
    UI.act(t.dataset.a, t.dataset, t);
  });
  document.addEventListener('input', e => { if (e.target.id === 'qtybox') { const v = parseFloat(e.target.value); UI.qabs = v > 0 ? Math.floor(v) : 0; UI.qmode = 'abs'; } });
  document.addEventListener('change', e => { if (e.target.id === 'qtybox') UI.refresh(); });
};
UI.modalOpen = () => !!(UI.panel || UI.dlg || G.map.open || !G.started);
/* Panels opened from inside another panel (a colony from the list) remember where you came from. */
UI.stack = [];
UI.go = function (name, arg) { if (UI.panel) UI.stack.push({ p: UI.panel, a: UI.arg, top: UI.el.pbody.scrollTop }); UI.open(name, arg, true); };
UI.back = function () { const b = UI.stack.pop(); if (!b) { UI.close(); return; } UI.open(b.p, b.a, true); UI.el.pbody.scrollTop = b.top; };
UI.open = function (name, arg, keep) {
  if (!keep) UI.stack = [];
  if (name === 'map') { UI.close(); G.map.show(); return; }
  if (G.map.open) G.map.hide();
  UI.panel = name; UI.arg = arg; UI.msg = ''; UI.hold = 0;
  UI.el.panel.classList.add('on'); UI.el.panel.dataset.p = name;
  UI.refresh(true);
};
UI.close = function () { UI.stack = []; UI.panel = null; UI.el.panel.classList.remove('on'); if (G.map.open) G.map.hide(); };
UI.toggle = function (name) { if (name === 'map' ? G.map.open : UI.panel === name) UI.close(); else UI.open(name); };
UI.refresh = function (reset) {
  if (!UI.panel) return;
  const P = PANELS[UI.panel]; if (!P) return;
  const body = UI.el.pbody, keep = {};
  body.querySelectorAll('[data-scroll]').forEach(n => keep[n.dataset.scroll] = [n.scrollLeft, n.scrollTop]);
  const top = body.scrollTop;
  const out = P(UI.arg);
  UI.el.ptitle.innerHTML = out.title; document.getElementById('pback').style.display = UI.stack.length ? '' : 'none';
  body.innerHTML = (UI.msg ? '<div class="note">' + esc(UI.msg) + '</div>' : '') + out.html;
  if (!reset) { body.scrollTop = top; body.querySelectorAll('[data-scroll]').forEach(n => { const k = keep[n.dataset.scroll]; if (k) { n.scrollLeft = k[0]; n.scrollTop = k[1]; } }); }
  else body.scrollTop = 0;
  UI.paint();
};
UI.paint = function () {
  UI.el.pbody.querySelectorAll('canvas[data-planet]').forEach(c => { const p = G.planetById(c.dataset.planet); if (p) G.render.portrait(c, p); });
  UI.el.pbody.querySelectorAll('canvas[data-civ]').forEach(c => { const civ = G.civById(c.dataset.civ); if (civ) G.render.alien(c, civ); });
  document.querySelectorAll('canvas[data-comp]').forEach(c => G.render.compIcon(c, c.dataset.comp));
  UI.el.pbody.querySelectorAll('canvas[data-ship]').forEach(c => { const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); G.render.drawShip(x, +c.dataset.ship, c.width / 2, c.height / 2, -Math.PI / 2, c.width * 0.26, c.dataset.col || '#9fd8ff', { t: G.S.t, thrust: 0.6, rust: c.dataset.rust === '1', lights: +(c.dataset.lights || 0), trail: c.dataset.trail || null }); });
};
UI.toast = function (msg, cls) {
  const t = document.createElement('div'); t.className = 'toast ' + (cls || ''); t.textContent = msg;
  const box = UI.el.toasts; if (!box) return; box.appendChild(t);
  while (box.children.length > 5) box.removeChild(box.firstChild);
  setTimeout(() => t.classList.add('out'), cls === 'epic' || cls === 'bad' ? 7000 : 4500); setTimeout(() => t.remove(), cls === 'epic' || cls === 'bad' ? 7600 : 5100);
};

/* ---------- HUD ---------- */
UI.hud = function () {
  const S = G.S, F = G.flight, sys = F.sys, st = G.shipStats(), el = UI.el; if (!sys) return;
  el.loc.innerHTML = '<b>' + esc(sys.name) + '</b><span>' + sys.star.n + ' · ' + G.sectorName(sys.cx, sys.cy) + '</span><span class="lv ' + G.dangerFor(sys.level)[1] + '">DANGER ' + sys.level + '</span>' + (F.erased ? '<span class="lv bad">ERASED SPACE' + (() => { const o = G.silenceOrigin(); return !o ? '' : o.id === sys.id ? ' · BOSS HERE' : ' · CENTRE: ' + esc(o.name); })() + '</span>' : '');
  // resources
  let h = '';
  const show = G.colonyCount() ? ['credits', 'energy'] : ['credits'];
  for (const id of G.RES_ORDER) if (id !== 'credits' && id !== 'energy' && id !== 'sci' && G.get(id) >= 1) show.push(id);
  const maxChips = Math.max(3, Math.floor((window.innerWidth - (UI.compact ? 16 : 470)) / (UI.compact ? 82 : 128)) * (UI.compact ? 1 : 2));
  for (const id of show.slice(0, maxChips)) {
    const r = G.rates[id] || 0;
    h += '<div class="chip" title="' + G.RES[id].n + (id === 'energy' ? ' — stored / capacity. Buildings slow down when this hits zero.' : '') + '">' + ri(id) + '<span class="cn">' + G.RES[id].n + '</span><b>' + fmt(G.get(id)) + '</b>' + (Math.abs(r) > 0.004 ? '<em class="' + (r < 0 ? 'neg' : '') + '">' + G.fmtRate(r) + '</em>' : '') + '</div>';
  }
  if (show.length > maxChips) h += '<div class="chip more" data-a="stock">+' + (show.length - maxChips) + ' more</div>';
  el.resbar.innerHTML = h;
  // research + level
  let c = '';
  if (S.cur) { const need = G.techCost(S.cur.id), nm = G.TECH[S.cur.id] ? G.TECH[S.cur.id].n : G.REPEAT.find(r => r.id === S.cur.id).n; c += '<div class="rs" data-a="open" data-p="research">' + ri('sci') + esc(nm) + bar(S.cur.p / need, '#b89bff') + '</div>'; }
  else c += '<div class="rs idle" data-a="open" data-p="research">' + ri('sci') + fmt(G.get('sci')) + ' · no research</div>';
  c += '<div class="lvl">CIV <b>' + G.civLevel() + '</b></div><div class="lvl">UNIVERSE <b>#' + S.uni.n + '</b></div>';
  el.civ.innerHTML = c;
  // ship
  const used = G.cargoUsed();
  let sb = bar(S.ship.hp / st.hull, '#ff6a6a', 'HULL ' + fmt(Math.max(0, S.ship.hp)) + ' / ' + fmt(st.hull)) + bar(S.ship.sh / st.shield, '#6ee7ff', 'SHIELD ' + fmt(S.ship.sh) + ' / ' + fmt(st.shield)) + bar(S.ship.en / st.energy, '#ffd76a', 'ENERGY ' + fmt(S.ship.en) + ' / ' + fmt(st.energy));
  if (!G.has('uplink')) sb += bar(used / st.cargo, used >= st.cargo * 0.999 ? '#ff9a4a' : '#b7a79b', 'CARGO ' + fmt(used) + ' / ' + fmt(st.cargo));
  if (F.safe) sb += '<div class="sig safe">SAFE HARBOUR</div>';
  else sb += '<div class="sig' + (F.heat > 70 ? ' hot' : '') + '">' + bar(F.heat / 100, F.heat > 70 ? '#ff4a5c' : '#ff9a4a', 'SIGNATURE ' + Math.floor(F.heat) + '%' + (F.wave ? ' · wave ' + F.wave : '')) + '</div>';
  sb += '<div class="abil"><span class="' + (F.abilityCd > 0 ? 'cd' : 'rdy') + '"><kbd>Q</kbd> Nova ' + (F.abilityCd > 0 ? Math.ceil(F.abilityCd) + 's' : 'ready') + '</span><span><kbd>Shift</kbd> Boost</span></div>';
  if (S.active.length) sb += '<div class="pets">' + S.active.map(id => '<span title="' + esc(G.compName(id)) + '">' + esc(G.COMP[id].n) + ' ' + S.comp[id].lvl + '</span>').join('') + '</div>';
  if (!el.sbMain) { el.shipbox.innerHTML = '<div></div><div></div>'; el.sbMain = el.shipbox.children[0]; el.sbDest = el.shipbox.children[1]; }
  el.sbMain.innerHTML = sb;
  const dl = destLine(); if (dl !== el.sbDestHTML) { el.sbDestHTML = dl; el.sbDest.innerHTML = dl; } // only redraw when it changes, so taps land
  // objective
  const m = G.MISSIONS[S.mission];
  el.mission.innerHTML = m ? '<h4>OBJECTIVE <span>' + (S.mission + 1) + ' / ' + G.MISSIONS.length + '</span></h4><b>' + esc(m.t) + '</b><p>' + esc(typeof m.d === 'function' ? m.d() : m.d) + '</p>' + (m.p ? '<em>' + esc(m.p()) + '</em>' : '') : '';
  // prompt
  let pr = '';
  if (F.dead) pr = '';
  else if (F.near) pr = (G.touch ? '<kbd>TAP</kbd> ' : '<kbd>E</kbd> ') + (F.near.kind === 'planet' ? (S.colonies[F.near.ref.id] ? 'Land at ' : 'Orbit ') + esc(F.near.ref.name) : ({ station: 'Dock at ', anomaly: 'Investigate ', derelict: 'Board ', ruins: 'Explore ', wormhole: 'Approach ', signal: 'Investigate ', stargate: 'Use ' }[F.near.ref.type] || '') + esc(F.near.ref.name));
  else if (F.burn) pr = '<span class="bad">HULL BURNING — get away from the star</span>';
  else if (F.time - F.cargoFull < 1.5) pr = '<span class="bad">CARGO FULL — bank it at a station or colony</span>';
  else if (!F.mineBeam && F.roids.length && !F.hostileCount()) { const s = F.ship; for (const r of F.roids) if (Math.hypot(r.x - s.x, r.y - s.y) < 300 + r.r) { pr = G.touch ? 'Hold <kbd>MINE</kbd>' : 'Hold <kbd>Space</kbd> to mine'; break; } }
  el.prompt.innerHTML = pr; el.prompt.className = pr ? 'on' : '';
  // alerts
  let al = '';
  if (S.raid.pending) { const p = G.planetById(S.raid.pending.pid); al += '<div class="al bad">RAID on ' + esc(p ? p.name : '?') + ' in ' + Math.max(0, Math.ceil(S.raid.pending.t - S.t)) + 's</div>'; }
  if (G.pwr < 0.999 && G.colonyCount()) al += '<div class="al warn">ENERGY SHORTAGE — colonies at ' + Math.round(G.pwr * 100) + '%</div>';
  if (S.silence.on) {
    const nx = G.silenceNext(), o = G.silenceOrigin();
    if (F.erased && o) al += '<div class="al quiet">' + (o.id === S.loc ? 'BOSS HERE · white arrow' : 'ERASED SPACE · centre: ' + esc(o.name)) + '</div>';
    else al += '<div class="al quiet">THE SILENCE' + (nx.pid && nx.eta < 3600 ? ' · reaches ' + esc(G.planetById(nx.pid).name) + ' in ' + G.fmtT(nx.eta) : '') + '</div>';
  }
  if (F.raid) al += '<div class="al bad">RAID IN PROGRESS</div>';
  if (al !== el.alertHTML) { el.alertHTML = al; el.alert.innerHTML = al; }
  // phones: in portrait the bottom belongs to the controls, so alerts and toasts stack under the HUD boxes
  if (UI.compact) {
    let b = Math.max(el.shipbox.getBoundingClientRect().bottom, el.mission.getBoundingClientRect().bottom) + 8;
    if (innerHeight > innerWidth) { el.alert.style.top = Math.round(b) + 'px'; el.alert.style.bottom = 'auto'; if (al) b = el.alert.getBoundingClientRect().bottom + 6; }
    else { el.alert.style.top = ''; el.alert.style.bottom = ''; }
    el.toasts.style.top = Math.round(b) + 'px';
  } else { el.toasts.style.top = ''; el.alert.style.top = ''; el.alert.style.bottom = ''; }
  G.render.minimap(el.mini);
};

/* ---------- map side panel ---------- */
function destLine() {
  const S = G.S; if (!S.dest) return '';
  const d = G.sysById(S.dest), p = G.route(S.dest), nx = p && p[0] && G.sysById(p[0]);
  let h = '<div class="dest"><div class="dt" data-a="destmap">⟶ <b>' + esc(d.name) + '</b> · ' + (p ? p.length + ' jump' + (p.length > 1 ? 's' : '') : 'no charted route') + '</div>';
  if (nx) h += '<button class="b dj" data-a="destjump">JUMP ▸ ' + esc(nx.name) + (G.touch ? '' : ' <kbd>J</kbd>') + '</button>';
  return h + '</div>';
}
function routeHTML(s) {
  const S = G.S; if (s.id === S.loc) return '';
  const p = G.route(s.id), isDest = S.dest === s.id, dp = S.dest && !isDest && G.route(S.dest), at = dp ? dp.indexOf(s.id) : -1;
  if (at >= 0) return '<p class="epic">Stop ' + (at + 1) + ' of ' + dp.length + ' on your route to ' + esc(G.sysById(S.dest).name) + '.</p><div class="row">' + btn('Clear destination', 'destclear') + '</div>';
  let h = kv('Route', p ? p.length + ' jump' + (p.length > 1 ? 's' : '') + (p.length > 1 ? ' via ' + esc(G.sysById(p[0]).name) + (p.length > 2 ? '…' : '') : '') : '<span class="bad">no charted route</span>');
  if (!p && S.ship.ftl) h += '<p class="dim">No chain of charted systems within your jump range reaches it. Chart more systems on the way (scanner range) or upgrade the jump drive.</p>';
  h += '<div class="row">' + (isDest ? btn('Clear destination', 'destclear') : btn('Set as destination', 'dest', { id: s.id }, p ? false : 'No charted route')) + '</div>';
  return h;
}
UI.mapInfo = function (s) {
  const S = G.S, el = UI.el.mapinfo;
  if (!s) {
    el.innerHTML = '<h3>GALAXY MAP</h3><p class="dim">' + (G.touch ? 'Drag to pan, pinch to zoom. Tap a star, then JUMP.' : 'Drag to pan, scroll to zoom. Click a star, then JUMP.') + '</p>' + kv('Systems visited', fmt(Object.keys(S.visited).length)) + kv('Systems charted', fmt(Object.keys(S.known).length)) + kv('Jump range', fmt(G.shipStats().jump)) + kv('Scanner range', fmt(G.shipStats().scan)) + kv('Colonies', G.colonyCount()) +
      (S.dest ? '<h3>DESTINATION</h3>' + kv('System', esc(G.sysById(S.dest).name)) + routeHTML(G.sysById(S.dest)) + (G.nextHop() ? '<div class="row">' + btn('JUMP TO NEXT: ' + esc(G.sysById(G.nextHop()).name), 'jump', { id: G.nextHop() }, G.canJump(G.sysById(G.nextHop())) || false, 'big') + '</div>' + (G.canJump(G.sysById(G.nextHop())) ? '<p class="bad">' + esc(G.canJump(G.sysById(G.nextHop()))) + '</p>' : '') : '') : '<p class="dim">Pick any charted star and press <b>Set as destination</b> to plan a route of jumps to it.</p>') +
      '<p class="dim">The dashed blue ring is how far you can jump. Danger rises with distance from home, without limit.</p>' + (G.megaCountOf('stargate') > 1 ? '<p class="dim">Stargates link to each other at any distance.</p>' : '');
    return;
  }
  const here = G.here(), d = Math.hypot(s.x - here.x, s.y - here.y), vis = S.visited[s.id], why = G.canJump(s), sd = S.sd[s.id] || {};
  let h = '<h3>' + esc(s.name) + '</h3><p class="dim">' + s.star.n + ' · ' + G.sectorName(s.cx, s.cy) + '</p>';
  h += kv('Danger level', s.level + ' <span class="' + G.dangerFor(s.level)[1] + '">(' + G.dangerFor(s.level)[0] + ' for you)</span>') + kv('Distance', fmt(d)) + kv('Jump cost', s.id === S.loc ? '—' : fmt(G.jumpCost(s)) + ' energy');
  if (G.isErased(s.cx, s.cy)) h += '<p class="bad">There is nothing here. There may never have been.</p>';
  else {
    if (vis || G.has('survey')) {
      h += kv('Planets', s.planets.length) + kv('Asteroid belts', s.belts.length);
      const ic = G.map.SPECIAL_ICON[s.special];
      if (ic) h += kv('Contains', '<span style="color:' + ic[1] + '">' + ic[0] + ' ' + ({ anomaly: 'Anomaly', derelict: 'Derelict', station: 'Trade station', capital: 'Alien capital', pirate: 'Pirate base', ruins: 'Ruins', wormhole: 'Wormhole', lair: 'Boss lair', nest: 'Brood nest', home: 'Your Waystation' })[s.special] + ((sd.done || sd.cleared) ? ' (done)' : '') + '</span>');
      if (s.belts.length) h += '<div class="kv"><span>Belt ores</span><b>' + [...new Set(s.belts.flatMap(b => b.res))].map(ri).join(' ') + '</b></div>';
    } else h += '<p class="dim">Unvisited. Jump there to learn more.</p>';
    if (s.civ) { const civ = G.civById(s.civ), cs = S.civs[s.civ]; if (cs && cs.met) h += kv('Territory', '<span style="color:' + civ.color + '">' + esc(civ.name) + '</span>'); }
    const cols = G.systemColonies(s.id); if (cols.length) h += kv('Your colonies', cols.length);
    if (sd.mega) h += kv('Megastructures', Object.keys(sd.mega).map(k => G.MEGA[k].n).join(', '));
  }
  const sig = G.signalTarget(); if (sig && sig.id === s.id) h += '<p class="epic">The signal comes from here.</p>';
  if (s.id !== S.loc) { const nh = S.dest === s.id && G.nextHop(); if (nh && nh !== s.id) { const w2 = G.canJump(G.sysById(nh)); h += '<div class="row">' + btn('JUMP TO NEXT: ' + esc(G.sysById(nh).name), 'jump', { id: nh }, w2 || false, 'big') + '</div>' + (w2 ? '<p class="bad">' + esc(w2) + '</p>' : ''); } else h += '<div class="row">' + btn('JUMP', 'jump', { id: s.id }, why || false, 'big') + '</div>' + (why && why !== 'Out of jump range' ? '<p class="bad">' + esc(why) + '</p>' : why ? '<p class="dim">Out of jump range: set it as your destination to plan a route.</p>' : ''); h += routeHTML(s); }
  else h += '<p class="dim">You are here.</p>';
  el.innerHTML = h;
};

/* ---------- interaction ---------- */
UI.interact = function () {
  const F = G.flight, S = G.S, n = F.near; if (!n || F.dead || UI.modalOpen()) return;
  if (n.kind === 'planet') {
    if (S.colonies[n.ref.id]) UI.dock();
    UI.open('planet', n.ref.id); return;
  }
  const o = n.ref, sys = F.sys;
  const done = () => { G.sd(sys.id).done = 1; F.objs = F.objs.filter(x => x !== o); };
  switch (o.type) {
    case 'station': UI.dock(); if (o.civ) UI.open('diplo', o.civ); else UI.open('station'); break;
    case 'anomaly': case 'derelict': case 'ruins': { const ev = G.pickEvent(o.type, sys.level); if (ev) UI.showEvent(ev, { level: sys.level, sys }, done); else done(); break; }
    case 'wormhole': UI.showEvent(G.EVENT.wormhole, { level: sys.level, sys }, r => { if (r.ctx.wormhole && !G.has('wormhole')) G.sd(sys.id).done = 1; }); break;
    case 'signal': UI.showEvent(G.EVENT['signal' + S.story.signal], { level: Math.max(sys.level, 3), sys }, () => { F.objs = F.objs.filter(x => x !== o); }); break;
    case 'stargate': UI.open('map'); break;
  }
};
UI.dock = function () {
  const S = G.S, st = G.shipStats(), n = G.bank();
  S.ship.hp = st.hull; S.ship.en = st.energy;
  if (n > 0) { UI.toast('Banked ' + fmt(n) + ' cargo.', 'good'); if (G.sfx) G.sfx('good'); }
};
UI.wormholeJump = function () {
  const S = G.S, here = G.here(), far = G.has('wormhole') ? 2 : 1;
  const a = G.rand.range(0, G.TAU), d = G.rand.range(7, 16) * far;
  const t = G.nearestSystem(Math.round(here.cx + Math.cos(a) * d), Math.round(here.cy + Math.sin(a) * d));
  if (t && t.id !== S.loc) { S.stats.wormholes++; G.jump(t.id, true); G.log('The wormhole spits you out at ' + t.name + ', danger ' + t.level + '.', 'epic'); }
};

/* ---------- event dialog ---------- */
UI.showEvent = function (ev, ctx, onDone) {
  UI.dlg = { ev, ctx, onDone, res: null }; UI.renderDlg();
};
UI.renderDlg = function () {
  const d = UI.dlg, el = UI.el;
  if (!d) { el.dialog.classList.remove('on'); return; }
  el.dialog.classList.add('on');
  let h;
  if (d.custom) h = d.custom;
  else if (!d.res) {
    const txt = typeof d.ev.text === 'function' ? d.ev.text(d.ctx) : d.ev.text;
    h = '<h2>' + esc(d.ev.title) + '</h2><p class="etext">' + esc(txt) + '</p><div class="choices">' + d.ev.choices.map((c, i) => '<button class="b choice" data-a="evc" data-i="' + i + '">' + esc(c.l) + '</button>').join('') + '</div>';
  } else {
    h = '<h2>' + esc(d.ev.title) + '</h2>' + (d.res.text ? '<p class="etext">' + esc(d.res.text) + '</p>' : '') + (d.res.lines.length ? '<ul class="gains">' + d.res.lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '') + '<div class="choices">' + btn('Continue', 'evok', null, false, 'big') + '</div>';
  }
  el.dbody.innerHTML = h;
};
UI.pump = function () { // show queued events when nothing else is in the way
  if (UI.dlg || !G.started || !G.eventQueue.length || G.flight.dead) return;
  if (G.flight.hostileNear(700)) return;
  const q = G.eventQueue.shift(); UI.showEvent(q.ev, q.ctx);
};
UI.info = function (title, html) { UI.dlg = { custom: '<h2>' + esc(title) + '</h2>' + html + '<div class="choices">' + btn('Continue', 'evok', null, false, 'big') + '</div>' }; UI.renderDlg(); };

/* ---------- panels ---------- */
const PANELS = {};

PANELS.ship = function () {
  const S = G.S, st = G.shipStats(), hc = S.ship.hullClass, hull = G.HULLS[hc], next = G.HULLS[hc + 1];
  let h = tabsHTML('ship', [['up', 'Upgrades'], ['wp', 'Weapons'], ['paint', 'Hulls & Paint'], ['pets', 'Companions'], ['cargo', 'Cargo']]);
  const tab = curTab('ship', 'up');
  if (tab === 'up') {
    h += '<div class="cols"><div class="card shipcard"><canvas data-ship="' + hull.shape + '" data-col="' + G.paintColor() + '" data-rust="' + (hc === 0 && S.cos.paint === 'stock' ? 1 : 0) + '" data-lights="' + hc + '" data-trail="' + G.trailColor() + '" width="150" height="150"></canvas><h3>' + hull.n + '</h3><p class="dim">Hull class ' + (hc + 1) + ' of ' + G.HULLS.length + ' · ' + hull.slots + ' weapon mounts</p>';
    if (!S.ship.ftl) h += '<div class="warnbox"><b>FTL drive: broken</b><p>Costs 30 iron and 12 crystal to patch.</p>' + costHTML({ iron: 30, crystal: 12 }) + ' ' + btn('Repair drive', 'ftl', null, !G.canAfford({ iron: 30, crystal: 12 }), 'big') + '</div>';
    if (next) h += '<div class="refit"><b>Refit: ' + next.n + '</b><p class="dim">×' + (next.mul / hull.mul).toFixed(1) + ' hull, shields, damage and cargo · ' + next.slots + ' mounts</p>' + costHTML(next.cost) + ' ' + btn('Refit', 'refit', null, !G.canAfford(next.cost)) + '</div>';
    else h += '<p class="epic">There is no bigger ship.</p>';
    h += '</div><div class="card grow"><div class="statgrid">' + kv('Built for danger', '~' + G.shipRating()) + kv('Hull', fmt(st.hull)) + kv('Shield', fmt(st.shield)) + kv('Damage / s per weapon', fmt(st.dmg)) + kv('Mining / s', fmt(st.mining)) + kv('Cargo', fmt(st.cargo)) + kv('Speed', st.speed.toFixed(2) + '×') + kv('Energy', fmt(st.energy) + ' (+' + st.enRegen.toFixed(1) + '/s)') + kv('Scanner', fmt(st.scan)) + kv('Jump range', fmt(st.jump)) + kv('Mining drones', st.drones) + kv('Combat power', fmt(G.shipPower())) + '</div>';
    h += '<table class="tbl">';
    for (const id in G.UPG) { const c = G.upgCost(id); h += '<tr><td><b>' + G.UPG[id].n + '</b> <span class="lvn">' + S.ship.up[id] + '</span><br><span class="dim">' + G.UPG[id].d + '</span></td><td class="r">' + costHTML(c) + '</td><td class="r">' + btn('Upgrade', 'upg', { id }, !G.canAfford(c)) + btn('Max', 'upgmax', { id }, !G.canAfford(c)) + '</td></tr>'; }
    h += '</table></div></div>';
  } else if (tab === 'wp') {
    h += '<p class="dim">Weapons fire on their own at the nearest hostile in range (click a hostile to focus it). Your job is to fly: stay out of plasma, outrun missiles, keep the big ones at arm\'s length.</p><div class="counter">Lasers ▸ shields &nbsp;·&nbsp; Plasma ▸ armor &nbsp;·&nbsp; Missiles ▸ slow ships &nbsp;·&nbsp; Drones ▸ large ships &nbsp;·&nbsp; Point defense ▸ missiles and drones &nbsp;·&nbsp; Railguns ▸ everything, a little</div>';
    h += '<div class="mounts">'; for (let i = 0; i < st.slots; i++) { const w = S.ship.weapons[i]; h += '<div class="mount"><span class="dim">MOUNT ' + (i + 1) + '</span><b>' + (w ? G.WEAPONS[w].n : 'empty') + '</b>' + (w ? btn('Remove', 'unequip', { i }) : '') + '</div>'; } h += '</div><table class="tbl">';
    for (const id in G.WEAPONS) {
      const w = G.WEAPONS[id]; if (w.req && !G.has(w.req)) continue;
      const owned = S.ship.owned[id], cnt = S.ship.weapons.filter(x => x === id).length, free = S.ship.weapons.slice(0, st.slots).indexOf(null);
      const hasFree = S.ship.weapons.slice(0, st.slots).some(x => !x) || S.ship.weapons.length < st.slots;
      h += '<tr><td><b>' + w.n + '</b> <span class="dim">' + w.type + ' · ' + Math.round(w.f * 100) + '% dmg · range ' + w.range + '</span><br><span class="dim">' + w.d + '</span></td><td class="r">' + (owned ? (cnt ? '<span class="good">mounted ×' + cnt + '</span> ' : '') + btn('Mount', 'equip', { id }, !hasFree && 'No free mount') : costHTML(w.cost) + ' ' + btn('Buy', 'buyw', { id }, !G.canAfford(w.cost))) + '</td></tr>';
    }
    h += '</table><p class="dim">More weapons unlock in the Military research branch.</p>';
  } else if (tab === 'paint') {
    const pc = G.paintColor();
    h += '<h4>HULL CLASSES</h4><p class="dim">The ship is not fixed. Each refit (Upgrades tab) replaces it with a bigger hull: new silhouette, more running lights, more weapon mounts.</p><div class="grid g5">';
    G.HULLS.forEach((hl, i) => { h += '<div class="card cx' + (i === hc ? ' got' : i > hc ? ' unk' : '') + '"><canvas data-ship="' + hl.shape + '" data-col="' + (i > hc ? '#667090' : pc) + '" data-rust="' + (i === 0 && S.cos.paint === 'stock' ? 1 : 0) + '" data-lights="' + i + '" width="110" height="110"></canvas><b>' + hl.n + '</b><span class="dim">' + (i === hc ? 'Your ship' : i < hc ? 'Outgrown' : '×' + hl.mul + ' base stats · ' + hl.slots + ' mounts') + '</span></div>'; });
    h += '</div><h4>PAINT — ' + G.PAINTS.filter(p => S.cos.own[p.id]).length + ' / ' + G.PAINTS.length + ' earned</h4><p class="dim">Cosmetic only. Earned by playing and kept through ascension.</p><div class="grid g5">';
    for (const p of G.PAINTS) { const own = S.cos.own[p.id], on = S.cos.paint === p.id; h += '<div class="card cx' + (on ? ' got' : own ? '' : ' unk') + '"><canvas data-ship="' + hull.shape + '" data-col="' + (own ? G.cosColor(p, hc ? '#9fd8ff' : '#d99a6a') : '#444a5c') + '" data-rust="' + (p.id === 'stock' && hc === 0 ? 1 : 0) + '" data-lights="' + (own ? hc : 0) + '" width="90" height="90"></canvas><b>' + p.n + '</b><span class="dim">' + p.d + '</span>' + (own ? btn(on ? 'In use' : 'Use', 'paint', { id: p.id }, on) : '<span class="warn">Locked</span>') + '</div>'; }
    h += '</div><h4>ENGINE TRAIL — ' + G.TRAILS.filter(p => S.cos.own[p.id]).length + ' / ' + G.TRAILS.length + ' earned</h4><div class="grid g5">';
    for (const p of G.TRAILS) { const own = S.cos.own[p.id], on = S.cos.trail === p.id; h += '<div class="card cx' + (on ? ' got' : own ? '' : ' unk') + '"><i class="swatch" style="background:linear-gradient(90deg,' + (own ? G.cosColor(p, '#ffb060') : '#444a5c') + ',transparent)"></i><b>' + p.n + '</b><span class="dim">' + p.d + '</span>' + (own ? btn(on ? 'In use' : 'Use', 'trail', { id: p.id }, on) : '<span class="warn">Locked</span>') + '</div>'; }
    h += '</div>';
  } else if (tab === 'pets') {
    const ids = Object.keys(S.comp);
    h += '<p class="dim">Companions grant a bonus while active and gain experience from kills, scans and exploring. They evolve at level 10 and 25. Active slots: ' + S.active.length + ' / ' + G.compSlots() + '.</p>';
    if (!ids.length) h += '<p class="empty">Nothing has adopted you yet. Strange creatures turn up in anomalies, nests and drifting gardens.</p>';
    h += '<div class="grid">';
    for (const id of ids) { const c = S.comp[id], d = G.COMP[id], on = S.active.includes(id), b = G.compBonus(id); h += '<div class="card pet' + (on ? ' on' : '') + (c.pris ? ' pris' : '') + '"><canvas data-comp="' + id + '" width="72" height="72"></canvas><h4>' + esc(G.compName(id)) + '</h4><p>Level ' + c.lvl + '</p>' + bar(c.xp / G.compNeed(c.lvl), d.col) + '<p class="good">' + (b > 0 ? '+' : '') + Math.round(b * 100) + '% ' + d.d + '</p>' + btn(on ? 'Rest' : 'Activate', 'comp', { id }, !on && S.active.length >= G.compSlots()) + '</div>'; }
    h += '</div>';
  } else {
    const c = S.ship.cargo; h += '<p class="dim">Cargo is lost if the ship is destroyed. Dock at a station or one of your colonies to bank it.' + (G.has('uplink') ? ' <span class="good">Quantum Uplink active: everything is banked instantly.</span>' : '') + '</p><table class="tbl">';
    let any = false; for (const k in c) { any = true; h += '<tr><td>' + rname(k) + '</td><td class="r">' + fmt(c[k]) + '</td></tr>'; }
    if (!any) h += '<tr><td class="empty">Hold is empty.</td></tr>';
    h += '</table><div class="row"><label class="chk" data-a="automine"><i class="' + (S.set.autoMine ? 'on' : '') + '"></i> Auto-mine when no hostiles are near (you still have to fly there)</label></div>';
  }
  return { title: 'SHIP — ' + hull.n, html: h };
};

function resStars(p) { let h = ''; for (const r in p.res) h += '<div class="kv"><span>' + (r === 'energy' ? ri('energy') + 'Sunlight' : rname(r)) + '</span>' + G.stars(p.res[r]) + '</div>'; return h; }
PANELS.planet = function (pid) {
  const S = G.S, p = G.planetById(pid), pt = G.PTYPES[p.type], sys = G.sysById(p.sys), col = S.colonies[pid], sd = S.sd[p.sys] || {};
  const tr = p.trait && G.TRAITS[p.trait];
  let h = '<div class="cols"><div class="card pcard"><canvas data-planet="' + pid + '" width="240" height="200"></canvas><h3>' + esc(p.name) + '</h3><p class="dim">' + pt.n + ' World · ' + esc(sys.name) + ' system</p>';
  h += kv('Habitability', G.planetHab(p, col) + '%') + kv('Temperature', p.temp + ' K') + kv('Gravity', p.grav + ' g') + kv('Atmosphere', p.atm) + kv('Moons', p.moons) + kv('Building slots', col ? Object.keys(col.b).length + ' / ' + G.colonySlots(col) : p.slots + p.moons);
  h += '<h4>RESOURCES</h4>' + resStars(p);
  if (tr) h += '<div class="trait"><b>' + tr.n + '</b><span>' + tr.d + '</span></div>';
  if (p.anomaly && !((sd.pdone || 0) & (1 << p.idx))) h += '<div class="trait anom"><b>◆ Anomaly detected</b>' + btn('Investigate', 'panom', { id: pid }) + '</div>';
  h += '</div><div class="card grow">';
  if (!col) {
    const why = G.canColonize(p), c = G.colonyPodCost();
    h += '<h3>UNCLAIMED</h3><p>A colony extracts this world\'s resources, houses population, and gives you somewhere safe to bank cargo and repair.</p>';
    if (sys.civ && S.civs[sys.civ] && !S.civs[sys.civ].dead && !S.civs[sys.civ].vassal) h += '<p class="warn">This is ' + esc(G.civById(sys.civ).name) + ' territory. Settling here will cost you standing with them.</p>';
    const n = G.colonyCount(), ext = Object.keys(p.res).filter(r => r !== 'energy' && Object.values(G.BLD).some(b => b.ext && b.ext.includes(r) && (!b.req || G.has(b.req))));
    const hab = G.planetHab(p), slots = Math.max(2, p.slots + (tr && tr.eff.slots || 0) + G.sysBonus(p.sys).slots + p.moons);
    h += '<div class="trait"><b>Is it worth it?</b><span>' + slots + ' building slots · habitability ' + hab + '% (' + (hab >= 70 ? 'grows fast, big population' : hab >= 40 ? 'average population' : 'small population, slow growth') + ') · ' + (ext.length ? 'buildings here can extract ' + ext.map(rname).join(', ') : '<span class="bad">nothing your buildings can extract yet</span>') + '.</span></div>';
    h += '<p class="dim">This would be colony #' + (n + 1) + '. Every colony makes the next pod 10% dearer and draws slightly more raider attention, wherever it is. A colony with no buildings only pays a trickle of credits, so plan to build on it.</p>';
    h += '<div class="row">' + costHTML(c) + ' ' + btn('Found colony', 'colonize', { id: pid }, why || !G.canAfford(c), 'big') + '</div>' + (why ? '<p class="bad">' + esc(why) + '</p>' : '');
  } else {
    const c = G.colonyCalc(col);
    h += '<div class="statgrid">' + kv('Population', fmt(col.pop * 1e6) + ' / ' + fmt(c.popcap * 1e6)) + kv('Workforce', Math.round(c.eff * 100) + '%' + (c.eff < 0.99 ? ' <span class="bad">(needs ' + c.workers + 'M workers)</span>' : '')) + kv('Defense', (() => { const rc = G.raidCheck(col, c); return '<span class="' + (rc.state === 'safe' ? 'good' : rc.state === 'risk' ? 'warn' : 'bad') + '">' + fmt(c.def) + '</span> <span class="dim">vs raids ~' + fmt(rc.power) + '</span>'; })()) + kv('Energy', '<span class="' + (c.enProd - c.enCons < 0 ? 'bad' : 'good') + '">' + G.fmtRate(c.enProd - c.enCons) + '</span>') + '</div>';
    let pr = ''; for (const k in c.prod) pr += '<span class="cost">' + ri(k) + G.fmtRate(c.prod[k] * G.pwr) + '</span>';
    h += '<div class="prodline">' + pr + '</div>';
    const iss = colIssues(col, c); if (iss.length) h += '<div class="iss">' + iss.join('<br>') + '</div>';
    { const rc = G.raidCheck(col, c); if (rc.state !== 'safe') h += '<p class="dim">Raid safety: ' + (G.S.tech.mil2 ? 'about <b>' + rc.need + ' more Missile Platform level' + (rc.need === 1 ? '' : 's') + '</b> (or the equivalent in Shield Generators / Orbital Defense Grids) would hold every raid here today. Raids grow as you add colonies and megastructures.' : 'research <b>Missile Systems</b> (Military) to build Missile Platforms here.') + ' Or just be in this system when a raid arrives and fight it yourself.</p>'; }
    if (col.sys !== S.loc) h += '<div class="row">' + (S.dest === col.sys ? btn('Clear course', 'destclear') : btn('Set course here', 'dest', { id: col.sys }, G.route(col.sys) ? false : 'No charted route')) + '<span class="dim">' + (G.route(col.sys) ? G.route(col.sys).length + ' jump(s) away · megastructures are built while you are in the system' : 'no charted route yet') + '</span></div>';
    if (G.has('governor')) {
      h += '<label class="chk" data-a="auto" data-id="' + pid + '"><i class="' + (col.auto ? 'on' : '') + '"></i> AI Governor builds here automatically</label>';
      h += GOV_D; if (col.auto) h += '<p class="dim">Governor now: ' + esc(col.gov || 'thinking…') + '</p>';
      const bans = Object.keys(col.ban || {}).filter(id => G.BLD[id]);
      if (bans.length) h += '<p class="dim">Governor will not rebuild what you demolished: ' + bans.map(id => G.BLD[id].n + ' ' + btn('allow', 'unban', { id: pid, b: id })).join(' · ') + '</p>';
    }
    for (const cat of G.BLD_CATS) {
      let rows = '';
      for (const id in G.BLD) {
        const b = G.BLD[id]; if (b.cat !== cat) continue; const lvl = col.b[id] || 0;
        if (b.req && !G.has(b.req)) continue;
        if (b.ext && !b.ext.some(r => p.res[r])) continue;
        const why = G.canBuild(col, id), cst = G.bldCost(id, lvl);
        let eff = b.d;
        if (b.ext) eff = b.ext.filter(r => p.res[r]).map(r => ri(r) + G.RES[r].n + ' ' + G.stars(p.res[r])).join(' ');
        if (lvl && b.inp && G.convRun && G.convRun[id] && !(col.off && col.off[id])) { const r = G.convRun[id]; eff += ' <span class="' + (r.run < 0.9 ? 'warn' : 'good') + '">· running ' + Math.round(r.run * 100) + '%' + (r.run < 0.9 && r.short ? ', short of ' + G.RES[r.short].n : '') + '</span>'; }
        if (col.off && col.off[id]) eff += ' <span class="dim">· PAUSED (no energy, no workers)</span>';
        const pw = b.pw ? '<span class="' + (b.pw > 0 ? 'good' : 'dim') + '">' + (b.pw > 0 ? '+' : '') + b.pw + ' ⚡/lvl</span>' : '';
        rows += '<tr class="' + (lvl ? 'has' : '') + '"><td><b>' + b.n + '</b> ' + (lvl ? '<span class="lvn">' + lvl + '</span>' : '') + '<br><span class="dim">' + eff + '</span> ' + pw + '</td><td class="r">' + (why === 'Max level' ? '<span class="dim">max</span>' : costHTML(cst)) + '</td><td class="r">' + btn(lvl ? 'Upgrade' : 'Build', 'build', { id: pid, b: id }, why || !G.canAfford(cst)) + (lvl && !b.max ? btn('Max', 'buildmax', { id: pid, b: id }, why || !G.canAfford(cst)) : '') + (lvl && (b.inp || b.pw < 0) ? btn(col.off && col.off[id] ? 'Resume' : 'Pause', 'pause', { id: pid, b: id }, false, col.off && col.off[id] ? 'sel' : '') : '') + (lvl ? btn('Demolish', 'demolish', { id: pid, b: id }, false, 'ghost') : '') + (why && why !== 'Max level' ? '<div class="why">' + why + '</div>' : '') + '</td></tr>';
      }
      if (rows) h += '<h4>' + cat.toUpperCase() + '</h4><table class="tbl">' + rows + '</table>';
    }
    const only = G.colonyCount() <= 1;
    h += '<h4>ABANDON</h4><p class="dim">Gives this world up. Every building is demolished and the people leave. You get back ' + costHTML(G.abandonRefund(pid)) + ' (half a pod plus half of what you spent on its buildings), and every later pod gets 10% cheaper again.</p><div class="row">' + btn('Abandon colony', 'abandon', { id: pid }, only ? 'You cannot abandon your only colony' : false) + (only ? '<span class="dim">Not possible with only one colony.</span>' : '') + '</div>';
  }
  h += '</div></div>';
  return { title: (col ? 'COLONY — ' : 'PLANET — ') + esc(p.name), html: h };
};

const PROBE_D = '<p class="chkd">When on, probes found one free colony every 45 seconds on a habitable world (30%+ habitability, something to mine) in a system you have visited. They skip alien space and worlds you abandoned. The colony is free, but every colony makes the next pod 10% dearer and draws a little more raider attention. Off by default.</p>';
const GOVNEW_D = '<p class="chkd">When on, colonies the probes found start with the AI Governor building on them. When off, they start empty and you build them yourself. Off by default.</p>';
const GOV_D = '<p class="chkd">The AI Governor spends your stock on buildings for this colony, at most a quarter of any resource per build. Order: fix energy, then housing, then mines, research and credits, and converters only when their inputs have spare supply. It never demolishes and never rebuilds what you demolished.</p>';
/* What is wrong with one colony, in plain words. */
function colIssues(col, c) {
  const out = [], B = G.BLD, R = G.rates || {}, off = col.off || {}, seen = {};
  for (const id in col.b) {
    const d = B[id];
    if (off[id]) { out.push('<span class="dim">' + d.n + ' paused</span>'); continue; }
    if (!d.inp) continue;
    const r = G.convRun && G.convRun[id];
    if (r && r.run < 0.9 && r.short) out.push('<span class="warn">' + d.n + ' running ' + Math.round(r.run * 100) + '%: short of ' + G.RES[r.short].n + '</span>');
    for (const k in d.inp) if ((R[k] || 0) < -0.005 && !seen[k]) { seen[k] = 1; out.push('<span class="bad">' + d.n + ' is draining ' + G.RES[k].n + ' (' + G.fmtRate(R[k]) + ' overall)</span>'); }
  }
  if (G.pwr < 0.999 && c.enCons > c.enProd) out.push('<span class="bad">Uses ' + G.fmt(c.enCons - c.enProd) + ' more energy than it makes; the empire is short</span>');
  if (!c.used) out.push('<span class="bad">IDLE: no buildings</span>');
  else if (c.eff < 0.99) out.push('<span class="warn">Only ' + Math.round(c.eff * 100) + '% staffed: build housing</span>');
  { const e = G.silenceETA(col.sys); if (e < 1800) out.push('<span class="bad">The Silence reaches it in ' + G.fmtT(e) + '</span>'); }
  if (c.used) { const rc = G.raidCheck(col, c); if (rc.state !== 'safe') out.push('<span class="' + (rc.state === 'weak' ? 'warn' : 'dim') + '">' + (rc.state === 'weak' ? 'Would lose a raid' : 'Raids are a coin flip') + ': defence ' + G.fmt(rc.def) + ' vs ~' + G.fmt(rc.power) + '</span>'); }
  return out;
}
/* Resources that are falling, and who is eating them. */
function drainHTML() {
  const R = G.rates || {}, S = G.S; let h = '';
  for (const k in R) {
    if (k === 'energy' || R[k] >= -0.005) continue;
    const who = [];
    for (const id of G.CONV_ORDER) { const d = G.BLD[id]; if (!d.inp || !d.inp[k]) continue; let n = 0, lv = 0; for (const pid in S.colonies) { const col = S.colonies[pid]; if (col.b[id] && !(col.off && col.off[id])) { n++; lv += col.b[id]; } } if (n) who.push(d.n + ' ×' + lv + ' in ' + n + ' ' + (n === 1 ? 'colony' : 'colonies')); }
    h += '<li>' + rname(k) + ' <b class="bad">' + G.fmtRate(R[k]) + '</b>' + (who.length ? ' <span class="dim">— used by ' + who.join(', ') + '</span>' : '') + '</li>';
  }
  if (G.pwr < 0.999) h += '<li>' + ri('energy') + 'Energy <b class="bad">short</b> <span class="dim">— colonies run at ' + Math.round(G.pwr * 100) + '%. Build Solar Farms or pause hungry buildings.</span></li>';
  return h ? '<div class="card issues"><b>Falling resources</b><ul>' + h + '</ul><p class="dim">Converters stop before they empty a stock (they keep the reserve below), so a falling resource settles at that reserve instead of hitting zero. To free it up, pause or demolish the converters listed.</p></div>' : '';
}
const SILENCE_D = () => 'A black circle on the galaxy map that grows by about one system every 10 minutes (it rests while you have no colonies outside it). Colonies inside it vanish (they come back when it is stopped). Reality Anchors (Megastructures) protect everything within 8 systems. To stop it: research <b>Null Weaponry</b> (Transcendence), which lets you jump into erased space and triples your damage against it, then fly to its centre and destroy the boss there, An Absence. Silence ships measure themselves against <b>your ship</b>: the boss takes about a minute and a half of your fire to kill and about 25 seconds of hits (more with shields) to kill you; its beams go half through your shields. Without Null Weaponry you only do a third of the damage. They never stop you jumping away: if a fight goes badly, retreat.';
function silenceHTML() {
  const S = G.S; if (!S.silence.on) return '';
  const org = G.silenceOrigin(), nx = G.silenceNext(), lost = Object.keys(S.lost || {}).length;
  return '<div class="card issues"><b>The Silence is spreading.</b><p class="dim">' + SILENCE_D() + '</p>' +
    (nx.pid && nx.eta < Infinity ? '<p class="bad">Next colony lost: ' + esc(G.planetById(nx.pid).name) + ' in ' + G.fmtT(nx.eta) + '</p>' : '') +
    (lost ? '<p>' + lost + ' ' + (lost === 1 ? 'colony is' : 'colonies are') + ' inside it and will return when you stop it.</p>' : '') +
    (!S.tech.trn2 ? '<p class="warn">You cannot enter it yet: research Null Weaponry first.</p>' : org && org.id !== S.loc ? '<div class="row">' + btn(S.dest === org.id ? 'Clear course' : 'Set course to its centre (' + esc(org.name) + ')', S.dest === org.id ? 'destclear' : 'dest', { id: org.id }) + '</div>' : '') + '</div>';
}
PANELS.colonies = function (only) {
  const S = G.S, ids = Object.keys(S.colonies);
  let h = '<div class="statgrid">' + kv('Colonies', ids.length) + kv('Population', fmt((G.totalPop || 0) * 1e6)) + kv('Energy', G.fmtRate((G.enProd || 0) - (G.enCons || 0)) + ' (' + fmt(G.get('energy')) + ' / ' + fmt(G.energyCap || 0) + ')') + kv('Total defense', fmt(G.totalDef || 0)) + kv('Next colony pod', costHTML(G.colonyPodCost())) + '</div>';
  h += silenceHTML();
  if (!ids.length) return { title: 'COLONIES', html: h + '<p class="empty">No colonies yet. Research Colonial Charter, then orbit a habitable planet (fly to it, press E) and found one.</p>' };
  const rv = S.set.reserve == null ? 60 : S.set.reserve;
  h += '<div class="qty"><span class="dim">Converters keep a reserve of</span>' + [[0, 'nothing'], [60, '1 min'], [300, '5 min'], [900, '15 min']].map(o => '<button class="b' + (rv === o[0] ? ' sel' : '') + '" data-a="reserve" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '<span class="dim">of each input (income or use, whichever is larger)</span></div>';
  h += '<div class="ctl">';
  if (G.has('governor')) h += '<div class="row">' + btn('Governors: all on', 'autoall', { v: 1 }) + btn('all off', 'autoall', { v: 0 }) + '</div><p class="chkd" style="margin-left:2px">Switches the AI Governor on or off for every colony at once, and for colonies probes found later.</p>';
  if (G.has('probes')) h += '<label class="chk" data-a="probes"><i class="' + (S.set.probes === true ? 'on' : '') + '"></i> Von Neumann probes found new colonies by themselves</label>' + PROBE_D;
  h += '</div>' + drainHTML();
  const idle = ids.filter(pid => !Object.keys(S.colonies[pid].b).length).length;
  if (idle) h += '<p class="warn">' + idle + ' ' + (idle === 1 ? 'colony has' : 'colonies have') + ' no buildings and ' + (idle === 1 ? 'is' : 'are') + ' marked IDLE below. Open one to build on it, or abandon it to get half a pod back and make the next pod cheaper.</p>';
  // group by system
  const bySys = {}; for (const pid of ids) (bySys[S.colonies[pid].sys] = bySys[S.colonies[pid].sys] || []).push(S.colonies[pid]);
  let sysIds = Object.keys(bySys);
  if (only && bySys[only]) sysIds = [only];
  if (sysIds.length > 12) { // empire is big: summarise by system
    h += '<table class="tbl"><tr><th>System</th><th class="r">Problems</th><th>Sector</th><th class="r">Worlds</th><th class="r">Population</th><th class="r">Megastructures</th><th></th></tr>';
    const pg = UI.tab.colpage || 0, per = 40;
    for (const sid of sysIds.slice(pg * per, pg * per + per)) { const sys = G.sysById(sid), cols = bySys[sid]; let pop = 0; for (const c of cols) pop += c.pop; const m = S.sd[sid] && S.sd[sid].mega; let bad = 0; for (const c of cols) if (colIssues(c, G.colonyCalc(c)).some(x => x.indexOf('dim') < 0)) bad++; h += '<tr><td><b>' + esc(sys.name) + '</b> <span class="dim">L' + sys.level + '</span></td><td class="r">' + (bad ? '<span class="bad">' + bad + ' ⚠</span>' : '<span class="dim">—</span>') + '</td><td class="dim">' + G.sectorName(sys.cx, sys.cy) + '</td><td class="r">' + cols.length + '</td><td class="r">' + fmt(pop * 1e6) + '</td><td class="r">' + (m ? Object.keys(m).length : '—') + '</td><td class="r">' + btn('Open', 'colsys', { id: sid }) + (sid === S.loc ? '' : btn(S.dest === sid ? 'Clear course' : 'Set course', S.dest === sid ? 'destclear' : 'dest', { id: sid })) + '</td></tr>'; }
    h += '</table>'; if (sysIds.length > per) h += '<div class="row">' + btn('◂ Prev', 'colpage', { d: -1 }, pg <= 0) + '<span class="dim">Page ' + (pg + 1) + ' / ' + Math.ceil(sysIds.length / per) + '</span>' + btn('Next ▸', 'colpage', { d: 1 }, (pg + 1) * per >= sysIds.length) + '</div>';
  } else for (const sid of sysIds) {
    const sys = G.sysById(sid);
    h += '<h4>' + esc(sys.name).toUpperCase() + ' <span class="dim">· ' + sys.star.n + ' · danger ' + sys.level + (sid === S.loc ? ' · you are here' : '') + '</span>' + (sid === S.loc ? '' : S.dest === sid ? ' ' + btn('Clear course', 'destclear') : ' ' + btn('Set course', 'dest', { id: sid }, G.route(sid) ? false : 'No charted route')) + '</h4><div class="grid">';
    for (const col of bySys[sid]) {
      const p = G.planetById(col.pid), c = G.colonyCalc(col), iss = colIssues(col, c); let pr = ''; let n = 0;
      for (const k in c.prod) if (n++ < 5) pr += '<span class="cost">' + ri(k) + G.fmtRate(c.prod[k] * G.pwr) + '</span>';
      h += '<div class="card colcard" data-a="planet" data-id="' + col.pid + '"><canvas data-planet="' + col.pid + '" width="120" height="90"></canvas><div><b>' + esc(p.name) + '</b> <span class="dim">' + G.PTYPES[p.type].n + '</span><br>' + bar(col.pop / c.popcap, '#7dffb0', fmt(col.pop * 1e6) + ' pop') + '<span class="dim">Slots ' + c.used + '/' + c.slots + ' · work ' + Math.round(c.eff * 100) + '%' + (col.auto ? ' · governor on' : '') + '</span><div class="prodline">' + pr + '</div>' + (iss.length ? '<div class="iss">' + iss.join('<br>') + '</div>' : '') + '</div></div>';
    }
    h += '</div>';
  }
  return { title: 'COLONIES', html: h };
};

PANELS.research = function () {
  const S = G.S, NW = 178, NH = 58, GAP = 10;
  let h = '<div class="rtop">';
  if (S.cur) { const need = G.techCost(S.cur.id), nm = G.TECH[S.cur.id] ? G.TECH[S.cur.id].n : G.REPEAT.find(r => r.id === S.cur.id).n, rate = G.rates.sci || 0; h += '<div class="grow"><b>Researching: ' + esc(nm) + '</b>' + bar(S.cur.p / need, '#b89bff', fmt(S.cur.p) + ' / ' + fmt(need) + (rate > 0 ? ' · ' + G.fmtT((need - S.cur.p) / rate) : '')) + '</div>'; }
  else h += '<div class="grow"><b>Idle.</b> <span class="dim">' + fmt(G.get('sci')) + ' research banked. Pick something below.</span></div>';
  h += '<div>' + kv('Research income', G.fmtRate(G.rates.sci || 0)) + '</div></div>';
  if (!S.tech.soc1) h += '<p class="warn">Research <b>Colonial Charter</b> (Society row) soon: colonies are where real research comes from. Until then it comes from scanning planets, visiting new systems, and a small trickle from your ship\'s lab.</p>';
  if (S.queue.length) h += '<div class="queue">Queue: ' + S.queue.map((q, i) => '<span class="cost" data-a="unq" data-i="' + i + '">' + esc(G.TECH[q] ? G.TECH[q].n : G.REPEAT.find(r => r.id === q).n) + ' ✕</span>').join('') + '</div>';
  { const t = G.TECH[UI.techSel];
    if (t && G.techVisible(t)) {
      let md = 0; for (const id in S.tech) md = Math.max(md, G.TECH[id].t);
      const done = S.tech[t.id], can = G.canResearch(t.id), veiled = !done && !can && t.t > md + 2, cur = S.cur && S.cur.id === t.id;
      h += '<div class="card tdet" style="--bc:' + G.BRANCH[t.br].c + '"><div><b>' + (veiled ? '? ? ?' : esc(t.n)) + '</b> <span class="dim">' + G.BRANCH[t.br].n + ' · tier ' + (t.t + 1) + '</span><p>' + (veiled ? 'Too far ahead to make out. Research the technologies leading to it first.' : esc(t.d)) + '</p>' + (!done && !can && !veiled ? '<p class="dim">Needs first: ' + t.req.filter(r => !S.tech[r]).map(r => esc(G.TECH[r].n)).join(', ') + '</p>' : '') + '</div><div class="r">' + (done ? '<span class="good">Researched</span>' : '<span class="cost">' + ri('sci') + fmt(G.techCost(t.id)) + '<u>Research</u></span> ' + btn(cur ? 'In progress' : S.cur ? 'Add to queue' : 'Research this', 'research', { id: t.id }, !can || cur || S.queue.includes(t.id), 'big')) + '</div></div>';
    } else h += '<p class="tip">Click a technology to read what it does, then research it. Bright boxes are available now; research points come from Laboratories and from scanning and exploring.</p>'; }
  // layout: one band per branch, columns are tiers
  let maxDone = 0; for (const id in S.tech) maxDone = Math.max(maxDone, G.TECH[id].t);
  const pos = {}, bands = []; let y = 0, maxT = 0;
  for (const br in G.BRANCH) {
    const list = G.TECH_LIST.filter(t => t.br === br && G.techVisible(t));
    if (!list.length) { if (br === 'trn') { bands.push({ br, y, hgt: NH + GAP, mystery: true }); y += NH + GAP + 14; } continue; }
    const stack = {}; let rows = 1;
    for (const t of list) { const k = stack[t.t] = (stack[t.t] || 0) + 1; rows = Math.max(rows, k); pos[t.id] = { x: 96 + t.t * (NW + 26), y: y + (k - 1) * (NH + GAP) }; maxT = Math.max(maxT, t.t); }
    bands.push({ br, y, hgt: rows * (NH + GAP) }); y += rows * (NH + GAP) + 14;
  }
  const W = 96 + (maxT + 1) * (NW + 26) + 40;
  let svg = '', nodes = '';
  for (const t of G.TECH_LIST) {
    const p = pos[t.id]; if (!p) continue;
    const done = S.tech[t.id], can = G.canResearch(t.id), cur = S.cur && S.cur.id === t.id, q = S.queue.includes(t.id);
    const veiled = !done && !can && t.t > maxDone + 2;
    for (const r of t.req) { const a = pos[r]; if (!a) continue; const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = p.x, y2 = p.y + NH / 2; svg += '<path d="M' + x1 + ' ' + y1 + ' C' + (x1 + 16) + ' ' + y1 + ',' + (x2 - 16) + ' ' + y2 + ',' + x2 + ' ' + y2 + '" class="' + (S.tech[r] ? (done ? 'd' : 'a') : '') + '"/>'; }
    nodes += '<div class="tn ' + (done ? 'done' : cur ? 'cur' : q ? 'q' : can ? 'can' : 'lock') + (UI.techSel === t.id ? ' sel' : '') + '" style="left:' + p.x + 'px;top:' + p.y + 'px;--bc:' + G.BRANCH[t.br].c + '" data-a="tsel" data-id="' + t.id + '" title="' + esc(veiled ? '???' : t.d) + '"><b>' + (veiled ? '? ? ?' : esc(t.n)) + '</b><span>' + (done ? '✓ researched' : veiled ? 'unknown' : ri('sci') + fmt(G.techCost(t.id)) + (cur ? ' · in progress' : q ? ' · queued' : '')) + '</span></div>';
  }
  let lab = '';
  for (const b of bands) lab += '<div class="band" style="top:' + (b.y - 6) + 'px;height:' + (b.hgt + 2) + 'px;--bc:' + G.BRANCH[b.br].c + '"><span>' + G.BRANCH[b.br].n.toUpperCase() + '</span>' + (b.mystery ? '<em>Something has to happen first.</em>' : '') + '</div>';
  h += '<div class="tree" data-scroll="tree"><div class="treein" style="width:' + W + 'px;height:' + y + 'px">' + lab + '<svg width="' + W + '" height="' + y + '">' + svg + '</svg>' + nodes + '</div></div>';
  // repeatables
  h += '<h4>ENDLESS RESEARCH</h4>';
  if (Object.keys(S.tech).length < 30) h += '<p class="dim">Unlocks after 30 technologies (' + Object.keys(S.tech).length + '/30). These never run out.</p>';
  else { h += '<div class="grid">'; for (const r of G.REPEAT) { const cur = S.cur && S.cur.id === r.id; h += '<div class="card"><b>' + r.n + '</b> <span class="lvn">' + G.repLevel(r.id) + '</span><p class="dim">' + r.d + '</p><span class="cost">' + ri('sci') + fmt(G.techCost(r.id)) + '</span> ' + btn(cur ? 'In progress' : 'Research', 'research', { id: r.id }, cur) + '</div>'; } h += '</div>'; }
  return { title: 'RESEARCH — ' + Object.keys(S.tech).length + ' / ' + G.TECH_LIST.filter(G.techVisible).length + ' known technologies', html: h };
};

PANELS.fleet = function () {
  const S = G.S, cap = G.fleetCap(), used = G.fleetUsed(), yard = G.hasShipyard();
  let h = '<div class="statgrid">' + kv('Command', used + ' / ' + cap) + kv('Fleet power', fmt(G.fleetPower())) + kv('Your ship', fmt(G.shipPower())) + kv('Ships lost, ever', fmt(S.stats.fleetLost)) + '</div>' + bar(used / Math.max(1, cap), '#7dc8ff');
  h += '<p class="dim">The fleet flies with you and fights on its own. Ships that die in battle are gone. Command comes from Shipyards (+4 per level).</p>';
  h += '<div class="counter">Missiles ▸ slow ships &nbsp;·&nbsp; Lasers ▸ shields &nbsp;·&nbsp; Plasma ▸ armor &nbsp;·&nbsp; Drones ▸ large ships &nbsp;·&nbsp; Point defense ▸ drones</div>';
  if (!yard) h += '<p class="warn">You need a Shipyard on a colony (research Fleet Doctrine).</p>';
  h += '<table class="tbl">';
  for (const id in G.FLEET) {
    const d = G.FLEET[id], n = S.fleet[id] || 0, known = G.has(d.req);
    if (!known && !n) { h += '<tr class="lockrow"><td colspan="4"><span class="dim">? ? ? — locked hull class</span></td></tr>'; continue; }
    const room = Math.floor((cap - used) / d.cp); let afford = Infinity; for (const k in d.cost) afford = Math.min(afford, Math.floor(G.get(k) / d.cost[k]));
    const mx = Math.max(0, Math.min(room, afford));
    h += '<tr><td class="shipico"><canvas data-ship="' + d.shape + '" data-col="#7dc8ff" width="54" height="54"></canvas></td><td><b>' + d.n + '</b> <span class="lvn">×' + n + '</span><br><span class="dim">' + d.cp + ' command · ' + fmt(d.hp * G.mult('fleethp')) + ' hull · ' + fmt(d.dmg * G.mult('fleetdmg')) + ' dps · ' + d.w + (d.fast ? ' · fast' : '') + (d.large ? ' · large' : '') + (d.arm ? ' · ' + d.arm * 100 + '% armor' : '') + '</span></td><td class="r">' + costHTML(d.cost) + '</td><td class="r nowrap">' + btn('+1', 'ship', { id, n: 1 }, mx < 1 || !yard) + btn('+5', 'ship', { id, n: 5 }, mx < 5 || !yard) + btn('Max ' + (isFinite(mx) ? mx : 0), 'ship', { id, n: mx }, mx < 1 || !yard) + '</td></tr>';
  }
  h += '</table>';
  return { title: 'FLEET', html: h };
};

PANELS.diplo = function (cid) {
  const S = G.S, met = Object.keys(S.civs).filter(c => S.civs[c].met);
  if (!met.length) return { title: 'DIPLOMACY', html: '<p class="empty">You have met no one. Other civilisations hold territory out there; explore until you find the coloured haze on the map.</p>' };
  if (!cid || !S.civs[cid]) cid = UI.arg = met[0];
  const civ = G.civById(cid), c = S.civs[cid], att = G.attitude(c);
  let h = '<div class="cols"><div class="civlist" data-scroll="civs">';
  for (const id of met) { const v = G.civById(id), s = S.civs[id], a = G.attitude(s); h += '<div class="civrow' + (id === cid ? ' on' : '') + '" data-a="civ" data-id="' + id + '"><i style="background:' + v.color + '"></i><b>' + esc(v.name) + '</b><span style="color:' + a[1] + '">' + a[0] + '</span></div>'; }
  h += '</div><div class="card grow"><div class="civhead"><canvas data-civ="' + cid + '" width="130" height="130"></canvas><div><h3 style="color:' + civ.color + '">' + esc(civ.name) + '</h3><p>' + esc(civ.species) + ' · ' + civ.body + ' · ' + esc(civ.gov) + '</p><p class="dim">' + civ.pers.n + '. ' + esc(civ.quirk.n) + ' <i>' + esc(civ.quirk.d) + '</i></p>';
  h += '<div class="statgrid">' + kv('Technology', G.stars(civ.tech)) + kv('Military', G.stars(civ.mil)) + kv('Economy', G.stars(civ.eco)) + kv('Danger level', civ.level) + '</div></div></div>';
  h += '<div class="relbar"><div class="relfill" style="left:' + ((c.rel + 100) / 2) + '%"></div><span class="l">−100 Enemy</span><span class="m">' + att[0] + ' (' + Math.round(c.rel) + ')</span><span class="r">Allied +100</span></div>';
  if (c.mods.length) h += '<div class="mods">' + c.mods.map(m => '<span class="' + (m.v >= 0 ? 'good' : 'bad') + '">' + (m.v >= 0 ? '+' : '') + m.v + ' ' + esc(m.n) + '</span>').join('') + '</div>';
  h += '<p class="dim">Their strength: ' + fmt(G.civPower(civ)) + ' · Yours: ' + fmt(G.myPower()) + (c.pact ? ' · <span class="good">Trade agreement</span>' : '') + (c.rpact ? ' · <span class="good">Research exchange</span>' : '') + '</p>';
  if (c.dead) h += '<p class="bad">Extinct.</p>';
  else {
    h += '<div class="row wrap">' + btn('Gift (' + fmt(G.giftCost(civ)) + ' cr)', 'dip', { id: cid, k: 'gift' }) + btn('Trade agreement', 'dip', { id: cid, k: 'pact' }, c.pact || c.vassal) + btn('Research exchange (' + fmt(G.giftCost(civ) * 4) + ' cr)', 'dip', { id: cid, k: 'rpact' }, c.rpact) + btn('Alliance', 'dip', { id: cid, k: 'ally' }, c.ally || c.vassal) + btn('Spy', 'dip', { id: cid, k: 'spy' }) + btn('Threaten', 'dip', { id: cid, k: 'threat' }, c.vassal) + (c.war ? btn('Sue for peace', 'dip', { id: cid, k: 'peace' }) : btn('Declare war', 'dip', { id: cid, k: 'war' }, c.vassal, 'danger')) + '</div>';
    if (c.war) h += '<p class="warn">At war. Destroy the Citadel in their capital system (' + esc(G.sysById(civ.capId).name) + ') to make them your vassals.</p>';
    if (!c.war) {
      h += '<h4>TRADE</h4>' + qtyBar() + '<table class="tbl">';
      for (const r of civ.wants) { const pr = G.tradePrice(civ, r, true) * G.mult('credits'), n = sellN(r); h += '<tr><td>They want ' + rname(r) + '<br><span class="dim">' + pr.toFixed(1) + ' credits each · you have ' + fmt(G.get(r)) + '</span></td><td class="r">' + btn('Sell ' + fmt(n) + ' for ' + fmt(n * pr) + ' cr', 'tsell', { id: cid, r }, n < 1) + '</td></tr>'; }
      for (const r of civ.sells) { const pr = G.tradePrice(civ, r, false), n = buyN(pr); h += '<tr><td>They sell ' + rname(r) + '<br><span class="dim">' + pr.toFixed(1) + ' credits each · you have ' + fmt(G.get(r)) + '</span></td><td class="r">' + btn('Buy ' + fmt(n) + ' for ' + fmt(n * pr) + ' cr', 'tbuy', { id: cid, r }, n < 1) + '</td></tr>'; }
      h += '</table>';
    }
  }
  h += '</div></div>';
  return { title: 'DIPLOMACY', html: h };
};

const STATION_SELL = () => G.here().home ? 0.5 : 0.6;
PANELS.station = function () {
  const S = G.S, sys = G.here(), sm = STATION_SELL();
  let h = '<p>' + (sys.home ? 'The Waystation: an old relay, mostly rust, still pressurised. Docking here banks your cargo and patches the ship. It will buy anything, at scrap prices.' : 'A free port. Cargo banked, hull repaired, tanks filled. They buy anything and sell the basics, at port prices.') + '</p>' + qtyBar() + '<table class="tbl"><tr><th>Resource</th><th class="r">You have</th><th class="r">Sell at ' + Math.round(sm * 100) + '% value</th><th class="r">' + (sys.home ? '' : 'Buy at 250% value') + '</th></tr>';
  let rows = 0;
  for (const id of G.RES_ORDER) {
    const r = G.RES[id]; if (r.t === 'core') continue; const have = G.get(id); const buyable = (r.t === 'common' || r.t === 'refined') && !sys.home;
    if (have < 1 && !buyable) continue; rows++;
    const n = sellN(id), bp = r.v * 2.5, bn = buyN(bp);
    h += '<tr><td>' + rname(id) + '</td><td class="r">' + fmt(have) + '</td><td class="r">' + btn('Sell ' + fmt(n) + ' for ' + fmt(n * r.v * sm) + ' cr', 'ssell', { r: id }, n < 1) + '</td><td class="r">' + (buyable ? btn('Buy ' + fmt(bn) + ' for ' + fmt(bn * bp) + ' cr', 'sbuy', { r: id }, bn < 1) : '') + '</td></tr>';
  }
  h += '</table>' + (rows ? '' : '<p class="empty">Nothing banked to sell yet. Mine something first.</p>');
  return { title: sys.home ? 'WAYSTATION' : 'TRADE STATION', html: h };
};

PANELS.mega = function () {
  const S = G.S, sys = G.here(), sid = sys.id, cols = G.systemColonies(sid);
  let h = '<p class="dim">Megastructures are built in the system you are in, and need a colony there. Each one of a kind you already own makes the next 60% more expensive. They also make you conspicuous: raids grow with every one.</p>';
  h += '<div class="statgrid">' + kv('This system', esc(sys.name)) + kv('Your colonies here', cols.length) + kv('Megastructure stages', G.megaCount || 0) + kv('Notoriety', '×' + G.notoriety().toFixed(2)) + '</div>';
  if (G.has('rigs') && sys.belts.length) { const n = S.sd[sid] && S.sd[sid].rigs || 0, mx = sys.belts.length * 5, c = G.rigCost(sid); h += '<div class="card megac"><div><b>Mining Rigs</b> <span class="lvn">' + n + ' / ' + mx + '</span><p class="dim">Automated rigs on this system\'s belts. Passive income of ' + [...new Set(sys.belts.flatMap(b => b.res))].map(ri).join(' ') + ' forever, no colony needed. No workers or energy.</p>' + (() => { const now = G.rigRates(sid, n), nx = G.rigRates(sid, 1), f = o => Object.keys(o).map(r => ri(r) + ' ' + G.RES[r].n + ' +' + G.fmtRate(o[r]).replace(/^\+/, '')).join(', '); return (n ? '<p>Now earning: <span class="good">' + f(now) + '</span></p>' : '') + (n < mx ? '<p class="dim">Next rig adds: ' + f(nx) + '</p>' : ''); })() + '</div><div class="r">' + costHTML(c) + ' ' + btn('Build rig', 'rig', null, n >= mx || !G.canAfford(c)) + '</div></div>'; }
  let any = false;
  for (const id in G.MEGA) {
    const d = G.MEGA[id], stg = G.megaStage(sid, id);
    if (!G.has(d.req)) continue; any = true;
    const why = G.canBuildMega(sid, id), c = G.megaCost(sid, id), nextN = stg < d.stages.length ? d.stages[stg].n : null;
    h += '<div class="card megac' + (stg >= d.stages.length ? ' done' : '') + '"><div><b>' + d.n + '</b> ' + (d.stages.length > 1 ? '<span class="lvn">stage ' + stg + ' / ' + d.stages.length + '</span>' : stg ? '<span class="good">built</span>' : '') + (d.scope === 'uni' ? ' <span class="epic">one per universe</span>' : '') + '<p class="dim">' + d.d + '</p>' + (d.stages.length > 1 ? '<div class="stages">' + d.stages.map((s, i) => '<span class="' + (i < stg ? 'on' : i === stg ? 'next' : '') + '">' + s.n + '</span>').join('') + '</div>' : '') + '</div><div class="r">' + (c ? costHTML(c) + ' ' + btn(nextN ? 'Build ' + nextN : 'Build', 'mega', { id }, why || !G.canAfford(c)) + (why && why !== 'Complete' ? '<br><span class="bad">' + why + '</span>' : '') : '<span class="good">Complete</span>') + '</div></div>';
  }
  if (!any) h += '<p class="empty">Nothing unlocked yet. The Megastructures research branch opens with Orbital Construction.</p>';
  let list = ''; for (const s in S.sd) { const m = S.sd[s].mega; if (!m) continue; list += '<tr><td><b>' + esc(G.sysById(s).name) + '</b></td><td>' + Object.keys(m).map(k => G.MEGA[k].n + (G.MEGA[k].stages.length > 1 ? ' ' + m[k] + '/' + G.MEGA[k].stages.length : '')).join(' · ') + '</td></tr>'; }
  if (list) h += '<h4>ACROSS YOUR EMPIRE</h4><table class="tbl">' + list + '</table>';
  return { title: 'MEGASTRUCTURES', html: h };
};

PANELS.codex = function () {
  const S = G.S, tab = curTab('codex', 'planets');
  let h = tabsHTML('codex', [['planets', 'Planets'], ['stars', 'Stars'], ['species', 'Species'], ['enemies', 'Hostiles'], ['res', 'Resources'], ['arti', 'Artifacts'], ['events', 'Events'], ['ach', 'Achievements']]);
  const head = (n, t, unk) => '<p class="dim">Discovered: <b>' + n + '</b> / ' + (unk ? '???' : t) + '</p>';
  if (tab === 'planets') {
    const ks = Object.keys(G.PTYPES); h += head(Object.keys(S.codex.planet).length, ks.length) + '<div class="grid">';
    for (const k of ks) { const pt = G.PTYPES[k], seen = S.codex.planet[k]; h += '<div class="card cx' + (seen ? '' : ' unk') + '"><i class="orb" style="background:radial-gradient(circle at 35% 30%,' + (seen ? pt.pal[4] + ',' + pt.pal[2] + ' 45%,' + pt.pal[0] : '#333,#111') + ')"></i><b>' + (seen ? pt.n : '? ? ?') + '</b><span class="dim">' + (seen ? 'Base habitability ' + pt.hab + '%' : 'Undiscovered') + '</span></div>'; }
    h += '</div><h4>PLANET TRAITS</h4><div class="grid">'; for (const k in G.TRAITS) { const seen = S.codex.trait[k]; h += '<div class="card cx' + (seen ? '' : ' unk') + '"><b>' + (seen ? G.TRAITS[k].n : '? ? ?') + '</b><span class="dim">' + (seen ? G.TRAITS[k].d : '') + '</span></div>'; } h += '</div>';
  } else if (tab === 'stars') {
    const ks = Object.keys(G.STARS); h += head(Object.keys(S.codex.star).length, ks.length) + '<div class="grid">';
    for (const k of ks) { const s = G.STARS[k], seen = S.codex.star[k]; h += '<div class="card cx' + (seen ? '' : ' unk') + '"><i class="orb" style="background:' + (seen ? s.c : '#222') + ';box-shadow:0 0 18px ' + (seen ? s.c : '#000') + '"></i><b>' + (seen ? s.n : '? ? ?') + '</b><span class="dim">' + (seen ? 'Solar output ×' + s.e : 'Undiscovered') + '</span></div>'; }
    h += '</div>';
  } else if (tab === 'species') {
    const ks = Object.keys(S.codex.species); h += head(ks.length, 0, true) + (ks.length ? '<div class="grid">' + ks.map(k => { const civ = G.civById(k); const live = civ && S.civs[k]; return '<div class="card cx">' + (live ? '<canvas data-civ="' + k + '" width="90" height="90"></canvas>' : '<i class="orb" style="background:hsl(' + S.codex.species[k].hue + ',70%,50%)"></i>') + '<b>' + esc(S.codex.species[k].n) + '</b><span class="dim">' + S.codex.species[k].body + '</span></div>'; }).join('') + '</div>' : '<p class="empty">No species catalogued. Every universe has different ones.</p>');
  } else if (tab === 'enemies') {
    const ks = Object.keys(G.ENEMY).filter(k => !G.ENEMY[k].isDrone); h += head(Object.keys(S.codex.enemy).length, ks.length) + '<div class="grid">';
    for (const k of ks) { const e = G.ENEMY[k], seen = S.codex.enemy[k]; h += '<div class="card cx' + (seen ? '' : ' unk') + '">' + (seen ? '<canvas data-ship="' + e.shape + '" data-col="' + e.col + '" width="64" height="64"></canvas>' : '<i class="orb" style="background:#181818"></i>') + '<b>' + (seen ? e.n : '? ? ?') + '</b><span class="dim">' + (seen ? G.FACTIONS[e.fac].n + ' · ' + e.w + (e.sh ? ' · shields' : '') + (e.arm >= 0.3 ? ' · armored' : '') + (e.fast ? ' · fast' : '') + (e.large ? ' · large' : '') + (e.boss ? ' · BOSS' : '') : 'Not yet encountered') + '</span></div>'; }
    h += '</div>';
  } else if (tab === 'res') {
    h += head(Object.keys(S.codex.res).length, G.RES_ORDER.length);
    for (const tier of ['common', 'uncommon', 'rare', 'legendary', 'mythic', 'refined', 'advanced', 'exotic']) {
      h += '<h4>' + G.TIER_NAME[tier].toUpperCase() + '</h4><table class="tbl">';
      for (const id of G.RES_ORDER) { const r = G.RES[id]; if (r.t !== tier) continue; const seen = S.codex.res[id]; h += '<tr><td>' + (seen ? rname(id) : '<span class="dim">? ? ?</span>') + '</td><td class="r">' + (seen ? fmt(G.get(id)) : '') + '</td><td class="r">' + (seen && G.rates[id] ? '<span class="' + (G.rates[id] < 0 ? 'bad' : 'good') + '">' + G.fmtRate(G.rates[id]) + '</span>' : '') + '</td><td class="r dim">' + (seen && r.minL ? 'found from danger ' + r.minL : '') + '</td></tr>'; }
      h += '</table>';
    }
  } else if (tab === 'arti') {
    h += head(S.arti.length, G.ARTI_LIST.length) + '<div class="grid">';
    for (const a of G.ARTI_LIST) { const seen = S.arti.includes(a.id); h += '<div class="card cx' + (seen ? '' : ' unk') + '" style="--bc:' + G.RAR_COL[a.rar] + '"><em style="color:' + G.RAR_COL[a.rar] + '">' + G.RAR_NAME[a.rar] + '</em><b>' + (seen ? esc(a.n) : '? ? ?') + '</b><span class="dim">' + (seen ? a.d : '') + '</span></div>'; }
    h += '</div>';
  } else if (tab === 'events') {
    h += head(Object.keys(S.codex.event).length, G.EVENTS.length) + '<div class="grid">';
    for (const e of G.EVENTS) { const seen = S.codex.event[e.id]; h += '<div class="card cx' + (seen ? '' : ' unk') + '"><b>' + (seen ? esc(e.title) : '? ? ?') + '</b></div>'; }
    h += '</div>';
  } else {
    h += head(Object.keys(S.ach).length, G.ACH.length) + '<div class="grid">';
    for (const a of G.ACH) { const got = S.ach[a.id]; h += '<div class="card cx' + (got ? ' got' : ' unk') + '"><b>' + (got ? '★ ' : '') + '"' + esc(a.n) + '"</b><span class="dim">' + esc(a.d) + '</span></div>'; }
    h += '</div>';
  }
  return { title: 'CODEX', html: h };
};

PANELS.empire = function () {
  const S = G.S, s = S.stats, tab = curTab('empire', 'over');
  let h = tabsHTML('empire', [['over', 'Overview'], ['res', 'Stockpile'], ['log', 'Log']]);
  if (tab === 'over') {
    const L = G.civLevel(), sc = G.score();
    h += '<div class="biglvl"><span>CIVILISATION LEVEL</span><b>' + L + '</b>' + bar((sc - L * L) / ((L + 1) * (L + 1) - L * L), '#ffd76a') + '</div>';
    h += '<div class="statgrid">' + kv('Colonies', G.colonyCount()) + kv('Population', fmt((G.totalPop || 0) * 1e6)) + kv('Systems visited', fmt(Object.keys(S.visited).length)) + kv('Deepest danger level', s.maxLevel) + kv('Technologies', Object.keys(S.tech).length) + kv('Megastructure stages', G.megaCount || 0) + kv('Fleet command', G.fleetUsed() + ' / ' + G.fleetCap()) + kv('Artifacts', S.arti.length + ' / ' + G.ARTI_LIST.length) + kv('Companions', Object.keys(S.comp).length + ' / ' + G.COMP_LIST.length) + kv('Hostiles destroyed', fmt(s.kills)) + kv('Bosses killed', s.bossKills) + kv('Deaths', s.deaths) + kv('Jumps', fmt(s.jumps)) + kv('Ore mined by hand', fmt(s.mined)) + kv('Raids repelled / lost', s.raidsWon + ' / ' + s.raidsLost) + kv('Time played', G.fmtT(s.play)) + kv('Universe', '#' + S.uni.n) + kv('Ascensions', S.asc.count) + '</div>';
    if (S.uni.mods.length) h += '<h4>THIS UNIVERSE</h4>' + S.uni.mods.map(m => '<div class="trait"><b>' + G.UMOD[m].n + '</b><span>' + G.UMOD[m].d + '</span></div>').join('');
    // sectors
    const sec = {}; for (const pid in S.colonies) { const c = S.colonies[pid], p = G.parseId(c.sys), k = G.sectorName(p[0], p[1]); const e = sec[k] = sec[k] || { sys: {}, n: 0, pop: 0 }; e.sys[c.sys] = 1; e.n++; e.pop += c.pop; }
    const sk = Object.keys(sec); if (sk.length) { h += '<h4>SECTORS</h4><table class="tbl"><tr><th>Sector</th><th class="r">Systems</th><th class="r">Colonies</th><th class="r">Population</th></tr>' + sk.map(k => '<tr><td><b>' + k + '</b></td><td class="r">' + Object.keys(sec[k].sys).length + '</td><td class="r">' + sec[k].n + '</td><td class="r">' + fmt(sec[k].pop * 1e6) + '</td></tr>').join('') + '</table>'; }
  } else if (tab === 'res') {
    h += '<table class="tbl"><tr><th>Resource</th><th class="r">Stock</th><th class="r">Net / s</th></tr>';
    for (const id of G.RES_ORDER) { if (!S.codex.res[id] && G.get(id) < 1 && id !== 'energy') continue; const r = G.rates[id] || 0; h += '<tr><td>' + rname(id) + ' <span class="dim">' + G.TIER_NAME[G.RES[id].t] + '</span></td><td class="r">' + fmt(G.get(id)) + '</td><td class="r ' + (r < 0 ? 'bad' : r > 0 ? 'good' : 'dim') + '">' + (r ? G.fmtRate(r) : '—') + '</td></tr>'; }
    h += '</table>';
  } else h += '<div class="logbox">' + S.log.slice().reverse().map(l => '<div class="' + l.c + '"><span class="dim">' + G.fmtT(l.t) + '</span> ' + esc(l.m) + '</div>').join('') + '</div>';
  return { title: 'EMPIRE', html: h };
};

PANELS.asc = function () {
  const S = G.S, L = G.civLevel(), gain = G.apGain();
  let h = '<div class="cols"><div class="card grow"><h3>ASCENSION</h3><p>Let this civilisation go. Colonies, fleets, technology and stockpiles are lost; your codex, achievements, companions and perks are not. You begin again in a new galaxy of the same universe, stronger.</p>' + kv('Civilisation level', L + ' <span class="dim">(30 needed)</span>') + kv('Ascension points now', '<b class="epic">' + fmt(gain) + '</b>') + kv('Unspent points', fmt(S.asc.pts)) + kv('Times ascended', S.asc.count);
  h += '<div class="row">' + btn('ASCEND (+' + fmt(gain) + ' points)', 'ascend', null, gain < 1 && 'Reach civilisation level 30', 'big') + '</div></div>';
  h += '<div class="card grow"><h3>NEW UNIVERSE</h3><p>Universe #' + S.uni.n + (S.uni.mods.length ? ' — ' + S.uni.mods.map(m => G.UMOD[m].n).join(', ') : ' — Ordinary') + '. Universes collected: ' + S.uni.cores + '.</p><p class="dim">Build the Aperture to leave. The next universe has its own laws, stronger enemies (×1.6 each time), and pays 50% more ascension points.</p>';
  h += '<div class="row">' + btn('CREATE NEW UNIVERSE', 'newuni', null, !G.canNewUniverse() && 'Build the Aperture first', 'big epicb') + '</div></div></div>';
  h += '<h4>PERKS — ' + fmt(S.asc.pts) + ' points to spend</h4><div class="grid">';
  for (const p of G.PERKS) { const l = S.asc.perks[p.id] || 0, c = G.perkCost(p.id); h += '<div class="card perk"><b>' + p.n + '</b> <span class="lvn">' + l + ' / ' + p.max + '</span><p class="dim">' + p.d + '</p>' + (l >= p.max ? '<span class="good">maxed</span>' : btn('Buy · ' + c + ' pt' + (c > 1 ? 's' : ''), 'perk', { id: p.id }, S.asc.pts < c)) + '</div>'; }
  h += '</div><h4>WHAT OTHER UNIVERSES CAN BE LIKE</h4><div class="grid">' + G.UMODS.map(u => '<div class="card cx' + (S.uni.mods.includes(u.id) ? ' got' : '') + '"><b>' + u.n + '</b><span class="dim">' + u.d + '</span></div>').join('') + '</div>';
  return { title: 'ASCENSION', html: h };
};

PANELS.settings = function () {
  const S = G.S;
  let h = '<div class="cols"><div class="card grow"><h3>CONTROLS</h3>' + kv('<kbd>W A S D</kbd> / arrows', 'Fly') + kv('<kbd>Shift</kbd>', 'Afterburner (uses energy)') + kv('<kbd>Space</kbd>', 'Mine nearest asteroid') + kv('<kbd>E</kbd>', 'Orbit / dock / investigate') + kv('<kbd>Q</kbd>', 'Nova burst (25 energy, 18s cooldown)') + kv('<kbd>M</kbd>', 'Galaxy map') + kv('<kbd>2</kbd>–<kbd>0</kbd>', 'Panels') + kv('Mouse wheel', 'Zoom') + kv('Click', 'Fly there, or focus a hostile') +
    '<h3>HOW NOT TO DIE</h3><p class="dim">Wild systems track your <b>signature</b>. It climbs while you linger and climbs faster while you mine. At 100% a wave finds you, and each wave is bigger than the last. Mine, then move. Your own systems and friendly territory are safe harbour. You cannot jump with hostiles close by, so run first. Dying costs your cargo and a tenth of your credits (never more than two minutes of credit income). Do not fly into the star.</p></div>';
  h += '<div class="card grow"><h3>GAME</h3><label class="chk" data-a="set" data-k="sfx"><i class="' + (S.set.sfx ? 'on' : '') + '"></i> Sound effects</label><label class="chk" data-a="set" data-k="music"><i class="' + (S.set.music ? 'on' : '') + '"></i> Ambient drone</label><label class="chk" data-a="set" data-k="shake"><i class="' + (S.set.shake ? 'on' : '') + '"></i> Screen shake</label>';
  if (G.has('probes')) h += '<label class="chk" data-a="probes"><i class="' + (S.set.probes === true ? 'on' : '') + '"></i> Von Neumann probes found colonies by themselves</label>' + PROBE_D;
  if (G.has('governor')) h += '<label class="chk" data-a="govnew"><i class="' + (S.set.govNew === true ? 'on' : '') + '"></i> Turn the AI Governor on for new probe colonies</label>' + GOVNEW_D;
  h += '<div class="row wrap">' + btn('Save now', 'save') + btn('Export save', 'export') + btn('Import save', 'import') + btn('Wipe everything', 'wipe', null, false, 'danger') + '</div><textarea id="savebox" placeholder="Exported saves appear here. Paste one and press Import."></textarea>';
  h += '<p class="dim">Universe seed ' + S.seed + ' · everything is stored in this browser only. The galaxy is generated from the seed; only your changes are saved.</p></div></div>';
  return { title: 'MENU', html: h };
};

/* ---------- actions ---------- */
UI.act = function (a, d, node) {
  const S = G.S, F = G.flight; let quiet = false;
  const say = m => { UI.msg = m || ''; };
  UI.msg = '';
  switch (a) {
    case 'open': document.body.classList.remove('navopen'); UI.toggle(d.p); return;
    case 'navtoggle': document.body.classList.toggle('navopen'); return;
    case 'interact': UI.interact(); return;
    case 'nova': F.ability(); return;
    case 'mtoggle': UI.el.mission.classList.toggle('open'); return;
    case 'mz': G.map.zoomAt(window.innerWidth / 2, window.innerHeight / 2, d.d === '1' ? 1.5 : 1 / 1.5); return;
    case 'guideintro': UI.dlg = null; UI.renderDlg(); UI.open('guide'); return;
    case 'close': UI.close(); return;
    case 'mapclose': G.map.hide(); return;
    case 'tab': UI.tab[d.p] = d.t; UI.refresh(true); if (G.sfx) G.sfx('click'); return;
    case 'start': G.startGame(d.mode); return;
    case 'jump': if (G.jump(d.id)) { G.map.hide(); } else UI.mapInfo(G.sysById(d.id)); return;
    case 'ftl': if (G.pay({ iron: 30, crystal: 12 })) { S.ship.ftl = true; G.reveal(G.here()); G.log('The drive coughs, catches, and holds. You can jump.', 'epic'); } break;
    case 'upg': if (G.buyUpg(d.id)) { const st = G.shipStats(); if (d.id === 'hull') S.ship.hp = Math.min(st.hull, S.ship.hp + st.hull * 0.15); if (d.id === 'scanner') G.reveal(G.here()); } break;
    case 'refit': { const n = G.HULLS[S.ship.hullClass + 1]; if (n && G.pay(n.cost)) { S.ship.hullClass++; G.dirty = true; const st = G.shipStats(); S.ship.hp = st.hull; S.ship.sh = st.shield; while (S.ship.weapons.length < st.slots) S.ship.weapons.push(null); G.log('Refit complete: ' + n.n + '.', 'epic'); } break; }
    case 'buyw': { const w = G.WEAPONS[d.id]; if (G.pay(w.cost)) { S.ship.owned[d.id] = 1; UI.act('equip', d); return; } break; }
    case 'equip': { const st = G.shipStats(); while (S.ship.weapons.length < st.slots) S.ship.weapons.push(null); const i = S.ship.weapons.slice(0, st.slots).indexOf(null); if (i >= 0) S.ship.weapons[i] = d.id; break; }
    case 'unequip': S.ship.weapons[+d.i] = null; break;
    case 'comp': { const i = S.active.indexOf(d.id); if (i >= 0) S.active.splice(i, 1); else if (S.active.length < G.compSlots()) S.active.push(d.id); G.dirty = true; break; }
    case 'automine': S.set.autoMine = !S.set.autoMine; break;
    case 'planet': if (UI.panel) UI.go('planet', d.id); else UI.open('planet', d.id); return;
    case 'colsys': UI.go('colonies', d.id); return;
    case 'back': UI.back(); return;
    case 'dest': { if (!G.route(d.id)) { say('No charted route there yet.'); break; } S.dest = d.id; const n = G.route(d.id).length; G.log('Course set for ' + G.sysById(d.id).name + ': ' + n + ' jump' + (n > 1 ? 's' : '') + '.', 'good'); if (G.map.open) { UI.mapInfo(G.map.sel); return; } break; }
    case 'destclear': S.dest = null; if (G.map.open) { UI.mapInfo(G.map.sel); return; } break;
    case 'destjump': { const n = G.nextHop(); if (!n) break; const why = G.canJump(G.sysById(n)); if (why) UI.toast(why, 'bad'); else G.jump(n); return; }
    case 'destmap': { UI.open('map'); const n = G.nextHop(); G.map.sel = n ? G.sysById(n) : null; UI.mapInfo(G.map.sel); return; }
    case 'reserve': S.set.reserve = +d.v; break;
    case 'probes': S.set.probes = S.set.probes !== true; break;
    case 'govnew': S.set.govNew = S.set.govNew !== true; break;
    case 'pause': { const col = S.colonies[d.id]; if (!col) break; col.off = col.off || {}; if (col.off[d.b]) delete col.off[d.b]; else col.off[d.b] = 1; G.dirty = true; G.econTick(0.001); break; }
    case 'unban': { const col = S.colonies[d.id]; if (col && col.ban) delete col.ban[d.b]; break; }
    case 'demolish': {
      const col = S.colonies[d.id]; if (!col || !col.b[d.b]) break;
      if (node.dataset.sure !== '1') { node.dataset.sure = '1'; UI.hold = Date.now() + 6000; const r = G.demolishRefund(d.b, col.b[d.b]); node.textContent = 'Sure? Refund ' + Object.keys(r).map(k => G.fmt(r[k]) + ' ' + G.RES[k].n).join(', '); return; }
      G.demolish(d.id, d.b); break;
    }
    case 'abandon': {
      if (node.dataset.sure !== '1') { node.dataset.sure = '1'; UI.hold = Date.now() + 6000; const r = G.abandonRefund(d.id); node.textContent = 'Sure? Refund ' + Object.keys(r).map(k => G.fmt(r[k]) + ' ' + G.RES[k].n).join(', '); return; }
      if (G.abandonColony(d.id)) { if (F.sys) F.safe = F.isSafe(); UI.stack.length ? UI.back() : UI.open('colonies'); return; } break;
    }
    case 'colonize': { const p = G.planetById(d.id); if (G.colonize(p)) { UI.dock(); if (F.sys) F.safe = true; } break; }
    case 'build': if (!G.build(d.id, d.b)) quiet = true; break;
    case 'buildmax': case 'upgmax': if (node.dataset.sure !== '1') {
      // dry run: buy as far as possible, note the cost, then put everything back
      const res0 = Object.assign({}, S.res), col = S.colonies[d.id], lv0 = a === 'buildmax' ? col && col.b[d.b] : S.ship.up[d.id], ban0 = col && col.ban && Object.assign({}, col.ban);
      let n = 0; while (n < 100 && (a === 'buildmax' ? G.build(d.id, d.b) : G.buyUpg(d.id))) n++;
      const spent = []; for (const k in res0) if (res0[k] - (S.res[k] || 0) > 0.5) spent.push(G.fmt(res0[k] - S.res[k]) + ' ' + G.RES[k].n + ' (' + Math.round((res0[k] - S.res[k]) / res0[k] * 100) + '% of it)');
      for (const k in S.res) S.res[k] = res0[k] || 0;
      if (a === 'buildmax') { col.b[d.b] = lv0; if (ban0) col.ban = ban0; } else S.ship.up[d.id] = lv0; G.dirty = true;
      if (!n) { quiet = true; break; }
      node.dataset.sure = '1'; UI.hold = Date.now() + 6000; node.textContent = '+' + n + ' levels for ' + spent.join(', ') + (G.touch ? '. Tap again' : '. Click again');
      node.classList.add('confirm'); return;
    }
    if (a === 'upgmax') { let n = 0; while (n < 100 && G.buyUpg(d.id)) n++; if (n) { say(G.UPG[d.id].n + ' +' + n + '.'); if (d.id === 'scanner') G.reveal(G.here()); } break; }
    { let n = 0; while (n < 100 && G.build(d.id, d.b)) n++; if (n) say('Raised ' + G.BLD[d.b].n + ' by ' + n + ' level' + (n > 1 ? 's' : '') + '.'); else quiet = true; break; }
    case 'paint': if (S.cos.own[d.id]) S.cos.paint = d.id; break;
    case 'trail': if (S.cos.own[d.id]) S.cos.trail = d.id; break;
    case 'tsel': UI.techSel = d.id; break;
    case 'stock': UI.tab.empire = 'res'; UI.open('empire'); return;
    case 'auto': S.colonies[d.id].auto = !S.colonies[d.id].auto; break;
    case 'autoall': for (const pid in S.colonies) S.colonies[pid].auto = d.v === '1'; S.set.govNew = d.v === '1'; break;
    case 'colpage': UI.tab.colpage = Math.max(0, (UI.tab.colpage || 0) + (+d.d)); break;
    case 'panom': { const p = G.planetById(d.id), sys = G.sysById(p.sys); const ev = G.pickEvent('planet', sys.level); const sd = G.sd(p.sys); sd.pdone = (sd.pdone || 0) | (1 << p.idx); UI.close(); if (ev) UI.showEvent(ev, { level: sys.level, sys, planet: p }); return; }
    case 'research': if (!G.startResearch(d.id) && S.queue.length >= 6) say('The queue is full (6). Remove something from it first (tap ✕ on a queued item).'); break;
    case 'unq': S.queue.splice(+d.i, 1); break;
    case 'ship': if (!G.buyShip(d.id, +d.n)) quiet = true; else say(F.refreshEscorts() ? 'Built. They have joined your formation.' : 'Built. They will join as soon as the fighting stops.'); break;
    case 'civ': UI.arg = d.id; UI.refresh(true); return;
    case 'dip': say(G.diplo(d.id, d.k)); break;
    case 'qty': UI.qmode = 'frac'; UI.qfrac = +d.f; UI.qabs = 0; break;
    case 'tsell': { const n = sellN(d.r), cr = G.tradeSell(d.id, d.r, n); say(cr ? 'Sold ' + fmt(n) + ' ' + G.RES[d.r].n + ' for ' + fmt(cr) + ' credits.' : 'Nothing to sell.'); break; }
    case 'tbuy': { const n = G.tradeBuy(d.id, d.r, buyN(G.tradePrice(G.civById(d.id), d.r, false))); say(n ? 'Bought ' + fmt(n) + ' ' + G.RES[d.r].n + '.' : 'Not enough credits.'); break; }
    case 'ssell': { const n = sellN(d.r); if (n > 0) { const cr = n * G.RES[d.r].v * STATION_SELL(); G.add(d.r, -n); G.add('credits', cr); say('Sold ' + fmt(n) + ' for ' + fmt(cr) + ' credits.'); } break; }
    case 'sbuy': { const price = G.RES[d.r].v * 2.5, n = buyN(price); if (n > 0) { G.add('credits', -n * price); G.add(d.r, n); say('Bought ' + fmt(n) + ' ' + G.RES[d.r].n + '.'); } else say('Not enough credits.'); break; }
    case 'rig': G.buildRig(S.loc); break;
    case 'mega': G.buildMega(S.loc, d.id); G._anchorsDirty = true; break;
    case 'perk': G.buyPerk(d.id); break;
    case 'ascend': case 'newuni': {
      const nu = a === 'newuni';
      if (node.dataset.sure !== '1') { node.dataset.sure = '1'; UI.hold = Date.now() + 6000; node.textContent = nu ? (G.touch ? 'Really leave this universe? Tap again.' : 'Really leave this universe? Click again.') : (G.touch ? 'Everything resets. Tap again to confirm.' : 'Everything resets. Click again to confirm.'); return; }
      const gain = G.ascend(nu); UI.close(); UI.info(nu ? 'Universe #' + G.S.uni.n : 'Ascended', '<p class="etext">' + (nu ? 'You step through. The constants are different here.' + (G.S.uni.mods.length ? ' This universe is ' + G.S.uni.mods.map(m => '<b>' + G.UMOD[m].n + '</b> (' + G.UMOD[m].d + ')').join(', ') + '.' : '') : 'One rusty ship. Again. But you remember.') + '</p><ul class="gains"><li>+' + fmt(gain) + ' ascension points</li></ul>'); return;
    }
    case 'set': S.set[d.k] = !S.set[d.k]; if (G.audioApply) G.audioApply(); break;
    case 'save': G.save(); say('Saved.'); break;
    case 'export': UI.refresh(); UI.hold = Date.now() + 120000; $('savebox').value = G.exportSave(); $('savebox').select(); return;
    case 'import': { const v = $('savebox').value; if (v && G.importSave(v)) { G.arrive(G.here(), false); UI.close(); UI.toast('Save imported.', 'good'); } else { say('That is not a valid save.'); UI.refresh(); } return; }
    case 'wipe': if (node.dataset.sure !== '1') { node.dataset.sure = '1'; UI.hold = Date.now() + 6000; node.textContent = G.touch ? 'Really erase everything? Tap again.' : 'Really erase everything? Click again.'; return; } localStorage.removeItem(G.SAVE_KEY); location.reload(); return;
    case 'evc': { const dl = UI.dlg; dl.res = G.resolveEvent(dl.ev, +d.i, dl.ctx); UI.renderDlg(); if (G.sfx) G.sfx('click'); return; }
    case 'evok': {
      const dl = UI.dlg; UI.dlg = null; UI.renderDlg();
      if (dl && dl.res) { const ctx = dl.res.ctx; if (dl.onDone) dl.onDone(dl.res); if (ctx.fight) F.spawnWave(ctx.fight.fac, ctx.level || F.sys.level, ctx.fight.budget, ctx.fight.boss); if (ctx.wormhole) UI.wormholeJump(); if (ctx.herald) F.spawnHerald(); }
      return;
    }
  }
  if (G.sfx) G.sfx(quiet ? 'deny' : 'click');
  if (G.map.open) return;
  UI.refresh();
};

/* ---------- trade quantity ---------- */
UI.qmode = 'frac'; UI.qfrac = 0.25; UI.qabs = 0;
function qtyBar() {
  const fr = [[0.1, '10%'], [0.25, '25%'], [0.5, 'Half'], [1, 'All']];
  return '<div class="qty"><span class="dim">Amount per trade</span>' + fr.map(f => '<button class="b' + (UI.qmode === 'frac' && UI.qfrac === f[0] ? ' sel' : '') + '" data-a="qty" data-f="' + f[0] + '">' + f[1] + '</button>').join('') +
    '<span class="dim">or exactly</span><input id="qtybox" type="number" min="1" inputmode="numeric" placeholder="units" value="' + (UI.qmode === 'abs' && UI.qabs ? UI.qabs : '') + '"' + (UI.qmode === 'abs' ? ' class="sel"' : '') + '><span class="dim">' + (UI.qmode === 'abs' ? 'units of each' : 'of what you hold (buying: of what you can afford)') + '</span></div>';
}
function sellN(res) { const have = Math.floor(G.get(res)); return UI.qmode === 'abs' ? Math.min(have, UI.qabs || 0) : Math.floor(have * UI.qfrac); }
function buyN(price) { const mx = Math.floor(G.get('credits') / price); return UI.qmode === 'abs' ? Math.min(mx, UI.qabs || 0) : Math.floor(mx * UI.qfrac); }

/* ---------- the guide ---------- */
PANELS.guide = function () {
  const T = G.touch, tab = curTab('guide', 'start');
  const k = (kb, touch) => '<kbd>' + (T ? touch : kb) + '</kbd>';
  const step = (n, t, d) => '<div class="step"><i>' + n + '</i><div><b>' + t + '</b><p>' + d + '</p></div></div>';
  const sec = (t, d) => '<div class="card gsec"><h3>' + t + '</h3>' + d + '</div>';
  let h = tabsHTML('guide', [['start', 'First 15 minutes'], ['screen', 'Reading the screen'], ['colony', 'Colonies & economy'], ['fight', 'Danger & combat'], ['later', 'The long game'], ['faq', 'Questions']]);
  if (tab === 'start') {
    h += '<p class="tip">You never have to remember this. The <b>OBJECTIVE</b> box always says the next thing to do, and a <b>yellow marker</b> points at where to do it.</p>';
    h += step(1, 'Mine the belt', 'Fly with ' + (T ? 'the stick on the left' : k('W A S D') + ' or by clicking where you want to go') + '. Near an asteroid, hold ' + k('Space', 'MINE') + '. The dots on a rock show what it holds; ore goes into your <b>cargo</b> hold (40 units at first).');
    h += step(2, 'Bank it at the Waystation', 'Cargo is not yours until it is banked. Fly to the Waystation and ' + (T ? 'tap the prompt' : 'press ' + k('E')) + '. Docking banks the cargo, repairs the hull and refills energy. Banked resources appear along the top of the screen.');
    h += step(3, 'Repair the drive', 'With 30 iron and 12 crystal banked, open <b>Ship</b> and repair the FTL drive. The Ship panel is also where you spend ore on upgrades.');
    h += step(4, 'Scan planets, research Colonial Charter', 'Flying close to a planet scans it and pays research points. Open <b>Research</b>, pick <b>Colonial Charter</b> in the Society row.');
    h += step(5, 'Found a colony on Haven', 'Bank 150 iron, 40 copper and 50 crystal, fly to Haven, ' + (T ? 'tap the prompt' : 'press ' + k('E')) + ', and found the colony. From now on you can also bank and repair there.');
    h += step(6, 'Build: Mine, Solar Farm, Laboratory, Habitat', 'The colony now earns ore and research on its own, even while you are away. Upgrade buildings as you can afford them.');
    h += step(7, 'Jump somewhere', 'Open the <b>Galaxy map</b>, pick a star inside the blue ring and jump. The white SIGNAL marker is the story. Read "Danger & combat" before you linger out there.');
  } else if (tab === 'screen') {
    h += sec('Top bar', '<p>Left: where you are and its <b>danger level</b> (enemy strength; it rises with distance from home, forever). Middle: what you have <b>banked</b>, with income per second in green. Right: current research, your civilisation level and universe number.</p>');
    h += sec('Ship box', '<p><b>Hull</b>: at zero you die. <b>Shield</b>: absorbs damage first and recharges a few seconds after you stop being hit. <b>Energy</b>: spent by jumping, the afterburner and the Nova; recharges on its own. <b>Cargo</b>: unbanked ore, lost if you die. <b>Signature</b>: see Danger & combat. "Safe harbour" means nothing will come looking for you here.</p>');
    h += sec('Resource shapes', '<p>The colour tells you which resource; the shape tells you how rare it is.</p><div class="legend">' + ['common', 'uncommon', 'rare', 'legendary', 'refined', 'advanced', 'exotic'].map(t => { const id = G.RES_ORDER.find(r => G.RES[r].t === t); return '<span>' + ri(id) + G.TIER_NAME[t] + '</span>'; }).join('') + '</div><p class="dim">Every cost in the game names the resource next to the number. Red means you do not have enough banked.</p>');
    h += sec('Controls', kv(T ? 'Left stick' : '<kbd>W A S D</kbd> / arrows / click', 'Fly') + kv(k('Space', 'MINE') + ' hold', 'Mine the nearest rock') + kv(k('E', 'tap the prompt'), 'Orbit, dock, investigate') + kv(k('Shift', 'BOOST') + ' hold', 'Afterburner, burns energy') + kv(k('Q', 'NOVA'), 'Area blast: 25 energy, 18s cooldown') + kv(T ? 'Pinch' : 'Mouse wheel', 'Zoom') + kv(T ? 'Tap a hostile' : 'Click a hostile', 'Focus fire on it') + (T ? kv('<kbd>MENU</kbd>', 'All panels') : kv('<kbd>M</kbd> <kbd>2</kbd>–<kbd>0</kbd> <kbd>H</kbd>', 'Map, panels, this guide')));
  } else if (tab === 'colony') {
    h += sec('What a colony needs', '<p><b>Slots</b>: each kind of building takes one slot; levels are unlimited. Bigger planets and moons mean more slots. Changed your mind? <b>Demolish</b> a building to free its slot and get half of what you spent on it back, or <b>Pause</b> it to stop it using energy, workers and inputs.</p><p><b>Converters</b> (Smelter, Fabricator, Refinery…) turn one resource into another. They never empty a stock: they keep a reserve (1 minute of income by default; change it at the top of the Colonies screen). If a resource is falling, the Colonies screen lists which converters are eating it.</p><p><b>AI Governor</b> (optional, per colony): fixes energy first, then housing, then extraction and research, and only adds converters when the inputs have spare supply. It never rebuilds something you demolished.</p><p><b>Workers</b>: every building level needs 1M population. If "Workforce" is under 100%, build Habitats (or wait: population grows toward its housing cap, faster on habitable worlds).</p><p><b>Energy</b>: most buildings draw energy; Solar Farms make it. If the empire-wide energy store hits zero, everything slows. The warning appears top-centre.</p><p><b>Travelling</b>: to reach a far system (one of your colonies, say), press <b>Set course</b> in the Colonies screen or <b>Set as destination</b> on the galaxy map. The route appears on the map and under your location; ' + (T ? 'tap it' : 'press ' + k('J', '') + ' or click it') + ' to jump to the next stop.</p><p><b>Richness</b>: the stars beside each resource. A Mine on a ★★★★ iron world makes four times what it does on ★.</p>');
    h += sec('Which worlds to settle', '<p>Distance from home does not matter: a far colony costs and produces the same as a near one. What matters is the planet. Each colony makes the next pod 10% dearer and draws a little more raider attention, so a colony with no buildings is a cost. Pick worlds with resources you need, good habitability and plenty of slots, and build on them. The planet screen sums this up under "Is it worth it?".</p><p>A colony you regret can be abandoned from its screen: you get back half a pod and the next pod gets cheaper again.</p>');
    h += sec('Production chains', '<p>Raw ore is turned into better materials by Industry buildings, and those feed the next tier:</p><p class="chain">Iron → Steel → Advanced Alloy → Nanomaterial → Quantum Material</p><p class="chain">Hydrogen → Fusion Fuel → Antimatter → Exotic Energy</p><p class="chain">Crystal → Refined Crystal → Quantum Crystal → Neural Crystal</p><p>A converter only runs if its inputs are in stock. If a number on the top bar is red and negative, something is eating that resource faster than you make it: build more of whatever produces it.</p>');
    h += sec('Automation', '<p>Research in the Industry branch removes the chores: <b>Mining Drones</b> mine beside you, <b>Mining Rigs</b> (Megastructures panel) farm a belt forever, <b>Quantum Uplink</b> banks cargo instantly, <b>AI Governors</b> build colonies for you, and <b>Von Neumann Probes</b> found new ones.</p><p>Colonies keep producing while the game is closed, at reduced efficiency, for up to 12 hours.</p>');
  } else if (tab === 'fight') {
    h += sec('Signature: why you cannot sit still', '<p>In any system that is not yours or a friend\'s, a <b>Signature</b> meter fills while you are there, and twice as fast while you mine. At 100% a wave of whatever lives there finds you, and each wave is bigger than the last; every fifth brings a boss. Mine, then move. Destroying a system\'s pirate base slows it to a third.</p><p>You cannot jump while hostiles are close. Outrun them first (the afterburner helps).</p>');
    h += sec('Fighting', '<p>Your weapons fire by themselves at the nearest hostile in range. <b>You fly.</b> Plasma bolts are slow: sidestep them. Missiles turn slowly: outrun them or fit Point Defense. Keep big ships at the edge of your range. The Nova hits everything around you and deletes incoming shots.</p><div class="counter">Lasers ▸ shields · Plasma ▸ armor · Missiles ▸ slow ships · Drones ▸ large ships · Point defense ▸ missiles and drones · Railguns ▸ a bit of everything</div><p>Enemy types are listed in the Codex once met, with what they carry.</p>');
    h += sec('Repairs', '<p>Shields recharge by themselves a few seconds after the last hit. Hull does not, except: <b>docking</b> at a colony or station repairs it fully at once; in a <b>safe harbour</b> (your home, a system with your colony, friendly territory) it repairs fast once no enemies are around; anywhere else it repairs slowly (about 2 minutes from empty) after 10 seconds with no enemies around.</p>');
    h += sec('Dying', '<p>You lose the cargo in your hold and a repair fee: 10% of your credits, but never more than two minutes of your credit income. Banked resources, colonies and upgrades are untouched. You wake up at home with half a hull.</p>');
    h += sec('The Silence', '<p>The Signal story ends at <b>the Herald</b>, a powerful boss that waits until you are ready (the map marks it). Killing it wakes <b>the Silence</b>; nothing else does. ' + SILENCE_D() + '</p><p>The top of the screen counts down to the next colony it will reach, each colony screen shows its own countdown, and the log warns you 5 minutes before. The Colonies screen has a button to set course to its centre.</p>');
    h += sec('Raids', '<p>You do not have to be everywhere. Every few minutes raiders pick <b>one random colony</b> and you get an 80 second warning in the log and at the top of the screen. Then one of three things happens:</p><ul><li><b>You are in that system</b> when it lands: you fight the raiders yourself. Win and you get a bounty.</li><li><b>You are elsewhere</b> and the colony\'s <b>defence</b> is at least the raid\'s strength (±20% luck): it wins on its own, and you get salvage.</li><li><b>You are elsewhere and defence is too low</b>: the colony loses up to 2 building levels, 30% of its population and a little stock (never more than two minutes of income). It is a setback, not a loss of the colony.</li></ul><p><b>Defence</b> comes from Defense buildings (Missile Platform, Shield Generator, Orbital Defense Grid; research them in Military), and grows with the system\'s danger level and some research. Every colony screen shows its defence <b>vs raids ~N</b>: green holds every raid, yellow is a coin flip, red loses. It also says how many Missile Platform levels it needs. The Colonies list flags colonies that would lose.</p><p><b>Raid strength</b> grows with the danger level of the colony\'s system, the number of colonies and megastructures you own, and every raid you repel. Deep, dangerous systems need much stronger defences, so settle them only when you can protect them, or accept the odd raid.</p><p>Raids never happen while the game is closed.</p>');
  } else if (tab === 'later') {
    h += sec('Fleet', '<p>Research Fleet Doctrine, build a Shipyard, then buy warships in the Fleet panel. They fly with you and fight on their own. Ships destroyed in battle are gone for good.</p>');
    h += sec('Other civilisations', '<p>Coloured haze on the map is someone\'s territory. Each has a personality and one quirk that changes how they see you. Trade with them, sign pacts for income and research, ally with them, or conquer them by destroying the Citadel in their capital.</p>');
    h += sec('Megastructures', '<p>Built in the system you are standing in, if you have a colony there. Stations, elevators and forges boost one system; a Dyson structure, built in seven stages around the star, boosts everything. They also make you conspicuous: raids scale with them.</p>');
    h += sec('Collections', '<p><b>Artifacts</b> give permanent bonuses and come from ruins, vaults and bosses. <b>Companions</b> are creatures that adopt your ship; active ones give a bonus and level up. <b>Paints and trails</b> for the ship are earned by milestones. The Codex tracks all of it.</p>');
    h += sec('Ascension and new universes', '<p>At civilisation level 30 you may ascend: start over in a fresh galaxy with <b>ascension points</b> to spend on permanent perks. Much later, a structure called the Aperture lets you leave for a new universe with different laws. Collections and perks always come with you.</p>');
  } else {
    const q = (a, b) => '<div class="card gsec"><b>' + a + '</b><p>' + b + '</p></div>';
    h += q('I mined ore but the top bar shows nothing.', 'It is still in your cargo hold. Dock at the Waystation or a colony to bank it.') +
      q('The mining beam stopped.', 'Cargo is full (the prompt says so). Bank it. Cargo Hold upgrades and the Cargo Compression tech help.') +
      q('A button is greyed out.', 'Either a cost is unaffordable (shown in red) or there is a reason printed under it, such as "No free slots".') +
      q('I cannot jump.', 'The map says why under the Jump button: out of range (upgrade the FTL Drive), not enough energy (wait a few seconds), or hostiles too close (run first).') +
      q('My colony makes almost nothing.', 'Check Workforce in the colony screen. Under 100% means too few people: build Habitats. Then check the energy warning.') +
      q('Enemies are too strong.', 'Danger rises with distance from home. Come back closer, buy Hull, Shield and Weapon upgrades, refit to a bigger hull, and mount a second weapon.') +
      q('Can I sell things?', 'Yes: any station, and any civilisation you are not at war with. Choose the amount at the top of the trade list: a percentage, all of it, or an exact number.') +
      q('Does the ship ever look better?', 'Yes. Seven hull classes, each a different ship, plus paint and engine trails. See Ship → Hulls & Paint.') +
      q('Is there an end?', 'There is a story with an ending. After it there are other universes. Enemy levels, research and universes do not run out.');
  }
  return { title: 'GUIDE', html: h };
};
