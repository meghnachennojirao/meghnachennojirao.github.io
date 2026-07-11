import { sections, lessons, lessonCount } from "./course-data.js";

const app = document.querySelector("#app");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const storageKey = "neural-atlas-progress-v1";

let stored = {};
try {
  stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
} catch {
  stored = {};
}

const state = {
  completed: new Set(stored.completed || []),
  selectedId: lessons.some((lesson) => lesson.id === location.hash.slice(1))
    ? location.hash.slice(1)
    : stored.selectedId || lessons[0].id,
  focusMode: false,
};

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({
    completed: [...state.completed],
    selectedId: state.selectedId,
  }));
}

function currentLesson() {
  return lessons.find((lesson) => lesson.id === state.selectedId) || lessons[0];
}

function selectedIndex() {
  return lessons.findIndex((lesson) => lesson.id === state.selectedId);
}

function escapeHTML(value) {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[character]));
}

function progressPercentage() {
  return Math.round((state.completed.size / lessonCount) * 100);
}

function renderShell() {
  app.innerHTML = `
    <header class="topbar">
      <a class="wordmark" href="#${lessons[0].id}" aria-label="Neural Atlas home">
        <span class="wordmark-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span><strong>Neural Atlas</strong><small>the whole nervous system, held together</small></span>
      </a>
      <div class="topbar-actions">
        <span class="progress-chip"><b>${progressPercentage()}%</b> remembered</span>
        <button class="quiet-button" id="focus-toggle" type="button" aria-pressed="false">Focus view</button>
      </div>
    </header>
    <div class="course-layout">
      <aside class="course-index" aria-label="Course index">
        <section class="index-intro">
          <p class="eyebrow">A study companion</p>
          <h1>A complete route through neuroscience—not a trail of disconnected facts.</h1>
          <p>Read the original chapter in full, then use this page to return to the ideas that matter, connect them, and keep your place when attention wanders.</p>
        </section>
        <div class="progress-panel">
          <div><span>Your route</span><strong>${state.completed.size} / ${lessonCount}</strong></div>
          <div class="progress-line" aria-label="${progressPercentage()} percent of chapters marked complete"><span style="transform: scaleX(${progressPercentage() / 100})"></span></div>
        </div>
        <nav class="section-nav" id="section-nav"></nav>
        <button class="reset-button" id="reset-progress" type="button">Reset my markers</button>
      </aside>
      <main id="lesson" class="lesson-stage" tabindex="-1"></main>
    </div>
  `;
  renderNavigation();
  renderLesson();
  wireShell();
}

function renderNavigation() {
  const nav = document.querySelector("#section-nav");
  nav.innerHTML = sections.map((section) => {
    const completed = section.lessons.filter((item) => state.completed.has(item.id)).length;
    return `
      <section class="nav-section ${section.color}">
        <div class="nav-section-title">
          <span>${section.number}</span>
          <div><strong>${section.title}</strong><small>${completed}/${section.lessons.length}</small></div>
        </div>
        <div class="lesson-links">
          ${section.lessons.map((lesson, index) => `
            <button class="lesson-link ${lesson.id === state.selectedId ? "is-active" : ""} ${state.completed.has(lesson.id) ? "is-complete" : ""}" type="button" data-lesson="${lesson.id}">
              <span class="lesson-status" aria-hidden="true">${state.completed.has(lesson.id) ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <span>${escapeHTML(lesson.title)}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function lessonReading(lesson) {
  const [first, second, third] = lesson.anchors;
  return `
    <p><strong>${lesson.synopsis}</strong> Begin with ${first}. Do not treat it as a vocabulary item to get past: ask what changes, where that change is detected, and what consequence follows. In neuroscience, a useful explanation always keeps the mechanism connected to the function it enables.</p>
    <p>Next, make the relationship between <em>${second}</em> and <em>${third}</em> explicit. The point is not to retain a list. You are building a causal model that can survive a new example, a lesion question, or a graph that looks unfamiliar. If you lose the thread, return to the simple sequence: input, transformation, output, feedback.</p>
    <p>While reading the full chapter, pause whenever an experiment, diagram, or clinical example appears. Ask what it rules out, not only what it shows. That small habit turns detail into understanding—and keeps the chapter connected to the larger system rather than becoming a pile of facts.</p>
  `;
}

function renderLesson() {
  const lesson = currentLesson();
  const index = selectedIndex();
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const stage = document.querySelector("#lesson");
  const complete = state.completed.has(lesson.id);

  stage.innerHTML = `
    <section class="lesson-header ${lesson.sectionColor}">
      <div class="lesson-breadcrumb"><span>Section ${lesson.sectionNumber}</span><span>${escapeHTML(lesson.sectionTitle)}</span><span>Chapter ${lesson.lessonNumber}</span></div>
      <div class="lesson-utility">
        <a class="video-link" href="${lesson.youtube}" target="_blank" rel="noreferrer">YouTube companion <span aria-hidden="true">↗</span></a>
        <a class="source-link" href="${lesson.source}" target="_blank" rel="noreferrer">Official full chapter <span aria-hidden="true">↗</span></a>
      </div>
      <p class="eyebrow">${lesson.minutes}–${lesson.minutes + 12} minute deep study</p>
      <h2>${escapeHTML(lesson.title)}</h2>
      <p class="lesson-deck">${escapeHTML(lesson.synopsis)}</p>
      <div class="start-row">
        <span class="chapter-count">${index + 1} of ${lessonCount}</span>
        <button class="complete-button ${complete ? "is-complete" : ""}" id="complete-button" type="button">${complete ? "Marked understood ✓" : "Mark this chapter understood"}</button>
      </div>
    </section>

    <div class="lesson-content">
      <section class="study-contract" aria-label="Study approach">
        <div><p class="eyebrow">Before the detail</p><h3>Keep one question in view.</h3></div>
        <p>${escapeHTML(lesson.prompt)}</p>
      </section>

      <div class="teaching-grid">
        <article class="reading-column">
          <p class="eyebrow">The connected explanation</p>
          <h3>Learn the chain, not isolated names.</h3>
          ${lessonReading(lesson)}
          <section class="anchor-section">
            <p class="eyebrow">Three anchors to return to</p>
            <ol class="anchor-list">
              ${lesson.anchors.map((anchor, anchorIndex) => `<li><span>${String(anchorIndex + 1).padStart(2, "0")}</span><strong>${escapeHTML(anchor)}</strong></li>`).join("")}
            </ol>
          </section>
        </article>
        <aside class="visual-column">
          <div class="visual-head"><span>Original teaching sketch</span><small>live mental model</small></div>
          <canvas class="lesson-canvas" id="lesson-canvas" width="820" height="540" data-visual="${lesson.visual}" aria-label="Animated conceptual diagram for ${escapeHTML(lesson.title)}"></canvas>
          <p class="visual-caption">This is a fresh diagram created for this companion. It is meant to help you reason through the process before returning to the full source chapter.</p>
        </aside>
      </div>

      <section class="return-point">
        <div><p class="eyebrow">When attention drifts</p><h3>Do not restart. Leave a breadcrumb.</h3></div>
        <label for="lesson-note">Where was your mind when you stopped?</label>
        <textarea id="lesson-note" rows="3" placeholder="e.g. I understand the pathway until it crosses in the medulla."></textarea>
        <small>Saved only in this browser. Next time, read this sentence first.</small>
      </section>

      <nav class="chapter-pager" aria-label="Chapter navigation">
        ${previous ? `<button type="button" data-go="${previous.id}" class="pager-back"><span>← Previous</span><strong>${escapeHTML(previous.title)}</strong></button>` : `<span></span>`}
        ${next ? `<button type="button" data-go="${next.id}" class="pager-next"><span>Continue →</span><strong>${escapeHTML(next.title)}</strong></button>` : `<a class="finish-link" href="#${lessons[0].id}">Begin another pass ↗</a>`}
      </nav>
    </div>
    <footer class="course-footer">Independent study companion based on the <a href="https://nba.uth.tmc.edu/neuroscience/m/index.htm" target="_blank" rel="noreferrer">Neuroscience Online curriculum</a>. Original summaries and diagrams; source text and media remain with their creators.</footer>
  `;

  const note = document.querySelector("#lesson-note");
  note.value = localStorage.getItem(`neural-atlas-note-${lesson.id}`) || "";
  note.addEventListener("input", () => localStorage.setItem(`neural-atlas-note-${lesson.id}`, note.value));
  document.querySelector("#complete-button").addEventListener("click", () => toggleComplete(lesson.id));
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => selectLesson(button.dataset.go)));
  drawLessonCanvas(document.querySelector("#lesson-canvas"), lesson.visual, lesson.anchors);
}

function wireShell() {
  document.querySelectorAll("[data-lesson]").forEach((button) => button.addEventListener("click", () => selectLesson(button.dataset.lesson)));
  document.querySelector("#focus-toggle").addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    document.body.classList.toggle("focus-mode", state.focusMode);
    const toggle = document.querySelector("#focus-toggle");
    toggle.setAttribute("aria-pressed", String(state.focusMode));
    toggle.textContent = state.focusMode ? "Exit focus view" : "Focus view";
  });
  document.querySelector("#reset-progress").addEventListener("click", () => {
    if (!window.confirm("Clear all chapter markers? Your notes will stay.")) return;
    state.completed.clear();
    saveState();
    renderShell();
  });
}

function selectLesson(id) {
  if (!lessons.some((lesson) => lesson.id === id)) return;
  state.selectedId = id;
  saveState();
  history.replaceState(null, "", `#${id}`);
  renderShell();
  document.querySelector("#lesson").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

function toggleComplete(id) {
  if (state.completed.has(id)) state.completed.delete(id);
  else state.completed.add(id);
  saveState();
  renderShell();
}

function point(ctx, x, y, label, hue) {
  ctx.fillStyle = hue;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#263037";
  ctx.font = "600 13px Onest, sans-serif";
  ctx.fillText(label, x + 20, y + 4);
}

function drawLessonCanvas(canvas, visual, anchors) {
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  const width = Math.max(300, Math.round(box.width));
  const height = Math.round(width * 0.62);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  let frame = 0;

  function draw() {
    const phase = reduceMotion ? 0.58 : (frame % 300) / 300;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f1eadc";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(52, 67, 73, .14)";
    ctx.lineWidth = 1;
    for (let y = 42; y < height; y += 42) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.fillStyle = "#263037";
    ctx.font = "600 12px Onest, sans-serif";
    ctx.fillText(anchors[0].toUpperCase(), 22, 28);

    if (visual === "signal") drawSignal(ctx, width, height, phase);
    else if (visual === "synapse") drawSynapse(ctx, width, height, phase);
    else if (visual === "pathway") drawPathway(ctx, width, height, phase);
    else if (visual === "network") drawNetwork(ctx, width, height, phase);
    else drawBrain(ctx, width, height, phase);

    ctx.fillStyle = "#5f665f";
    ctx.font = "500 12px Onest, sans-serif";
    ctx.fillText("follow the relationship, not just the label", 22, height - 18);
    frame += 1;
    if (!reduceMotion) window.requestAnimationFrame(draw);
  }
  draw();
}

function drawSignal(ctx, width, height, phase) {
  const base = height * 0.62;
  ctx.strokeStyle = "#263037"; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 48; x < width - 42; x += 3) {
    const t = x / width;
    const spike = Math.exp(-Math.pow((t - phase) * 16, 2)) * 130 - Math.exp(-Math.pow((t - phase - .05) * 12, 2)) * 40;
    const y = base - spike;
    if (x === 48) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#c95842";
  ctx.beginPath(); ctx.arc(width * phase, base - 130, 8, 0, Math.PI * 2); ctx.fill();
  point(ctx, 66, height * .22, "threshold", "#d4a942");
  point(ctx, width * .66, height * .32, "recovery", "#4c8b82");
}

function drawSynapse(ctx, width, height, phase) {
  const left = width * .32, right = width * .68, y = height * .48;
  ctx.fillStyle = "#c95842"; ctx.beginPath(); ctx.arc(left, y, 82, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#547d78"; ctx.beginPath(); ctx.arc(right, y, 82, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f1eadc"; ctx.fillRect(width * .48, y - 105, width * .04, 210);
  for (let i = 0; i < 8; i += 1) {
    const progress = (phase + i / 8) % 1;
    const x = left + 84 + (right - left - 168) * progress;
    const dy = Math.sin(progress * Math.PI * 5 + i) * 23;
    ctx.fillStyle = "#d4a942"; ctx.beginPath(); ctx.arc(x, y + dy, 7, 0, Math.PI * 2); ctx.fill();
  }
  point(ctx, left - 80, height * .18, "release", "#c95842");
  point(ctx, right - 30, height * .82, "response", "#547d78");
}

function drawPathway(ctx, width, height, phase) {
  const points = [[width*.13,height*.74],[width*.33,height*.62],[width*.49,height*.38],[width*.66,height*.48],[width*.86,height*.2]];
  ctx.strokeStyle = "#263037"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
  points.forEach(([x,y], i) => point(ctx, x, y, String(i + 1).padStart(2, "0"), i === 2 ? "#c95842" : "#4c8b82"));
  const route = phase * (points.length - 1); const segment = Math.min(points.length - 2, Math.floor(route)); const amount = route - segment;
  const from = points[segment], to = points[segment + 1];
  const x = from[0] + (to[0] - from[0]) * amount, y = from[1] + (to[1] - from[1]) * amount;
  ctx.fillStyle = "#d4a942"; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
}

function drawNetwork(ctx, width, height, phase) {
  const nodes = [[.25,.28],[.5,.18],[.75,.3],[.3,.66],[.52,.52],[.72,.7]].map(([x,y]) => [x*width,y*height]);
  ctx.lineWidth = 2;
  nodes.forEach(([x,y], i) => nodes.slice(i + 1).forEach(([x2,y2], j) => {
    const active = Math.sin(phase * Math.PI * 2 + i + j) > .45;
    ctx.strokeStyle = active ? "rgba(201,88,66,.72)" : "rgba(38,48,55,.25)";
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x2,y2); ctx.stroke();
  }));
  nodes.forEach(([x,y], i) => point(ctx, x, y, `N${i+1}`, i === 4 ? "#d4a942" : "#4c8b82"));
}

function drawBrain(ctx, width, height, phase) {
  const cx = width * .52, cy = height * .5, rx = width * .31, ry = height * .3;
  ctx.fillStyle = "#d7cec0"; ctx.strokeStyle = "#263037"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = -3; i <= 3; i += 1) {
    ctx.strokeStyle = "rgba(38,48,55,.25)";
    ctx.beginPath(); ctx.moveTo(cx-rx*.78, cy+i*34); ctx.bezierCurveTo(cx-rx*.25, cy+i*34-28, cx+rx*.18, cy+i*34+28, cx+rx*.77, cy+i*34-6); ctx.stroke();
  }
  const spots = [[-.35,-.15,"#c95842"],[.2,-.25,"#4c8b82"],[.38,.2,"#d4a942"],[-.12,.28,"#9278a8"]];
  spots.forEach(([x,y,color], i) => { ctx.globalAlpha = .45 + .35 * (1 + Math.sin(phase*Math.PI*2+i))/2; ctx.fillStyle=color; ctx.beginPath(); ctx.arc(cx+x*rx, cy+y*ry, 24, 0, Math.PI*2); ctx.fill(); });
  ctx.globalAlpha = 1;
}

window.addEventListener("hashchange", () => selectLesson(location.hash.slice(1)));
renderShell();
