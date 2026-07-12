/*
 * viz.js — Per-exercise visualization engine for EEG Lab
 * Seven distinct renderers:
 *   head-diagram    — interactive 10-20 electrode map
 *   frequency-scope — animated band oscilloscope (no EEG sim)
 *   eeg-single      — one large channel, full-height canvas
 *   compare-panel   — two EEG strips side by side
 *   eeg-multi       — standard 10-channel scrolling EEG
 *   cap-trace       — cap map and trace page in one training canvas
 *   biophysics      — static source-to-scalp teaching schematics
 *   montage         — algebraic views of one deterministic voltage dataset
 */
(function (global) {
  'use strict';

  var SR    = 256;
  var WIN_S = 8;
  var WIN_N = SR * WIN_S;
  var CH    = ['Fp1','Fp2','F3','F4','C3','C4','T3','T4','O1','O2'];

  function logicalWidth(canvas) {
    return canvas._eegLogicalWidth || canvas.width;
  }

  function logicalHeight(canvas) {
    return canvas._eegLogicalHeight || canvas.height;
  }

  function prepareCanvas(ctx, canvas) {
    var pixelRatio = canvas._eegPixelRatio || 1;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  // Keep legacy keys for engine/data compatibility while displaying current
  // IFCN labels. Explanatory labels can retain the legacy name in parentheses.
  function displayChannel(name, includeLegacy) {
    var modern = { T3:'T7', T4:'T8', T5:'P7', T6:'P8' }[name] || name;
    return includeLegacy && modern !== name ? modern + ' (' + name + ')' : modern;
  }

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

  VizEngine.prototype.setDark  = function (d)  {
    this.dark = !!d;
    if (this.type === 'biophysics') this._drawBiophysics();
    if (this.type === 'montage') this._drawMontage();
  };
  VizEngine.prototype.onEvent  = function (cb) { this._evCb = cb; };

  /** preferredHeight — let app.js size the canvas correctly per type */
  VizEngine.prototype.preferredHeight = function () {
    var h = { 'eeg-multi':280, 'eeg-single':200, 'frequency-scope':268,
               'head-diagram':300, 'compare-panel':240, 'cap-trace':270,
               'biophysics':260, 'montage':280 };
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
    if (this.type === 'biophysics') {
      this._drawBiophysics();
      return;
    }
    if (this.type === 'montage') {
      this._drawMontage();
      return;
    }
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
      case 'cap-trace':        this._drawCapTrace();  break;
      case 'biophysics':       this._drawBiophysics(); break;
      case 'montage':          this._drawMontage();   break;
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: eeg-multi
  // ────────────────────────────────────────────────────────────────────────────

  VizEngine.prototype._drawMulti = function () {
    var cv = this.cv, ctx = this.ctx;
    var W = logicalWidth(cv), H = logicalHeight(cv);
    prepareCanvas(ctx, cv);
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
    ctx.font       = 'bold 10px "Manrope", sans-serif';
    ctx.textAlign  = 'right';
    ctx.textBaseline = 'middle';
    for (var i3 = 0; i3 < nCh; i3++) {
      var by3 = chH * i3 + chH / 2;
      var isHL3 = highlights.indexOf(chs[i3]) !== -1;
      if (isHL3) ctx.fillStyle = p.accent;
      else ctx.fillStyle = p.lbl;
      ctx.fillText(displayChannel(CH[chs[i3]], false), LPAD - 4, by3);
    }

    // Time scale
    if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Manrope", sans-serif';
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
    var W = logicalWidth(cv), H = logicalHeight(cv);
    prepareCanvas(ctx, cv);
    var p = pal(this.dark);
    var cfg = this.cfg;
    var ci  = typeof cfg.channel === 'number' ? cfg.channel : 6; // default T3
    var chName = displayChannel(CH[ci], false);

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
      ctx.font = '9px "Manrope", sans-serif';
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
    ctx.font = 'bold 13px "Manrope", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(chName, LPAD + 6, 10);

    // Description label from cfg
    if (cfg.label) {
      ctx.fillStyle = p.lbl;
      ctx.font = '10px "Manrope", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(cfg.label, W - RPAD, 10);
    }

    // Time scale
    if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Manrope", sans-serif';
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
    var W = logicalWidth(cv), H = logicalHeight(cv);
    prepareCanvas(ctx, cv);
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
      ctx.font = 'bold 14px "Manrope", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(band.label, LPAD - 10, baseY - 7);
      ctx.font = '11px "Manrope", sans-serif';
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
      ctx.font = '9px "Manrope", sans-serif';
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
    var W    = logicalWidth(this.cv);
    var H    = logicalHeight(this.cv);
    var mx   = (e.clientX - rect.left) * (W / rect.width);
    var my   = (e.clientY - rect.top) * (H / rect.height);
    var cx   = W * 0.5;
    var cy   = H * 0.46;
    var rx   = W * 0.44;
    var ry   = H * 0.44;
    var R    = W * 0.046;  // hit radius

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
    var W = logicalWidth(cv), H = logicalHeight(cv);
    prepareCanvas(ctx, cv);
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
        ctx.font = (isSel || isHov) ? 'bold 10px "Manrope",sans-serif' : '9px "Manrope",sans-serif';
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(displayChannel(name, false), ex, ey - dotR - 2);
      } else if (minimal && isTgt) {
        ctx.fillStyle = p.accent;
        ctx.font = 'bold 10px "Manrope",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(displayChannel(name, false), ex, ey - dotR - 4);
      }
    }

    // Selected electrode: big name label at bottom
    if (selected && !minimal) {
      ctx.fillStyle = p.accent;
      ctx.font = 'bold 15px "Manrope", sans-serif';
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
      ctx.fillText(displayChannel(selected, true) + ' — ' + (NAMES[selected] || ''), cx, H - 6);
    } else if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '10px "Manrope", sans-serif';
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
    var W = logicalWidth(cv), H = logicalHeight(cv);
    prepareCanvas(ctx, cv);
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
    ctx.font = 'bold 11px "Manrope",sans-serif';
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
      ctx.font = '9px "Manrope",sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (var i3 = 0; i3 < chs.length; i3++) {
        var by3 = TPAD + chH * i3 + chH / 2;
        ctx.fillText(displayChannel(CH[chs[i3]], false), xOff + LPAD - 3, by3);
      }
    }

    drawPanel(this._bufA, p.trace,  chsA, 0);
    drawPanel(this._bufB, p.traceB, chsB, MID + 4);

    // Time scale (shared)
    if (!cfg.minimal) {
      ctx.fillStyle = p.lbl;
      ctx.font = '9px "Manrope",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (var s2 = 0; s2 <= WIN_S; s2 += 2) {
        ctx.fillText(s2 + 's', LPAD + (s2 / WIN_S) * panW, H - BPAD + 3);
      }
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: cap-trace
  // ────────────────────────────────────────────────────────────────────────────

  VizEngine.prototype._drawCapTrace = function () {
    var cv = this.cv, ctx = this.ctx;
    var W = logicalWidth(cv), H = logicalHeight(cv);
    prepareCanvas(ctx, cv);
    var p = pal(this.dark);
    var cfg = this.cfg;
    var chs = cfg.channels || [0,1,2,3,4,5,6,7,8,9];
    var highlights = cfg.highlight ? (Array.isArray(cfg.highlight) ? cfg.highlight : [cfg.highlight]) : [];
    var targetNames = cfg.targets || highlights.map(function (idx) { return CH[idx]; });
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);

    var capW = W < 520 ? Math.max(116, W * 0.33) : Math.max(190, W * 0.36);
    var gutter = W < 520 ? 8 : 12;
    this._drawCapBlock(ctx, p, 0, 0, capW, H, targetNames);
    this._drawTraceBlock(ctx, p, capW + gutter, 0, W - capW - gutter, H, chs, highlights, cfg);
  };

  VizEngine.prototype._drawCapBlock = function (ctx, p, x, y, w, h, targets) {
    var cx = x + w * 0.5;
    var cy = y + h * 0.48;
    var rx = w * 0.36;
    var ry = Math.min(h * 0.34, w * 0.43);
    var r = Math.max(3, Math.min(7, w * 0.028));
    var targetSet = {};
    (targets || []).forEach(function (name) { targetSet[name] = true; });

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - ry); ctx.lineTo(cx, cy + ry); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - rx, cy); ctx.lineTo(cx + rx, cy); ctx.stroke();

    ctx.strokeStyle = p.line;
    ctx.beginPath();
    ctx.arc(cx, cy - ry, w * 0.035, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - rx, cy, w * 0.025, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + rx, cy, w * 0.025, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ALL_ELEC.forEach(function (name) {
      var pos = ELEC_POS[name];
      var ex = cx + (pos[0] - 0.5) * rx * 2;
      var ey = cy + (pos[1] - 0.5) * ry * 2;
      var on = !!targetSet[name];
      if (on) {
        ctx.beginPath();
        ctx.arc(ex, ey, r * 2.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(61,189,114,0.16)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(ex, ey, OUR_ELEC.has(name) ? r : r * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = on ? p.accent : (OUR_ELEC.has(name) ? p.lbl : (p.dark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.11)'));
      ctx.fill();
      if (on) {
        ctx.fillStyle = p.accent;
        ctx.font = 'bold 10px "Manrope", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(displayChannel(name, false), ex, ey - r - 4);
      }
    });

    ctx.fillStyle = p.lbl;
    ctx.font = 'bold 10px "Manrope", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('cap map', cx, y + h - 8);
  };

  VizEngine.prototype._drawTraceBlock = function (ctx, p, x, y, w, h, chs, highlights, cfg) {
    var nCh = chs.length;
    var LPAD = w < 290 ? 32 : 42;
    var RPAD = 6, TPAD = 24, BPAD = 28;
    var dataW = w - LPAD - RPAD;
    var dataH = h - TPAD - BPAD;
    var chH = dataH / nCh;
    var gainPx = chH / (7 * 2 * 10);

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x, y + h - 8);
    ctx.stroke();

    ctx.fillStyle = p.lbl;
    ctx.font = 'bold 10px "Manrope", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(cfg.header || 'trace page', x + LPAD, y + 6);

    ctx.strokeStyle = p.grid;
    for (var s = 0; s <= WIN_S; s++) {
      var gx = x + LPAD + (s / WIN_S) * dataW;
      ctx.beginPath(); ctx.moveTo(gx, y + TPAD); ctx.lineTo(gx, y + TPAD + dataH); ctx.stroke();
    }
    for (var i = 0; i < nCh; i++) {
      var gy = y + TPAD + chH * i + chH / 2;
      ctx.beginPath(); ctx.moveTo(x + LPAD, gy); ctx.lineTo(x + LPAD + dataW, gy); ctx.stroke();
    }

    for (var i2 = 0; i2 < nCh; i2++) {
      var ci = chs[i2];
      var by = y + TPAD + chH * i2 + chH / 2;
      var data = this._bufA[ci];
      var isHL = highlights.indexOf(ci) !== -1;
      var step = dataW / WIN_N;
      ctx.strokeStyle = isHL ? p.accent : p.trace;
      ctx.lineWidth = isHL ? 1.5 : 1;
      ctx.beginPath();
      for (var k = 0; k < WIN_N; k++) {
        var px = x + LPAD + k * step;
        var py = by - data[k] * gainPx;
        py = Math.max(y + TPAD + chH * i2 + 2, Math.min(y + TPAD + chH * (i2 + 1) - 2, py));
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = isHL ? p.accent : p.lbl;
      ctx.font = 'bold 10px "Manrope", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayChannel(CH[ci], false), x + LPAD - 5, by);
    }

    var bx = x + LPAD + dataW * 0.58;
    var by2 = y + h - 18;
    var bw = dataW / WIN_S;
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by2);
    ctx.lineTo(bx + bw, by2);
    ctx.moveTo(bx, by2 - 5);
    ctx.lineTo(bx, by2 + 5);
    ctx.moveTo(bx + bw, by2 - 5);
    ctx.lineTo(bx + bw, by2 + 5);
    ctx.stroke();

    ctx.fillStyle = p.accent;
    ctx.font = 'bold 10px "Manrope", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(cfg.measure || '1 second', bx + bw / 2, by2 - 6);
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: biophysics
  //
  //  Static, original teaching schematics for source generation and volume
  //  conduction. Every distinction is encoded with labels, geometry, line style,
  //  or direction as well as colour.
  // ────────────────────────────────────────────────────────────────────────────

  VizEngine.prototype._drawBiophysics = function () {
    var cv = this.cv, ctx = this.ctx;
    if (!cv || !ctx) return;

    var W = Math.max(1, logicalWidth(cv));
    var H = Math.max(1, logicalHeight(cv));
    prepareCanvas(ctx, cv);
    var p = pal(this.dark);
    var compact = W < 520;
    var vw = compact ? 360 : 680;
    var vh = 260;
    var scale = Math.min(W / vw, H / vh);
    var ox = (W - vw * scale) / 2;
    var oy = (H - vh * scale) / 2;
    var layout = { w:vw, h:vh, compact:compact };

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (this.cfg.mode) {
      case 'synchrony':
        _bioSynchrony(ctx, p, layout);
        break;
      case 'orientation':
        _bioOrientation(ctx, p, layout);
        break;
      case 'conduction':
        _bioConduction(ctx, p, layout);
        break;
      case 'skull-filter':
        _bioSkullFilter(ctx, p, layout);
        break;
      case 'inverse':
        _bioInverse(ctx, p, layout);
        break;
      case 'source-area':
        _bioSourceArea(ctx, p, layout);
        break;
      case 'source-depth':
        _bioSourceDepth(ctx, p, layout);
        break;
      case 'synapse':
      default:
        _bioSynapse(ctx, p, layout);
        break;
    }

    ctx.restore();
  };

  function _bioHeader(ctx, p, layout, title, subtitle) {
    var top = layout.compact ? 44 : 38;
    ctx.fillStyle = p.ink;
    ctx.font = '800 14px "Manrope", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, 14, 10);

    ctx.fillStyle = p.lbl;
    ctx.font = '700 9px "Manrope", sans-serif';
    if (layout.compact) {
      ctx.textAlign = 'left';
      ctx.fillText(subtitle, 14, 28);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(subtitle, layout.w - 14, 14);
    }

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, top - 6);
    ctx.lineTo(layout.w - 14, top - 6);
    ctx.stroke();
    return top;
  }

  function _bioFooter(ctx, p, layout, text) {
    var size = 9;
    ctx.fillStyle = p.lbl;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    do {
      ctx.font = '700 ' + size + 'px "Manrope", sans-serif';
      size--;
    } while (size > 6 && ctx.measureText(text).width > layout.w - 24);
    ctx.fillText(text, layout.w / 2, layout.h - 5);
  }

  function _bioLabel(ctx, p, text, x, y, align, strong) {
    ctx.fillStyle = strong ? p.ink : p.lbl;
    ctx.font = (strong ? '800 10px ' : '700 9px ') + '"Manrope", sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function _bioArrow(ctx, x1, y1, x2, y2, color, dashed) {
    var angle = Math.atan2(y2 - y1, x2 - x1);
    var head = 6;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dashed ? [4, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function _bioCell(ctx, p, x, y, size, rotation, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation || 0);
    ctx.scale(size, size);
    ctx.globalAlpha = typeof alpha === 'number' ? alpha : 1;
    ctx.strokeStyle = p.trace;
    ctx.fillStyle = p.dark ? 'rgba(82,217,138,0.16)' : 'rgba(28,82,51,0.1)';
    ctx.lineWidth = 1.7;

    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(0, -48);
    ctx.moveTo(0, -35); ctx.lineTo(-11, -43);
    ctx.moveTo(0, -35); ctx.lineTo(11, -43);
    ctx.moveTo(0, -45); ctx.lineTo(-7, -53);
    ctx.moveTo(0, -45); ctx.lineTo(7, -53);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(9, 7);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-6, 5); ctx.lineTo(-18, 16); ctx.lineTo(-25, 14);
    ctx.moveTo(6, 5); ctx.lineTo(18, 16); ctx.lineTo(25, 14);
    ctx.moveTo(0, 7); ctx.lineTo(0, 35);
    ctx.stroke();
    ctx.restore();
  }

  function _bioWave(ctx, x, y, w, amp, cycles, color, dashed, phase) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.setLineDash(dashed ? [4, 3] : []);
    ctx.beginPath();
    for (var i = 0; i <= 90; i++) {
      var n = i / 90;
      var px = x + n * w;
      var py = y + Math.sin(n * Math.PI * 2 * cycles + (phase || 0)) * amp;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function _bioDipole(ctx, p, x, y, angle, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-size * 0.55, 0);
    ctx.lineTo(size * 0.55, 0);
    ctx.stroke();

    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.arc(side * size * 0.55, 0, size * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = side < 0
        ? (p.dark ? 'rgba(106,176,245,0.18)' : 'rgba(80,120,208,0.1)')
        : (p.dark ? 'rgba(224,112,48,0.2)' : 'rgba(224,112,48,0.1)');
      ctx.fill();
      ctx.strokeStyle = side < 0 ? p.cool : p.warm;
      ctx.stroke();
      ctx.fillStyle = p.ink;
      ctx.font = '800 10px "Manrope", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(side < 0 ? '−' : '+', side * size * 0.55, 0);
    });
    ctx.restore();
  }

  function _bioSensorRow(ctx, p, x, y, w, values, label) {
    var count = values.length;
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    values.forEach(function (value, i) {
      var px = x + (i / (count - 1)) * w;
      var barH = value * 24;
      ctx.strokeStyle = p.trace;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, y - 4);
      ctx.lineTo(px, y - 4 - barH);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = p.bg;
      ctx.fill();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    if (label) _bioLabel(ctx, p, label, x + w / 2, y + 13, 'center', false);
  }

  function _bioSynapse(ctx, p, layout) {
    var top = _bioHeader(ctx, p, layout, 'Synaptic currents', 'sink and return source');
    var cx = layout.compact ? layout.w * 0.42 : layout.w * 0.43;
    var somaY = top + 112;
    var side = layout.compact ? 43 : 72;
    var cellSize = layout.compact ? 0.72 : 0.92;

    _bioCell(ctx, p, cx - side, somaY, cellSize * 0.9, 0, 0.25);
    _bioCell(ctx, p, cx + side, somaY, cellSize * 0.9, 0, 0.25);
    _bioCell(ctx, p, cx, somaY, cellSize, 0, 1);

    // Excitatory input draws positive extracellular charge into the dendrite.
    var sinkY = somaY - 34 * cellSize;
    _bioArrow(ctx, cx - 42, sinkY, cx - 6, sinkY, p.cool, false);
    _bioArrow(ctx, cx + 42, sinkY, cx + 6, sinkY, p.cool, false);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = p.cool;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, sinkY, 14, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Return current leaves around the soma and basal dendrites.
    var sourceY = somaY + 6;
    _bioArrow(ctx, cx - 5, sourceY, cx - 42, sourceY, p.warm, false);
    _bioArrow(ctx, cx + 5, sourceY, cx + 42, sourceY, p.warm, false);

    var labelX = layout.compact ? layout.w - 12 : layout.w * 0.68;
    _bioLabel(ctx, p, 'CURRENT SINK  (−)', labelX, sinkY - 5, 'right', true);
    _bioLabel(ctx, p, 'charge moves inward', labelX, sinkY + 10, 'right', false);
    _bioLabel(ctx, p, 'RETURN SOURCE  (+)', labelX, sourceY - 4, 'right', true);
    _bioLabel(ctx, p, 'current closes near soma', labelX, sourceY + 11, 'right', false);

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(18, somaY + 42);
    ctx.lineTo(layout.w - 18, somaY + 42);
    ctx.stroke();
    ctx.setLineDash([]);
    _bioLabel(ctx, p, 'aligned cortical pyramidal cells', 20, somaY + 53, 'left', false);
    _bioFooter(ctx, p, layout, 'Overlapping postsynaptic currents can add into a measurable population field.');
  }

  function _bioSynchrony(ctx, p, layout) {
    var top = _bioHeader(ctx, p, layout, 'Population synchrony', 'sum or cancel');
    var mid = layout.w / 2;
    var panelW = mid - 18;
    var scale = layout.compact ? 0.34 : 0.48;
    var cellY = top + 76;

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid, top + 4);
    ctx.lineTo(mid, layout.h - 28);
    ctx.stroke();

    _bioLabel(ctx, p, 'SYNCHRONOUS', mid * 0.5, top + 8, 'center', true);
    _bioLabel(ctx, p, 'ASYNCHRONOUS', mid + mid * 0.5, top + 8, 'center', true);

    for (var i = 0; i < 4; i++) {
      var lx = 24 + (i + 0.5) * ((panelW - 24) / 4);
      var rx = mid + 14 + (i + 0.5) * ((panelW - 24) / 4);
      _bioCell(ctx, p, lx, cellY, scale, 0, 0.92);
      _bioCell(ctx, p, rx, cellY, scale, [-0.42, 0.28, -0.18, 0.48][i], 0.72);
      if (i < 3) {
        _bioLabel(ctx, p, '+', lx + (panelW - 24) / 8, cellY + 30, 'center', true);
        _bioLabel(ctx, p, i === 1 ? '−' : '+', rx + (panelW - 24) / 8, cellY + 30, 'center', true);
      }
    }

    var waveY = top + 146;
    _bioWave(ctx, 24, waveY, panelW - 42, 15, 2.2, p.trace, false, 0);
    _bioWave(ctx, mid + 22, waveY, panelW - 42, 3.5, 3.1, p.traceB, true, 1.1);
    _bioLabel(ctx, p, 'Σ  strong field', mid * 0.5, waveY + 25, 'center', true);
    _bioLabel(ctx, p, 'Σ  partial cancellation', mid + mid * 0.5, waveY + 25, 'center', true);
    _bioFooter(ctx, p, layout, 'Timing and alignment determine whether microscopic fields reinforce or cancel.');
  }

  function _bioOrientation(ctx, p, layout) {
    var top = _bioHeader(ctx, p, layout, 'Source orientation', 'folding changes projection');
    var w = layout.w;
    var scalpY = top + 40;

    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(26, scalpY + 24);
    ctx.bezierCurveTo(w * 0.24, scalpY - 18, w * 0.76, scalpY - 18, w - 26, scalpY + 24);
    ctx.stroke();
    for (var i = 0; i < 7; i++) {
      var nx = i / 6;
      var ex = 42 + nx * (w - 84);
      var curve = Math.pow((ex - w / 2) / (w * 0.5), 2);
      var ey = scalpY + 2 + curve * 20;
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = p.bg;
      ctx.fill();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    var cortexY = top + 130;
    ctx.strokeStyle = p.trace;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(24, cortexY + 8);
    ctx.bezierCurveTo(w * 0.12, cortexY + 8, w * 0.16, cortexY - 42, w * 0.28, cortexY - 42);
    ctx.bezierCurveTo(w * 0.39, cortexY - 42, w * 0.39, cortexY + 24, w * 0.5, cortexY + 24);
    ctx.bezierCurveTo(w * 0.62, cortexY + 24, w * 0.61, cortexY - 32, w * 0.72, cortexY - 32);
    ctx.bezierCurveTo(w * 0.84, cortexY - 32, w * 0.86, cortexY + 8, w - 24, cortexY + 8);
    ctx.stroke();

    var radialX = w * 0.28;
    var radialY = cortexY - 48;
    var tangentX = w * 0.51;
    var tangentY = cortexY + 17;
    _bioCell(ctx, p, radialX, radialY, layout.compact ? 0.37 : 0.44, 0, 1);
    _bioCell(ctx, p, tangentX, tangentY, layout.compact ? 0.37 : 0.44, Math.PI / 2, 1);
    _bioArrow(ctx, radialX, radialY - 17, radialX, scalpY + 18, p.warm, false);
    _bioArrow(ctx, tangentX + 18, tangentY, w * 0.72, tangentY, p.cool, true);

    _bioLabel(ctx, p, 'RADIAL', radialX, cortexY - 76, 'center', true);
    _bioLabel(ctx, p, 'toward scalp', radialX, cortexY - 64, 'center', false);
    _bioLabel(ctx, p, 'TANGENTIAL', w * 0.72, tangentY - 13, 'center', true);
    _bioLabel(ctx, p, 'along sulcal wall', w * 0.72, tangentY + 2, 'center', false);
    _bioLabel(ctx, p, '+   −', radialX, scalpY + 37, 'center', true);
    _bioLabel(ctx, p, '+       −', w * 0.72, scalpY + 37, 'center', true);
    _bioFooter(ctx, p, layout, 'Equally active cortical patches can create different scalp voltage maps.');
  }

  function _bioConduction(ctx, p, layout) {
    var top = _bioHeader(ctx, p, layout, 'Volume conduction', 'one field, many sensors');
    var w = layout.w;
    var x1 = 18;
    var x2 = w - (layout.compact ? 78 : 126);
    var center = (x1 + x2) / 2;
    var layers = [
      { name:'SCALP',  y:top + 48,  bow:20, width:5,  color:p.ink,  dash:[] },
      { name:'SKULL',  y:top + 78,  bow:16, width:12, color:p.warm, dash:[3,3] },
      { name:'CSF',    y:top + 108, bow:12, width:8,  color:p.cool, dash:[8,3] },
      { name:'CORTEX', y:top + 139, bow:8,  width:7,  color:p.trace, dash:[] }
    ];

    layers.forEach(function (layer) {
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = layer.width;
      ctx.setLineDash(layer.dash);
      ctx.beginPath();
      ctx.moveTo(x1, layer.y);
      ctx.quadraticCurveTo(center, layer.y - layer.bow, x2, layer.y);
      ctx.stroke();
      ctx.restore();
      _bioLabel(ctx, p, layer.name, x2 + 9, layer.y - layer.bow * 0.35, 'left', true);
    });

    var sourceX = center;
    var sourceY = top + 161;
    _bioDipole(ctx, p, sourceX, sourceY, -Math.PI / 2, 25);
    _bioLabel(ctx, p, 'cortical generator', sourceX, sourceY + 22, 'center', false);

    var span = x2 - x1;
    for (var i = 0; i < 5; i++) {
      var nx = (i + 1) / 6;
      var ex = x1 + nx * span;
      var centered = (ex - center) / (span / 2);
      var ey = top + 48 - 20 * (1 - centered * centered);
      ctx.save();
      ctx.strokeStyle = p.accent;
      ctx.globalAlpha = 0.35 + (1 - Math.abs(centered)) * 0.35;
      ctx.lineWidth = i === 2 ? 1.8 : 1.2;
      ctx.setLineDash(i % 2 ? [4, 3] : []);
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY - 15);
      ctx.bezierCurveTo(sourceX, top + 116, ex, top + 96, ex, ey + 4);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.bg;
      ctx.fill();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    _bioLabel(ctx, p, 'five electrodes sample one shared field', center, top + 23, 'center', false);
    _bioFooter(ctx, p, layout, 'Conductive tissue spreads one generator across several channels almost simultaneously.');
  }

  function _bioGaussianGraph(ctx, p, x, y, w, h, sigma, amplitude, label, note, color, dashed) {
    var baseY = y + h;
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w, baseY);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dashed ? [5, 3] : []);
    ctx.beginPath();
    for (var i = 0; i <= 100; i++) {
      var n = i / 100;
      var z = (n - 0.5) / sigma;
      var value = Math.exp(-0.5 * z * z);
      var px = x + n * w;
      var py = baseY - value * h * amplitude;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    _bioLabel(ctx, p, label, x, y - 8, 'left', true);
    _bioLabel(ctx, p, note, x + w, y - 8, 'right', false);

    var half = sigma * 1.18 * w;
    var cx = x + w / 2;
    ctx.strokeStyle = p.lbl;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - half, baseY + 6);
    ctx.lineTo(cx + half, baseY + 6);
    ctx.moveTo(cx - half, baseY + 3); ctx.lineTo(cx - half, baseY + 9);
    ctx.moveTo(cx + half, baseY + 3); ctx.lineTo(cx + half, baseY + 9);
    ctx.stroke();
  }

  function _bioSkullFilter(ctx, p, layout) {
    var top = _bioHeader(ctx, p, layout, 'The skull as a spatial filter', 'attenuation + blur');
    var w = layout.w;

    if (layout.compact) {
      _bioGaussianGraph(ctx, p, 24, top + 18, w - 48, 48, 0.09, 0.9,
        'CORTICAL FIELD', 'narrow / high', p.trace, false);

      var bandY = top + 91;
      ctx.strokeStyle = p.warm;
      ctx.lineWidth = 10;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(28, bandY); ctx.lineTo(w - 28, bandY); ctx.stroke();
      ctx.setLineDash([]);
      _bioArrow(ctx, w / 2, bandY - 13, w / 2, bandY + 14, p.ink, false);
      _bioLabel(ctx, p, 'SKULL', w - 28, bandY - 13, 'right', true);

      _bioGaussianGraph(ctx, p, 24, top + 119, w - 48, 38, 0.24, 0.52,
        'SCALP FIELD', 'broad / low', p.cool, true);
    } else {
      var panelW = w * 0.36;
      _bioGaussianGraph(ctx, p, 24, top + 55, panelW, 78, 0.09, 0.94,
        'CORTICAL FIELD', 'narrow / high', p.trace, false);

      var bandX = w / 2;
      ctx.strokeStyle = p.warm;
      ctx.lineWidth = 13;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(bandX, top + 30); ctx.lineTo(bandX, top + 155); ctx.stroke();
      ctx.setLineDash([]);
      _bioArrow(ctx, bandX - 35, top + 95, bandX + 35, top + 95, p.ink, false);
      _bioLabel(ctx, p, 'SKULL', bandX, top + 18, 'center', true);

      _bioGaussianGraph(ctx, p, w - panelW - 24, top + 72, panelW, 61, 0.24, 0.55,
        'SCALP FIELD', 'broad / low', p.cool, true);
    }
    _bioFooter(ctx, p, layout, 'By the scalp, a focal cortical field is smaller and spatially broader.');
  }

  function _bioInverse(ctx, p, layout) {
    var top = _bioHeader(ctx, p, layout, 'The inverse problem', 'different sources, same measurements');
    var mid = layout.w / 2;
    var left = mid * 0.5;
    var right = mid + mid * 0.5;
    var sourceY = top + 62;
    var sensorY = top + 146;
    var rowW = Math.min(layout.compact ? 128 : 230, mid - 42);

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid, top + 4);
    ctx.lineTo(mid, layout.h - 28);
    ctx.stroke();

    _bioLabel(ctx, p, 'SOURCE SET A', left, top + 8, 'center', true);
    _bioLabel(ctx, p, 'SOURCE SET B', right, top + 8, 'center', true);

    _bioDipole(ctx, p, left, sourceY, -Math.PI / 2, layout.compact ? 30 : 38);
    _bioDipole(ctx, p, right - (layout.compact ? 22 : 38), sourceY, -0.35, layout.compact ? 20 : 25);
    _bioDipole(ctx, p, right + (layout.compact ? 22 : 38), sourceY + 6, Math.PI + 0.35, layout.compact ? 20 : 25);
    _bioLabel(ctx, p, 'one radial dipole', left, sourceY + 34, 'center', false);
    _bioLabel(ctx, p, 'two oblique dipoles', right, sourceY + 34, 'center', false);

    _bioArrow(ctx, left, sourceY + 40, left, sensorY - 34, p.lbl, true);
    _bioArrow(ctx, right, sourceY + 40, right, sensorY - 34, p.lbl, true);
    var samePattern = [0.18, 0.55, 1, 0.55, 0.18];
    _bioSensorRow(ctx, p, left - rowW / 2, sensorY, rowW, samePattern, 'scalp sensors');
    _bioSensorRow(ctx, p, right - rowW / 2, sensorY, rowW, samePattern, 'scalp sensors');
    _bioLabel(ctx, p, '=', mid, sensorY - 13, 'center', true);
    _bioLabel(ctx, p, 'IDENTICAL VOLTAGE PATTERN', mid, sensorY + 29, 'center', true);
    _bioFooter(ctx, p, layout, 'Scalp voltages constrain possible sources; they do not identify one unique answer.');
  }

  function _bioSourceArea(ctx, p, layout) {
    var top = _bioHeader(ctx, p, layout, 'Source extent and synchrony', 'detectability changes continuously');
    var mid = layout.w / 2;
    var left = mid * 0.5;
    var right = mid + mid * 0.5;
    var cellY = top + 92;
    var smallScale = layout.compact ? 0.34 : 0.44;
    var largeScale = layout.compact ? 0.3 : 0.4;

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid, top + 4);
    ctx.lineTo(mid, layout.h - 28);
    ctx.stroke();

    _bioLabel(ctx, p, 'SMALL / ASYNCHRONOUS', left, top + 8, 'center', true);
    _bioLabel(ctx, p, 'LARGER / ALIGNED', right, top + 8, 'center', true);

    var smallXs = [-24, 0, 24];
    smallXs.forEach(function (offset, i) {
      _bioCell(ctx, p, left + offset, cellY + [5, -3, 7][i], smallScale,
        [-0.42, 0.18, 0.48][i], 0.78);
    });

    for (var i = 0; i < 7; i++) {
      var spread = layout.compact ? 72 : 116;
      var x = right - spread / 2 + (i / 6) * spread;
      _bioCell(ctx, p, x, cellY, largeScale, 0, 0.86);
    }

    var waveY = top + 157;
    _bioWave(ctx, left - (layout.compact ? 62 : 112), waveY,
      layout.compact ? 124 : 224, 3.5, 3.1, p.traceB, true, 0.7);
    _bioWave(ctx, right - (layout.compact ? 62 : 112), waveY,
      layout.compact ? 124 : 224, 15, 2.1, p.trace, false, 0);
    _bioLabel(ctx, p, 'partial cancellation → weaker field', left, waveY + 23, 'center', false);
    _bioLabel(ctx, p, 'reinforcement → stronger field', right, waveY + 23, 'center', false);
    _bioLabel(ctx, p, 'AREA ≠ GUARANTEE', mid, top + 194, 'center', true);
    _bioFooter(ctx, p, layout, 'There is no universal cortical-area threshold for scalp EEG detectability.');
  }

  function _bioSourceDepth(ctx, p, layout) {
    var top = _bioHeader(ctx, p, layout, 'Source depth', 'distance and orientation shape projection');
    var mid = layout.w / 2;
    var left = mid * 0.5;
    var right = mid + mid * 0.5;
    var rowW = Math.min(layout.compact ? 124 : 220, mid - 44);
    var sensorY = top + 45;
    var cortexY = top + 115;

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid, top + 4);
    ctx.lineTo(mid, layout.h - 28);
    ctx.stroke();

    _bioLabel(ctx, p, 'SUPERFICIAL / RADIAL', left, top + 8, 'center', true);
    _bioLabel(ctx, p, 'DEEPER / OBLIQUE', right, top + 8, 'center', true);

    _bioSensorRow(ctx, p, left - rowW / 2, sensorY, rowW,
      [0.16, 0.58, 1, 0.58, 0.16], 'stronger scalp projection');
    _bioSensorRow(ctx, p, right - rowW / 2, sensorY, rowW,
      [0.05, 0.16, 0.28, 0.16, 0.05], 'weaker scalp projection');

    ctx.strokeStyle = p.trace;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(20, cortexY);
    ctx.lineTo(mid - 12, cortexY);
    ctx.moveTo(mid + 12, cortexY);
    ctx.lineTo(layout.w - 20, cortexY);
    ctx.stroke();
    _bioLabel(ctx, p, 'cortical surface', mid, cortexY + 12, 'center', false);

    var superficialY = cortexY - 14;
    var deepY = cortexY + 36;
    _bioDipole(ctx, p, left, superficialY, -Math.PI / 2, layout.compact ? 24 : 31);
    _bioDipole(ctx, p, right, deepY, -0.45, layout.compact ? 24 : 31);

    _bioArrow(ctx, left, superficialY - 19, left, sensorY + 10, p.accent, false);
    _bioArrow(ctx, right - 10, deepY - 13, right - 32, sensorY + 12, p.lbl, true);
    _bioLabel(ctx, p, 'shorter distance', left, cortexY + 31, 'center', false);
    _bioLabel(ctx, p, 'longer distance', right, deepY + 23, 'center', false);
    _bioLabel(ctx, p, 'also: orientation · extent · synchrony · tissue · noise',
      mid, top + 185, 'center', true);
    _bioFooter(ctx, p, layout, 'Depth often weakens scalp projection, but distance alone never determines visibility.');
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  Renderer: montage
  //
  //  All display modes below are algebraic transforms of one deterministic set
  //  of electrode voltages. No mode receives a separately drawn cosmetic trace.
  // ────────────────────────────────────────────────────────────────────────────

  var MONTAGE_ELECTRODES = ['Fp1', 'F3', 'C3', 'P3', 'O1'];

  VizEngine.prototype._drawMontage = function () {
    var cv = this.cv, ctx = this.ctx;
    if (!cv || !ctx) return;

    var W = Math.max(1, logicalWidth(cv));
    var H = Math.max(1, logicalHeight(cv));
    prepareCanvas(ctx, cv);
    var p = pal(this.dark);
    var compact = W < 520;
    var vw = compact ? 360 : 680;
    var vh = 260;
    var scale = Math.min(W / vw, H / vh);
    var layout = { w:vw, h:vh, compact:compact };
    var mode = this.cfg.mode || 'compare';
    var raw = _montageVoltageDataset();

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate((W - vw * scale) / 2, (H - vh * scale) / 2);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (mode === 'referential') _montageReferentialView(ctx, p, layout, raw);
    else if (mode === 'bipolar') _montageBipolarView(ctx, p, layout, raw);
    else if (mode === 'average') _montageAverageView(ctx, p, layout, raw);
    else _montageCompareView(ctx, p, layout, raw);

    ctx.restore();
  };

  function _montageVoltageDataset() {
    var samples = 180;
    var volts = { A1:[] };
    var weights = { Fp1:0.08, F3:0.45, C3:1, P3:0.42, O1:0.08 };
    MONTAGE_ELECTRODES.forEach(function (name) { volts[name] = []; });

    for (var i = 0; i < samples; i++) {
      var t = i / (samples - 1);
      var common = 0.055 * Math.sin(Math.PI * 2 * 8 * t)
        + 0.022 * Math.sin(Math.PI * 2 * 3 * t + 0.8);
      var spikeZ = (t - 0.57) / 0.018;
      var slowZ = (t - 0.65) / 0.065;
      var focalEvent = -1.18 * Math.exp(-0.5 * spikeZ * spikeZ)
        + 0.32 * Math.exp(-0.5 * slowZ * slowZ);

      volts.A1.push(common * 0.12 + 0.012 * Math.sin(Math.PI * 2 * 5 * t + 0.4));
      MONTAGE_ELECTRODES.forEach(function (name, electrodeIndex) {
        var local = 0.018 * Math.sin(Math.PI * 2 * (5.5 + electrodeIndex * 0.65) * t + electrodeIndex * 0.7);
        volts[name].push(common * (0.7 + electrodeIndex * 0.025) + local + weights[name] * focalEvent);
      });
    }

    return { volts:volts, samples:samples, eventFraction:0.57 };
  }

  function _montageSubtract(a, b) {
    var result = new Array(a.length);
    for (var i = 0; i < a.length; i++) result[i] = a[i] - b[i];
    return result;
  }

  function _montageReferentialRows(raw) {
    return MONTAGE_ELECTRODES.map(function (name) {
      return {
        key:name,
        label:displayChannel(name, false) + ' − A1',
        data:_montageSubtract(raw.volts[name], raw.volts.A1)
      };
    });
  }

  function _montageBipolarRows(raw) {
    var pairs = [
      ['Fp1', 'F3'],
      ['F3', 'C3'],
      ['C3', 'P3'],
      ['P3', 'O1']
    ];
    return pairs.map(function (pair) {
      return {
        key:pair[0] + '-' + pair[1],
        label:displayChannel(pair[0], false) + ' − ' + displayChannel(pair[1], false),
        data:_montageSubtract(raw.volts[pair[0]], raw.volts[pair[1]])
      };
    });
  }

  function _montageAverageRows(raw) {
    var mean = new Array(raw.samples);
    for (var sample = 0; sample < raw.samples; sample++) {
      var sum = 0;
      MONTAGE_ELECTRODES.forEach(function (name) { sum += raw.volts[name][sample]; });
      mean[sample] = sum / MONTAGE_ELECTRODES.length;
    }
    return MONTAGE_ELECTRODES.map(function (name) {
      return {
        key:name,
        label:displayChannel(name, false) + ' − V̄',
        data:_montageSubtract(raw.volts[name], mean)
      };
    });
  }

  function _montageFitText(ctx, text, maxWidth, maxSize, minSize, weight) {
    var size = maxSize;
    do {
      ctx.font = (weight || 700) + ' ' + size + 'px "Manrope", sans-serif';
      if (ctx.measureText(text).width <= maxWidth) return;
      size--;
    } while (size >= minSize);
  }

  function _montagePanel(ctx, p, x, y, w, h, title, rows, raw, options) {
    options = options || {};
    var compact = w < 310;
    var labelW = compact ? Math.min(82, w * 0.34) : Math.min(112, w * 0.34);
    var rightPad = 8;
    var topPad = 21;
    var dataX = x + labelW;
    var dataY = y + topPad;
    var dataW = Math.max(40, w - labelW - rightPad);
    var dataH = Math.max(32, h - topPad - 4);
    var rowH = dataH / rows.length;
    var gain = rowH * 0.31 / 1.18;
    var eventX = dataX + raw.eventFraction * dataW;
    var highlights = options.highlights || [];

    ctx.fillStyle = p.ink;
    _montageFitText(ctx, title, w - 12, compact ? 9 : 11, 7, 800);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 4, y + 2);

    ctx.fillStyle = p.lbl;
    ctx.font = '700 7px "Manrope", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('NEGATIVE ↑', x + w - 4, y + 4);

    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (var tick = 0; tick <= 4; tick++) {
      var gx = dataX + tick * dataW / 4;
      ctx.beginPath(); ctx.moveTo(gx, dataY); ctx.lineTo(gx, dataY + dataH); ctx.stroke();
    }

    ctx.save();
    ctx.strokeStyle = p.warm;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(eventX, dataY);
    ctx.lineTo(eventX, dataY + dataH);
    ctx.stroke();
    ctx.restore();

    rows.forEach(function (row, rowIndex) {
      var baseline = dataY + rowH * rowIndex + rowH / 2;
      var highlighted = highlights.indexOf(rowIndex) !== -1;
      ctx.strokeStyle = p.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dataX, baseline); ctx.lineTo(dataX + dataW, baseline); ctx.stroke();

      ctx.strokeStyle = highlighted ? p.accent : p.trace;
      ctx.lineWidth = highlighted ? 1.9 : 1.15;
      ctx.beginPath();
      row.data.forEach(function (value, sampleIndex) {
        var px = dataX + (sampleIndex / (row.data.length - 1)) * dataW;
        // Teaching display follows the conventional EEG convention: negative up.
        var py = baseline + value * gain;
        var rowTop = dataY + rowH * rowIndex + 2;
        var rowBottom = rowTop + rowH - 4;
        py = Math.max(rowTop, Math.min(rowBottom, py));
        sampleIndex === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.fillStyle = highlighted ? p.accent : p.lbl;
      ctx.font = (highlighted ? '800 ' : '700 ') + (compact ? 7 : 8) + 'px "Manrope", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText((highlighted ? '› ' : '') + row.label, dataX - 5, baseline);
    });

    if (options.eventText) {
      ctx.fillStyle = p.warm;
      _montageFitText(ctx, options.eventText, Math.max(64, dataW * 0.55), compact ? 7 : 8, 6, 800);
      ctx.textAlign = eventX > dataX + dataW * 0.58 ? 'right' : 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(options.eventText, eventX + (ctx.textAlign === 'left' ? 4 : -4), dataY - 2);
    }
  }

  function _montageTeachingLegend(ctx, p, layout) {
    _bioLabel(ctx, p, 'Reduced teaching subset · left parasagittal Fp1–F3–C3–P3–O1',
      layout.w / 2, layout.h - 19, 'center', false);
  }

  function _montageReferentialView(ctx, p, layout, raw) {
    var top = _bioHeader(ctx, p, layout, 'Referential montage', 'Vi(t) − VA1(t)');
    _montagePanel(ctx, p, 12, top + 16, layout.w - 24, 162,
      'EACH SCALP ELECTRODE MINUS THE SAME A1 REFERENCE',
      _montageReferentialRows(raw), raw,
      { highlights:[2], eventText:'C3 local scalp maximum' });
    _montageTeachingLegend(ctx, p, layout);
    _bioFooter(ctx, p, layout, 'A shared reference preserves the focal voltage maximum, but the reference also contributes.');
  }

  function _montageBipolarView(ctx, p, layout, raw) {
    var top = _bioHeader(ctx, p, layout, 'Longitudinal bipolar montage', 'adjacent electrode subtraction');
    _montagePanel(ctx, p, 12, top + 18, layout.w - 24, 156,
      'ONE CHAIN · EACH ROW = FIRST ELECTRODE MINUS SECOND',
      _montageBipolarRows(raw), raw,
      { highlights:[1,2], eventText:'opposite deflections share C3' });
    _bioLabel(ctx, p, 'F3−C3  ↓     C3−P3  ↑   = phase reversal at shared C3',
      layout.w / 2, top + 183, 'center', true);
    _montageTeachingLegend(ctx, p, layout);
    _bioFooter(ctx, p, layout, 'A phase reversal marks a local maximum in this montage—not a unique cortical source.');
  }

  function _montageAverageView(ctx, p, layout, raw) {
    var top = _bioHeader(ctx, p, layout, 'Average-reference montage', 'each electrode minus arithmetic mean');
    var equation = 'V̄(t) = [VFp1(t) + VF3(t) + VC3(t) + VP3(t) + VO1(t)] / 5';
    ctx.fillStyle = p.ink;
    _montageFitText(ctx, equation, layout.w - 28, layout.compact ? 8 : 10, 6, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(equation, layout.w / 2, top + 11);
    _montagePanel(ctx, p, 12, top + 24, layout.w - 24, 151,
      'AVERAGE-REFERENCED CHANNELS · Vi(t) − V̄(t)',
      _montageAverageRows(raw), raw,
      { highlights:[2], eventText:'C3 − arithmetic mean' });
    _montageTeachingLegend(ctx, p, layout);
    _bioFooter(ctx, p, layout, 'The mean is recomputed at every sample, so every displayed channel contributes.');
  }

  function _montageCompareView(ctx, p, layout, raw) {
    var top = _bioHeader(ctx, p, layout, 'Same event, two montages', 'one voltage dataset · two algebraic views');
    var refRows = _montageReferentialRows(raw).slice(1, 4);
    var bipolarRows = _montageBipolarRows(raw).slice(1, 3);
    _bioLabel(ctx, p, 'SAME UNDERLYING ELECTRODE VOLTAGES', layout.w / 2, top + 7, 'center', true);

    if (layout.compact) {
      _montagePanel(ctx, p, 10, top + 17, layout.w - 20, 75,
        'REFERENTIAL · C3 IS THE LARGEST LOCAL VOLTAGE',
        refRows, raw, { highlights:[1], eventText:'local maximum' });
      _montagePanel(ctx, p, 10, top + 98, layout.w - 20, 67,
        'BIPOLAR · ADJACENT ROWS REVERSE AROUND C3',
        bipolarRows, raw, { highlights:[0,1], eventText:'phase reversal' });
    } else {
      var gap = 10;
      var panelW = (layout.w - 28 - gap) / 2;
      _montagePanel(ctx, p, 14, top + 23, panelW, 140,
        'REFERENTIAL · LOCAL MAXIMUM AT C3',
        refRows, raw, { highlights:[1], eventText:'C3 maximum' });
      _montagePanel(ctx, p, 14 + panelW + gap, top + 23, panelW, 140,
        'LONGITUDINAL BIPOLAR · SHARED C3',
        bipolarRows, raw, { highlights:[0,1], eventText:'phase reversal' });
    }

    _bioLabel(ctx, p, 'C3 is shared by F3−C3 and C3−P3, producing opposite deflections.',
      layout.w / 2, top + 190, 'center', true);
    _montageTeachingLegend(ctx, p, layout);
    _bioFooter(ctx, p, layout, 'Phase reversal identifies a montage maximum—not one uniquely proven brain source.');
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  global.VizEngine = VizEngine;

}(window));
