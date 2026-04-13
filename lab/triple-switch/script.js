const state = {
  manifest: null,
  subjects: {},
  steps: [],
  index: 0,
  frame: 0,
  playing: false,
  timer: null,
  reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  copyKey: "",
  sceneTimer: null,
  copyRestTimer: null,
  copyAnimTimer: null,
  theme: null,
  drag: null,
  selectedGuideId: null,
  selectedControlId: null,
  selectedPatientId: null,
  selectedExploreId: null,
};

const elements = {
  viz: document.querySelector(".viz"),
  copy: document.querySelector(".copy"),
  scene: document.querySelector(".scene"),
  tooltip: document.querySelector("#viz-tooltip"),
  stepIndex: document.querySelector("#step-index"),
  stepTotal: document.querySelector("#step-total"),
  sourceLine: document.querySelector("#source-line"),
  eyebrow: document.querySelector("#eyebrow"),
  headline: document.querySelector("#headline"),
  body: document.querySelector("#body"),
  whatLine: document.querySelector("#what-line"),
  triangleNote: document.querySelector("#triangle-note"),
  panelKicker: document.querySelector("#panel-kicker"),
  focusPanel: document.querySelector("#focus-panel"),
  stateLegend: document.querySelector("#state-legend"),
  modeFocus: document.querySelector("#mode-focus"),
  modeCompare: document.querySelector("#mode-compare"),
  compareStage: document.querySelector("#compare-stage"),
  modeSummary: document.querySelector("#mode-summary"),
  modeExplore: document.querySelector("#mode-explore"),
  focusTriangle: document.querySelector("#focus-triangle"),
  exploreTriangle: document.querySelector("#explore-triangle"),
  summaryKicker: document.querySelector("#summary-kicker"),
  summaryPanel: document.querySelector("#summary-panel"),
  exploreSubjects: document.querySelector("#explore-subjects"),
  exploreNote: document.querySelector("#explore-note"),
  exploreKicker: document.querySelector("#explore-kicker"),
  explorePanel: document.querySelector("#explore-panel"),
  exploreLegend: document.querySelector("#explore-legend"),
  playbar: document.querySelector("#playbar"),
  playToggle: document.querySelector("#play-toggle"),
  scrubber: document.querySelector("#scrubber"),
  timeReadout: document.querySelector("#time-readout"),
  prev: document.querySelector("#prev-step"),
  next: document.querySelector("#next-step"),
  dots: document.querySelector("#step-dots"),
};

init().catch((error) => {
  elements.headline.textContent = "The data did not load.";
  elements.body.textContent = error instanceof Error ? error.message : String(error);
  elements.whatLine.textContent =
    "Open the bundled page directly or run the local server if you want live fetches.";
  elements.sourceLine.textContent = "Data unavailable";
});

async function init() {
  const inlineData = window.TRIPLE_SWITCH_DATA;

  if (inlineData?.manifest && inlineData?.subjects) {
    state.manifest = inlineData.manifest;
    state.subjects = inlineData.subjects;
  } else {
    state.manifest = await fetchJSON("./data/manifest.json");
    const subjectEntries = await Promise.all(
      state.manifest.subjects.map(async (row) => [row.id, await fetchJSON(row.file)])
    );
    state.subjects = Object.fromEntries(subjectEntries);
  }

  state.selectedGuideId = state.manifest.featured.guide_subject_id;
  state.selectedControlId = state.manifest.featured.comparison_control_id;
  state.selectedPatientId = state.manifest.featured.comparison_patient_id;
  state.selectedExploreId = state.selectedGuideId;
  state.steps = buildSteps(state.manifest);
  applyInitialParams();
  state.steps = buildSteps(state.manifest);
  state.theme = readTheme();
  state.frame = peakFrame(state.steps[state.index].mode === "explore" ? exploreSubject() : guideSubject());

  elements.stepTotal.textContent = pad(state.steps.length);
  elements.sourceLine.textContent = "Real subset · ds000030 · 5 controls + 5 schizophrenia";

  renderDots();
  bindEvents();
  render();
}

function bindEvents() {
  elements.prev.addEventListener("click", () => {
    stopPlayback();
    state.index = Math.max(0, state.index - 1);
    render();
  });

  elements.next.addEventListener("click", () => {
    if (state.index === state.steps.length - 1) {
      stopPlayback();
      state.index = 0;
    } else {
      state.index += 1;
    }
    render();
  });

  elements.playToggle.addEventListener("click", () => {
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  elements.scrubber.addEventListener("input", () => {
    updateFrame(Number(elements.scrubber.value));
  });

  elements.focusPanel.addEventListener("pointermove", handleFocusPlotScrub);
  elements.focusPanel.addEventListener("click", handleFocusPlotScrub);
  elements.explorePanel.addEventListener("pointermove", handleFocusPlotScrub);
  elements.explorePanel.addEventListener("click", handleFocusPlotScrub);
  elements.modeCompare.addEventListener("pointermove", handleStripScrub);
  elements.modeCompare.addEventListener("click", handleStripScrub);
  elements.exploreSubjects.addEventListener("click", handleExploreSubjectPick);
  [elements.focusTriangle, elements.exploreTriangle].forEach((triangle) => {
    triangle.addEventListener("pointerdown", handleTrianglePointerDown);
  });

  elements.summaryPanel.addEventListener("pointermove", handleSummaryPointerMove);
  elements.summaryPanel.addEventListener("pointerleave", hideTooltip);
  elements.summaryPanel.addEventListener("click", handleSummaryClick);
  window.addEventListener("pointermove", handleTrianglePointerMove);
  window.addEventListener("pointerup", handleTrianglePointerUp);
  window.addEventListener("pointercancel", handleTrianglePointerUp);

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      elements.next.click();
    }
    if (event.key === "ArrowLeft") {
      elements.prev.click();
    }
    if (event.key === " " && playbackStep(state.steps[state.index])) {
      event.preventDefault();
      elements.playToggle.click();
    }
  });
}

function buildSteps(manifest) {
  const guide = guideSubject();
  const symptomR = manifest.symptom_associations.positive_vs_switches_per_minute.r;
  const symptomText =
    symptomR === null
      ? "The symptom overlay is ready for comparison once more patient data is added."
      : `Within the five schizophrenia participants here, higher positive-symptom scores line up with faster switching.`;

  return [
    {
      mode: "focus",
      eyebrow: "Step 1 / framing",
      headline: "Why this triangle.",
      body: "We are not drawing the whole brain. We keep only salience, frontoparietal, and default mode because published schizophrenia biomarker masks keep landing here.",
      what: "Now: each circle is one large network, not one brain spot.",
    },
    {
      mode: "focus",
      eyebrow: "Step 2 / one window",
      headline: "What a line means.",
      body: "This one frame comes from a real 40-second window in one resting scan. A solid line means the two networks moved together. A dashed line means they moved in opposite directions.",
      what: "Now: hover the graph to scrub the window, or click the strip to jump.",
    },
    {
      mode: "focus",
      eyebrow: "Step 3 / playback",
      headline: "Now let one scan move.",
      body: `The cursor moves through overlapping 40-second windows from one ${guide.group} participant. The triangle updates at each step.`,
      what: "Now: the NII line is live. Drag across it to inspect any moment.",
    },
    {
      mode: "focus",
      eyebrow: "Step 4 / recurring states",
      headline: "Some windows repeat.",
      body: `Instead of reading ${guide.nii.length} windows one by one, we group similar windows into ${manifest.states.length} recurring states.`,
      what: "Now: color marks the recurring state for each window.",
    },
    {
      mode: "compare",
      eyebrow: "Step 5 / compare two people",
      headline: "Different paths.",
      body: "At the same window index, the control and schizophrenia participant do not always land in the same pattern.",
      what: "Now: hover either strip to move both together.",
    },
    {
      mode: "summary",
      eyebrow: "Step 6 / small sample",
      headline: "The groups overlap.",
      body: "Across this 10-person subset, the two groups overlap more than they separate.",
      what: "Now: hover a point, then click one to inspect that subject.",
    },
    {
      mode: "summary",
      eyebrow: "Step 7 / symptoms",
      headline: "Symptoms can be compared.",
      body: symptomText,
      what: "Now: hover the patient points, then click one to make it the playback subject.",
    },
    {
      mode: "explore",
      eyebrow: "Step 8 / try it",
      headline: "Pick a subject.",
      body: "This last view is the real data without the narration. Switch participants, scrub the scan, and watch the triangle change window by window.",
      what: "Now: pick anyone below, drag the line, or press play.",
    },
  ];
}

function renderDots() {
  elements.dots.innerHTML = "";
  state.steps.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot";
    dot.addEventListener("click", () => {
      stopPlayback();
      state.index = index;
      render();
    });
    elements.dots.appendChild(dot);
  });
}

function render() {
  const step = state.steps[state.index];
  const copyKey = [state.index, step.eyebrow, step.headline, step.body, step.what].join("|");
  const copyChanged = state.copyKey !== copyKey;

  elements.stepIndex.textContent = pad(state.index + 1);
  elements.prev.disabled = state.index === 0;
  elements.next.textContent = state.index === state.steps.length - 1 ? "Again" : "Next";
  elements.viz.dataset.mode = step.mode;
  elements.viz.classList.toggle("is-playing", state.playing);

  [...elements.dots.children].forEach((dot, index) => {
    dot.classList.toggle("active", index === state.index);
  });

  if (copyChanged) {
    state.copyKey = copyKey;
    animateCopy(step);
    triggerSceneTransition();
  }

  toggleModes(step.mode);
  syncPlaybar(step);
  if (step.mode !== "summary") {
    hideTooltip();
  }

  if (step.mode === "focus") {
    renderFocus(step);
  }
  if (step.mode === "compare") {
    renderCompare();
  }
  if (step.mode === "summary") {
    renderSummary();
  }
  if (step.mode === "explore") {
    renderExplore();
  }
}

function animateCopy(step) {
  elements.copy.classList.remove("is-resting", "is-refreshing");
  window.clearTimeout(state.copyRestTimer);
  window.clearTimeout(state.copyAnimTimer);
  setCopyText(step);

  if (state.reduceMotion) {
    queueCopyRest(2200);
    return;
  }

  void elements.copy.offsetWidth;
  elements.copy.classList.add("is-refreshing");
  state.copyAnimTimer = window.setTimeout(() => {
    elements.copy.classList.remove("is-refreshing");
  }, 920);
  queueCopyRest(2600);
}

function setCopyText(step) {
  elements.eyebrow.textContent = step.eyebrow;
  elements.headline.textContent = step.headline;
  elements.body.textContent = step.body;
  elements.whatLine.textContent = step.what;
}

function queueCopyRest(delay) {
  window.clearTimeout(state.copyRestTimer);
  state.copyRestTimer = window.setTimeout(() => {
    elements.copy.classList.add("is-resting");
  }, delay);
}

function triggerSceneTransition() {
  if (state.reduceMotion) {
    return;
  }
  elements.scene.classList.remove("is-step-entering");
  void elements.scene.offsetWidth;
  elements.scene.classList.add("is-step-entering");
  window.clearTimeout(state.sceneTimer);
  state.sceneTimer = window.setTimeout(() => {
    elements.scene.classList.remove("is-step-entering");
  }, 620);
}

function toggleModes(mode) {
  elements.modeFocus.hidden = mode !== "focus";
  elements.modeCompare.hidden = mode !== "compare";
  elements.modeSummary.hidden = mode !== "summary";
  elements.modeExplore.hidden = mode !== "explore";
}

function syncPlaybar(step) {
  const show = playbackStep(step);
  elements.playbar.hidden = !show;

  if (!show) {
    stopPlayback();
    return;
  }

  const max = frameCountForStep(step) - 1;
  state.frame = Math.min(state.frame, max);
  elements.scrubber.max = String(max);
  elements.scrubber.value = String(state.frame);
  elements.playToggle.textContent = state.playing ? "Pause" : "Play";
  elements.timeReadout.textContent = formatTime(playbackSubject(step).window_seconds[state.frame]);
}

function renderFocus(step) {
  const guide = guideSubject();
  const current = edgeAt(guide, state.frame);
  const firstMask = state.manifest.static_masks[0];
  const live = playbackStep(step);

  if (state.index === 0) {
    paintTriangle(elements.focusTriangle, null, { live: false });
    elements.triangleNote.textContent = `500-edge mask · ${Math.round(firstMask.triple_share * 100)}% lands here`;
    elements.panelKicker.textContent = "Three roles";
    elements.focusPanel.innerHTML = renderGlossary();
    elements.stateLegend.innerHTML = "";
    return;
  }

  paintTriangle(elements.focusTriangle, current, { live });
  elements.triangleNote.textContent = `${guide.id} · ${formatTime(guide.window_seconds[state.frame])}`;

  if (state.index === 1) {
    elements.panelKicker.textContent = "One window";
    elements.focusPanel.innerHTML = renderPairBars(current);
    elements.stateLegend.innerHTML = "";
    return;
  }

  if (state.index === 2) {
    elements.panelKicker.textContent = `${guide.id} · NII over time`;
    elements.focusPanel.innerHTML = renderNIIPlot(guide, state.frame, false);
    elements.stateLegend.innerHTML = "";
    return;
  }

  elements.panelKicker.textContent = `${guide.id} · the same scan, grouped into states`;
  elements.focusPanel.innerHTML = renderNIIPlot(guide, state.frame, true);
  elements.stateLegend.innerHTML = renderStateLegend();
}

function renderCompare() {
  const control = comparisonControl();
  const patient = comparisonPatient();
  elements.compareStage.innerHTML = renderCompareScene(control, patient);
}

function renderSummary() {
  if (state.index === 5) {
    elements.summaryKicker.textContent = "Switches per minute · 5 controls / 5 schizophrenia";
    elements.summaryPanel.innerHTML = renderGroupPlot(state.manifest.subjects);
    return;
  }

  const patients = state.manifest.subjects.filter((row) => row.group === "schizophrenia");
  const assoc = state.manifest.symptom_associations.positive_vs_switches_per_minute;
  elements.summaryKicker.textContent =
    assoc.r === null
      ? "Positive symptoms vs switching"
      : `Positive symptoms vs switching · r = ${assoc.r.toFixed(2)}`;
  elements.summaryPanel.innerHTML = renderSymptomPlot(patients);
}

function renderExplore() {
  const subject = exploreSubject();
  const symptom =
    subject.positive_symptoms === null || subject.positive_symptoms === undefined
      ? "Positive symptoms unavailable for this subject."
      : `Positive symptoms ${subject.positive_symptoms.toFixed(1)}.`;

  elements.exploreSubjects.innerHTML = renderExplorePills();
  elements.exploreKicker.textContent = `${subject.id} · ${subject.group} · ${subject.metrics.switches_per_minute.toFixed(2)} switches/min`;
  elements.exploreNote.textContent = `${symptom} Scrub the line, press play, or drag any circle to rearrange the map.`;
  elements.explorePanel.innerHTML = renderNIIPlot(subject, state.frame, true);
  elements.exploreLegend.innerHTML = renderStateLegend();
  paintTriangle(elements.exploreTriangle, edgeAt(subject, state.frame), { live: true });
}

function paintTriangle(container, edges, { live = false } = {}) {
  container.classList.toggle("live", live);
  const isCompact = container.classList.contains("compact") || container.id.startsWith("compare");
  syncTriangleGeometry(container);

  const edgeElements = [...container.querySelectorAll("[data-edge]")];
  const nodeElements = [...container.querySelectorAll(".node")];

  if (!edges) {
    edgeElements.forEach((line) => {
      line.classList.remove("positive", "negative", "dominant");
      line.style.strokeWidth = "1.5";
      line.style.opacity = "0.12";
      line.style.strokeDasharray = "0";
      line.style.strokeLinecap = "round";
    });
    nodeElements.forEach((node) => {
      node.classList.add("active");
      node.classList.remove("is-hot", "live");
      node.style.setProperty("--ring-scale", "1");
    });
    return;
  }

  const dominantId = Object.entries(edges).sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))[0][0];
  const nodeStrength = {
    sn: (Math.abs(edges.sn_fpn) + Math.abs(edges.sn_dmn)) / 2,
    fpn: (Math.abs(edges.sn_fpn) + Math.abs(edges.fpn_dmn)) / 2,
    dmn: (Math.abs(edges.sn_dmn) + Math.abs(edges.fpn_dmn)) / 2,
  };

  edgeElements.forEach((line) => {
    const value = edges[line.dataset.edge];
    const width = (isCompact ? 1.8 : 1.45) + Math.min(Math.abs(value) * (isCompact ? 3.3 : 2.9), isCompact ? 4.8 : 4.2);
    const dash = value < 0 ? `${Math.max(4, width * 0.95).toFixed(1)} ${Math.max(6, width * 1.45).toFixed(1)}` : "0";
    line.classList.toggle("positive", value >= 0);
    line.classList.toggle("negative", value < 0);
    line.classList.toggle("dominant", line.dataset.edge === dominantId);
    line.style.strokeWidth = width.toFixed(2);
    line.style.opacity = String((isCompact ? 0.34 : 0.22) + Math.min(Math.abs(value) * 0.4, isCompact ? 0.56 : 0.62));
    line.style.strokeDasharray = dash;
    line.style.strokeLinecap = value < 0 ? "butt" : "round";
  });

  nodeElements.forEach((node) => {
    const strength = nodeStrength[node.dataset.node];
    node.classList.add("active");
    node.classList.toggle("live", live);
    node.classList.toggle("is-hot", strength === Math.max(...Object.values(nodeStrength)));
    node.style.setProperty("--ring-scale", `${1 + Math.min(strength * 0.32, 0.46)}`);
  });
}

function renderGlossary() {
  return `
    <div class="glossary">
      <div class="glossary-row">
        <strong class="glossary-name">SN</strong>
        <p class="glossary-note">salience helps redirect attention when something matters</p>
      </div>
      <div class="glossary-row">
        <strong class="glossary-name">FPN</strong>
        <p class="glossary-note">frontoparietal supports task-focused control</p>
      </div>
      <div class="glossary-row">
        <strong class="glossary-name">DMN</strong>
        <p class="glossary-note">default mode often rises during internal thought</p>
      </div>
    </div>
  `;
}

function renderPairBars(edges) {
  const pairs = [
    ["SN-FPN", edges.sn_fpn],
    ["SN-DMN", edges.sn_dmn],
    ["FPN-DMN", edges.fpn_dmn],
  ];
  const maxAbs = Math.max(...pairs.map(([, value]) => Math.abs(value)), 0.25);

  return `
    <p class="panel-note">The triangle is just these three pairings. Solid means the two network averages rose and fell together. Dashed means they pushed in opposite directions.</p>
    <div class="pair-bars">
      ${pairs
        .map(([label, value]) => {
          const left = value < 0 ? 50 - (Math.abs(value) / maxAbs) * 50 : 50;
          const width = (Math.abs(value) / maxAbs) * 50;
          return `
            <div class="pair-row">
              <label>${label}</label>
              <div class="pair-track" aria-hidden="true">
                <div class="pair-center"></div>
                <div class="pair-fill ${value >= 0 ? "positive" : "negative"}" style="left:${left}%;width:${width}%;"></div>
              </div>
              <span>${value >= 0 ? "together" : "opposite"}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStateLegend() {
  return state.manifest.states
    .map(
      (item, index) => `
        <div class="state-chip" data-state="${index}">
          <span></span>
          ${item.label}
        </div>
      `
    )
    .join("");
}

function renderStateStrip(labels, currentIndex) {
  return labels
    .map(
      (label, index) => `
        <button class="strip-segment ${index === currentIndex ? "current" : ""}" data-state="${label}" data-frame="${index}" type="button" aria-label="Jump to frame ${index + 1}"></button>
      `
    )
    .join("");
}

function renderNIIPlot(subject, currentIndex, showStates) {
  const colors = state.theme;
  const values = subject.nii;
  const width = 640;
  const height = showStates ? 280 : 244;
  const padding = { top: 18, right: 16, bottom: showStates ? 58 : 40, left: 16 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const rawExtent = paddedExtent(values);
  const extent = {
    min: Math.min(rawExtent.min, 0),
    max: Math.max(rawExtent.max, 0),
  };

  const x = (index) => padding.left + (index / (values.length - 1)) * plotWidth;
  const y = (value) =>
    padding.top + ((extent.max - value) / (extent.max - extent.min || 1)) * plotHeight;

  const points = values.map((value, index) => [x(index), y(value)]);
  const linePath = pathFromPoints(points);
  const fillPath = `${linePath} L ${x(values.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const currentX = x(currentIndex);
  const currentY = y(values[currentIndex]);
  const zeroY = y(0);
  const guideLines = [padding.top, zeroY, padding.top + plotHeight]
    .map(
      (value) =>
        `<line
          class="${Math.abs(value - zeroY) < 0.5 ? "plot-baseline" : "plot-gridline"}"
          x1="${padding.left}"
          x2="${width - padding.right}"
          y1="${value}"
          y2="${value}"
          style="stroke:${Math.abs(value - zeroY) < 0.5 ? colors.plotAxis : colors.plotGrid};stroke-width:1;${
            Math.abs(value - zeroY) < 0.5 ? "stroke-dasharray:4 6;" : ""
          }"
        ></line>`
    )
    .join("");

  const stateRects = showStates
    ? subject.state_labels
        .map((label, index) => {
          const left = padding.left + (index / values.length) * plotWidth;
          const nextLeft = padding.left + ((index + 1) / values.length) * plotWidth;
          return `<rect x="${left}" y="${height - 18}" width="${Math.max(
            nextLeft - left - 1,
            1
          )}" height="10" rx="5" style="fill:${colors[`state${label}`]};opacity:${
            index === currentIndex ? 1 : 0.34
          };"></rect>`;
        })
        .join("")
    : "";

  return `
    <p class="panel-note">This line is NII: salience-to-frontoparietal coupling minus salience-to-default coupling. Hover or click the plot to scrub time.</p>
    <svg class="plot-svg nii-plot ${state.playing ? "is-playing" : ""}" data-subject="${subject.id}" data-count="${values.length}" viewBox="0 0 ${width} ${height}" role="img" aria-label="NII plot">
      <rect class="plot-band" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" rx="18" style="fill:${colors.plotBand};"></rect>
      ${guideLines}
      <path class="plot-fill" d="${fillPath}" style="fill:${colors.plotFill};"></path>
      <path class="plot-line" d="${linePath}" style="fill:none;stroke:${colors.plotLine};stroke-width:3;stroke-linecap:round;stroke-linejoin:round;"></path>
      <line class="plot-cursor" x1="${currentX}" x2="${currentX}" y1="${padding.top}" y2="${padding.top + plotHeight}" style="stroke:${colors.plotCursor};stroke-width:1.2;"></line>
      <circle class="plot-point current-point" cx="${currentX}" cy="${currentY}" r="4.4" style="fill:${colors.plotCursor};stroke:${colors.paper};stroke-width:2;"></circle>
      ${stateRects}
      <rect class="plot-hitarea" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" fill="transparent"></rect>
      <text class="plot-label" x="${padding.left}" y="14">NII</text>
      <text class="plot-label" x="${width - padding.right}" y="14" text-anchor="end">closer to FPN</text>
      <text class="plot-label" x="${width - padding.right}" y="${height - (showStates ? 26 : 10)}" text-anchor="end">closer to DMN</text>
      <text class="plot-value" x="${currentX}" y="${currentY - 12}" text-anchor="middle">${values[currentIndex].toFixed(2)}</text>
    </svg>
  `;
}

function renderCompareScene(control, patient) {
  return `
    <section class="compare-board" aria-label="Control and schizophrenia comparison">
      <div class="compare-meta">
        <div class="compare-head">
          <p class="lane-label">Control</p>
          <p class="lane-subject">${control.id} · ${control.metrics.switches_per_minute.toFixed(2)} switches/min</p>
        </div>
        <div class="compare-head">
          <p class="lane-label">Schizophrenia</p>
          <p class="lane-subject">${patient.id} · ${patient.metrics.switches_per_minute.toFixed(2)} switches/min</p>
        </div>
      </div>
      <div class="compare-board-viz">
        ${renderCompareBoardSvg(edgeAt(control, state.frame), edgeAt(patient, state.frame))}
      </div>
      <div class="compare-strip-grid">
        <div class="mini-strip">
          ${renderStateStrip(control.state_labels, state.frame)}
        </div>
        <div class="mini-strip">
          ${renderStateStrip(patient.state_labels, state.frame)}
        </div>
      </div>
    </section>
  `;
}

function renderCompareBoardSvg(controlEdges, patientEdges) {
  return `
    <svg class="compare-board-svg" viewBox="0 0 820 320" role="img" aria-label="Control and schizophrenia comparison board">
      ${renderCompareBoardGlyph(controlEdges, 0)}
      ${renderCompareBoardGlyph(patientEdges, 420)}
    </svg>
  `;
}

function renderCompareBoardGlyph(edges, xOffset) {
  const colors = state.theme;
  const nodes = {
    sn: { x: xOffset + 86, y: 234, color: colors.sn, label: "SN" },
    fpn: { x: xOffset + 170, y: 76, color: colors.fpn, label: "FPN" },
    dmn: { x: xOffset + 254, y: 234, color: colors.dmn, label: "DMN" },
  };
  const edgeDefs = [
    ["sn_fpn", nodes.sn, nodes.fpn],
    ["sn_dmn", nodes.sn, nodes.dmn],
    ["fpn_dmn", nodes.fpn, nodes.dmn],
  ];
  const dominantId = Object.entries(edges).sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))[0][0];

  return `
    <g>
      ${edgeDefs
        .map(([edgeId, from, to]) => {
          const value = edges[edgeId];
          const width = 4.8 + Math.min(Math.abs(value) * 8, 8.6);
          const dash = value < 0 ? `${Math.max(5, width * 0.8).toFixed(1)} ${Math.max(7, width * 1.1).toFixed(1)}` : "0";
          return `
            <line
              x1="${from.x}"
              y1="${from.y}"
              x2="${to.x}"
              y2="${to.y}"
              stroke="${edgeColor(edgeId, colors)}"
              stroke-width="${width.toFixed(2)}"
              stroke-linecap="${value < 0 ? "butt" : "round"}"
              stroke-dasharray="${dash}"
              opacity="${edgeId === dominantId ? 0.92 : 0.56}"
            />
          `;
        })
        .join("")}
      ${Object.values(nodes)
        .map(
          (node) => `
            <circle cx="${node.x}" cy="${node.y}" r="30" fill="${colors.paper}" stroke="${node.color}" stroke-width="2.2" />
            <text x="${node.x}" y="${node.y + 5}" fill="${node.color}" font-size="15" font-weight="600" text-anchor="middle" font-family="Instrument Sans, sans-serif">${node.label}</text>
          `
        )
        .join("")}
    </g>
  `;
}

function renderGroupPlot(rows) {
  const colors = state.theme;
  const width = 640;
  const height = 292;
  const padding = { top: 26, right: 18, bottom: 34, left: 112 };
  const plotWidth = width - padding.left - padding.right;
  const values = rows.map((row) => row.metrics.switches_per_minute);
  const min = Math.min(...values) - 0.35;
  const max = Math.max(...values) + 0.35;
  const x = (value) => padding.left + ((value - min) / (max - min || 1)) * plotWidth;
  const yMap = { control: 92, schizophrenia: 188 };
  const means = summarizeMeans(rows, "switches_per_minute");
  const selectedIds = new Set([state.selectedControlId, state.selectedPatientId, state.selectedGuideId]);
  const tickValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => min + (max - min) * ratio);

  return `
    <p class="panel-note">Switching rate counts how often the window label changes. Hover a point for details. Click a point to inspect that subject.</p>
    <svg class="plot-svg summary-plot" viewBox="0 0 ${width} ${height}" role="img" aria-label="Group comparison of switching rates">
      <rect class="plot-band" x="${padding.left}" y="${yMap.control - 24}" width="${plotWidth}" height="48" rx="20" style="fill:${colors.plotBand};"></rect>
      <rect class="plot-band" x="${padding.left}" y="${yMap.schizophrenia - 24}" width="${plotWidth}" height="48" rx="20" style="fill:${colors.plotBand};"></rect>
      ${tickValues
        .map(
          (value) => `
            <line class="plot-gridline" x1="${x(value)}" x2="${x(value)}" y1="${padding.top}" y2="${height - padding.bottom}" style="stroke:${colors.plotGrid};stroke-width:1;"></line>
          `
        )
        .join("")}
      <line class="plot-axis" x1="${padding.left}" x2="${width - padding.right}" y1="${yMap.control}" y2="${yMap.control}" style="stroke:${colors.plotAxis};stroke-width:1;"></line>
      <line class="plot-axis" x1="${padding.left}" x2="${width - padding.right}" y1="${yMap.schizophrenia}" y2="${yMap.schizophrenia}" style="stroke:${colors.plotAxis};stroke-width:1;"></line>
      ${rows
        .map((row, index) => {
          const jitter = ((index % 3) - 1) * 12;
          const cx = x(row.metrics.switches_per_minute);
          const cy = yMap[row.group] + jitter;
          const selected = selectedIds.has(row.id);
          const fill = row.group === "control" ? colors.paper : colors.plotPatientFill;
          const stroke = row.group === "control" ? colors.plotControl : colors.plotPatient;
          return `
            <circle class="plot-point ${row.group}${selected ? " selected" : ""}" cx="${cx}" cy="${cy}" r="6" data-subject="${row.id}" style="fill:${fill};stroke:${stroke};stroke-width:${selected ? 3 : 2};"></circle>
            <circle class="plot-hit" cx="${cx}" cy="${cy}" r="13" data-subject="${row.id}" fill="transparent"></circle>
          `;
        })
        .join("")}
      ${Object.entries(means)
        .map(
          ([group, value]) => `
            <line class="plot-mean" x1="${x(value)}" x2="${x(value)}" y1="${yMap[group] - 18}" y2="${yMap[group] + 18}" style="stroke:${colors.plotMean};stroke-width:2;"></line>
          `
        )
        .join("")}
      <text class="plot-label" x="18" y="${yMap.control + 4}">control</text>
      <text class="plot-label" x="18" y="${yMap.schizophrenia + 4}">schizophrenia</text>
      <text class="plot-label" x="${padding.left}" y="${height - 10}">fewer switches</text>
      <text class="plot-label" x="${width - padding.right}" y="${height - 10}" text-anchor="end">more switches</text>
    </svg>
  `;
}

function renderSymptomPlot(rows) {
  const colors = state.theme;
  const points = rows.filter((row) => row.positive_symptoms !== null);
  const width = 640;
  const height = 300;
  const padding = { top: 26, right: 18, bottom: 40, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xExtent = paddedExtent(points.map((row) => row.positive_symptoms), 0.18);
  const yExtent = paddedExtent(points.map((row) => row.metrics.switches_per_minute), 0.2);
  const x = (value) => padding.left + ((value - xExtent.min) / (xExtent.max - xExtent.min || 1)) * plotWidth;
  const y = (value) => padding.top + ((yExtent.max - value) / (yExtent.max - yExtent.min || 1)) * plotHeight;
  const line = fitLine(points.map((row) => [row.positive_symptoms, row.metrics.switches_per_minute]));
  const selectedIds = new Set([state.selectedGuideId, state.selectedPatientId]);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => xExtent.min + (xExtent.max - xExtent.min) * ratio);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => yExtent.min + (yExtent.max - yExtent.min) * ratio);

  return `
    <p class="panel-note">Positive symptoms here use the BPRS positive factor from the public phenotype table. Hover a point for details. Click one to make it the playback subject.</p>
    <svg class="plot-svg summary-plot" viewBox="0 0 ${width} ${height}" role="img" aria-label="Positive symptoms versus switching">
      <rect class="plot-band" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" rx="20" style="fill:${colors.plotBand};"></rect>
      ${xTicks
        .map(
          (value) =>
            `<line class="plot-gridline" x1="${x(value)}" x2="${x(value)}" y1="${padding.top}" y2="${height - padding.bottom}" style="stroke:${colors.plotGrid};stroke-width:1;"></line>`
        )
        .join("")}
      ${yTicks
        .map(
          (value) =>
            `<line class="plot-gridline" x1="${padding.left}" x2="${width - padding.right}" y1="${y(value)}" y2="${y(value)}" style="stroke:${colors.plotGrid};stroke-width:1;"></line>`
        )
        .join("")}
      <line class="plot-axis" x1="${padding.left}" x2="${padding.left}" y1="${padding.top}" y2="${height - padding.bottom}" style="stroke:${colors.plotAxis};stroke-width:1;"></line>
      <line class="plot-axis" x1="${padding.left}" x2="${width - padding.right}" y1="${height - padding.bottom}" y2="${height - padding.bottom}" style="stroke:${colors.plotAxis};stroke-width:1;"></line>
      ${
        line
          ? `<line class="fit-line" x1="${x(xExtent.min)}" y1="${y(
              line.m * xExtent.min + line.b
            )}" x2="${x(xExtent.max)}" y2="${y(line.m * xExtent.max + line.b)}" style="stroke:${colors.plotPatient};stroke-width:2;stroke-dasharray:7 6;"></line>`
          : ""
      }
      ${points
        .map((row) => {
          const cx = x(row.positive_symptoms);
          const cy = y(row.metrics.switches_per_minute);
          const selected = selectedIds.has(row.id);
          return `
            <circle class="plot-point patient${selected ? " selected" : ""}" cx="${cx}" cy="${cy}" r="6.2" data-subject="${row.id}" style="fill:${colors.plotPatientFill};stroke:${colors.plotPatient};stroke-width:${selected ? 3 : 2};"></circle>
            <circle class="plot-hit" cx="${cx}" cy="${cy}" r="13" data-subject="${row.id}" fill="transparent"></circle>
          `;
        })
        .join("")}
      <text class="plot-label" x="${padding.left}" y="${height - 10}">lower positive symptoms</text>
      <text class="plot-label" x="${width - padding.right}" y="${height - 10}" text-anchor="end">higher positive symptoms</text>
      <text class="plot-label" x="16" y="${padding.top + 8}">more</text>
      <text class="plot-label" x="16" y="${height - padding.bottom}">less</text>
      <text class="plot-label" x="16" y="${height / 2}" transform="rotate(-90 16 ${height / 2})">switching</text>
    </svg>
  `;
}

function handleFocusPlotScrub(event) {
  const svg = event.target.closest(".nii-plot");
  const step = state.steps[state.index];
  const blockedFocusStep = step.mode === "focus" && !(state.index === 2 || state.index === 3);

  if (!svg || !["focus", "explore"].includes(step.mode) || blockedFocusStep) {
    return;
  }
  const nextFrame = frameFromSvgPosition(event, svg);
  updateFrame(nextFrame);
}

function handleStripScrub(event) {
  const segment = event.target.closest(".strip-segment[data-frame]");
  if (!segment || state.index !== 4) {
    return;
  }
  updateFrame(Number(segment.dataset.frame));
}

function handleExploreSubjectPick(event) {
  const button = event.target.closest("[data-subject-pick]");
  if (!button || state.index !== state.steps.length - 1) {
    return;
  }

  const subject = state.subjects[button.dataset.subjectPick];
  if (!subject) {
    return;
  }

  state.selectedExploreId = subject.id;
  state.frame = peakFrame(subject);
  render();
}

function handleTrianglePointerDown(event) {
  const node = event.target.closest(".node[data-node]");
  const container = event.currentTarget;
  if (!node || !(container instanceof HTMLElement)) {
    return;
  }

  event.preventDefault();
  state.drag = {
    pointerId: event.pointerId,
    container,
    node,
  };
  node.classList.add("is-grabbed");
  container.classList.add("is-dragging");
  node.setPointerCapture?.(event.pointerId);
}

function handleTrianglePointerMove(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  const { container, node } = state.drag;
  const rect = container.getBoundingClientRect();
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 16, 84);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 14, 84);

  node.style.setProperty("--x", x.toFixed(2));
  node.style.setProperty("--y", y.toFixed(2));
  syncTriangleGeometry(container);
}

function handleTrianglePointerUp(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  const { container, node } = state.drag;
  node.classList.remove("is-grabbed");
  container.classList.remove("is-dragging");
  node.releasePointerCapture?.(event.pointerId);
  state.drag = null;
}

function handleSummaryPointerMove(event) {
  const hit = event.target.closest("[data-subject]");
  if (!hit || state.index < 5) {
    hideTooltip();
    return;
  }

  const subjectId = hit.dataset.subject;
  const subject = subjectSummary(subjectId);
  if (!subject) {
    hideTooltip();
    return;
  }

  showTooltip(event, tooltipHTML(subject));
}

function handleSummaryClick(event) {
  const hit = event.target.closest("[data-subject]");
  if (!hit || state.index < 5) {
    return;
  }
  inspectSubject(hit.dataset.subject);
}

function inspectSubject(subjectId) {
  const subject = state.subjects[subjectId];
  if (!subject) {
    return;
  }

  state.selectedExploreId = subjectId;

  if (subject.group === "control") {
    state.selectedControlId = subjectId;
  } else {
    state.selectedGuideId = subjectId;
    state.selectedPatientId = subjectId;
  }

  state.frame = peakFrame(subject);
  state.steps = buildSteps(state.manifest);
  render();
}

function showTooltip(event, html) {
  elements.tooltip.innerHTML = html;
  elements.tooltip.hidden = false;

  const gap = 14;
  const width = elements.tooltip.offsetWidth;
  const height = elements.tooltip.offsetHeight;
  const left = Math.min(event.clientX + gap, window.innerWidth - width - 12);
  const top = Math.min(event.clientY + gap, window.innerHeight - height - 12);

  elements.tooltip.style.left = `${Math.max(12, left)}px`;
  elements.tooltip.style.top = `${Math.max(12, top)}px`;
}

function hideTooltip() {
  elements.tooltip.hidden = true;
}

function tooltipHTML(subject) {
  const positive =
    subject.positive_symptoms === null || subject.positive_symptoms === undefined
      ? "n/a"
      : subject.positive_symptoms.toFixed(1);

  return `
    <p class="tooltip-kicker">${subject.group}</p>
    <strong>${subject.id}</strong>
    <p>switches/min: ${subject.metrics.switches_per_minute.toFixed(2)}</p>
    <p>positive symptoms: ${positive}</p>
  `;
}

function subjectSummary(subjectId) {
  return state.manifest.subjects.find((row) => row.id === subjectId) ?? null;
}

function renderExplorePills() {
  return state.manifest.subjects
    .map((subject) => {
      const active = subject.id === state.selectedExploreId ? " active" : "";
      return `
        <button
          class="subject-pill ${subject.group}${active}"
          type="button"
          data-subject-pick="${subject.id}"
          aria-pressed="${subject.id === state.selectedExploreId ? "true" : "false"}"
        >
          ${subject.id}
        </button>
      `;
    })
    .join("");
}

function frameFromSvgPosition(event, svg) {
  const count = Number(svg.dataset.count);
  const rect = svg.getBoundingClientRect();
  const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  return Math.round(ratio * (count - 1));
}

function syncTriangleGeometry(container) {
  const svg = container.querySelector(".triangle-edges");
  if (!(svg instanceof SVGElement)) {
    return;
  }

  const nodes = Object.fromEntries(
    [...container.querySelectorAll(".node[data-node]")].map((node) => [
      node.dataset.node,
      readNodePosition(node),
    ])
  );

  const linePairs = {
    sn_fpn: ["sn", "fpn"],
    sn_dmn: ["sn", "dmn"],
    fpn_dmn: ["fpn", "dmn"],
  };

  [...svg.querySelectorAll("[data-edge]")].forEach((line) => {
    const [fromId, toId] = linePairs[line.dataset.edge] ?? [];
    const from = nodes[fromId];
    const to = nodes[toId];
    if (!from || !to) {
      return;
    }
    line.setAttribute("x1", from.x.toFixed(2));
    line.setAttribute("y1", from.y.toFixed(2));
    line.setAttribute("x2", to.x.toFixed(2));
    line.setAttribute("y2", to.y.toFixed(2));
  });
}

function readNodePosition(node) {
  const styles = getComputedStyle(node);
  return {
    x: Number(styles.getPropertyValue("--x")) || 50,
    y: Number(styles.getPropertyValue("--y")) || 50,
  };
}

function updateFrame(nextFrame) {
  if (nextFrame === state.frame) {
    return;
  }
  state.frame = clamp(nextFrame, 0, frameCountForStep(state.steps[state.index]) - 1);
  render();
}

function guideSubject() {
  return state.subjects[state.selectedGuideId || state.manifest.featured.guide_subject_id];
}

function comparisonControl() {
  return state.subjects[
    state.selectedControlId || state.manifest.featured.comparison_control_id
  ];
}

function comparisonPatient() {
  return state.subjects[
    state.selectedPatientId || state.manifest.featured.comparison_patient_id
  ];
}

function exploreSubject() {
  return state.subjects[state.selectedExploreId || state.selectedGuideId];
}

function edgeAt(subject, frame) {
  const index = Math.min(frame, subject.nii.length - 1);
  return {
    sn_fpn: subject.edges.sn_fpn[index],
    sn_dmn: subject.edges.sn_dmn[index],
    fpn_dmn: subject.edges.fpn_dmn[index],
  };
}

function peakFrame(subject) {
  let bestIndex = 0;
  let bestValue = -Infinity;
  subject.nii.forEach((value, index) => {
    const score = Math.abs(value);
    if (score > bestValue) {
      bestValue = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function sharedFrameCount() {
  return Math.min(
    guideSubject().nii.length,
    comparisonControl().nii.length,
    comparisonPatient().nii.length
  );
}

function playbackSubject(step) {
  return step.mode === "explore" ? exploreSubject() : guideSubject();
}

function frameCountForStep(step) {
  if (step.mode === "compare") {
    return sharedFrameCount();
  }
  if (step.mode === "explore") {
    return exploreSubject().nii.length;
  }
  return guideSubject().nii.length;
}

function startPlayback() {
  if (state.playing) {
    return;
  }
  state.playing = true;
  elements.playToggle.textContent = "Pause";
  state.timer = window.setInterval(() => {
    state.frame = (state.frame + 1) % frameCountForStep(state.steps[state.index]);
    render();
  }, 620);
  render();
}

function stopPlayback() {
  state.playing = false;
  elements.playToggle.textContent = "Play";
  if (state.timer !== null) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
  elements.viz.classList.remove("is-playing");
}

function playbackStep(step) {
  return (
    (step.mode === "focus" && (state.index === 2 || state.index === 3)) ||
    step.mode === "compare" ||
    step.mode === "explore"
  );
}

function summarizeMeans(rows, key) {
  const groups = { control: [], schizophrenia: [] };
  rows.forEach((row) => {
    groups[row.group].push(row.metrics[key]);
  });
  return {
    control: average(groups.control),
    schizophrenia: average(groups.schizophrenia),
  };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function paddedExtent(values, padRatio = 0.12) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return {
    min: min - span * padRatio,
    max: max + span * padRatio,
  };
}

function fitLine(points) {
  if (points.length < 2) {
    return null;
  }
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const meanX = average(xs);
  const meanY = average(ys);
  const numerator = points.reduce(
    (sum, point) => sum + (point[0] - meanX) * (point[1] - meanY),
    0
  );
  const denominator = points.reduce((sum, point) => sum + (point[0] - meanX) ** 2, 0);
  if (denominator === 0) {
    return null;
  }
  const m = numerator / denominator;
  return { m, b: meanY - m * meanX };
}

function edgeColor(edgeId, colors) {
  if (edgeId === "sn_fpn") {
    return "hsla(102, 16%, 42%, 1)";
  }
  if (edgeId === "sn_dmn") {
    return colors.plotPatient;
  }
  return "hsla(220, 10%, 62%, 1)";
}

function pathFromPoints(points) {
  return points
    .map(([xValue, yValue], index) => `${index === 0 ? "M" : "L"} ${xValue} ${yValue}`)
    .join(" ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatTime(seconds) {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

function applyInitialParams() {
  const params = new URLSearchParams(window.location.search);
  const requestedStep = Number(params.get("step"));
  const requestedSubject = params.get("subject");

  if (requestedSubject && state.subjects[requestedSubject]) {
    const subject = state.subjects[requestedSubject];
    state.selectedExploreId = requestedSubject;
    if (subject.group === "control") {
      state.selectedControlId = requestedSubject;
    } else {
      state.selectedGuideId = requestedSubject;
      state.selectedPatientId = requestedSubject;
    }
  }

  if (Number.isFinite(requestedStep) && requestedStep >= 1) {
    state.index = clamp(requestedStep - 1, 0, state.steps.length - 1);
  }
}

function readTheme() {
  const root = getComputedStyle(document.documentElement);
  const css = (name) => root.getPropertyValue(name).trim();
  const hue = Number(css("--h")) || 28;
  const hsla = (offset, saturation, lightness, alpha = 1) => {
    const normalized = ((offset % 360) + 360) % 360;
    return `hsla(${normalized}, ${saturation}%, ${lightness}%, ${alpha})`;
  };

  return {
    paper: hsla(hue, 34, 98, 1),
    plotAxis: hsla(hue, 18, 74, 0.74),
    plotGrid: hsla(hue, 18, 78, 0.5),
    plotBand: hsla(hue, 26, 94, 0.58),
    plotLine: hsla(hue + 156, 34, 37, 1),
    plotFill: hsla(hue + 156, 44, 52, 0.16),
    plotCursor: hsla(hue - 8, 66, 49, 0.9),
    plotMean: hsla(hue + 156, 14, 42, 0.74),
    plotControl: hsla(hue + 156, 34, 37, 1),
    plotPatient: hsla(hue - 8, 68, 52, 1),
    plotPatientFill: hsla(hue - 8, 72, 62, 0.16),
    sn: hsla(hue - 8, 71, 54, 1),
    fpn: hsla(hue + 156, 40, 36, 1),
    dmn: hsla(hue + 304, 26, 35, 1),
    state0: hsla(hue + 304, 30, 42, 0.82),
    state1: hsla(hue, 18, 54, 0.88),
    state2: hsla(hue + 156, 42, 40, 0.84),
  };
}
