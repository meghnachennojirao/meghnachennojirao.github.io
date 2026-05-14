/*
 * viz.js — Per-exercise visualization engine for EEG Lab
 * Five distinct renderers:
 *   head-diagram    — interactive 10-20 electrode map
 *   frequency-scope — animated band oscilloscope (no EEG sim)
 *   eeg-single      — one large channel, full-height canvas
 *   compare-panel   — two EEG strips side by side
 *   eeg-multi       — standard 10-channel scrolling EEG
 */
(function (global) {
  'use strict';

  var SR    = 256;
  var WIN_S = 8;
  var WIN_N = SR * WIN_S;
  var CH    = ['Fp1','Fp2','F3','F4','C3','C4','T3','T4','O1','O2'];

  // ── Palette ────────────────────────────────────────────────────────────────

  function pal(dk) {
    return {
      bg:     dk ? '#101815' : '#fbfaf7',
      trace:  dk ? '#52d98a' : '#1c5233',
      traceB: dk ? '#6ab0f5' : '#1a3a8a',   // second panel colour
      grid:   dk ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)',
      lbl:    dk ? 'rgba(255,255,255,0.32)'  : 'rgba(0,0,0,0.32)',
      ink:    dk ? '#d8eddf' : '#0f1f14',
      line:   dk ? 'rgba(255,255,255,0.1)'   : 'rgba(0,0,0,0.1)',
      accent: '#3dbd72',
      warm:   '#e07030',
      cool:   '#5078d0',
      dark:   dk,
    };
  }

  // ── 10-20 electrode positions (normalised 0–1 on oval) ───────────────────

  var ELEC_POS = {
    Fp1:[0.35,0.11], Fp2:[0.65,0.11],
    F7: [0.16,0.28], F3: [0.36,0.26], Fz: [0.50,0.24], F4: [0.64,0.26], F8: [0.84,0.28],
    T3: [0.10,0.50], C3: [0.30,0.50], Cz: [0.50,0.50], C4: [0.70,0.50], T4: [0.90,0.50],
    T5: [0.17,0.73], P3: [0.35,0.72], Pz: [0.50,0.74], P4: [0.65,0.72], T6: [0.83,0.73],
    O1: [0.35,0.88], Oz: [0.50,0.90], O2: [0.65,0.88],
  };
  var ALL_ELEC = Object.keys(ELEC_POS);
  var OUR_ELEC = new Set(CH);  // the 10 we actually simulate

  // ── Frequency bands for scope ──────────────────────────────────────────────

  var BANDS = [
    { label:'δ  Delta',   sub:'< 4 Hz',    hz:2.2,  amp:55, col:'#5578e0', phase:0   },
    { label:'θ  Theta',   sub:'4 – 8 Hz',  hz:6.0,  amp:36, col:'#3dbd72', phase:0.8 },
    { label:'α  Alpha',   sub:'8 – 13 Hz', hz:10.0, amp:60, col:'#e08038', phase:1.5 },
    { label:'β  Beta',    sub:'> 13 Hz',   hz:22.0, amp:18, col:'#c050d0', phase:2.2 },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  //  VizEngine
  // ────────────────────────────────────────────────────────────────────────────

  function VizEngine(canvas, type, cfg) {
    this.cv   = canvas;
    this.ctx  = canvas.getContext('2d');
    this.type = type;
    this.cfg  = cfg || {};
    this.dark = false;

    this.running = false;
    this._raf  = null;
    this._last = null;
    this._t    = 0;

    this._simA = null;
    this._simB = null;
    this._bufA = _mkBuf();
    this._bufB = _mkBuf();
    this._prevFiredA = -1;

    // Event game state (for timing-sensitive interactions)
    this._evActive = false;
    this._evTime   = -99;
    this._evWindow = (cfg && cfg.eventWindow) || 1.5;
    this._evCb     = null;

    // Head diagram state
    this._hdHover = null;
    this._hdSel   = null;

    this._loop = this._loop.bind(this);
    this._bindInput();
  }

  function _mkBuf() {
    var b = [];
    for (var i = 0; i < 10; i++) b.push(new Float32Array(WIN_N));
    return b;
  }

  VizEngine.prototype._bindInput = function () {
    var self = this;
    this.cv.addEventListener('mousemove', function (e) {
      if (self.type === 'head-diagram') self._hdMove(e);
    });
    this.cv.addEventListener('mouseleave', function () {
      if (self.type === 'head-diagram') self._hdHover = null;
    });
    this.cv.addEventListener('click', function (e) {
      if (self.type === 'head-diagram') self._hdClick(e);
    });
    this.cv.addEventListener('touchstart', function (e) {
      if (self.type === 'head-diagram') { e.preventDefault(); self._hdClick(e.touches[0]); }
    }, { passive: false });
  };

  VizEngine.prototype.setDark  = function (d)  { this.dark = !!d; };
  VizEngine.prototype.onEvent  = function (cb) { this._evCb = cb; };

  /** preferredHeight — let app.js size the canvas correctly per type */
  VizEngine.prototype.preferredHeight = function () {
    var h = { 'eeg-multi':280, 'eeg-single':200, 'frequency-scope':268,
               'head-diagram':300, 'compare-panel':240 };
    return h[this.type] || 280;
  };

  VizEngine.prototype.attach = function (simA, simB) {
    this._simA = simA || null;
    this._simB = simB || null;
    this._bufA = _mkBuf();
    this._bufB = _mkBuf();
    this._last = null;
    this._prevFiredA = simA ? (simA._eventFiredAt || -1) : -1;
  };

  VizEngine.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._raf  = requestAnimationFrame(this._loop);
  };

  VizEngine.prototype.stop = function () {
    this.running = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  };

  // ── Main loop ──────────────────────────────────────────────────────────────

  VizEngine.prototype._loop = function (now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._loop);

    var dt = Math.min((now - (this._last || now)) / 1000, 0.08);
    this._last = now;
    this._t   += dt;
    var n = Math.max(1, Math.min(Math.round(dt * SR), SR / 8));

    if (this._simA) {
      var ndA = this._simA.generate(n);
      for (var c = 0; c < 10; c++) {
        this._bufA[c].copyWithin(0, n);
        this._bufA[c].set(ndA[c], WIN_N - n);
      }
      var fa = this._simA._eventFiredAt;
      if (fa && fa !== this._prevFiredA) {
        this._prevFiredA = fa;
        this._evActive   = true;
        this._evTime     = this._t;
        if (this._evCb) this._evCb(this._simA._lastEventName);
      }
      if (this._evActive && (this._t - this._evTime) > this._evWindow) {
        this._evActive = false;
      }
    }

    if (this._simB) {
      var ndB = this._simB.generate(n);
      for (var c2 = 0; c2 < 10; c2++) {
        this._bufB[c2].copyWithin(0, n);
        this._bufB[c2].set(ndB[c2], WIN_N - n);
      }
    }

    switch (this.type) {
      case 'eeg-multi':        this._drawMulti();     break;
      case 'eeg-single':       this._drawSingle();    break;
      case 'frequency-scope':  this._drawFreqScope(); break;
      case 'head-diagram':     this._drawHead();      break;
      case 'compare-panel':    this._drawCompare();   break;
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: eeg-multi
  // ────────────────────────────────────────────────────────────────────────────

  VizEngine.prototype._drawMulti = function () {
    var cv = this.cv, ctx = this.ctx;
    var W = cv.width, H = cv.height;
    var p = pal(this.dark);
    var cfg = this.cfg;

    // channels to show (subset or all 10)
    var chs = cfg.channels || [0,1,2,3,4,5,6,7,8,9];
    var nCh = chs.length;
    var LPAD = 40, BPAD = 18;
    var chH = (H - BPAD) / nCh;
    var dataW = W - LPAD;
    var gainPx = chH / (7 * 2 * 10);

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (var s = 0; s <= WIN_S; s++) {
      var gx = LPAD + (s / WIN_S) * dataW;
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H - BPAD); ctx.stroke();
    }
    for (var i = 0; i < nCh; i++) {
      var gy = chH * i + chH / 2;
      ctx.beginPath(); ctx.moveTo(LPAD, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Highlight channels if requested
    var highlights = cfg.highlight ? (Array.isArray(cfg.highlight) ? cfg.highlight : [cfg.highlight]) : [];

    // Traces
    for (var i2 = 0; i2 < nCh; i2++) {
      var ci   = chs[i2];
      var by   = chH * i2 + chH / 2;
      var data = this._bufA[ci];
      var step = dataW / WIN_N;
      var isHL = highlights.indexOf(ci) !== -1;

      ctx.strokeStyle = isHL ? p.accent : p.trace;
      ctx.lineWidth   = isHL ? 1.6 : 1.1;
      ctx.beginPath();
      for (var k = 0; k < WIN_N; k++) {
        var x = LPAD + k * step;
        var y = by - data[k] * gainPx;
        y = Math.max(chH * i2 + 2, Math.min(chH * (i2 + 1) - 2, y));
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle  = p.lbl;
    ctx.font       = 'bold 10px "Nunito Sans", sans-serif';
    ctx.textAlign  = 'right';
    ctx.textBaseline = 'middle';
    for (var i3 = 0; i3 < nCh; i3++) {
      var by3 = chH * i3 + chH / 2;
      var isHL3 = highlights.indexOf(chs[i3]) !== -1;
      if (isHL3) ctx.fillStyle = p.accent;
      else ctx.fillStyle = p.lbl;
      ctx.fillText(CH[chs[i3]], LPAD - 4, by3);
    }

    // Time scale
    if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Nunito Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (var s2 = 0; s2 <= WIN_S; s2++) {
        var tx = LPAD + (s2 / WIN_S) * dataW;
        ctx.fillText(s2 + 's', tx, H - BPAD + 3);
      }
    }

    // Event flash overlay
    if (this._evActive) {
      var alpha = Math.max(0, 1 - (this._t - this._evTime) / this._evWindow);
      ctx.strokeStyle = 'rgba(61,189,114,' + (alpha * 0.6) + ')';
      ctx.lineWidth = 3;
      ctx.strokeRect(LPAD, 0, dataW, H - BPAD);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: eeg-single
  // ────────────────────────────────────────────────────────────────────────────

  VizEngine.prototype._drawSingle = function () {
    var cv = this.cv, ctx = this.ctx;
    var W = cv.width, H = cv.height;
    var p = pal(this.dark);
    var cfg = this.cfg;
    var ci  = typeof cfg.channel === 'number' ? cfg.channel : 6; // default T3
    var chName = CH[ci];

    var LPAD = 52, RPAD = 16, BPAD = 22, TPAD = 36;
    var dataW = W - LPAD - RPAD;
    var dataH = H - TPAD - BPAD;
    var midY  = TPAD + dataH / 2;
    // gain: fill ~60% of channel height with ±150µV
    var gainPx = dataH / (150 * 2);

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);

    // Horizontal grid lines at ±50, ±100 µV
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    [-100, -50, 0, 50, 100].forEach(function (uv) {
      var gy = midY - uv * gainPx;
      ctx.beginPath(); ctx.moveTo(LPAD, gy); ctx.lineTo(W - RPAD, gy); ctx.stroke();
    });
    // Vertical time grid
    for (var s = 0; s <= WIN_S; s++) {
      var gx = LPAD + (s / WIN_S) * dataW;
      ctx.beginPath(); ctx.moveTo(gx, TPAD); ctx.lineTo(gx, TPAD + dataH); ctx.stroke();
    }

    // Amplitude labels
    if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Nunito Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      [100, 50, 0, -50, -100].forEach(function (uv) {
        var ty = midY - uv * gainPx;
        ctx.fillText((uv > 0 ? '+' : '') + uv + ' µV', LPAD - 6, ty);
      });
    }

    // Trace
    var data = this._bufA[ci];
    var step = dataW / WIN_N;
    ctx.strokeStyle = p.trace;
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    for (var k = 0; k < WIN_N; k++) {
      var x = LPAD + k * step;
      var y = midY - data[k] * gainPx;
      y = Math.max(TPAD + 1, Math.min(TPAD + dataH - 1, y));
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Channel name label
    ctx.fillStyle = p.accent;
    ctx.font = 'bold 13px "Nunito Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(chName, LPAD + 6, 10);

    // Description label from cfg
    if (cfg.label) {
      ctx.fillStyle = p.lbl;
      ctx.font = '10px "Nunito Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(cfg.label, W - RPAD, 10);
    }

    // Time scale
    if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Nunito Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (var s2 = 0; s2 <= WIN_S; s2++) {
        var tx = LPAD + (s2 / WIN_S) * dataW;
        ctx.fillText(s2 + 's', tx, H - BPAD + 4);
      }
    }

    // Annotation arrow if event is active
    if (this._evActive) {
      var progress = (this._t - this._evTime) / this._evWindow;
      var alpha2 = Math.max(0, 1 - progress);
      // Flash the trace
      ctx.strokeStyle = 'rgba(224,112,48,' + (alpha2 * 0.8) + ')';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      for (var k2 = 0; k2 < WIN_N; k2++) {
        var x2 = LPAD + k2 * step;
        var y2 = midY - data[k2] * gainPx;
        y2 = Math.max(TPAD + 1, Math.min(TPAD + dataH - 1, y2));
        k2 === 0 ? ctx.moveTo(x2, y2) : ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: frequency-scope
  // ────────────────────────────────────────────────────────────────────────────

  VizEngine.prototype._drawFreqScope = function () {
    var cv = this.cv, ctx = this.ctx;
    var W = cv.width, H = cv.height;
    var p = pal(this.dark);
    var t = this._t;
    var cfg = this.cfg;
    var hlBand = typeof cfg.highlightBand === 'number' ? cfg.highlightBand : -1;

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);

    var LPAD = 130, RPAD = 16;
    var nBands = BANDS.length;
    var rowH = H / nBands;

    BANDS.forEach(function (band, bi) {
      var isHL  = hlBand === bi;
      var dimmed = hlBand !== -1 && !isHL;
      var baseY = rowH * bi + rowH / 2;
      var dataW = W - LPAD - RPAD;

      // Row background
      if (isHL) {
        ctx.fillStyle = p.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)';
        ctx.fillRect(LPAD, rowH * bi, dataW, rowH);
      }

      // Divider
      if (bi > 0) {
        ctx.strokeStyle = p.grid;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, rowH * bi); ctx.lineTo(W, rowH * bi); ctx.stroke();
      }

      // Label block
      var col = dimmed ? (p.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)') : band.col;
      ctx.fillStyle = col;
      ctx.font = 'bold 14px "Nunito Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(band.label, LPAD - 10, baseY - 7);
      ctx.font = '11px "Nunito Sans", sans-serif';
      ctx.fillStyle = dimmed ? (p.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)') : col;
      ctx.fillText(band.sub, LPAD - 10, baseY + 9);

      // Waveform — pure sine
      var amp    = isHL ? band.amp * 1.35 : band.amp;
      var maxPx  = rowH * 0.42;
      var ampPx  = Math.min(amp, maxPx);
      var alpha  = dimmed ? 0.25 : 1;

      ctx.strokeStyle = hexToRgba(band.col, alpha);
      ctx.lineWidth   = isHL ? 2.2 : 1.5;
      ctx.beginPath();
      var STEPS = Math.min(W * 2, 600);
      for (var i = 0; i <= STEPS; i++) {
        var frac  = i / STEPS;
        var xPos  = LPAD + frac * dataW;
        // Alpha band waxes/wanes
        var envMult = (bi === 2)
          ? 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.08 * t + band.phase)
          : 1;
        var yPos  = baseY - Math.sin(2 * Math.PI * band.hz * (t - frac * WIN_S) + band.phase) * ampPx * envMult;
        i === 0 ? ctx.moveTo(xPos, yPos) : ctx.lineTo(xPos, yPos);
      }
      ctx.stroke();
    });

    // Time labels bottom
    if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Nunito Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      var dataW2 = W - LPAD - RPAD;
      for (var s = 0; s <= WIN_S; s++) {
        var tx = LPAD + (s / WIN_S) * dataW2;
        ctx.fillText(s + 's', tx, H - 14);
      }
    }
  };

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: head-diagram
  // ────────────────────────────────────────────────────────────────────────────

  VizEngine.prototype._hdMove = function (e) {
    var hit = this._hdHitTest(e);
    this._hdHover = hit;
    this.cv.style.cursor = hit ? 'pointer' : 'default';
  };

  VizEngine.prototype._hdClick = function (e) {
    var hit = this._hdHitTest(e);
    if (hit) {
      this._hdSel = hit;
      if (this._evCb) this._evCb(hit);  // report clicked electrode name
    }
  };

  VizEngine.prototype._hdHitTest = function (e) {
    var rect = this.cv.getBoundingClientRect();
    var mx   = e.clientX - rect.left;
    var my   = e.clientY - rect.top;
    var cx   = this.cv.width  * 0.5;
    var cy   = this.cv.height * 0.46;
    var rx   = this.cv.width  * 0.44;
    var ry   = this.cv.height * 0.44;
    var R    = this.cv.width  * 0.046;  // hit radius

    for (var name in ELEC_POS) {
      var pos = ELEC_POS[name];
      var ex  = cx + (pos[0] - 0.5) * rx * 2;
      var ey  = cy + (pos[1] - 0.5) * ry * 2;
      var dx  = mx - ex, dy = my - ey;
      if (dx*dx + dy*dy < R * R) return name;
    }
    return null;
  };

  VizEngine.prototype._drawHead = function () {
    var cv = this.cv, ctx = this.ctx;
    var W = cv.width, H = cv.height;
    var p = pal(this.dark);
    var cfg = this.cfg;
    var targets  = cfg.targets  || [];
    var selected = this._hdSel;
    var hovered  = this._hdHover;

    var minimal = !!cfg.minimal;
    var cx = W * 0.50;
    var cy = H * 0.48;
    var rx = W * (minimal ? 0.34 : 0.44);
    var ry = H * (minimal ? 0.34 : 0.44);
    var R  = W * (minimal ? 0.022 : 0.034);  // electrode dot radius

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);

    // Skull outline
    ctx.strokeStyle = p.dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Nasion (nose nub)
    ctx.strokeStyle = p.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - ry, W * 0.035, Math.PI, 0);
    ctx.stroke();

    // Ear nubs
    ctx.beginPath();
    ctx.arc(cx - rx, cy, W * 0.02, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + rx, cy, W * 0.02, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    // Midline cross-hairs
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - ry); ctx.lineTo(cx, cy + ry); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - rx, cy); ctx.lineTo(cx + rx, cy); ctx.stroke();

    // Draw electrodes
    for (var name in ELEC_POS) {
      var pos  = ELEC_POS[name];
      var ex   = cx + (pos[0] - 0.5) * rx * 2;
      var ey   = cy + (pos[1] - 0.5) * ry * 2;
      var ours = OUR_ELEC.has(name);
      var isTgt = targets.indexOf(name) !== -1;
      var isSel = !minimal && name === selected;
      var isHov = !minimal && name === hovered;

      var dotR = ours ? R : R * 0.65;

      // Glow for targets
      if (isTgt && !minimal) {
        ctx.beginPath();
        ctx.arc(ex, ey, dotR * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(61,189,114,0.18)';
        ctx.fill();
      } else if (isTgt) {
        ctx.beginPath();
        ctx.arc(ex, ey, dotR * 1.9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(61,189,114,0.65)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Glow for selected
      if (isSel && !minimal) {
        ctx.beginPath();
        ctx.arc(ex, ey, dotR * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(61,189,114,0.3)';
        ctx.fill();
      }

      // Dot fill
      ctx.beginPath();
      ctx.arc(ex, ey, dotR, 0, Math.PI * 2);
      if (isSel) {
        ctx.fillStyle = p.accent;
      } else if (isHov) {
        ctx.fillStyle = p.dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';
      } else if (minimal && isTgt) {
        ctx.fillStyle = p.accent;
      } else if (minimal && ours) {
        ctx.fillStyle = p.dark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.2)';
      } else if (ours) {
        ctx.fillStyle = p.dark ? 'rgba(82,217,138,0.75)' : 'rgba(28,82,51,0.7)';
      } else {
        ctx.fillStyle = p.dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
      }
      ctx.fill();

      // Label for "our" electrodes or hovered/selected
      if (!minimal && (ours || isHov || isSel)) {
        ctx.fillStyle = isSel
          ? p.accent
          : (isHov ? p.ink : p.lbl);
        ctx.font = (isSel || isHov) ? 'bold 10px "Nunito Sans",sans-serif' : '9px "Nunito Sans",sans-serif';
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(name, ex, ey - dotR - 2);
      } else if (minimal && isTgt) {
        ctx.fillStyle = p.accent;
        ctx.font = 'bold 10px "Nunito Sans",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(name, ex, ey - dotR - 4);
      }
    }

    // Selected electrode: big name label at bottom
    if (selected && !minimal) {
      ctx.fillStyle = p.accent;
      ctx.font = 'bold 15px "Nunito Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      var fullName = selected;
      // Map to descriptive name
      var NAMES = {
        Fp1:'Frontopolar Left', Fp2:'Frontopolar Right',
        F3:'Frontal Left', F4:'Frontal Right', Fz:'Frontal Midline',
        C3:'Central Left', C4:'Central Right', Cz:'Central Midline',
        T3:'Temporal Left', T4:'Temporal Right',
        P3:'Parietal Left', P4:'Parietal Right', Pz:'Parietal Midline',
        O1:'Occipital Left', O2:'Occipital Right', Oz:'Occipital Midline',
        F7:'Frontotemporal Left', F8:'Frontotemporal Right',
        T5:'Posterior Temporal Left', T6:'Posterior Temporal Right',
      };
      ctx.fillText(selected + ' — ' + (NAMES[selected] || ''), cx, H - 6);
    } else if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '10px "Nunito Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('tap an electrode', cx, H - 6);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: compare-panel
  // ────────────────────────────────────────────────────────────────────────────

  VizEngine.prototype._drawCompare = function () {
    var cv = this.cv, ctx = this.ctx;
    var W = cv.width, H = cv.height;
    var p = pal(this.dark);
    var cfg = this.cfg;

    var chsA = cfg.channelsA || [0,2,4,6,8];
    var chsB = cfg.channelsB || [1,3,5,7,9];
    var nCh  = Math.max(chsA.length, chsB.length);
    var labA = cfg.labelA || 'A';
    var labB = cfg.labelB || 'B';
    var LPAD = 36, RPAD = 36;
    var MID  = W / 2;
    var TPAD = 22, BPAD = 16;
    var panW = MID - LPAD - 4;
    var chH  = (H - TPAD - BPAD) / nCh;
    var gainPx = chH / (7 * 2 * 10);

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);

    // Panel divider
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(MID, 0); ctx.lineTo(MID, H); ctx.stroke();

    // Panel labels
    ctx.font = 'bold 11px "Nunito Sans",sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = p.accent;
    ctx.fillText(labA, LPAD + panW / 2, 5);
    ctx.fillStyle = p.traceB;
    ctx.fillText(labB, MID + 4 + panW / 2, 5);

    // Draw both panels
    var self = this;
    function drawPanel(buf, col, chs, xOff) {
      ctx.strokeStyle = p.grid;
      ctx.lineWidth = 1;
      for (var s = 0; s <= WIN_S; s++) {
        var gx = xOff + LPAD + (s / WIN_S) * panW;
        ctx.beginPath(); ctx.moveTo(gx, TPAD); ctx.lineTo(gx, H - BPAD); ctx.stroke();
      }
      for (var i = 0; i < nCh; i++) {
        var gy = TPAD + chH * i + chH / 2;
        ctx.beginPath(); ctx.moveTo(xOff + LPAD, gy); ctx.lineTo(xOff + LPAD + panW, gy); ctx.stroke();
      }

      ctx.strokeStyle = col;
      ctx.lineWidth = 1.1;
      for (var i2 = 0; i2 < chs.length; i2++) {
        var ci  = chs[i2];
        var by  = TPAD + chH * i2 + chH / 2;
        var data = buf[ci];
        var step = panW / WIN_N;
        ctx.beginPath();
        for (var k = 0; k < WIN_N; k++) {
          var x = xOff + LPAD + k * step;
          var y = by - data[k] * gainPx;
          y = Math.max(TPAD + chH * i2 + 1, Math.min(TPAD + chH * (i2 + 1) - 1, y));
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Channel labels
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Nunito Sans",sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (var i3 = 0; i3 < chs.length; i3++) {
        var by3 = TPAD + chH * i3 + chH / 2;
        ctx.fillText(CH[chs[i3]], xOff + LPAD - 3, by3);
      }
    }

    drawPanel(this._bufA, p.trace,  chsA, 0);
    drawPanel(this._bufB, p.traceB, chsB, MID + 4);

    // Time scale (shared)
    if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Nunito Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (var s2 = 0; s2 <= WIN_S; s2 += 2) {
        ctx.fillText(s2 + 's', LPAD + (s2 / WIN_S) * panW, H - BPAD + 3);
      }
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  global.VizEngine = VizEngine;

}(window));
