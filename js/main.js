'use strict';
/* Rustwake — boot, input and the main loop. */
(function () {
  const F = G.flight, UI = G.ui;
  const keys = {};
  G.started = false;

  // Touch devices get on-screen controls. Add ?touch=1 to the address to try them on a desktop.
  G.touch = /[?&]touch=1/.test(location.search) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  function layout() {
    UI.compact = G.touch || window.innerWidth < 900 || window.innerHeight < 560;
    document.body.classList.toggle('compact', UI.compact); document.body.classList.toggle('touch', G.touch);
    document.body.classList.toggle('short', window.innerHeight < 480);
  }
  let jx = 0, jy = 0;
  function boot() {
    layout(); window.addEventListener('resize', layout);
    G.render.init(document.getElementById('view'));
    G.map.init(document.getElementById('map'));
    UI.init();
    const saved = G.loadRaw();
    // a live system behind the title screen
    if (saved) G.adopt(saved); else { G.S = G.freshState((Math.random() * 4294967296) >>> 0); G.resetUniverse(); G.recalc(); }
    F.enter(G.here(), false);
    const tb = document.getElementById('titlebtns');
    tb.innerHTML = (saved ? '<button class="b big" data-a="start" data-mode="cont">CONTINUE</button>' : '') + '<button class="b' + (saved ? '' : ' big') + '" data-a="start" data-mode="new">NEW GAME</button>';
    document.getElementById('hud').style.display = 'none';
    bind();
    requestAnimationFrame(frame);
  }

  G.startGame = function (mode) {
    let off = null;
    if (mode === 'new') {
      const el = document.getElementById('seed'), txt = el.value.trim();
      if (G.loadRaw() && el.dataset.sure !== '1') { el.dataset.sure = '1'; el.placeholder = 'this erases your save — press NEW GAME again'; el.value = ''; return; }
      const seed = txt ? (/^\d+$/.test(txt) ? parseInt(txt, 10) >>> 0 : G.hashStr(txt)) : (Math.random() * 4294967296) >>> 0;
      G.S = G.freshState(seed); G.resetUniverse(); G.dirty = true; G.recalc();
    } else off = G.offline();
    G.started = true;
    document.getElementById('title').classList.add('off');
    document.getElementById('hud').style.display = '';
    const st = G.shipStats(); G.S.ship.hp = Math.min(G.S.ship.hp, st.hull);
    G.arrive(G.here(), false);
    G.audioStart();
    if (mode === 'new') UI.info('Adrift', '<p class="etext">The drive is dead. The hull is mostly rust held together by older rust. But the mining beam works, the Waystation still has air, and there is a belt of rock between you and the next planet out.</p><p class="etext">Start small.</p><ul class="gains"><li>WASD to fly · hold SPACE near an asteroid to mine</li><li>E at the Waystation to bank cargo</li><li>Follow the OBJECTIVE panel and the yellow marker</li></ul>'.replace('WASD to fly · hold SPACE near an asteroid to mine', G.touch ? 'Left stick to fly · hold MINE near an asteroid' : 'WASD to fly · hold SPACE near an asteroid to mine').replace('E at the Waystation to bank cargo', G.touch ? 'Tap the prompt at the Waystation to bank cargo' : 'E at the Waystation to bank cargo') + '<div class="choices"><button class="b" data-a="guideintro">Read the guide first</button></div>');
    else if (off) {
      let g = ''; for (const k in off.gain) g += '<li>+' + G.fmt(off.gain[k]) + ' ' + G.RES[k].n + '</li>';
      UI.info('While you were away', '<p class="etext">Your colonies kept working for ' + G.fmtT(off.counted) + ' at ' + Math.round(off.eff * 100) + '% efficiency. Nobody raided them; they never do when you are not looking.</p>' + (g ? '<ul class="gains">' + g + '</ul>' : ''));
    }
  };

  function bind() {
    const view = document.getElementById('view');
    const typing = () => { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT'); };
    window.addEventListener('keydown', e => {
      if (typing() || !G.started) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k)) e.preventDefault();
      if (e.repeat) { keys[k] = true; return; }
      keys[k] = true;
      G.audioStart();
      if (UI.dlg) { if (k === 'Enter' && (UI.dlg.res || UI.dlg.custom)) UI.act('evok', {}); return; }
      const P = { '2': 'ship', '3': 'colonies', '4': 'research', '5': 'fleet', '6': 'diplo', '7': 'mega', '8': 'codex', '9': 'empire', '0': 'asc' };
      if (k === 'm' || k === '1') UI.toggle('map');
      else if (k === 'h' || k === '?') UI.toggle('guide');
      else if (P[k]) UI.toggle(P[k]);
      else if (k === 'Escape') { if (UI.panel || G.map.open) UI.close(); else UI.open('settings'); }
      else if (!UI.modalOpen()) { if (k === 'e') UI.interact(); else if (k === 'q') F.ability(); }
    });
    window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    // tap or click: fly there / focus a hostile. Two fingers: pinch to zoom.
    const pts = new Map(); let pinch = 0, multi = false, moved = 0, start = null;
    const spread = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    view.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); G.audioStart();
      if (pts.size === 1) { multi = false; moved = 0; start = { x: e.clientX, y: e.clientY }; } else { multi = true; pinch = spread(); }
    });
    view.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const d = spread(); if (pinch > 0) F.cam.zoom = G.clamp(F.cam.zoom * d / pinch, 0.28, 1.9); pinch = d; }
      else if (start) moved = Math.max(moved, Math.hypot(e.clientX - start.x, e.clientY - start.y));
    });
    view.addEventListener('pointerup', e => {
      if (pts.size === 1 && !multi && moved < 14 && G.started && !UI.modalOpen()) { const c = F.cam; F.click((e.clientX - G.render.W / 2) / c.zoom + c.x, (e.clientY - G.render.H / 2) / c.zoom + c.y); }
      pts.delete(e.pointerId);
    });
    view.addEventListener('pointercancel', e => pts.delete(e.pointerId));
    // virtual stick
    const stick = document.getElementById('stick'), knob = document.getElementById('knob'); let sid = null;
    const sm = e => { if (e.pointerId !== sid) return; const r = stick.getBoundingClientRect(), R = r.width / 2 - 16; let dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2; const m = Math.hypot(dx, dy); if (m > R) { dx *= R / m; dy *= R / m; } jx = dx / R; jy = dy / R; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; };
    const se = e => { if (e.pointerId !== sid) return; sid = null; jx = jy = 0; knob.style.transform = ''; };
    stick.addEventListener('pointerdown', e => { sid = e.pointerId; stick.setPointerCapture(sid); G.audioStart(); sm(e); e.preventDefault(); });
    stick.addEventListener('pointermove', sm); stick.addEventListener('pointerup', se); stick.addEventListener('pointercancel', se);
    // hold buttons
    document.querySelectorAll('[data-hold]').forEach(b => {
      const on = e => { keys[b.dataset.hold] = true; b.classList.add('on'); b.setPointerCapture(e.pointerId); G.audioStart(); e.preventDefault(); };
      const off = () => { keys[b.dataset.hold] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
    });
    document.addEventListener('contextmenu', e => { if (G.touch) e.preventDefault(); });
    view.addEventListener('wheel', e => { e.preventDefault(); F.cam.zoom = G.clamp(F.cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.28, 1.9); }, { passive: false });
    window.addEventListener('beforeunload', () => { if (G.started) G.save(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.started) G.save(); });
  }

  let last = performance.now(), econAcc = 0, slowAcc = 0, hudAcc = 0, uiAcc = 0, saveAcc = 0;
  function frame(now) {
    const real = Math.min(3600, (now - last) / 1000); last = now;
    const dt = Math.min(real, 0.05), S = G.S;
    if (G.started) {
      S.t += dt;
      econAcc += real; if (econAcc >= 0.5) { G.econTick(econAcc); econAcc = 0; }
      slowAcc += dt; if (slowAcc >= 1) { G.slowTick(slowAcc); slowAcc = 0; }
      const inp = F.input;
      inp.x = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0);
      inp.y = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0);
      if (Math.hypot(jx, jy) > 0.22) { inp.x = jx; inp.y = jy; }
      inp.boost = !!keys.Shift; inp.mine = !!keys[' '];
      if (!UI.modalOpen()) F.update(dt);
      UI.pump();
      hudAcc += dt; if (hudAcc >= 0.2) { hudAcc = 0; UI.hud(); }
      uiAcc += dt;
      if (uiAcc >= 1) {
        uiAcc = 0; const a = document.activeElement;
        if (UI.panel && !(UI.hold > Date.now()) && !UI.pressing && !(Date.now() - (UI.scrolled || 0) < 500) && !(a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT'))) UI.refresh();
        if (G.map.open) UI.mapInfo(G.map.sel);
      }
      saveAcc += dt; if (saveAcc >= 20) { saveAcc = 0; G.save(); }
    } else { S.t += dt; }
    if (G.map.open) G.map.draw(); else G.render.draw();
    requestAnimationFrame(frame);
  }
  boot();
})();
