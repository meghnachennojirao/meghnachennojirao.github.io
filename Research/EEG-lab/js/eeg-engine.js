/*
 * EEG Engine — signal simulation + canvas rendering
 * Self-contained: EEGSimulator + EEGViewer
 */
(function (global) {
  'use strict';

  var SR = 256; // samples/sec
  var CHANNELS = ['Fp1','Fp2','F3','F4','C3','C4','T3','T4','O1','O2'];
  var N_CH = CHANNELS.length;

  // ── Spatial weights per channel [Fp1,Fp2,F3,F4,C3,C4,T3,T4,O1,O2] ──────

  var SP = {
    alpha:   [0.05,0.05,0.18,0.18,0.32,0.32,0.22,0.22,1.0,1.0],
    beta:    [0.75,0.75,1.0,1.0,0.55,0.55,0.25,0.25,0.15,0.15],
    theta:   [0.15,0.15,0.22,0.22,0.38,0.38,1.0,1.0,0.28,0.28],
    delta:   [0.5,0.5,0.6,0.6,0.75,0.75,0.65,0.65,0.45,0.45],
    frontal: [1.0,1.0,0.85,0.85,0.35,0.35,0.1,0.1,0.05,0.05],
    leftH:   [0.9,0.1,0.8,0.1,0.75,0.1,1.0,0.1,0.65,0.1],
    rightH:  [0.1,0.9,0.1,0.8,0.1,0.75,0.1,1.0,0.1,0.65],
  };

  // ── Presets ───────────────────────────────────────────────────────────────

  var PRESETS = {
    normal_awake: {
      label:'Normal Awake Adult', group:'Normal',
      desc:'Posterior dominant alpha (10 Hz) with anterior beta. Eyes-closed resting state.',
      alpha:48, alphaFreq:10, beta:14, theta:6, delta:4, noise:7, events:null
    },
    drowsy: {
      label:'Drowsiness', group:'Normal',
      desc:'Alpha slows to 8 Hz. Anterior theta emerges. Occasional vertex sharp waves.',
      alpha:28, alphaFreq:8, beta:6, theta:22, delta:10, noise:8, events:'vertex_sharp'
    },
    sleep_2: {
      label:'Stage 2 Sleep', group:'Normal',
      desc:'Sleep spindles (14 Hz, vertex-maximal) and K-complexes on a theta-delta background.',
      alpha:0, alphaFreq:10, beta:4, theta:12, delta:18, noise:9, events:'spindles_k'
    },
    normal_pediatric: {
      label:'Normal Child (5 yr)', group:'Normal',
      desc:'PDR ~7–8 Hz, higher amplitude, more theta than adult. Normal for age.',
      alpha:55, alphaFreq:7.5, beta:8, theta:30, delta:15, noise:10, events:null
    },
    eye_blink: {
      label:'Eye Blink Artifact', group:'Artifact',
      desc:'Large bifrontal deflections every 3–5 s from the corneoretinal dipole.',
      alpha:28, alphaFreq:10, beta:8, theta:5, delta:4, noise:6, events:'eye_blinks'
    },
    muscle: {
      label:'Muscle (EMG) Artifact', group:'Artifact',
      desc:'High-frequency EMG bursts at temporal electrodes from temporalis tension.',
      alpha:25, alphaFreq:10, beta:8, theta:5, delta:4, noise:6, events:'muscle_burst'
    },
    sweat_drift: {
      label:'Sweat Artifact (Slow Drift)', group:'Artifact',
      desc:'Synthetic very-slow, irregular electrode drift, strongest frontotemporally. This nonphysiologic pattern is shown for artifact recognition.',
      alpha:18, alphaFreq:9.5, beta:5, theta:5, delta:2, noise:3,
      events:'sweat_drift', seed:1101
    },
    cardiac: {
      label:'Cardiac Artifact', group:'Artifact',
      desc:'Regular QRS-locked sharp deflections at temporal electrodes (75 bpm).',
      alpha:30, alphaFreq:10, beta:8, theta:5, delta:4, noise:6, events:'cardiac'
    },
    wicket: {
      label:'Wicket Waves (Normal Variant)', group:'Normal Variant',
      desc:'Monophasic arciform 8 Hz temporal runs during drowsiness. No afterdischarge — benign.',
      alpha:20, alphaFreq:8, beta:5, theta:16, delta:8, noise:7, events:'wicket'
    },
    focal_spike: {
      label:'Focal Temporal Spike', group:'Epileptiform',
      desc:'Left temporal interictal spike-wave (T3 phase reversal). Classic TLE interictal pattern.',
      alpha:32, alphaFreq:10, beta:8, theta:7, delta:6, noise:6, events:'focal_spike_left'
    },
    right_posterior_spike: {
      label:'Right Posterior Spike (Teaching Pattern)', group:'Epileptiform',
      desc:'Synthetic recurrent sharp transients with a following slow wave, maximal at O2 with a field toward T4 and C4. A waveform alone is not a diagnosis.',
      alpha:28, alphaFreq:9.5, beta:6, theta:7, delta:5, noise:4,
      events:'right_posterior_spike', seed:1202
    },
    generalized_sw: {
      label:'3 Hz Generalized Spike-Wave', group:'Epileptiform',
      desc:'Bilateral synchronous 3 Hz spike-wave bursts. Classic childhood absence epilepsy.',
      alpha:0, alphaFreq:10, beta:0, theta:0, delta:0, noise:5, events:'gen_spike_wave'
    },
    lpd: {
      label:'Lateralized Periodic Discharges', group:'Epileptiform',
      desc:'Regular 1 Hz sharp-slow complexes over right hemisphere. Ictal-interictal continuum.',
      alpha:8, alphaFreq:9, beta:4, theta:8, delta:6, noise:6, events:'lpd_right'
    },
    focal_delta: {
      label:'Focal Left Temporal Delta', group:'Pathological',
      desc:'Continuous polymorphic delta over left temporal region — structural lesion until proven otherwise.',
      alpha:30, alphaFreq:10, beta:7, theta:12, delta:50, noise:9, events:null, leftDelta:true
    },
    diffuse_slowing: {
      label:'Diffuse Encephalopathy', group:'Pathological',
      desc:'Generalized theta-delta replacing normal alpha. Background slowing proportional to severity.',
      alpha:5, alphaFreq:6.5, beta:3, theta:38, delta:28, noise:11, events:null
    },
    triphasic: {
      label:'Triphasic Waves', group:'Pathological',
      desc:'Bifrontal triphasic waves at 1.8 Hz. Hepatic/uremic encephalopathy — can mimic NCSE.',
      alpha:5, alphaFreq:6.5, beta:3, theta:14, delta:10, noise:8, events:'triphasic'
    },
    ncse_continuous: {
      label:'Continuous Rhythmic Sharp-Slow Pattern', group:'Ictal-Continuum Teaching Pattern',
      desc:'Synthetic continuous 2.4 Hz anterior-predominant sharp-slow activity with superimposed fast components. Clinical context and formal criteria are required; this display is not diagnostic of NCSE.',
      alpha:0, alphaFreq:10, beta:0, theta:5, delta:5, noise:3,
      events:'ncse_continuous', seed:1303
    },
    temporal_seizure: {
      label:'Temporal Lobe Seizure (Ictal)', group:'Seizure',
      desc:'Left temporal focal seizure: theta onset → alpha build → slowing → post-ictal delta.',
      alpha:18, alphaFreq:10, beta:5, theta:5, delta:4, noise:5, events:'temporal_seizure'
    },
    gtc_seizure: {
      label:'Generalized Tonic-Clonic (Ictal)', group:'Seizure',
      desc:'GTC seizure: tonic fast → clonic spike-wave → post-ictal suppression.',
      alpha:20, alphaFreq:10, beta:8, theta:5, delta:4, noise:6, events:'gtc_seizure'
    },
    gtc_seizure_emg: {
      label:'Generalized Convulsive Event with EMG (Simulation)', group:'Seizure Teaching Pattern',
      desc:'Synthetic sequence of generalized tonic fast activity, slowing clonic complexes, and low-amplitude recovery, with prominent frontotemporal muscle artifact. It is an educational simulation, not a diagnostic recording.',
      alpha:4, alphaFreq:9, beta:3, theta:2, delta:2, noise:3,
      events:'gtc_seizure_emg', seed:1404
    },
    rmt_drowsy: {
      label:'Rhythmic Mid-Temporal Theta of Drowsiness', group:'Normal Variant',
      desc:'Non-evolving 5-7 Hz sharply contoured temporal runs that alternate sides on a drowsy background. This synthetic RMTD pattern illustrates a benign normal variant.',
      alpha:14, alphaFreq:8, beta:4, theta:13, delta:8, noise:4,
      events:'rmt_drowsy', seed:1505
    },
    bsss_sleep: {
      label:'Benign Sporadic Sleep Spikes', group:'Normal Variant',
      desc:'Brief, low-amplitude, isolated temporal sharp transients on a light-sleep background, with alternating sides and no rhythmic afterdischarge. Also called small sharp spikes.',
      alpha:0, alphaFreq:8, beta:3, theta:13, delta:15, noise:4,
      events:'bsss_sleep', seed:1606
    },
    sreda: {
      label:'SREDA (Normal Variant)', group:'Normal Variant',
      desc:'A monomorphic 6 Hz sharply contoured run over both posterior temporal regions without frequency evolution. This synthetic pattern illustrates subclinical rhythmic EEG discharge of adults.',
      alpha:12, alphaFreq:9, beta:4, theta:8, delta:5, noise:4,
      events:'sreda', seed:1707
    },
    positive_14_6: {
      label:'14-and-6 Hz Positive Bursts', group:'Normal Variant',
      desc:'Short trains of positive 14 Hz and 6 Hz sharp activity, maximal over alternating posterior temporal regions during drowsiness. This is a synthetic normal-variant example.',
      alpha:8, alphaFreq:8, beta:3, theta:10, delta:10, noise:4,
      events:'positive_14_6', seed:1808
    },
  };

  // ── EEGSimulator ──────────────────────────────────────────────────────────

  function EEGSimulator(presetName) {
    this.t = 0;
    this.noise = new Float32Array(N_CH);   // smooth noise state per channel
    this.phases = [];
    this.ev = {};   // event state
    this._rngState = 0;
    for (var i = 0; i < N_CH; i++) this.phases.push(Math.random() * Math.PI * 2);
    this.setPreset(presetName || 'normal_awake');
  }

  // Presets with a seed are reproducible across resets; legacy presets retain
  // their original Math.random-backed behavior.
  EEGSimulator.prototype._random = function () {
    if (!this._rngState) return Math.random();
    var x = this._rngState;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this._rngState = x >>> 0;
    return this._rngState / 4294967296;
  };

  EEGSimulator.prototype.setPreset = function (name) {
    this.p = PRESETS[name] || PRESETS.normal_awake;
    this.presetName = name;
    this.t = 0;
    this._rngState = this.p.seed || 0;
    this.noise.fill(0);
    if (this.p.seed) {
      for (var i = 0; i < N_CH; i++) this.phases[i] = this._random() * Math.PI * 2;
    }
    this.ev = { next: 2.5 + this._random() };
  };

  EEGSimulator.prototype.generate = function (n) {
    var result = [];
    for (var c = 0; c < N_CH; c++) result.push(new Float32Array(n));
    var dt = 1 / SR, p = this.p;

    for (var s = 0; s < n; s++) {
      var t = this.t;
      var evArr = this._event(t);

      for (var c = 0; c < N_CH; c++) {
        var ph = this.phases[c], sig = 0;

        // Smooth (pink-ish) noise: EMA of randoms
        this.noise[c] = this.noise[c] * 0.82 + (this._random() - 0.5) * p.noise * 0.36;
        sig += this.noise[c] + (this._random() - 0.5) * p.noise * 0.14;

        // Alpha (waxing-waning envelope at 0.07 Hz)
        if (p.alpha) {
          var aEnv = 0.68 + 0.32 * Math.sin(2 * Math.PI * 0.07 * t + ph * 0.4);
          sig += p.alpha * SP.alpha[c] * aEnv * Math.sin(2 * Math.PI * p.alphaFreq * t + ph);
          sig += p.alpha * 0.1 * SP.alpha[c] * Math.sin(2 * Math.PI * p.alphaFreq * 2 * t + ph);
        }
        // Beta (two overlapping frequencies)
        if (p.beta) {
          sig += p.beta * SP.beta[c] * (
            0.58 * Math.sin(2 * Math.PI * 20 * t + ph * 1.3) +
            0.42 * Math.sin(2 * Math.PI * 26 * t + ph * 1.8)
          );
        }
        // Theta
        if (p.theta) sig += p.theta * SP.theta[c] * Math.sin(2 * Math.PI * 6.2 * t + ph * 0.7);
        // Delta — left-biased if leftDelta preset
        if (p.delta) {
          var dw = p.leftDelta ? (c % 2 === 0 ? SP.leftH[c] * 1.6 : SP.delta[c] * 0.35) : SP.delta[c];
          sig += p.delta * dw * (
            0.65 * Math.sin(2 * Math.PI * 1.4 * t + ph * 0.2) +
            0.35 * Math.sin(2 * Math.PI * 2.2 * t + ph * 0.35)
          );
        }
        // Event overlay
        if (evArr) sig += evArr[c] || 0;
        result[c][s] = sig;
      }
      this.t += dt;
    }
    return result;
  };

  EEGSimulator.prototype._event = function (t) {
    var p = this.p, ev = this.ev;
    if (!p.events) return null;
    var out = new Float32Array(N_CH);

    switch (p.events) {

      case 'sweat_drift':
        // Very slow, electrode-specific baseline wander rather than cerebral rhythm.
        var sdLeft = 108 * Math.sin(2 * Math.PI * 0.085 * t + 0.35)
          + 34 * Math.sin(2 * Math.PI * 0.21 * t + 1.1);
        var sdRight = 76 * Math.sin(2 * Math.PI * 0.065 * t + 2.0)
          + 29 * Math.sin(2 * Math.PI * 0.17 * t + 0.2);
        out[0] += sdLeft;
        out[2] += sdLeft * 0.56;
        out[6] += sdLeft * 0.72;
        out[1] += sdRight;
        out[3] += sdRight * 0.48;
        out[7] += sdRight * 0.64;
        out[4] += (sdLeft - sdRight) * 0.18;
        out[5] += (sdRight - sdLeft) * 0.15;
        break;

      case 'eye_blinks':
        if (t >= ev.next) {
          var age = t - ev.next, amp;
          if (age < 0.28) {
            amp = 190 * Math.exp(-Math.pow((age - 0.1) / 0.055, 2));
            out[0] += amp; out[1] += amp;
            out[2] += amp * 0.38; out[3] += amp * 0.38;
          } else ev.next = t + 2.8 + Math.random() * 2.2;
        }
        break;

      case 'muscle_burst':
        if (t >= ev.next) {
          var age = t - ev.next;
          if (age < 1.4) {
            var env = Math.sin(Math.PI * age / 0.7) * (age < 0.7 ? 1 : Math.exp(-2 * (age - 0.7)));
            var hf = Math.sin(2*Math.PI*85*t) * 0.5 + Math.sin(2*Math.PI*115*t) * 0.35 + Math.sin(2*Math.PI*150*t) * 0.15;
            var m = 28 * env * hf;
            out[6] += m; out[7] += m * 0.7; out[2] += m * 0.28; out[3] += m * 0.28;
          } else ev.next = t + 1.8 + Math.random() * 1.6;
        }
        break;

      case 'cardiac':
        // Regular 1/0.8 = 1.25 Hz (75 bpm)
        var ph_c = (t * 1.25) % 1.0;
        if (ph_c < 0.06) {
          var cAmp = 55 * Math.exp(-Math.pow((ph_c - 0.02) / 0.012, 2));
          out[6] += cAmp; out[7] += cAmp * 0.6; out[4] += cAmp * 0.25;
        }
        break;

      case 'vertex_sharp':
        if (t >= ev.next) {
          var age = t - ev.next;
          if (age < 0.18) {
            var v = -130 * Math.exp(-Math.pow((age - 0.06) / 0.035, 2));
            out[4] += v; out[5] += v; out[2] += v * 0.45; out[3] += v * 0.45;
          } else ev.next = t + 3.8 + Math.random() * 2.5;
        }
        break;

      case 'spindles_k':
        if (!ev.spNext) { ev.spNext = 1.5; ev.kNext = 4.5; }
        if (t >= ev.spNext) {
          var age = t - ev.spNext;
          if (age < 1.3) {
            var env = Math.sin(Math.PI * age / 1.3);
            var sp = 65 * env * Math.sin(2 * Math.PI * 14 * t);
            out[4] += sp; out[5] += sp; out[2] += sp * 0.48; out[3] += sp * 0.48;
          } else ev.spNext = t + 3.8 + Math.random() * 2.2;
        }
        if (t >= ev.kNext) {
          var age = t - ev.kNext;
          if (age < 0.55) {
            var k = age < 0.12 ? -220 * (age / 0.12)
              : -220 * Math.exp(-7 * (age - 0.12)) + 90 * (1 - Math.exp(-5 * (age - 0.12)));
            out[4] += k * 0.85; out[5] += k * 0.85; out[2] += k * 0.5; out[3] += k * 0.5;
          } else ev.kNext = t + 7.5 + Math.random() * 4.5;
        }
        break;

      case 'focal_spike_left':
        if (t >= ev.next) {
          var age = t - ev.next;
          if (age < 0.65) {
            var spk = age < 0.07 ? -190 * Math.exp(-Math.pow((age - 0.03) / 0.016, 2)) : 0;
            var sw  = (age > 0.06 && age < 0.58) ? 90 * Math.sin(Math.PI * (age - 0.06) / 0.52) : 0;
            var tot = spk - sw;
            out[6] += tot; out[4] += tot * 0.42; out[2] += tot * 0.2; out[8] += tot * 0.15;
          } else ev.next = t + 2.8 + Math.random() * 2.4;
        }
        break;

      case 'right_posterior_spike':
        // Fixed recurrence keeps the teaching example reproducible. O2 is maximal,
        // with a plausible ipsilateral posterior-temporal field.
        var rpCycle = t % 2.8;
        if (rpCycle >= 0.9 && rpCycle < 1.5) {
          var rpAge = rpCycle - 0.9;
          var rpSharp = -205 * Math.exp(-Math.pow((rpAge - 0.035) / 0.015, 2));
          var rpSlow = (rpAge > 0.065 && rpAge < 0.54)
            ? 92 * Math.sin(Math.PI * (rpAge - 0.065) / 0.475) : 0;
          var rp = rpSharp + rpSlow;
          out[9] += rp;
          out[7] += rp * 0.62;
          out[5] += rp * 0.30;
          out[3] += rp * 0.14;
          out[8] += rp * 0.12;
        }
        break;

      case 'gen_spike_wave':
        if (!ev.burstStart) { ev.burstStart = 1.8; ev.inB = false; }
        if (!ev.inB && t >= ev.burstStart) {
          ev.inB = true; ev.bT = t; ev.bDur = 3.2 + Math.random() * 2.8;
        }
        if (ev.inB) {
          var age = t - ev.bT;
          if (age < ev.bDur) {
            var cyc = (age * 3) % 1;
            var s = cyc < 0.08 ? -210 * Math.exp(-Math.pow((cyc - 0.04) / 0.022, 2))
              : cyc < 0.46 ? 130 * Math.sin(Math.PI * (cyc - 0.08) / 0.38) : 0;
            for (var cc = 0; cc < N_CH; cc++) out[cc] += s * (SP.frontal[cc] * 0.75 + 0.25);
          } else {
            ev.inB = false; ev.burstStart = t + 4.5 + Math.random() * 4;
          }
        }
        break;

      case 'ncse_continuous':
        // Continuous anterior-predominant sharp-slow morphology. It deliberately
        // differs from the finite 3 Hz bursts and from the slower triphasic preset.
        var ncCycle = (t * 2.4) % 1;
        var ncSharp = -168 * Math.exp(-Math.pow((ncCycle - 0.055) / 0.024, 2));
        var ncSlow = (ncCycle > 0.10 && ncCycle < 0.68)
          ? 104 * Math.sin(Math.PI * (ncCycle - 0.10) / 0.58) : 0;
        var ncFast = 20 * Math.sin(2 * Math.PI * 12 * t)
          * (0.72 + 0.28 * Math.cos(2 * Math.PI * 2.4 * t));
        var ncAmp = 0.88 + 0.12 * Math.sin(2 * Math.PI * 0.075 * t);
        var nc = (ncSharp + ncSlow + ncFast) * ncAmp;
        for (var cc = 0; cc < N_CH; cc++) {
          out[cc] += nc * (0.28 + SP.frontal[cc] * 0.72);
        }
        break;

      case 'lpd_right':
        var ph_l = (t * 1.0) % 1;
        if (ph_l < 0.18) {
          var lp = ph_l < 0.05 ? -160 * Math.exp(-Math.pow((ph_l - 0.025) / 0.016, 2))
            : 70 * Math.exp(-7 * (ph_l - 0.05));
          out[1] += lp; out[3] += lp * 0.88; out[5] += lp * 0.78; out[7] += lp; out[9] += lp * 0.58;
        }
        break;

      case 'temporal_seizure':
        if (!ev.szStart) ev.szStart = 4.5;
        if (t >= ev.szStart && !ev.inSz) { ev.inSz = true; ev.szT = t; }
        if (ev.inSz) {
          var age = t - ev.szT, szSig = 0, szF;
          if (age < 4) {
            szF = 6.5 + age * 0.55; szSig = (42 + age * 16) * Math.sin(2 * Math.PI * szF * t);
          } else if (age < 11) {
            szF = 8.8 + (age - 4) * 0.35; szSig = (100 + (age - 4) * 9) * Math.sin(2 * Math.PI * szF * t);
          } else if (age < 18) {
            szF = Math.max(2, 9 - (age - 11) * 0.9); szSig = 145 * Math.exp(-0.09 * (age - 11)) * Math.sin(2 * Math.PI * szF * t);
          } else if (age < 26) {
            // post-ictal delta
            szSig = 70 * Math.exp(-0.25 * (age - 18)) * Math.sin(2 * Math.PI * 1.4 * t);
          } else {
            ev.inSz = false; ev.szStart = t + 12;
          }
          out[6] += szSig; out[4] += szSig * 0.55; out[2] += szSig * 0.38;
          out[7] += szSig * 0.28; out[8] += szSig * 0.22;
        }
        break;

      case 'gtc_seizure':
        if (!ev.szStart) ev.szStart = 4;
        if (t >= ev.szStart && !ev.inSz) { ev.inSz = true; ev.szT = t; }
        if (ev.inSz) {
          var age = t - ev.szT, szSig = 0;
          if (age < 6) {
            // Tonic: high-amp fast
            szSig = (80 + age * 20) * (Math.sin(2*Math.PI*18*t) + 0.4*Math.sin(2*Math.PI*28*t));
          } else if (age < 16) {
            // Clonic: spike-wave slowing from 5 Hz → 2.5 Hz
            var cHz = Math.max(2.5, 5 - (age - 6) * 0.25);
            var cCyc = (age * cHz) % 1;
            szSig = cCyc < 0.12 ? -200 * Math.exp(-Math.pow((cCyc - 0.06) / 0.03, 2))
              : cCyc < 0.5 ? 110 * Math.sin(Math.PI * (cCyc - 0.12) / 0.38) : 0;
          } else if (age < 22) {
            // Post-ictal suppression (very low amplitude)
            szSig = 8 * (Math.random() - 0.5);
          } else {
            ev.inSz = false; ev.szStart = t + 15;
          }
          for (var cc = 0; cc < N_CH; cc++) out[cc] += szSig * (SP.frontal[cc] * 0.5 + 0.5);
        }
        break;

      case 'gtc_seizure_emg':
        if (!ev.convStart) ev.convStart = 3.5;
        if (t >= ev.convStart && !ev.inConv) { ev.inConv = true; ev.convT = t; }
        if (ev.inConv) {
          var convAge = t - ev.convT;
          var convBrain = 0;
          var convEmg = 0;
          if (convAge < 5.5) {
            // Generalized tonic fast activity plus sustained high-frequency muscle.
            var tonicRamp = 0.72 + 0.28 * Math.min(1, convAge / 1.4);
            convBrain = tonicRamp * (112 * Math.sin(2 * Math.PI * 17 * t)
              + 46 * Math.sin(2 * Math.PI * 27 * t));
            convEmg = (74 + convAge * 7) * (0.56 * Math.sin(2 * Math.PI * 47 * t)
              + 0.29 * Math.sin(2 * Math.PI * 73 * t + 0.6)
              + 0.15 * Math.sin(2 * Math.PI * 101 * t + 1.2));
          } else if (convAge < 15.5) {
            // Discrete clonic complexes progressively slow from about 5 to 2.6 Hz.
            var clonicAge = convAge - 5.5;
            var clonicCycles = 5 * clonicAge - 0.12 * clonicAge * clonicAge;
            var clonicPhase = clonicCycles % 1;
            convBrain = clonicPhase < 0.11
              ? -218 * Math.exp(-Math.pow((clonicPhase - 0.055) / 0.027, 2))
              : clonicPhase < 0.53
                ? 116 * Math.sin(Math.PI * (clonicPhase - 0.11) / 0.42) : 0;
            var clonicMuscleEnv = Math.exp(-Math.pow((clonicPhase - 0.10) / 0.13, 2));
            convEmg = 112 * clonicMuscleEnv * (0.62 * Math.sin(2 * Math.PI * 52 * t)
              + 0.38 * Math.sin(2 * Math.PI * 89 * t + 0.8));
          } else if (convAge < 21.5) {
            // Low-amplitude synthetic recovery interval; the preset background is quiet.
            convBrain = 3.5 * Math.sin(2 * Math.PI * 1.1 * t);
          } else {
            ev.inConv = false;
            ev.convStart = t + 14;
          }
          for (var cc = 0; cc < N_CH; cc++) {
            var convMuscleW = cc < 2 ? 1.0 : cc < 4 ? 0.50
              : cc < 6 ? 0.24 : cc < 8 ? 0.88 : 0.14;
            out[cc] += convBrain * (0.72 + 0.28 * SP.frontal[cc])
              + convEmg * convMuscleW;
          }
        }
        break;

      case 'triphasic':
        var ph_tw = (t * 1.85) % 1;
        if (ph_tw < 0.32) {
          var tw = ph_tw < 0.055  ? -88 * Math.sin(Math.PI * ph_tw / 0.055)
            : ph_tw < 0.135 ? 130 * Math.sin(Math.PI * (ph_tw - 0.055) / 0.08)
            : ph_tw < 0.245 ? -65 * Math.sin(Math.PI * (ph_tw - 0.135) / 0.11)
            : 0;
          out[0] += tw; out[1] += tw;
          out[2] += tw * 0.88; out[3] += tw * 0.88;
          out[4] += tw * 0.58; out[5] += tw * 0.58;
          out[8] += tw * 0.28; out[9] += tw * 0.28;
        }
        break;

      case 'wicket':
        if (!ev.wkNext) ev.wkNext = 1.8;
        if (!ev.inWk && t >= ev.wkNext) { ev.inWk = true; ev.wkT = t; ev.wkDur = 0.9 + Math.random() * 1.1; }
        if (ev.inWk) {
          var age = t - ev.wkT;
          if (age < ev.wkDur) {
            var env = Math.sin(Math.PI * age / ev.wkDur);
            var wk = 62 * env * Math.max(0, Math.sin(2 * Math.PI * 8 * t));
            out[6] += wk; out[7] += wk * 0.55;
          } else {
            ev.inWk = false; ev.wkNext = t + 2.8 + Math.random() * 2.8;
          }
        }
        break;

      case 'rmt_drowsy':
        // Separate non-evolving temporal runs make laterality and lack of spread clear.
        var rmtCycle = t % 10.5;
        var rmtAge = -1;
        var rmtLeft = true;
        var rmtFreq = 6.2;
        if (rmtCycle >= 1.0 && rmtCycle < 3.7) {
          rmtAge = rmtCycle - 1.0;
        } else if (rmtCycle >= 5.2 && rmtCycle < 7.9) {
          rmtAge = rmtCycle - 5.2;
          rmtLeft = false;
          rmtFreq = 5.8;
        }
        if (rmtAge >= 0) {
          var rmtEnv = Math.min(1, rmtAge / 0.28, (2.7 - rmtAge) / 0.28);
          var rmt = 58 * rmtEnv * (Math.sin(2 * Math.PI * rmtFreq * t)
            + 0.27 * Math.sin(2 * Math.PI * rmtFreq * 2 * t + 0.45));
          if (rmtLeft) {
            out[6] += rmt;
            out[4] += rmt * 0.48;
            out[2] += rmt * 0.27;
            out[8] += rmt * 0.17;
            out[7] += rmt * 0.08;
          } else {
            out[7] += rmt;
            out[5] += rmt * 0.48;
            out[3] += rmt * 0.27;
            out[9] += rmt * 0.17;
            out[6] += rmt * 0.08;
          }
        }
        break;

      case 'bsss_sleep':
        // Brief, isolated, alternating small sharp spikes without an afterdischarge.
        var bsCycle = t % 10.4;
        var bsAge = -1;
        var bsRight = false;
        if (bsCycle >= 1.25 && bsCycle < 1.37) {
          bsAge = bsCycle - 1.25;
        } else if (bsCycle >= 3.72 && bsCycle < 3.84) {
          bsAge = bsCycle - 3.72;
          bsRight = true;
        } else if (bsCycle >= 6.18 && bsCycle < 6.30) {
          bsAge = bsCycle - 6.18;
        } else if (bsCycle >= 8.62 && bsCycle < 8.74) {
          bsAge = bsCycle - 8.62;
          bsRight = true;
        }
        if (bsAge >= 0) {
          var bs = -58 * Math.exp(-Math.pow((bsAge - 0.024) / 0.010, 2))
            + 18 * Math.exp(-Math.pow((bsAge - 0.066) / 0.022, 2));
          if (bsRight) {
            out[7] += bs;
            out[5] += bs * 0.38;
            out[9] += bs * 0.28;
            out[3] += bs * 0.16;
          } else {
            out[6] += bs;
            out[4] += bs * 0.38;
            out[8] += bs * 0.28;
            out[2] += bs * 0.16;
          }
        }
        break;

      case 'sreda':
        // Bilateral posterior-temporal, monomorphic 6 Hz run with no evolution.
        var srCycle = t % 13;
        if (srCycle >= 1.5 && srCycle < 7.0) {
          var srAge = srCycle - 1.5;
          var srEnv = Math.min(1, srAge / 0.35, (5.5 - srAge) / 0.35);
          var sr = 66 * srEnv * (Math.sin(2 * Math.PI * 6 * t)
            + 0.34 * Math.sin(2 * Math.PI * 12 * t + 0.55));
          out[6] += sr;
          out[7] += sr * 0.96;
          out[8] += sr * 0.78;
          out[9] += sr * 0.76;
          out[4] += sr * 0.36;
          out[5] += sr * 0.35;
        }
        break;

      case 'positive_14_6':
        // Positive-polarity narrow transients in short posterior-temporal trains.
        var psCycle = t % 10.2;
        var psAge = -1;
        var psDur = 0;
        var psFreq = 14;
        var psRight = true;
        if (psCycle >= 1.0 && psCycle < 1.9) {
          psAge = psCycle - 1.0;
          psDur = 0.9;
        } else if (psCycle >= 4.0 && psCycle < 5.15) {
          psAge = psCycle - 4.0;
          psDur = 1.15;
          psFreq = 6;
          psRight = false;
        } else if (psCycle >= 7.1 && psCycle < 7.95) {
          psAge = psCycle - 7.1;
          psDur = 0.85;
          psRight = false;
        }
        if (psAge >= 0) {
          var psEnv = Math.sin(Math.PI * psAge / psDur);
          var psHalf = Math.max(0, Math.sin(2 * Math.PI * psFreq * psAge));
          var ps = 72 * psEnv * (Math.pow(psHalf, 5) - 0.11);
          if (psRight) {
            out[7] += ps;
            out[9] += ps * 0.58;
            out[5] += ps * 0.25;
            out[6] += ps * 0.10;
          } else {
            out[6] += ps;
            out[8] += ps * 0.58;
            out[4] += ps * 0.25;
            out[7] += ps * 0.10;
          }
        }
        break;
    }
    return out;
  };

  // ── EEGViewer ─────────────────────────────────────────────────────────────

  var WIN_SEC = 10;
  var WIN_N   = SR * WIN_SEC;

  function EEGViewer(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.gain    = 7;    // μV/px scaling denominator
    this.sim     = null;
    this.buf     = [];
    this.running = false;
    this._raf    = null;
    this._last   = null;
    this._dark   = false;
    for (var i = 0; i < N_CH; i++) this.buf.push(new Float32Array(WIN_N));
    this._loop   = this._loop.bind(this);
  }

  EEGViewer.prototype.attach = function (sim) {
    this.sim = sim;
    for (var i = 0; i < N_CH; i++) this.buf[i].fill(0);
    this._last = null;
  };

  EEGViewer.prototype.setGain = function (g) { this.gain = g; };
  EEGViewer.prototype.setDark = function (d) { this._dark = !!d; };

  EEGViewer.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._loop);
  };

  EEGViewer.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  EEGViewer.prototype._loop = function (now) {
    if (!this.running) return;
    var dt  = Math.min((now - (this._last || now)) / 1000, 0.1);
    this._last = now;

    if (this.sim) {
      var n = Math.max(1, Math.min(Math.round(dt * SR), SR / 8));
      var nd = this.sim.generate(n);
      for (var c = 0; c < N_CH; c++) {
        this.buf[c].copyWithin(0, n);
        this.buf[c].set(nd[c], WIN_N - n);
      }
    }
    this._draw();
    this._raf = requestAnimationFrame(this._loop);
  };

  EEGViewer.prototype._draw = function () {
    var cv  = this.canvas, ctx = this.ctx;
    var W   = cv.width, H = cv.height;
    var dk  = this._dark;

    var bg    = dk ? '#0c1d14' : '#fcfcfc';
    var trace = dk ? '#5be8a0' : '#1a4a2e';
    var grid  = dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    var label = dk ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)';
    var tick  = dk ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

    var LABEL_W = 38, PAD_B = 18;
    var chH  = (H - PAD_B) / N_CH;
    var dataW = W - LABEL_W;
    var gainPx = chH / (this.gain * 2 * 10); // 10 = μV sensitivity factor

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Grid ─────────────────────────────────────────────────────────────
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    // Vertical: every 1 second
    for (var s = 0; s <= WIN_SEC; s++) {
      var x = LABEL_W + (s / WIN_SEC) * dataW;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - PAD_B); ctx.stroke();
    }
    // Horizontal: every channel baseline
    for (var c = 0; c < N_CH; c++) {
      var y = chH * c + chH / 2;
      ctx.beginPath(); ctx.moveTo(LABEL_W, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // ── Amplitude scale ticks (±50 μV) ───────────────────────────────────
    ctx.strokeStyle = tick;
    ctx.lineWidth = 0.5;
    for (var c = 0; c < N_CH; c++) {
      var by = chH * c + chH / 2;
      var tick50 = 50 * gainPx;
      [by - tick50, by + tick50].forEach(function (ty) {
        ctx.beginPath(); ctx.moveTo(LABEL_W, ty); ctx.lineTo(LABEL_W + 6, ty); ctx.stroke();
      });
    }

    // ── Traces ───────────────────────────────────────────────────────────
    ctx.strokeStyle = trace;
    ctx.lineWidth = 1.2;
    ctx.lineJoin  = 'round';

    for (var c = 0; c < N_CH; c++) {
      var by   = chH * c + chH / 2;
      var data = this.buf[c];
      var step = dataW / WIN_N;

      ctx.beginPath();
      for (var i = 0; i < WIN_N; i++) {
        var x = LABEL_W + i * step;
        var y = by - data[i] * gainPx;
        // Clamp to channel box
        y = Math.max(chH * c + 2, Math.min(chH * (c + 1) - 2, y));
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // ── Channel labels ────────────────────────────────────────────────────
    ctx.fillStyle = label;
    ctx.font = 'bold 10px "Nunito Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var c = 0; c < N_CH; c++) {
      var by = chH * c + chH / 2;
      ctx.fillText(CHANNELS[c], LABEL_W - 4, by);
    }

    // ── Time scale ────────────────────────────────────────────────────────
    ctx.fillStyle = label;
    ctx.font = '9px "Nunito Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var s = 0; s <= WIN_SEC; s++) {
      var x = LABEL_W + (s / WIN_SEC) * dataW;
      ctx.fillText(s + 's', x, H - PAD_B + 3);
    }
  };

  // ── Exports ───────────────────────────────────────────────────────────────

  global.EEGSimulator = EEGSimulator;
  global.EEGViewer    = EEGViewer;
  global.EEG_PRESETS  = PRESETS;

}(window));
