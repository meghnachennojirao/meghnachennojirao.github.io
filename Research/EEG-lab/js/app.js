(function () {
  'use strict';

  var STORAGE_KEY = 'eeg-lab-progress-v2';
  var TOTAL = EEG_EXERCISES.length;
  var MODULE_COUNT = (window.EEG_MODULES && window.EEG_MODULES.length) || 10;
  var CHANNEL_NAMES = ['Fp1','Fp2','F3','F4','C3','C4','T7','T8','O1','O2'];

  var state = {
    screen: 'welcome',
    exerciseIdx: 0,
    cardIdx: 0,
    interacted: false,
    currentMeta: null,
    completedIds: []
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var META = window.EEG_LESSON_META || {};

  var screens = {
    welcome: $('#screen-welcome'),
    map: $('#screen-map'),
    stageIntro: $('#screen-stage-intro'),
    primer: $('#screen-primer'),
    look: $('#screen-look'),
    exercise: $('#screen-exercise'),
    answer: $('#screen-answer'),
    complete: $('#screen-complete')
  };

  var progressBar = $('#eeg-progress-bar');
  var exViz = null;
  var primerViz = null;
  var stageViz = null;
  var stageLine = null;
  var answerLine = null;
  var welcomeLine = null;
  var tapListener = null;

  var STAGE_META = {
    1: {
      title: 'From Cortex to Scalp',
      desc: 'Follow the field from synaptic current to scalp voltage.'
    },
    2: {
      title: 'The Electrode Map',
      desc: 'Build the measured head map before reading a trace.'
    },
    3: {
      title: 'Channels and Montages',
      desc: 'Learn what each line measures and how the view changes it.'
    },
    4: {
      title: 'Rhythms, Wake, and Sleep',
      desc: 'Recognize normal organization before naming abnormality.'
    },
    5: {
      title: 'Artifacts',
      desc: 'Separate patient, electrode, and environment from brain.'
    },
    6: {
      title: 'Benign Look-alikes',
      desc: 'Meet sharp-looking patterns that invite overcalling.'
    },
    7: {
      title: 'Abnormal Backgrounds',
      desc: 'Describe slowing, asymmetry, and epileptiform candidates carefully.'
    },
    8: {
      title: 'Seizures and Status',
      desc: 'Use evolution, field, duration, and context together.'
    },
    9: {
      title: 'Yield and Clinical Context',
      desc: 'Understand what a normal recording can and cannot exclude.'
    },
    10: {
      title: 'Full Cap Synthesis',
      desc: 'Bring montage, field, pattern, artifact, and patient together.'
    }
  };

  function getMeta(ex) {
    return META[ex.id] || {};
  }

  function getModuleIndices(moduleNum) {
    var indices = [];
    EEG_EXERCISES.forEach(function (exercise, index) {
      if (exercise.stage === moduleNum) indices.push(index);
    });
    return indices;
  }

  function getModuleProgress(moduleNum) {
    var indices = getModuleIndices(moduleNum);
    var complete = indices.filter(function (index) {
      return state.completedIds.indexOf(EEG_EXERCISES[index].id) !== -1;
    }).length;
    return { complete: complete, total: indices.length, indices: indices };
  }

  function openModule(moduleNum) {
    var progress = getModuleProgress(moduleNum);
    if (!progress.indices.length) return;
    var target = progress.indices.find(function (index) {
      return state.completedIds.indexOf(EEG_EXERCISES[index].id) === -1;
    });
    state.exerciseIdx = typeof target === 'number' ? target : progress.indices[0];
    state.cardIdx = 0;
    state.interacted = false;
    saveProgress();
    renderStageIntro(moduleNum);
  }

  function renderCourseMap() {
    var list = $('#module-list');
    list.innerHTML = '';

    for (var moduleNum = 1; moduleNum <= MODULE_COUNT; moduleNum++) {
      (function (number) {
        var meta = STAGE_META[number];
        var progress = getModuleProgress(number);
        var isCurrent = EEG_EXERCISES[state.exerciseIdx].stage === number;
        var row = document.createElement('button');
        var numberEl = document.createElement('span');
        var copy = document.createElement('span');
        var title = document.createElement('strong');
        var description = document.createElement('small');
        var status = document.createElement('span');

        row.type = 'button';
        row.className = 'eeg-module-row';
        if (isCurrent) row.setAttribute('aria-current', 'step');
        row.setAttribute('aria-label', 'Module ' + number + ': ' + meta.title + '. ' + progress.complete + ' of ' + progress.total + ' lessons complete.');

        numberEl.className = 'eeg-module-number';
        numberEl.textContent = String(number).padStart(2, '0');
        copy.className = 'eeg-module-copy';
        title.textContent = meta.title;
        description.textContent = meta.desc;
        copy.appendChild(title);
        copy.appendChild(description);

        status.className = 'eeg-module-status';
        status.textContent = progress.complete === progress.total ? 'Review' : (progress.complete ? 'Continue' : 'Start');
        status.setAttribute('data-progress', progress.complete + '/' + progress.total);

        row.appendChild(numberEl);
        row.appendChild(copy);
        row.appendChild(status);
        row.addEventListener('click', function () { openModule(number); });
        list.appendChild(row);
      }(moduleNum));
    }

    $('#map-progress-copy').textContent = state.completedIds.length + ' of ' + TOTAL + ' lessons';
    $('#map-progress-fill').style.width = (TOTAL ? (state.completedIds.length / TOTAL) * 100 : 0) + '%';
    $('#btn-map-resume').classList.toggle('is-hidden', state.completedIds.length === 0 && state.exerciseIdx === 0);
    showScreen('map');
  }

  function loadProgress() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (typeof saved.currentExerciseId === 'number') {
        var savedIdx = EEG_EXERCISES.findIndex(function (exercise) {
          return exercise.id === saved.currentExerciseId;
        });
        if (savedIdx >= 0) state.exerciseIdx = savedIdx;
      }
      if (Array.isArray(saved.completedIds)) {
        state.completedIds = saved.completedIds.filter(function (id) {
          return EEG_EXERCISES.some(function (exercise) { return exercise.id === id; });
        });
      }
    } catch (e) {}
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 2,
        currentExerciseId: EEG_EXERCISES[state.exerciseIdx].id,
        completedIds: state.completedIds
      }));
    } catch (e) {}
  }

  function resetProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    state.exerciseIdx = 0;
    state.cardIdx = 0;
    state.interacted = false;
    state.completedIds = [];
    if ($('#btn-resume')) $('#btn-resume').classList.add('is-hidden');
    if ($('#btn-map-resume')) $('#btn-map-resume').classList.add('is-hidden');
  }

  function renderStepbar(el, active, total) {
    if (!el) return;
    el.innerHTML = '';
    for (var i = 1; i <= total; i++) {
      var span = document.createElement('span');
      if (i <= active) span.className = 'is-active';
      el.appendChild(span);
    }
  }

  function updateProgressBar() {
    var pct = TOTAL ? (state.completedIds.length / TOTAL) * 100 : 0;
    if (state.screen === 'complete') pct = 100;
    progressBar.style.width = pct + '%';
    progressBar.style.opacity = state.screen === 'welcome' || state.screen === 'map' ? '0' : '1';
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('is-hidden', key !== name);
    });
    state.screen = name;
    updateProgressBar();
    window.scrollTo(0, 0);

    stopExerciseVisual();
    stopPrimerVisual();
    stopStageVisual();
    if (stageLine) stageLine.stop();
    if (answerLine) answerLine.stop();
    if (welcomeLine) {
      if (name === 'welcome') welcomeLine.start();
      else welcomeLine.stop();
    }
  }

  function sizeCanvas(canvas, height) {
    if (!canvas) return;
    var width = Math.max(280, canvas.parentElement.clientWidth || 360);
    canvas.width = width;
    canvas.height = height;
  }

  function makeSimulator(name) {
    return new EEGSimulator(name || 'normal_awake');
  }

  function createViz(canvas, visual) {
    if (!canvas || !visual || !window.VizEngine) return null;
    var kind = visual.kind || 'eeg-multi';
    var config = Object.assign({ minimal: true }, visual.config || {});
    var engine = new VizEngine(canvas, kind, config);
    engine.setDark(document.documentElement.dataset.theme === 'dark');

    if (visual.preset || visual.presetB) {
      var simA = makeSimulator(visual.preset || 'normal_awake');
      var simB = visual.presetB ? makeSimulator(visual.presetB) : null;
      engine.attach(simA, simB);
    }

    engine.start();
    return engine;
  }

  function stopExerciseVisual() {
    removeTapListener();
    if (exViz) {
      exViz.stop();
      exViz = null;
    }
  }

  function stopPrimerVisual() {
    if (primerViz) {
      primerViz.stop();
      primerViz = null;
    }
  }

  function stopStageVisual() {
    if (stageViz) {
      stageViz.stop();
      stageViz = null;
    }
  }

  function renderStageIntro(stageNum) {
    var meta = STAGE_META[stageNum];
    $('#stage-intro-num').textContent = 'Module ' + stageNum + ' of ' + MODULE_COUNT;
    $('#stage-intro-title').textContent = meta.title;
    $('#stage-intro-desc').textContent = meta.desc;
    renderStepbar($('#stage-stepbar'), stageNum, MODULE_COUNT);

    showScreen('stageIntro');

    var canvas = $('#stage-viz-canvas');
    if (!stageLine) stageLine = new AmbientLine(canvas, { compact: true });
    stageLine.start();
  }

  function getCards(ex, meta) {
    var sentences = [];
    var seen = {};
    var sourceCards = meta.cards || [];
    var terms = [];
    var termKeys = {};

    function addText(value) {
      if (!value || sentences.length >= 4) return;
      var sentence = String(value).trim();
      if (!sentence) return;
      if (!/[.!?]$/.test(sentence)) sentence += '.';
      var key = sentence.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      sentences.push(sentence);
    }

    addText(meta.lessonCopy);
    sourceCards.forEach(function (card) { addText(card.copy); });
    if (sentences.length < 2) addText(ex.body);
    addText(meta.why);
    addText(ex.concept);
    addText(meta.guide);

    sourceCards.forEach(function (card) {
      (card.terms || []).forEach(function (term) {
        var key = term.join('|').toLowerCase();
        if (termKeys[key]) return;
        termKeys[key] = true;
        terms.push(term);
      });
    });
    (meta.terms || []).forEach(function (term) {
      var key = term.join('|').toLowerCase();
      if (termKeys[key]) return;
      termKeys[key] = true;
      terms.push(term);
    });

    return [{
      title: (meta.explain && meta.explain.title) || meta.shortTitle || ex.title || 'Lesson briefing',
      copy: sentences.slice(0, 4).join(' '),
      terms: terms.slice(0, 4)
    }];
  }

  function renderPrimer(idx, cardIdx) {
    var ex = EEG_EXERCISES[idx];
    var meta = getMeta(ex);
    var cards = getCards(ex, meta);
    state.cardIdx = Math.max(0, Math.min(cardIdx || 0, cards.length - 1));
    var card = cards[state.cardIdx] || {};
    var moduleProgress = getModuleProgress(ex.stage);
    var lessonInModule = moduleProgress.indices.indexOf(idx) + 1;
    $('#primer-count').textContent = 'Module ' + ex.stage + ' · Lesson ' + lessonInModule + ' of ' + moduleProgress.total;
    $('#primer-title').textContent = card.title || meta.shortTitle || ex.title;
    $('#primer-copy').textContent = card.copy || meta.guide || ex.concept;
    $('#btn-primer-continue').textContent = 'Practice';
    renderStepbar($('#primer-stepbar'), ex.stage, MODULE_COUNT);
    renderTermList($('#primer-terms'), card.terms || []);

    showScreen('primer');
    renderPrimerVisual(ex, meta);
  }

  function renderPrimerVisual(ex, meta) {
    var visual = (meta && meta.visual) || { kind: 'eeg-multi', preset: 'normal_awake' };
    var canvas = $('#primer-viz-canvas');
    var report = $('#primer-report-wrap');

    stopPrimerVisual();
    canvas.setAttribute('aria-label', (meta.shortTitle || ex.title || 'Lesson') + ' concept diagram');

    if (visual.kind === 'report') {
      canvas.classList.add('is-hidden');
      report.classList.remove('is-hidden');
      renderReportInto(visual.report || {}, $('#primer-report-tabs'), $('#primer-report-rows'));
      return;
    }

    report.classList.add('is-hidden');
    canvas.classList.remove('is-hidden');
    var heights = { 'biophysics': 260, 'montage': 260, 'cap-trace': 240, 'eeg-multi': 235, 'frequency-scope': 235 };
    var height = heights[visual.kind] || 220;
    if (window.innerHeight < 760) height = Math.min(height, 195);
    sizeCanvas(canvas, height);
    primerViz = createViz(canvas, visual);
  }

  function renderLook(idx) {
    var ex = EEG_EXERCISES[idx];
    var meta = getMeta(ex);
    $('#look-count').textContent = 'Look ' + String(ex.id).padStart(2, '0');
    $('#look-title').textContent = meta.lookTitle || 'Look for one thing.';
    $('#look-copy').textContent = meta.notice || 'Notice one clear clue before you answer.';
    renderStepbar($('#look-stepbar'), ex.stage, MODULE_COUNT);
    renderTermList($('#look-terms'), meta.terms || []);

    showScreen('look');
    renderLookGraphic(ex, meta);
  }

  function renderPrimerGraphic(ex, meta, card) {
    var el = $('#primer-graphic');
    card = card || {};
    if (card.kind) {
      renderConceptGraphic(el, card.kind, card, ex, meta);
      return;
    }
    var visual = meta.visual || {};
    var type = 'field';
    if (visual.kind === 'head-diagram') type = 'address';
    else if (visual.kind === 'frequency-scope') type = 'rhythm';
    else if (visual.kind === 'compare-panel') type = 'compare';
    else if (visual.kind === 'report') type = 'report';
    else if (ex.stage >= 5) type = 'field';

    if (type === 'address') {
      var label = ex.id === 18 ? 'F8' : 'O2';
      el.innerHTML =
        '<div class="primer-address">' +
          '<div class="primer-address-head"></div>' +
          '<span class="primer-dot" style="left:32%;top:27%"></span>' +
          '<span class="primer-dot" style="left:62%;top:27%"></span>' +
          '<span class="primer-dot" style="left:22%;top:50%"></span>' +
          '<span class="primer-dot" style="left:72%;top:50%"></span>' +
          '<span class="primer-dot" style="left:36%;top:72%"></span>' +
          '<span class="primer-dot is-target" data-label="' + label + '" style="left:' + (label === 'F8' ? '78' : '61') + '%;top:' + (label === 'F8' ? '26' : '72') + '%"></span>' +
        '</div>';
    } else if (type === 'rhythm') {
      el.innerHTML =
        '<div class="primer-rhythm">' +
          '<div class="primer-rhythm-row"><span>slow</span><i class="primer-wave slow"></i></div>' +
          '<div class="primer-rhythm-row"><span>steady</span><i class="primer-wave mid"></i></div>' +
          '<div class="primer-rhythm-row"><span>fast</span><i class="primer-wave fast"></i></div>' +
        '</div>';
    } else if (type === 'compare') {
      el.innerHTML =
        '<div class="primer-compare">' +
          '<div class="primer-compare-card"><span>view one</span><i class="primer-compare-line" style="--tilt:-3deg"></i></div>' +
          '<div class="primer-compare-card"><span>view two</span><i class="primer-compare-line" style="--tilt:3deg"></i></div>' +
        '</div>';
    } else if (type === 'report') {
      el.innerHTML =
        '<div class="primer-report">' +
          '<div class="primer-report-line"><strong>Patient</strong><i class="primer-report-mark"></i></div>' +
          '<div class="primer-report-line"><strong>Trace</strong><i class="primer-report-mark is-active"></i></div>' +
          '<div class="primer-report-line"><strong>Meaning</strong><i class="primer-report-mark"></i></div>' +
        '</div>';
    } else {
      var focus = ex.stage <= 3 ? '50%' : (ex.stage === 4 ? '38%' : '68%');
      el.innerHTML = '<div class="primer-field"><i class="primer-field-line" style="--focus-x:' + focus + '"></i></div>';
    }
  }

  function renderLookGraphic(ex, meta) {
    var el = $('#look-graphic');
    var kind = meta.lookKind || 'spread';
    var visual = meta.visual || {};

    if (!meta.lookKind) {
      if (visual.kind === 'head-diagram') kind = 'side';
      else if (visual.kind === 'compare-panel') kind = 'flip';
      else if (visual.kind === 'frequency-scope') kind = 'speed';
      else if (visual.kind === 'report') kind = 'report';
      else if (ex.stage >= 5) kind = 'story';
    }

    renderConceptGraphic(el, kind, { focusX: meta.focusX }, ex, meta);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function getConceptLabel(card, fallback) {
    card = card || {};
    if (card.visualLabel) return card.visualLabel;
    if (card.terms && card.terms[0] && card.terms[0][0]) return card.terms[0][0];
    if (card.title) return String(card.title).replace(/[.?!]+$/g, '');
    return fallback || 'clue';
  }

  function getConceptNote(card, fallback) {
    card = card || {};
    if (card.visualNote) return card.visualNote;
    if (card.terms && card.terms[0] && card.terms[0][1]) return card.terms[0][1];
    return fallback || '';
  }

  function semanticTag(card, fallback) {
    var label = getConceptLabel(card, fallback);
    var note = getConceptNote(card, '');
    return '<span class="concept-semantic-tag"><b>' + escapeHtml(label) + '</b>' + (note ? '<small>' + escapeHtml(note) + '</small>' : '') + '</span>';
  }

  function inferSide(card) {
    var text = ((card && card.title) || '') + ' ' + ((card && card.copy) || '') + ' ' + ((card && card.terms) || []).map(function (t) { return t.join(' '); }).join(' ');
    text = text.toLowerCase();
    if (/both|two sides|whole head|broad|generalized/.test(text)) return 'both';
    if (/left|odd|c3|t3|o1|fp1|f3/.test(text)) return 'left';
    if (/right|even|c4|t4|o2|fp2|f4/.test(text)) return 'right';
    return 'both';
  }

  function inferSpeed(card) {
    var text = ((card && card.title) || '') + ' ' + ((card && card.copy) || '') + ' ' + ((card && card.terms) || []).map(function (t) { return t.join(' '); }).join(' ');
    text = text.toLowerCase();
    if (/slow|delta|theta|drowsy|k-complex|large slow|deep|yield/.test(text)) return 'slow';
    if (/fast|spindle|beta|muscle|emg|filter|artifact/.test(text)) return 'fast';
    return 'steady';
  }

  function renderConceptGraphic(el, kind, card, ex, meta) {
    card = card || {};

    if (kind === 'landmarks') {
      var mode = card.mode || 'frontback';
      var labelA = mode === 'ears' ? 'left ear point' : 'nasion';
      var labelB = mode === 'ears' ? 'right ear point' : 'inion';
      el.innerHTML =
        '<div class="concept-landmarks ' + (mode === 'ears' ? 'is-ears' : '') + '">' +
          '<i class="concept-head"></i>' +
          '<span class="concept-landmark-dot is-a"><b>' + labelA + '</b></span>' +
          '<span class="concept-landmark-dot is-b"><b>' + labelB + '</b></span>' +
          '<em></em>' +
        '</div>';
    } else if (kind === 'measure') {
      var marks = card.marks || ['10%', '20%', '20%', '20%', '20%', '10%'];
      el.innerHTML =
        '<div class="concept-measure">' +
          '<i></i>' +
          marks.map(function (mark) { return '<span>' + mark + '</span>'; }).join('') +
        '</div>';
    } else if (kind === 'intersections') {
      el.innerHTML =
        '<div class="concept-intersections">' +
          '<i></i><em></em><b></b>' +
          '<span style="left:35%;top:33%"></span><span style="left:50%;top:50%"></span><span style="left:65%;top:33%"></span>' +
          '<span style="left:35%;top:67%"></span><span style="left:65%;top:67%"></span>' +
        '</div>';
    } else if (kind === 'midline') {
      el.innerHTML =
        '<div class="concept-midline">' +
          '<i></i><em></em>' +
          '<span style="top:22%">Fz</span><span style="top:50%">Cz</span><span style="top:78%">Pz</span>' +
        '</div>';
    } else if (kind === 'dipole') {
      el.innerHTML =
        '<div class="concept-dipole">' +
          '<i></i><span class="is-front"><b>cornea +</b></span><span class="is-back"><b>retina -</b></span>' +
          '<em>' + escapeHtml(getConceptLabel(card, 'dipole')) + '</em>' +
        '</div>';
    } else if (kind === 'timing') {
      el.innerHTML =
        '<div class="concept-timing">' +
          '<span>EEG mark<i></i><i></i><i></i></span>' +
          '<span>ECG beat<i></i><i></i><i></i></span>' +
          '<b>' + escapeHtml(getConceptLabel(card, 'same timing')) + '</b>' +
        '</div>';
    } else if (kind === 'spike-tail') {
      el.innerHTML =
        '<div class="concept-spike-tail">' +
          '<i></i><em></em><b>' + escapeHtml(getConceptLabel(card, 'tail')) + '</b>' +
        '</div>';
    } else if (kind === 'polarity') {
      el.innerHTML =
        '<div class="concept-polarity">' +
          '<span><i class="is-up"></i><b>upward</b></span>' +
          '<span class="is-on"><i class="is-down"></i><b>' + escapeHtml(getConceptLabel(card, 'direction')) + '</b></span>' +
        '</div>';
    } else if (kind === 'line') {
      el.innerHTML = '<div class="concept-line">' + semanticTag(card, 'trace') + '<i></i></div>';
    } else if (kind === 'sensor') {
      el.innerHTML =
        '<div class="concept-sensor">' +
          '<i></i><span style="left:34%;top:34%"></span><span style="left:62%;top:34%"></span>' +
          '<span style="left:25%;top:58%"></span><span class="is-on" style="left:64%;top:68%"><b>' + escapeHtml(getConceptLabel(card, 'sensor')) + '</b></span>' +
        '</div>';
    } else if (kind === 'regions') {
      var activeRegion = card.region || 'back';
      el.innerHTML =
        '<div class="concept-regions">' +
          ['front','center','side','back'].map(function (name) {
            return '<span class="' + (name === activeRegion ? 'is-on' : '') + '">' + name + (name === activeRegion ? '<b>' + escapeHtml(getConceptLabel(card, name)) + '</b>' : '') + '</span>';
          }).join('') +
        '</div>';
    } else if (kind === 'code') {
      var parts = card.parts || ['O', '2'];
      var labels = card.labels || ['back', 'right'];
      el.innerHTML =
        '<div class="concept-code">' +
          '<span><b>' + parts[0] + '</b><small>' + labels[0] + '</small></span>' +
          '<span><b>' + parts[1] + '</b><small>' + labels[1] + '</small></span>' +
        '</div>';
    } else if (kind === 'compare') {
      var compareLabels = card.labels || ['view one', 'view two'];
      el.innerHTML =
        '<div class="primer-compare">' +
          '<div class="primer-compare-card"><span>' + compareLabels[0] + '</span><i class="primer-compare-line" style="--tilt:-3deg"></i></div>' +
          '<div class="primer-compare-card"><span>' + compareLabels[1] + '</span><i class="primer-compare-line" style="--tilt:3deg"></i></div>' +
          '<em>' + escapeHtml(getConceptLabel(card, 'compare')) + '</em>' +
        '</div>';
    } else if (kind === 'side') {
      var side = inferSide(card);
      el.innerHTML =
        '<div class="look-side">' +
          '<span class="' + (side === 'left' || side === 'both' ? 'is-on' : '') + '">left side<b>' + (side === 'left' ? escapeHtml(getConceptLabel(card, 'left')) : '') + '</b></span>' +
          '<span class="' + (side === 'right' || side === 'both' ? 'is-on' : '') + '">right side<b>' + (side === 'right' ? escapeHtml(getConceptLabel(card, 'right')) : '') + '</b></span>' +
        '</div>';
    } else if (kind === 'flip') {
      el.innerHTML = '<div class="look-flip">' + semanticTag(card, 'phase flip') + '<i></i></div>';
    } else if (kind === 'speed') {
      var speed = inferSpeed(card);
      el.innerHTML =
        '<div class="look-speed">' +
          '<span class="' + (speed === 'slow' ? 'is-on' : '') + '">slow<i></i>' + (speed === 'slow' ? '<b>' + escapeHtml(getConceptLabel(card, 'slow')) + '</b>' : '') + '</span>' +
          '<span class="' + (speed === 'steady' ? 'is-on' : '') + '">steady<i></i>' + (speed === 'steady' ? '<b>' + escapeHtml(getConceptLabel(card, 'steady')) + '</b>' : '') + '</span>' +
          '<span class="' + (speed === 'fast' ? 'is-on' : '') + '">fast<i></i>' + (speed === 'fast' ? '<b>' + escapeHtml(getConceptLabel(card, 'fast')) + '</b>' : '') + '</span>' +
        '</div>';
    } else if (kind === 'report') {
      el.innerHTML =
        '<div class="look-report">' +
          '<span><b>patient</b><i></i></span>' +
          '<span class="is-on"><b>' + escapeHtml(getConceptLabel(card, 'trace')) + '</b><i></i></span>' +
          '<span><b>meaning</b><i></i></span>' +
        '</div>';
    } else if (kind === 'story') {
      el.innerHTML =
        '<div class="look-story">' +
          '<i></i><b>' + escapeHtml(getConceptLabel(card, 'step')) + '</b><i></i><i></i>' +
        '</div>';
    } else {
      var focus = card.focusX || (meta && meta.focusX) || (ex.stage === 3 ? '34%' : (ex.stage === 4 ? '42%' : '60%'));
      el.innerHTML =
        '<div class="look-spread">' +
          '<i style="--x:' + focus + '"></i>' +
          '<span style="--x:' + focus + '">' + escapeHtml(getConceptLabel(card, 'focus')) + '</span>' +
        '</div>';
    }
  }

  function renderExercise(idx) {
    var ex = EEG_EXERCISES[idx];
    var meta = getMeta(ex);
    var ix = ex.interaction;
    state.currentMeta = meta;
    state.interacted = false;

    var moduleProgress = getModuleProgress(ex.stage);
    var lessonInModule = moduleProgress.indices.indexOf(idx) + 1;
    $('#ex-count').textContent = 'Module ' + ex.stage + ' · Lesson ' + lessonInModule + ' of ' + moduleProgress.total;
    $('#ex-title').textContent = meta.shortTitle || ex.title;
    $('#ex-concept').textContent = meta.guide || ex.concept || ix.prompt;
    $('#ex-viz-canvas').setAttribute('aria-label', (meta.shortTitle || ex.title || 'EEG') + ' exercise visualization');
    renderStepbar($('#ex-stepbar'), ex.stage, MODULE_COUNT);

    var source = $('#ex-source');
    if (ex.imageCredit) {
      source.textContent = ex.imageCredit;
      source.classList.remove('is-hidden');
    } else {
      source.textContent = '';
      source.classList.add('is-hidden');
    }

    var sandbox = $('#btn-sandbox');
    var preset = meta.visual && meta.visual.preset;
    sandbox.href = preset ? 'sandbox.html?preset=' + preset : 'sandbox.html';

    renderInteraction(ex, meta);
    showScreen('exercise');
    renderExerciseVisual(meta);
    $('#btn-prev').disabled = idx === 0;
  }

  function renderTermList(wrap, terms) {
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!terms.length) {
      wrap.classList.add('is-hidden');
      return;
    }
    wrap.classList.remove('is-hidden');
    terms.forEach(function (term) {
      var div = document.createElement('div');
      div.className = 'look-term';
      var strong = document.createElement('strong');
      var span = document.createElement('span');
      strong.textContent = term[0];
      span.textContent = term[1];
      div.appendChild(strong);
      div.appendChild(span);
      wrap.appendChild(div);
    });
  }

  function renderExerciseVisual(meta) {
    var visual = (meta && meta.visual) || { kind: 'eeg-multi', preset: 'normal_awake' };
    var canvas = $('#ex-viz-canvas');
    var report = $('#ex-report-wrap');

    stopExerciseVisual();

    if (visual.kind === 'report') {
      canvas.classList.add('is-hidden');
      report.classList.remove('is-hidden');
      renderReportVisual(visual.report || {});
      return;
    }

    report.classList.add('is-hidden');
    canvas.classList.remove('is-hidden');

    var h = 248;
    if (window.VizEngine) {
      var probe = { 'head-diagram': 220, 'frequency-scope': 268, 'eeg-single': 220, 'compare-panel': 240, 'eeg-multi': 260, 'cap-trace': 270, 'biophysics': 250 };
      if (visual.kind === 'cap-trace' && window.innerHeight < 760) h = 210;
      else if (visual.kind === 'eeg-multi' && window.innerHeight < 760) h = 220;
      else if (visual.kind === 'compare-panel' && window.innerHeight < 760) h = 210;
      else h = probe[visual.kind] || h;
    }
    sizeCanvas(canvas, h);
    exViz = createViz(canvas, visual);
  }

  function renderReportVisual(report) {
    renderReportInto(report, $('#report-tabs'), $('#report-rows'));
  }

  function renderReportInto(report, tabs, rows) {
    tabs.innerHTML = '';
    rows.innerHTML = '';

    (report.tabs || ['Referral', 'Report', 'Impression']).forEach(function (label, i) {
      var tab = document.createElement('span');
      tab.textContent = label;
      if (i === 1) tab.className = 'is-active';
      tabs.appendChild(tab);
    });

    (report.rows || []).forEach(function (row) {
      var div = document.createElement('div');
      div.className = 'report-row';
      var key = document.createElement('strong');
      var val = document.createElement('span');
      key.textContent = row[0];
      val.textContent = row[1];
      div.appendChild(key);
      div.appendChild(val);
      rows.appendChild(div);
    });
  }

  function renderInteraction(ex, meta) {
    var ix = ex.interaction;
    $('#interact-binary').classList.add('is-hidden');
    $('#interact-tap').classList.add('is-hidden');
    $('#interact-observe').classList.add('is-hidden');
    removeTapListener();

    if (ix.type === 'binary') renderBinary(ex, meta);
    else if (ix.type === 'channel-tap') renderChannelTap(ex, meta);
    else if (ix.type === 'observe') renderObserve(ex, meta);
  }

  function resolveAnswer(correct, ix) {
    state.interacted = true;
    showAnswerScreen(correct, ix);
  }

  function renderBinary(ex, meta) {
    var ix = ex.interaction;
    var labels = meta.optionLabels || ix.options;
    var panel = $('#interact-binary');
    var container = $('#interact-binary-btns');
    panel.classList.remove('is-hidden');
    $('#interact-binary-prompt').textContent = meta.question || ix.prompt;
    container.innerHTML = '';

    labels.forEach(function (label, i) {
      var btn = document.createElement('button');
      btn.className = 'interact-binary-btn';
      btn.textContent = label;
      btn.addEventListener('click', function () {
        if (state.interacted) return;
        var correct = i === ix.answer;
        Array.prototype.forEach.call(container.children, function (child, j) {
          child.disabled = true;
          if (j === ix.answer) child.classList.add('is-correct');
          else if (j === i) child.classList.add('is-wrong');
        });
        setTimeout(function () { resolveAnswer(correct, ix); }, 260);
      });
      container.appendChild(btn);
    });
  }

  function renderChannelTap(ex, meta) {
    var ix = ex.interaction;
    var panel = $('#interact-tap');
    panel.classList.remove('is-hidden');
    $('#interact-tap-prompt').textContent = meta.question || ix.prompt;

    window.setTimeout(function () {
      var canvas = $('#ex-viz-canvas');
      if (!canvas || canvas.classList.contains('is-hidden')) return;
      var visual = meta.visual || {};
      var chIdxs = (visual.config && visual.config.channels) || [0,1,2,3,4,5,6,7,8,9];
      var shownNames = chIdxs.map(function (idx) { return CHANNEL_NAMES[idx]; });

      tapListener = function (e) {
        if (state.interacted) return;
        var rect = canvas.getBoundingClientRect();
        var y = e.clientY - rect.top;
        var usableHeight = rect.height - 18;
        var localIdx = Math.max(0, Math.min(Math.floor(y / (usableHeight / shownNames.length)), shownNames.length - 1));
        var tapped = shownNames[localIdx];
        var targets = Array.isArray(ix.target) ? ix.target.slice() : [ix.target];
        targets = targets.map(function (name) {
          if (name === 'T3') return 'T7';
          if (name === 'T4') return 'T8';
          return name;
        });
        var correct = targets.indexOf(tapped) !== -1;
        removeTapListener();
        resolveAnswer(correct, ix);
      };

      canvas.addEventListener('click', tapListener);
      canvas.style.cursor = 'crosshair';
    }, 0);
  }

  function removeTapListener() {
    var canvas = $('#ex-viz-canvas');
    if (canvas && tapListener) {
      canvas.removeEventListener('click', tapListener);
      canvas.style.cursor = '';
      tapListener = null;
    }
  }

  function renderObserve(ex, meta) {
    var ix = ex.interaction;
    var panel = $('#interact-observe');
    var oldBtn = $('#btn-reveal');
    var btn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(btn, oldBtn);

    panel.classList.remove('is-hidden');
    $('#interact-observe-prompt').textContent = meta.question || ix.prompt || 'Watch the trace.';
    btn.addEventListener('click', function () {
      if (state.interacted) return;
      resolveAnswer(true, ix);
    });
  }

  function showAnswerScreen(correct, ix) {
    var ex = EEG_EXERCISES[state.exerciseIdx];
    var meta = state.currentMeta || getMeta(ex);

    $('#answer-icon').textContent = correct ? '✓' : '↑';
    $('#answer-icon').className = 'answer-icon' + (correct ? '' : ' is-wrong');
    $('#answer-finding-label').textContent = correct ? 'Finding' : 'Review';
    $('#answer-verdict').textContent = meta.verdict || (correct ? 'Correct' : 'Review');
    $('#answer-subtitle').textContent = meta.subtitle || '';
    $('#answer-why').textContent = meta.why || ix.reveal || ix.feedback || '';

    if (meta.mistake) {
      $('#answer-mistake-section').classList.remove('is-hidden');
      $('#answer-mistake').textContent = meta.mistake;
    } else {
      $('#answer-mistake-section').classList.add('is-hidden');
      $('#answer-mistake').textContent = '';
    }

    showScreen('answer');
    if (!answerLine) answerLine = new AmbientLine($('#answer-viz-canvas'), { compact: true });
    answerLine.start();
  }

  function goNext() {
    var currentEx = EEG_EXERCISES[state.exerciseIdx];
    if (state.completedIds.indexOf(currentEx.id) === -1) {
      state.completedIds.push(currentEx.id);
    }
    var nextIdx = state.exerciseIdx + 1;
    if (nextIdx >= TOTAL) {
      saveProgress();
      showScreen('complete');
      return;
    }
    var nextEx = EEG_EXERCISES[nextIdx];
    state.exerciseIdx = nextIdx;
    saveProgress();
    if (nextEx.stage !== currentEx.stage) renderStageIntro(nextEx.stage);
    else renderPrimer(nextIdx, 0);
  }

  function goPrev() {
    if (state.screen === 'exercise') {
      var currentExercise = EEG_EXERCISES[state.exerciseIdx];
      var cards = getCards(currentExercise, getMeta(currentExercise));
      renderPrimer(state.exerciseIdx, cards.length - 1);
      return;
    }
    if (state.exerciseIdx === 0) return;
    state.exerciseIdx--;
    saveProgress();
    renderPrimer(state.exerciseIdx, 0);
  }

  function advancePrimer() {
    var exercise = EEG_EXERCISES[state.exerciseIdx];
    var meta = getMeta(exercise);
    var cards = getCards(exercise, meta);
    if (state.cardIdx < cards.length - 1) renderPrimer(state.exerciseIdx, state.cardIdx + 1);
    else renderExercise(state.exerciseIdx);
  }

  function setupThemeToggle() {
    var btn = $('#btn-theme');
    function sync() {
      var dark = document.documentElement.dataset.theme === 'dark';
      btn.innerHTML = '<i class="fa-solid ' + (dark ? 'fa-sun' : 'fa-moon') + '" aria-hidden="true"></i><span>' + (dark ? 'Light' : 'Dark') + '</span>';
      if (exViz) exViz.setDark(dark);
      if (primerViz) primerViz.setDark(dark);
      if (stageViz) stageViz.setDark(dark);
      if (welcomeLine) welcomeLine.draw();
      if (stageLine) stageLine.draw();
      if (answerLine) answerLine.draw();
    }
    btn.addEventListener('click', function () {
      if (window.siteTheme) {
        window.siteTheme.toggle();
        sync();
      }
    });
    window.addEventListener('site-theme-change', sync);
    sync();
  }

  function setupKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (state.screen === 'answer' && (e.key === 'Enter' || e.key === 'ArrowRight')) goNext();
      if (state.screen === 'stageIntro' && (e.key === 'Enter' || e.key === 'ArrowRight')) renderPrimer(state.exerciseIdx, 0);
      if (state.screen === 'primer' && (e.key === 'Enter' || e.key === 'ArrowRight')) advancePrimer();
      if (state.screen === 'look' && (e.key === 'Enter' || e.key === 'ArrowRight')) renderExercise(state.exerciseIdx);
      if (state.screen === 'exercise' && e.key === 'ArrowLeft') goPrev();
      if (state.screen === 'exercise') {
        var n = parseInt(e.key, 10);
        if ((n === 1 || n === 2) && !state.interacted) {
          var btns = document.querySelectorAll('.interact-binary-btn:not(:disabled)');
          if (btns[n - 1]) btns[n - 1].click();
        }
      }
    });
  }

  function init() {
    loadProgress();
    setupThemeToggle();
    setupKeyboard();

    welcomeLine = new AmbientLine($('#deco-canvas'), { welcome: true });
    welcomeLine.start();

    if (state.completedIds.length > 0 || state.exerciseIdx > 0) {
      var savedExercise = EEG_EXERCISES[state.exerciseIdx];
      var savedModule = getModuleProgress(savedExercise.stage);
      var savedLesson = savedModule.indices.indexOf(state.exerciseIdx) + 1;
      $('#btn-resume').classList.remove('is-hidden');
      $('#btn-resume').textContent = 'Resume module ' + savedExercise.stage + ' · lesson ' + savedLesson;
    }

    $('#btn-begin').addEventListener('click', function () {
      resetProgress();
      renderStageIntro(1);
    });
    $('#btn-resume').addEventListener('click', function () {
      renderPrimer(state.exerciseIdx, 0);
    });
    $('#btn-map').addEventListener('click', renderCourseMap);
    $('#btn-view-map').addEventListener('click', renderCourseMap);
    $('#btn-map-begin').addEventListener('click', function () {
      resetProgress();
      renderStageIntro(1);
    });
    $('#btn-map-resume').addEventListener('click', function () {
      renderPrimer(state.exerciseIdx, 0);
    });
    $('#btn-map-home').addEventListener('click', function () {
      showScreen('welcome');
    });
    $('#btn-stage-continue').addEventListener('click', function () {
      renderPrimer(state.exerciseIdx, 0);
    });
    $('#btn-primer-continue').addEventListener('click', function () {
      advancePrimer();
    });
    $('#btn-look-continue').addEventListener('click', function () {
      renderExercise(state.exerciseIdx);
    });
    $('#btn-prev').addEventListener('click', goPrev);
    $('#btn-answer-next').addEventListener('click', goNext);
    $('#btn-restart').addEventListener('click', function () {
      resetProgress();
      renderStageIntro(1);
    });
    $('#btn-home').addEventListener('click', function () {
      renderCourseMap();
    });

    updateProgressBar();
  }

  function AmbientLine(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas && canvas.getContext('2d');
    this.opts = opts || {};
    this.t = 0;
    this.raf = null;
    this.running = false;
    this.loop = this.loop.bind(this);
    var self = this;
    window.addEventListener('resize', function () { self.draw(); });
  }

  AmbientLine.prototype.start = function () {
    if (!this.canvas || this.running) return;
    this.running = true;
    this.loop();
  };

  AmbientLine.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  AmbientLine.prototype.loop = function () {
    if (!this.running) return;
    this.t += 0.014;
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  AmbientLine.prototype.draw = function () {
    if (!this.canvas || !this.ctx) return;
    var parent = this.canvas.parentElement;
    var width = Math.max(280, parent.clientWidth || window.innerWidth);
    var height = Math.max(64, parent.clientHeight || 96);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    var ctx = this.ctx;
    var dark = document.documentElement.dataset.theme === 'dark';
    var trace = dark ? 'rgba(95,208,191,0.72)' : 'rgba(18,120,110,0.56)';
    var grid = dark ? 'rgba(255,255,255,0.07)' : 'rgba(18,24,23,0.07)';
    var mid = height * 0.52;
    var amp = this.opts.compact ? height * 0.18 : height * 0.24;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    for (var x = 0; x < width; x += width / 14) {
      ctx.beginPath();
      ctx.moveTo(x, height * 0.18);
      ctx.lineTo(x, height * 0.82);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = trace;
    ctx.lineWidth = this.opts.compact ? 1.15 : 1.6;
    ctx.beginPath();
    for (var i = 0; i <= width; i++) {
      var n = i / width;
      var y = mid
        + Math.sin(n * 50 + this.t * 2.5) * amp * 0.32
        + Math.sin(n * 97 - this.t * 1.9) * amp * 0.22
        + Math.sin(n * 171 + this.t * 1.2) * amp * 0.12;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

}());
