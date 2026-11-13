'use strict';
/* Rustwake — tiny synthesised sound. No audio files. */
(function () {
  let ac = null, master = null, pad = null; const last = {};
  G.audioStart = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    // ambient: two detuned low sines through a slow filter sweep
    pad = ac.createGain(); pad.gain.value = 0; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    for (const hz of [55, 82.6, 110.4, 164.2]) { const o = ac.createOscillator(); o.type = hz < 100 ? 'sine' : 'triangle'; o.frequency.value = hz; const g = ac.createGain(); g.gain.value = hz < 100 ? 0.5 : 0.12; o.connect(g); g.connect(f); o.start(); }
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.05; lg.gain.value = 220; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    f.connect(pad); pad.connect(master);
    G.audioApply();
  };
  G.audioApply = function () { if (!ac || !G.S) return; pad.gain.setTargetAtTime(G.S.set.music ? 0.16 : 0, ac.currentTime, 0.8); };
  function tone(type, f0, f1, dur, vol, delay) {
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, cutoff) {
    const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; const g = ac.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  const GAP = { laser: 0.07, mine: 0.12, plasma: 0.1, missile: 0.15, boom: 0.06, pick: 0.05, rail: 0.1 };
  G.sfx = function (name) {
    if (!ac || !G.S || !G.S.set.sfx) return;
    const now = ac.currentTime; if (now - (last[name] || 0) < (GAP[name] || 0.03)) return; last[name] = now;
    switch (name) {
      case 'laser': tone('sawtooth', 900, 240, 0.09, 0.05); break;
      case 'plasma': tone('square', 300, 90, 0.18, 0.06); break;
      case 'missile': noise(0.25, 0.08, 1800); tone('sawtooth', 200, 420, 0.25, 0.03); break;
      case 'rail': tone('sawtooth', 1800, 80, 0.2, 0.07); noise(0.1, 0.07, 5000); break;
      case 'mine': tone('triangle', 520 + Math.random() * 60, 500, 0.12, 0.025); break;
      case 'rock': noise(0.3, 0.15, 900); break;
      case 'boom': noise(0.4, 0.22, 700); tone('sine', 140, 40, 0.35, 0.18); break;
      case 'boom2': noise(0.9, 0.3, 500); tone('sine', 110, 28, 0.8, 0.26); break;
      case 'pick': tone('sine', 880, 1320, 0.09, 0.05); break;
      case 'scan': tone('sine', 660, 990, 0.12, 0.05); tone('sine', 990, 1480, 0.14, 0.04, 0.1); break;
      case 'click': tone('triangle', 620, 500, 0.04, 0.05); break;
      case 'deny': tone('square', 160, 120, 0.1, 0.04); break;
      case 'good': tone('sine', 523, 523, 0.12, 0.06); tone('sine', 784, 784, 0.2, 0.06, 0.1); break;
      case 'tech': tone('sine', 523, 523, 0.1, 0.06); tone('sine', 659, 659, 0.1, 0.06, 0.09); tone('sine', 1046, 1046, 0.3, 0.06, 0.18); break;
      case 'epic': for (let i = 0; i < 4; i++) tone('sine', [392, 523, 659, 1046][i], [392, 523, 659, 1046][i], 0.35, 0.06, i * 0.1); break;
      case 'alarm': tone('square', 440, 440, 0.14, 0.05); tone('square', 330, 330, 0.14, 0.05, 0.18); tone('square', 440, 440, 0.14, 0.05, 0.36); break;
      case 'jump': tone('sawtooth', 80, 1600, 0.6, 0.06); noise(0.7, 0.14, 2600); break;
    }
  };
})();
