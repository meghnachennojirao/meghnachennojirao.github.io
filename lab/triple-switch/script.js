const state = {
  manifest: null,
  subjects: {},
  steps: [],
  index: 0,
  frame: 0,
  playing: false,
  timer: null,
};

const elements = {
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
  modeSummary: document.querySelector("#mode-summary"),
  focusTriangle: document.querySelector("#focus-triangle"),
  controlTriangle: document.querySelector("#compare-control-triangle"),
  patientTriangle: document.querySelector("#compare-patient-triangle"),
  controlStrip: document.querySelector("#control-strip"),
  patientStrip: document.querySelector("#patient-strip"),
  controlLabel: document.querySelector("#control-subject-label"),
  patientLabel: document.querySelector("#patient-subject-label"),
  summaryKicker: document.querySelector("#summary-kicker"),
  summaryPanel: document.querySelector("#summary-panel"),
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

  state.steps = buildSteps(state.manifest);
  state.frame = peakFrame(guideSubject());

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
    state.frame = Number(elements.scrubber.value);
    render();
  });

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
  const guide = state.subjects[manifest.featured.guide_subject_id];
  const symptomR = manifest.symptom_associations.positive_vs_switches_per_minute.r;
  const symptomText =
    symptomR === null
      ? "The symptom overlay is ready for comparison once more patient data is added."
      : `Within the five schizophrenia participants here, higher positive-symptom scores line up with faster switching (r = ${symptomR.toFixed(2)}).`;

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
      what: "Now: thicker means stronger coupling inside this one window.",
    },
    {
      mode: "focus",
      eyebrow: "Step 3 / playback",
      headline: "Now let one scan move.",
      body: `The cursor moves through overlapping 40-second windows from one ${guide.group} participant. The triangle updates at each step.`,
      what: "Now: the line below is NII. Positive means salience sits closer to FPN than DMN.",
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
      headline: "Two people can travel differently.",
      body: "Here, a control and a schizophrenia participant move through the same map at the same window index.",
      what: "Now: top is a control, bottom is a schizophrenia participant, aligned to the same moment in the scan.",
    },
    {
      mode: "summary",
      eyebrow: "Step 6 / small sample",
      headline: "The small sample overlaps.",
      body: "Across this 10-person subset, the groups overlap more than they separate. This is a comparison view, not a proof view.",
      what: "Now: each point is one person, positioned by switching rate.",
    },
    {
      mode: "summary",
      eyebrow: "Step 7 / symptoms",
      headline: "Symptoms can be compared too.",
      body: symptomText,
      what: "Now: each point is one schizophrenia participant.",
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

  elements.stepIndex.textContent = pad(state.index + 1);
  elements.eyebrow.textContent = step.eyebrow;
  elements.headline.textContent = step.headline;
  elements.body.textContent = step.body;
  elements.whatLine.textContent = step.what;
  elements.prev.disabled = state.index === 0;
  elements.next.textContent = state.index === state.steps.length - 1 ? "Again" : "Next";

  [...elements.dots.children].forEach((dot, index) => {
    dot.classList.toggle("active", index === state.index);
  });

  toggleModes(step.mode);
  syncPlaybar(step);

  if (step.mode === "focus") {
    renderFocus();
  }
  if (step.mode === "compare") {
    renderCompare();
  }
  if (step.mode === "summary") {
    renderSummary();
  }
}

function toggleModes(mode) {
  elements.modeFocus.hidden = mode !== "focus";
  elements.modeCompare.hidden = mode !== "compare";
  elements.modeSummary.hidden = mode !== "summary";
}

function syncPlaybar(step) {
  const show = playbackStep(step);
  elements.playbar.hidden = !show;

  if (!show) {
    stopPlayback();
    return;
  }

  const max = sharedFrameCount() - 1;
  state.frame = Math.min(state.frame, max);
  elements.scrubber.max = String(max);
  elements.scrubber.value = String(state.frame);
  elements.playToggle.textContent = state.playing ? "Pause" : "Play";
  elements.timeReadout.textContent = formatTime(guideSubject().window_seconds[state.frame]);
}

function renderFocus() {
  const guide = guideSubject();
  const current = edgeAt(guide, state.frame);
  const firstMask = state.manifest.static_masks[0];

  if (state.index === 0) {
    paintTriangle(elements.focusTriangle, null);
    elements.triangleNote.textContent = `${Math.round(firstMask.triple_share * 100)}% of the published 500-edge biomarker mask falls inside this triangle.`;
    elements.panelKicker.textContent = "Three roles, before any timing";
    elements.focusPanel.innerHTML = renderGlossary();
    elements.stateLegend.innerHTML = "";
    return;
  }

  paintTriangle(elements.focusTriangle, current);
  elements.triangleNote.textContent = `${guide.id} · ${guide.group} · ${formatTime(guide.window_seconds[state.frame])}`;

  if (state.index === 1) {
    elements.panelKicker.textContent = "One window, broken into three pairings";
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

  elements.controlLabel.textContent = `${control.id} · ${control.metrics.switches_per_minute.toFixed(2)} switches/min`;
  elements.patientLabel.textContent = `${patient.id} · ${patient.metrics.switches_per_minute.toFixed(2)} switches/min`;

  paintTriangle(elements.controlTriangle, edgeAt(control, state.frame));
  paintTriangle(elements.patientTriangle, edgeAt(patient, state.frame));

  elements.controlStrip.innerHTML = renderStateStrip(control.state_labels, state.frame);
  elements.patientStrip.innerHTML = renderStateStrip(patient.state_labels, state.frame);
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

function paintTriangle(container, edges) {
  container.querySelectorAll(".node").forEach((node) => {
    node.classList.add("active");
  });

  container.querySelectorAll("[data-edge]").forEach((line) => {
    if (!edges) {
      line.style.strokeWidth = "1.5";
      line.style.opacity = "0.12";
      line.style.strokeDasharray = "0";
      return;
    }

    const value = edges[line.dataset.edge];
    line.style.strokeWidth = String(1.8 + Math.min(Math.abs(value) * 4.2, 8.4));
    line.style.opacity = String(0.22 + Math.min(Math.abs(value) * 0.36, 0.7));
    line.style.strokeDasharray = value < 0 ? "5 5" : "0";
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
        <div class="strip-segment ${index === currentIndex ? "current" : ""}" data-state="${label}"></div>
      `
    )
    .join("");
}

function renderNIIPlot(subject, currentIndex, showStates) {
  const values = subject.nii;
  const width = 640;
  const height = showStates ? 264 : 232;
  const padding = { top: 18, right: 16, bottom: showStates ? 50 : 34, left: 16 };
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

  const linePath = pathFromPoints(values.map((value, index) => [x(index), y(value)]));
  const fillPath = `${linePath} L ${x(values.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const currentX = x(currentIndex);
  const currentY = y(values[currentIndex]);
  const zeroY = y(0);

  const stateRects = showStates
    ? subject.state_labels
        .map((label, index) => {
          const left = padding.left + (index / values.length) * plotWidth;
          const nextLeft = padding.left + ((index + 1) / values.length) * plotWidth;
          return `<rect x="${left}" y="${height - 18}" width="${Math.max(
            nextLeft - left - 1,
            1
          )}" height="10" rx="5" fill="var(--state-${label})" opacity="${
            index === currentIndex ? 1 : 0.34
          }"></rect>`;
        })
        .join("")
    : "";

  return `
    <p class="panel-note">This line is NII: salience-to-frontoparietal coupling minus salience-to-default coupling.</p>
    <svg class="plot-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="NII plot">
      <path class="plot-fill" d="${fillPath}"></path>
      <line class="plot-baseline" x1="${padding.left}" x2="${width - padding.right}" y1="${zeroY}" y2="${zeroY}"></line>
      <path class="plot-line" d="${linePath}"></path>
      <line class="plot-cursor" x1="${currentX}" x2="${currentX}" y1="${padding.top}" y2="${padding.top + plotHeight}"></line>
      <circle cx="${currentX}" cy="${currentY}" r="4.2" fill="var(--ink)"></circle>
      ${stateRects}
      <text class="plot-label" x="${padding.left}" y="14">NII</text>
      <text class="plot-label" x="${width - padding.right}" y="14" text-anchor="end">closer to FPN</text>
      <text class="plot-label" x="${width - padding.right}" y="${height - (showStates ? 26 : 10)}" text-anchor="end">closer to DMN</text>
      <text class="plot-value" x="${currentX}" y="${currentY - 10}" text-anchor="middle">${values[currentIndex].toFixed(2)}</text>
    </svg>
  `;
}

function renderGroupPlot(rows) {
  const width = 640;
  const height = 280;
  const padding = { top: 26, right: 18, bottom: 34, left: 126 };
  const plotWidth = width - padding.left - padding.right;
  const values = rows.map((row) => row.metrics.switches_per_minute);
  const min = Math.min(...values) - 0.35;
  const max = Math.max(...values) + 0.35;
  const x = (value) => padding.left + ((value - min) / (max - min || 1)) * plotWidth;
  const yMap = { control: 92, schizophrenia: 188 };
  const means = summarizeMeans(rows, "switches_per_minute");

  return `
    <p class="panel-note">Switching rate counts how often the window label changes. Higher means the scan hops between recurring states more often.</p>
    <svg class="plot-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Group comparison of switching rates">
      <line class="plot-axis" x1="${padding.left}" x2="${width - padding.right}" y1="${yMap.control}" y2="${yMap.control}"></line>
      <line class="plot-axis" x1="${padding.left}" x2="${width - padding.right}" y1="${yMap.schizophrenia}" y2="${yMap.schizophrenia}"></line>
      ${rows
        .map((row, index) => {
          const jitter = ((index % 3) - 1) * 12;
          return `<circle class="plot-point ${row.group}" cx="${x(
            row.metrics.switches_per_minute
          )}" cy="${yMap[row.group] + jitter}" r="6"></circle>`;
        })
        .join("")}
      ${Object.entries(means)
        .map(
          ([group, value]) => `
            <line class="plot-mean" x1="${x(value)}" x2="${x(value)}" y1="${yMap[group] - 18}" y2="${yMap[group] + 18}"></line>
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

  return `
    <p class="panel-note">Positive symptoms here use the BPRS positive factor from the public phenotype table. The sample is tiny, so the point is pattern-reading, not certainty.</p>
    <svg class="plot-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Positive symptoms versus switching">
      <line class="plot-axis" x1="${padding.left}" x2="${padding.left}" y1="${padding.top}" y2="${height - padding.bottom}"></line>
      <line class="plot-axis" x1="${padding.left}" x2="${width - padding.right}" y1="${height - padding.bottom}" y2="${height - padding.bottom}"></line>
      ${
        line
          ? `<line class="fit-line" x1="${x(xExtent.min)}" y1="${y(
              line.m * xExtent.min + line.b
            )}" x2="${x(xExtent.max)}" y2="${y(line.m * xExtent.max + line.b)}"></line>`
          : ""
      }
      ${points
        .map(
          (row) => `
            <circle class="plot-point patient" cx="${x(row.positive_symptoms)}" cy="${y(
              row.metrics.switches_per_minute
            )}" r="6.2"></circle>
          `
        )
        .join("")}
      <text class="plot-label" x="${padding.left}" y="${height - 10}">lower positive symptoms</text>
      <text class="plot-label" x="${width - padding.right}" y="${height - 10}" text-anchor="end">higher positive symptoms</text>
      <text class="plot-label" x="16" y="${padding.top + 8}">more</text>
      <text class="plot-label" x="16" y="${height - padding.bottom}">less</text>
      <text class="plot-label" x="16" y="${height / 2}" transform="rotate(-90 16 ${height / 2})">switching</text>
    </svg>
  `;
}

function guideSubject() {
  return state.subjects[state.manifest.featured.guide_subject_id];
}

function comparisonControl() {
  return state.subjects[state.manifest.featured.comparison_control_id];
}

function comparisonPatient() {
  return state.subjects[state.manifest.featured.comparison_patient_id];
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

function startPlayback() {
  if (state.playing) {
    return;
  }
  state.playing = true;
  elements.playToggle.textContent = "Pause";
  state.timer = window.setInterval(() => {
    state.frame = (state.frame + 1) % sharedFrameCount();
    render();
  }, 620);
}

function stopPlayback() {
  state.playing = false;
  elements.playToggle.textContent = "Play";
  if (state.timer !== null) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
}

function playbackStep(step) {
  return (step.mode === "focus" && (state.index === 2 || state.index === 3)) || step.mode === "compare";
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
  const numerator = points.reduce((sum, point) => sum + (point[0] - meanX) * (point[1] - meanY), 0);
  const denominator = points.reduce((sum, point) => sum + (point[0] - meanX) ** 2, 0);
  if (denominator === 0) {
    return null;
  }
  const m = numerator / denominator;
  return { m, b: meanY - m * meanX };
}

function pathFromPoints(points) {
  return points
    .map(([xValue, yValue], index) => `${index === 0 ? "M" : "L"} ${xValue} ${yValue}`)
    .join(" ");
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
