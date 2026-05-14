(function () {
  'use strict';

  var STORAGE_KEY = 'eeg-lab-progress';
  var TOTAL = EEG_EXERCISES.length;
  var CHANNEL_NAMES = ['Fp1','Fp2','F3','F4','C3','C4','T3','T4','O1','O2'];

  var state = {
    screen: 'welcome',
    exerciseIdx: 0,
    cardIdx: 0,
    interacted: false,
    currentMeta: null
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var META = window.EEG_LESSON_META || {};

  var screens = {
    welcome: $('#screen-welcome'),
    stageIntro: $('#screen-stage-intro'),
    primer: $('#screen-primer'),
    look: $('#screen-look'),
    exercise: $('#screen-exercise'),
    answer: $('#screen-answer'),
    complete: $('#screen-complete')
  };

  var progressBar = $('#eeg-progress-bar');
  var exViz = null;
  var stageViz = null;
  var stageLine = null;
  var answerLine = null;
  var welcomeLine = null;
  var tapListener = null;

  var STAGE_META = {
    1: {
      title: 'Map Science',
      desc: 'Build the cap before reading it.',
      visual: { kind: 'head-diagram', config: { targets: ['Fp1', 'Fp2', 'Cz', 'O1', 'O2'] } }
    },
    2: {
      title: 'Page Science',
      desc: 'Learn what each line means.',
      visual: { kind: 'cap-trace', preset: 'normal_awake', config: { targets: ['Fp1', 'Fp2', 'O1', 'O2'], highlight: [0, 1] } }
    },
    3: {
      title: 'Normal Signals',
      desc: 'Know the baseline first.',
      visual: { kind: 'frequency-scope', config: { highlightBand: 2 } }
    },
    4: {
      title: 'Look-alikes',
      desc: 'Separate noise from brain.',
      visual: { kind: 'eeg-multi', preset: 'eye_blink', config: { channels: [0, 1, 8, 9], highlight: [0, 1] } }
    },
    5: {
      title: 'Abnormal Patterns',
      desc: 'Localize, then name.',
      visual: { kind: 'eeg-single', preset: 'focal_spike', config: { channel: 6, label: 'T3' } }
    },
    6: {
      title: 'Full Cap Training',
      desc: 'Read cap and traces together.',
      visual: { kind: 'cap-trace', preset: 'generalized_sw', config: { targets: ['Fp1', 'Fp2', 'F3', 'F4'], highlight: [0, 1, 2, 3], measure: '1 second · count the waves' } }
    }
  };

  function getMeta(ex) {
    return META[ex.id] || {};
  }

  function loadProgress() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (typeof saved.exerciseIdx === 'number') {
        state.exerciseIdx = Math.min(saved.exerciseIdx, TOTAL - 1);
      }
    } catch (e) {}
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ exerciseIdx: state.exerciseIdx }));
    } catch (e) {}
  }

  function resetProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    state.exerciseIdx = 0;
    state.cardIdx = 0;
    state.interacted = false;
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
    var pct = TOTAL === 1 ? 100 : (state.exerciseIdx / (TOTAL - 1)) * 100;
    if (state.screen === 'complete') pct = 100;
    progressBar.style.width = pct + '%';
    progressBar.style.opacity = state.screen === 'welcome' ? '0' : '1';
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('is-hidden', key !== name);
    });
    state.screen = name;
    updateProgressBar();
    window.scrollTo(0, 0);

    stopExerciseVisual();
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

  function stopStageVisual() {
    if (stageViz) {
      stageViz.stop();
      stageViz = null;
    }
  }

  function renderStageIntro(stageNum) {
    var meta = STAGE_META[stageNum];
    $('#stage-intro-num').textContent = 'Stage ' + stageNum + ' of 6';
    $('#stage-intro-title').textContent = meta.title;
    $('#stage-intro-desc').textContent = meta.desc;
    renderStepbar($('#stage-stepbar'), stageNum, 6);

    showScreen('stageIntro');

    var canvas = $('#stage-viz-canvas');
    if (!stageLine) stageLine = new AmbientLine(canvas, { compact: true });
    stageLine.start();
  }

  function getCards(meta) {
    if (meta.cards && meta.cards.length) return meta.cards;
    return [{
      title: (meta.explain && meta.explain.title) || meta.shortTitle || 'One clue',
      copy: (meta.explain && meta.explain.copy) || meta.guide || 'Look at one clue before you answer.',
      kind: meta.lookKind || 'spread',
      terms: meta.terms || []
    }];
  }

  function renderPrimer(idx, cardIdx) {
    var ex = EEG_EXERCISES[idx];
    var meta = getMeta(ex);
    var cards = getCards(meta);
    state.cardIdx = Math.max(0, Math.min(cardIdx || 0, cards.length - 1));
    var card = cards[state.cardIdx] || {};
    $('#primer-count').textContent = 'Clue ' + String(idx + 1).padStart(2, '0') + ' · ' + (state.cardIdx + 1) + '/' + cards.length;
    $('#primer-title').textContent = card.title || meta.shortTitle || ex.title;
    $('#primer-copy').textContent = card.copy || meta.guide || ex.concept;
    $('#btn-primer-continue').textContent = state.cardIdx === cards.length - 1 ? 'Practice' : 'Continue';
    renderStepbar($('#primer-stepbar'), ex.stage, 6);
    renderTermList($('#primer-terms'), card.terms || []);

    showScreen('primer');

    renderPrimerGraphic(ex, meta, card);
  }

  function renderLook(idx) {
    var ex = EEG_EXERCISES[idx];
    var meta = getMeta(ex);
    $('#look-count').textContent = 'Look ' + String(ex.id).padStart(2, '0');
    $('#look-title').textContent = meta.lookTitle || 'Look for one thing.';
    $('#look-copy').textContent = meta.notice || 'Notice one clear clue before you answer.';
    renderStepbar($('#look-stepbar'), ex.stage, 6);
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
    } else if (kind === 'line') {
      el.innerHTML = '<div class="concept-line"><i></i></div>';
    } else if (kind === 'sensor') {
      el.innerHTML =
        '<div class="concept-sensor">' +
          '<i></i><span style="left:34%;top:34%"></span><span style="left:62%;top:34%"></span>' +
          '<span style="left:25%;top:58%"></span><span class="is-on" style="left:64%;top:68%"></span>' +
        '</div>';
    } else if (kind === 'regions') {
      var activeRegion = card.region || 'back';
      el.innerHTML =
        '<div class="concept-regions">' +
          ['front','center','side','back'].map(function (name) {
            return '<span class="' + (name === activeRegion ? 'is-on' : '') + '">' + name + '</span>';
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
        '</div>';
    } else if (kind === 'side') {
      el.innerHTML =
        '<div class="look-side">' +
          '<span>left side</span>' +
          '<span class="is-on">right side</span>' +
        '</div>';
    } else if (kind === 'flip') {
      el.innerHTML = '<div class="look-flip"><i></i></div>';
    } else if (kind === 'speed') {
      el.innerHTML =
        '<div class="look-speed">' +
          '<span>slow<i></i></span>' +
          '<span>steady<i></i></span>' +
          '<span>fast<i></i></span>' +
        '</div>';
    } else if (kind === 'report') {
      el.innerHTML =
        '<div class="look-report">' +
          '<span><b>patient</b><i></i></span>' +
          '<span class="is-on"><b>trace</b><i></i></span>' +
          '<span><b>meaning</b><i></i></span>' +
        '</div>';
    } else if (kind === 'story') {
      el.innerHTML = '<div class="look-story"><i></i><i></i><i></i></div>';
    } else {
      var focus = card.focusX || (meta && meta.focusX) || (ex.stage === 3 ? '34%' : (ex.stage === 4 ? '42%' : '60%'));
      el.innerHTML = '<div class="look-spread"><i style="--x:' + focus + '"></i></div>';
    }
  }

  function renderExercise(idx) {
    var ex = EEG_EXERCISES[idx];
    var meta = getMeta(ex);
    var ix = ex.interaction;
    state.currentMeta = meta;
    state.interacted = false;

    $('#ex-count').textContent = 'Exercise ' + String(idx + 1).padStart(2, '0');
    $('#ex-title').textContent = meta.shortTitle || ex.title;
    $('#ex-concept').textContent = meta.guide || ex.concept || ix.prompt;
    renderStepbar($('#ex-stepbar'), ex.stage, 6);

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
      var probe = { 'head-diagram': 220, 'frequency-scope': 268, 'eeg-single': 220, 'compare-panel': 240, 'eeg-multi': 260, 'cap-trace': 270 };
      if (visual.kind === 'cap-trace' && window.innerHeight < 760) h = 210;
      else if (visual.kind === 'eeg-multi' && window.innerHeight < 760) h = 220;
      else if (visual.kind === 'compare-panel' && window.innerHeight < 760) h = 210;
      else h = probe[visual.kind] || h;
    }
    sizeCanvas(canvas, h);
    exViz = createViz(canvas, visual);
  }

  function renderReportVisual(report) {
    var tabs = $('#report-tabs');
    var rows = $('#report-rows');
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
        var targets = Array.isArray(ix.target) ? ix.target : [ix.target];
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
      var cards = getCards(getMeta(EEG_EXERCISES[state.exerciseIdx]));
      renderPrimer(state.exerciseIdx, cards.length - 1);
      return;
    }
    if (state.exerciseIdx === 0) return;
    state.exerciseIdx--;
    saveProgress();
    renderPrimer(state.exerciseIdx, 0);
  }

  function advancePrimer() {
    var meta = getMeta(EEG_EXERCISES[state.exerciseIdx]);
    var cards = getCards(meta);
    if (state.cardIdx < cards.length - 1) renderPrimer(state.exerciseIdx, state.cardIdx + 1);
    else renderExercise(state.exerciseIdx);
  }

  function setupThemeToggle() {
    var btn = $('#btn-theme');
    function sync() {
      var dark = document.documentElement.dataset.theme === 'dark';
      btn.innerHTML = '<i class="fa-solid ' + (dark ? 'fa-sun' : 'fa-moon') + '" aria-hidden="true"></i><span>' + (dark ? 'Light' : 'Dark') + '</span>';
      if (exViz) exViz.setDark(dark);
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

    if (state.exerciseIdx > 0) {
      $('#btn-resume').classList.remove('is-hidden');
      $('#btn-resume').textContent = 'Resume ' + String(state.exerciseIdx + 1).padStart(2, '0');
    }

    $('#btn-begin').addEventListener('click', function () {
      resetProgress();
      renderStageIntro(1);
    });
    $('#btn-resume').addEventListener('click', function () {
      renderPrimer(state.exerciseIdx, 0);
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
      resetProgress();
      showScreen('welcome');
      $('#btn-resume').classList.add('is-hidden');
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
