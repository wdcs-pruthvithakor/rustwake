'use strict';
/* Rustwake — the galaxy map: pan, zoom from one system out to the whole explored galaxy. */

const MP = G.map = { open: false, cv: null, ctx: null, x: 50, y: 50, zoom: 1.6, sel: null, hover: null, drag: null, moved: 0 };

MP.zoomAt = function (px, py, f) {
  const W = window.innerWidth, H = window.innerHeight;
  const wx = MP.x + (px - W / 2) / MP.zoom, wy = MP.y + (py - H / 2) / MP.zoom;
  MP.zoom = G.clamp(MP.zoom * f, 0.04, 5);
  MP.x = wx - (px - W / 2) / MP.zoom; MP.y = wy - (py - H / 2) / MP.zoom;
};
MP.init = function (cv) {
  MP.cv = cv; MP.ctx = cv.getContext('2d');
  const pts = new Map(); let pinch = 0;
  const spread = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
  cv.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); cv.setPointerCapture(e.pointerId);
    if (pts.size === 1) { MP.drag = { x: e.clientX, y: e.clientY, ox: MP.x, oy: MP.y }; MP.moved = 0; }
    else { MP.drag = null; MP.moved = 99; pinch = spread(); }
  });
  cv.addEventListener('pointermove', e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const d = spread(), a = [...pts.values()]; if (pinch > 0) MP.zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, d / pinch); pinch = d; return; }
    if (MP.drag) { const dx = e.clientX - MP.drag.x, dy = e.clientY - MP.drag.y; MP.moved = Math.max(MP.moved, Math.abs(dx) + Math.abs(dy)); MP.x = MP.drag.ox - dx / MP.zoom; MP.y = MP.drag.oy - dy / MP.zoom; }
    MP.hover = MP.pick(e.clientX, e.clientY);
    cv.style.cursor = MP.hover ? 'pointer' : MP.drag ? 'grabbing' : 'grab';
  });
  const up = e => {
    if (pts.size === 1 && MP.drag && MP.moved < 10) { const s = MP.pick(e.clientX, e.clientY); MP.sel = s; G.ui.mapInfo(s); if (s && G.sfx) G.sfx('click'); }
    pts.delete(e.pointerId); MP.drag = null; pinch = 0;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { pts.delete(e.pointerId); MP.drag = null; });
  cv.addEventListener('wheel', e => { e.preventDefault(); MP.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
};
MP.show = function () {
  const h = G.here(); MP.open = true; MP.x = h.x; MP.y = h.y; MP.sel = null;
  MP.zoom = G.clamp(Math.min(window.innerWidth, window.innerHeight) / (G.shipStats().jump * 3.2), 0.5, 3);
  MP.cv.parentElement.classList.add('on'); G.ui.mapInfo(null);
};
MP.hide = function () { MP.open = false; MP.cv.parentElement.classList.remove('on'); };
MP.pick = function (px, py) {
  const W = window.innerWidth, H = window.innerHeight;
  const wx = MP.x + (px - W / 2) / MP.zoom, wy = MP.y + (py - H / 2) / MP.zoom, rad = (G.touch ? 30 : 16) / MP.zoom;
  let best = null, bd = rad;
  for (const s of G.systemsNear(wx, wy, Math.min(rad, 140))) { if (!G.S.known[s.id]) continue; const d = Math.hypot(s.x - wx, s.y - wy); if (d < bd) { bd = d; best = s; } }
  return best;
};
const SPECIAL_ICON = { anomaly: ['◆', '#ff8cf0'], derelict: ['▰', '#c8c0b0'], station: ['⬡', '#8ad4ff'], capital: ['★', '#ffd76a'], pirate: ['▲', '#ff5c5c'], ruins: ['▣', '#ffe08a'], wormhole: ['◎', '#b89bff'], lair: ['☠', '#ff9a4a'], nest: ['✺', '#b4ff6a'], home: ['⌂', '#7dffb0'] };
MP.SPECIAL_ICON = SPECIAL_ICON;

MP.draw = function () {
  const cv = MP.cv, ctx = MP.ctx, dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
  if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const S = G.S, z = MP.zoom, t = S.t, TAU = G.TAU;
  const X = x => (x - MP.x) * z + W / 2, Y = y => (y - MP.y) * z + H / 2;
  ctx.fillStyle = '#03040a'; ctx.fillRect(0, 0, W, H);
  { // a soft band of galactic light, fixed in space
    const gx = X(0) * 0.25 + W * 0.375, gy = Y(0) * 0.25 + H * 0.375, gr = Math.max(W, H) * 0.9; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, 'rgba(70,60,130,0.22)'); g.addColorStop(0.4, 'rgba(30,50,110,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // faint dust so empty space is not flat
  const rngD = G.RNG(7); ctx.fillStyle = 'rgba(160,180,255,0.25)';
  for (let i = 0; i < 260; i++) { const px = ((rngD.f() * 4000 - MP.x * 0.15 * z) % W + W) % W, py = ((rngD.f() * 4000 - MP.y * 0.15 * z) % H + H) % H; ctx.fillRect(px, py, 1, 1); }
  const here = G.here(), st = G.shipStats();
  const x0 = MP.x - W / 2 / z, x1 = MP.x + W / 2 / z, y0 = MP.y - H / 2 / z, y1 = MP.y + H / 2 / z;
  const c0x = Math.floor(x0 / G.CELL), c1x = Math.floor(x1 / G.CELL), c0y = Math.floor(y0 / G.CELL), c1y = Math.floor(y1 / G.CELL);
  // sector grid
  if (z > 0.12) {
    ctx.strokeStyle = 'rgba(110,140,220,0.09)'; ctx.lineWidth = 1; const g = G.CELL * G.REGION;
    for (let gx = Math.floor(x0 / g) * g; gx <= x1; gx += g) { ctx.beginPath(); ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), H); ctx.stroke(); }
    for (let gy = Math.floor(y0 / g) * g; gy <= y1; gy += g) { ctx.beginPath(); ctx.moveTo(0, Y(gy)); ctx.lineTo(W, Y(gy)); ctx.stroke(); }
    if (z > 0.3) { ctx.font = '500 11px "DM Mono", monospace'; ctx.fillStyle = 'rgba(140,170,240,0.35)'; ctx.textAlign = 'left'; for (let gx = Math.floor(x0 / g) * g; gx <= x1; gx += g) for (let gy = Math.floor(y0 / g) * g; gy <= y1; gy += g) ctx.fillText(G.sectorName(gx / G.CELL, gy / G.CELL).toUpperCase(), X(gx) + 8, Y(gy) + 16); }
  }
  // alien territory
  const r0x = Math.floor(c0x / G.REGION) - 1, r1x = Math.floor(c1x / G.REGION) + 1, r0y = Math.floor(c0y / G.REGION) - 1, r1y = Math.floor(c1y / G.REGION) + 1;
  if ((r1x - r0x) * (r1y - r0y) < 2500) for (let rx = r0x; rx <= r1x; rx++) for (let ry = r0y; ry <= r1y; ry++) {
    const civ = G.civOfRegion(rx, ry); if (!civ) continue; const cs = S.civs[civ.id]; if (!cs || !cs.met) continue;
    const cx = X((civ.cap.cx + 0.5) * G.CELL), cy = Y((civ.cap.cy + 0.5) * G.CELL), rr = (civ.rad + 0.6) * G.CELL * z;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr); const a = cs.dead ? 0.05 : 0.2;
    g.addColorStop(0, 'hsla(' + civ.hue + ',80%,60%,' + a + ')'); g.addColorStop(0.8, 'hsla(' + civ.hue + ',80%,60%,' + a * 0.6 + ')'); g.addColorStop(1, 'hsla(' + civ.hue + ',80%,60%,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    if (z > 0.35) { ctx.font = '500 12px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'hsla(' + civ.hue + ',80%,75%,0.9)'; ctx.fillText(civ.name.toUpperCase() + (cs.war ? ' — AT WAR' : cs.vassal ? ' — VASSAL' : ''), cx, cy - rr * 0.75); }
  }
  // your territory glows
  ctx.globalCompositeOperation = 'lighter';
  const seen = {};
  for (const pid in S.colonies) { const sid = S.colonies[pid].sys; if (seen[sid]) continue; seen[sid] = 1; const sy = G.sysById(sid); if (!sy) continue; const px = X(sy.x), py = Y(sy.y); if (px < -200 || py < -200 || px > W + 200 || py > H + 200) continue; const rr = Math.max(14, 70 * z); const g = ctx.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(90,255,160,0.28)'); g.addColorStop(1, 'rgba(90,255,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  // ranges
  const hx = X(here.x), hy = Y(here.y);
  ctx.setLineDash([5, 7]); ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(184,155,255,0.35)'; ctx.beginPath(); ctx.arc(hx, hy, st.scan * z, 0, TAU); ctx.stroke();
  if (S.ship.ftl) { ctx.strokeStyle = 'rgba(110,231,255,0.7)'; ctx.lineDashOffset = -t * 6; ctx.beginPath(); ctx.arc(hx, hy, st.jump * z, 0, TAU); ctx.stroke(); }
  ctx.setLineDash([]);
  // stars
  const drawSys = s => {
    const px = X(s.x), py = Y(s.y); if (px < -30 || py < -30 || px > W + 30 || py > H + 30) return;
    const vis = S.visited[s.id], erased = G.isErased(s.cx, s.cy);
    const base = G.clamp((s.star.r / 180) * 3.6 * Math.sqrt(z), 1.6, 10);
    if (erased) { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, base, 0, TAU); ctx.stroke(); return; }
    const col = s.cls === 'BH' ? '#ff9a4a' : s.star.c, c = G.rgb(col);
    if (z > 0.25) { const g = ctx.createRadialGradient(px, py, 0, px, py, base * 4); g.addColorStop(0, G.rgba(c, vis ? 0.7 : 0.45)); g.addColorStop(1, G.rgba(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, base * 4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = vis ? col : G.rgba(c, 0.85); ctx.beginPath(); ctx.arc(px, py, base, 0, TAU); ctx.fill();
    if (z < 0.5) return;
    if (seen[s.id]) { ctx.strokeStyle = '#7dffb0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(px, py, base + 5, 0, TAU); ctx.stroke(); }
    else if (vis) { ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, base + 4, 0, TAU); ctx.stroke(); }
    const sdd = S.sd[s.id];
    if (sdd && sdd.mega) { ctx.strokeStyle = '#ff9af0'; ctx.lineWidth = 1.2; ctx.strokeRect(px - base - 8, py - base - 8, (base + 8) * 2, (base + 8) * 2); }
    if ((vis || G.has('survey')) && s.special !== 'none' && z > 0.8) {
      const ic = SPECIAL_ICON[s.special], done = sdd && (sdd.done || sdd.cleared);
      if (ic && !done) { ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = ic[1]; ctx.fillText(ic[0], px + base + 9, py - base - 2); }
    }
    if (z > 1.1) { ctx.font = '400 10px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = vis ? 'rgba(220,230,255,0.75)' : 'rgba(220,230,255,0.35)'; ctx.fillText(s.name + ' · ' + s.level, px, py + base + 14); }
  };
  const cells = (c1x - c0x + 1) * (c1y - c0y + 1);
  if (cells < 30000) { for (let cx = c0x; cx <= c1x; cx++) for (let cy = c0y; cy <= c1y; cy++) { if (!S.known[cx + ',' + cy]) continue; const s = G.sysAt(cx, cy); if (s) drawSys(s); } }
  else for (const id in S.known) { const s = G.sysById(id); if (s) drawSys(s); }
  // the Silence
  const si = S.silence;
  if (si.on) {
    const cx = X((si.cx + 0.5) * G.CELL), cy = Y((si.cy + 0.5) * G.CELL), rr = si.r * G.CELL * z;
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(t * 2)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.arc(cx, cy, rr + k * 9, 0, TAU); ctx.stroke(); }
    if (rr > 40) { ctx.font = '500 12px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('T H E   S I L E N C E', cx, cy); }
    for (const a of G.anchorList()) { const ax = X((a[0] + 0.5) * G.CELL), ay = Y((a[1] + 0.5) * G.CELL); ctx.strokeStyle = 'rgba(255,215,106,0.6)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(ax, ay, 8 * G.CELL * z, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  }
  // story marker
  const sig = G.signalTarget();
  if (sig) {
    const px = X(sig.x), py = Y(sig.y), q = (t * 0.7) % 1;
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - q) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 6 + q * 26, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
    ctx.font = '500 11px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('SIGNAL', px, py - 16);
    if (px < 0 || py < 0 || px > W || py > H) { const a = Math.atan2(py - H / 2, px - W / 2); ctx.save(); ctx.translate(W / 2 + Math.cos(a) * (W / 2 - 60), H / 2 + Math.sin(a) * (H / 2 - 60)); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, 9); ctx.lineTo(-8, -9); ctx.fill(); ctx.restore(); }
  }
  // you are here
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; const pr = 10 + 2 * Math.sin(t * 4);
  ctx.beginPath(); ctx.arc(hx, hy, pr, 0, TAU); ctx.stroke();
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * (pr + 3), hy + Math.sin(a) * (pr + 3)); ctx.lineTo(hx + Math.cos(a) * (pr + 9), hy + Math.sin(a) * (pr + 9)); ctx.stroke(); }
  // selection / hover
  for (const s of [MP.hover, MP.sel]) {
    if (!s) continue; const px = X(s.x), py = Y(s.y);
    ctx.strokeStyle = s === MP.sel ? '#ffd76a' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 13, 0, TAU); ctx.stroke();
    if (s === MP.sel && s.id !== S.loc) { const ok = !G.canJump(s); ctx.strokeStyle = ok ? 'rgba(110,231,255,0.8)' : 'rgba(255,110,110,0.5)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]); }
  }
};
