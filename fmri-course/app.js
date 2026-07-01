(function () {
  const pages = [
    ["cover", "Course cover"],
    ["module-1", "What fMRI measures"],
    ["module-2", "Voxels and slices"],
    ["module-3", "BOLD and HRF"],
    ["module-4", "BIDS data"],
    ["datasets", "Open datasets"],
    ["module-5", "Preprocessing"],
    ["module-6", "Task GLM"],
    ["module-7", "Activation maps"],
    ["module-8", "Connectivity"],
    ["module-9", "Interpretation traps"],
    ["module-10", "Biomarkers"],
    ["grid", "Grid-like signals"],
    ["capstone", "Checklist"],
    ["sources", "Sources"]
  ];

  const modules = [
    ["module-1", "What fMRI measures"],
    ["module-2", "Voxels and slices"],
    ["module-3", "BOLD and HRF"],
    ["module-4", "BIDS data"],
    ["datasets", "Open datasets"],
    ["module-5", "Preprocessing"],
    ["module-6", "Task GLM"],
    ["module-7", "Activation maps"],
    ["module-8", "Connectivity"],
    ["module-9", "Interpretation traps"],
    ["module-10", "Biomarkers"],
    ["grid", "Grid-like signals"],
    ["capstone", "Checklist"]
  ];

  const completed = new Set(JSON.parse(localStorage.getItem("fmriCourseProgress") || "[]"));
  const nav = document.getElementById("module-nav");
  const progressPercent = document.getElementById("progress-percent");
  const progressFill = document.getElementById("progress-fill");
  const courseBody = document.querySelector(".course-body");
  let currentPage = "cover";
  let pager = null;

  function saveProgress() {
    localStorage.setItem("fmriCourseProgress", JSON.stringify(Array.from(completed)));
  }

  function updateProgress() {
    const pct = Math.round((completed.size / modules.length) * 100);
    progressPercent.textContent = `${pct}%`;
    progressFill.style.width = `${pct}%`;

    modules.forEach(([id]) => {
      const link = nav.querySelector(`[href="#${id}"]`);
      const button = document.querySelector(`[data-complete="${id}"]`);
      if (link) link.classList.toggle("done", completed.has(id));
      if (button) {
        button.classList.toggle("done", completed.has(id));
        button.textContent = completed.has(id) ? "Completed" : "Mark complete";
      }
    });
  }

  function buildNavigation() {
    nav.innerHTML = pages.map(([id, label], index) => `
      <a href="#${id}" data-step="${index + 1}">${label}</a>
    `).join("");
  }

  function setupProgressButtons() {
    document.querySelectorAll("[data-complete]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.complete;
        if (completed.has(id)) completed.delete(id);
        else completed.add(id);
        saveProgress();
        updateProgress();
      });
    });

    document.getElementById("reset-progress").addEventListener("click", () => {
      completed.clear();
      saveProgress();
      updateProgress();
    });
  }

  function buildPager() {
    pager = document.createElement("nav");
    pager.className = "page-controls";
    pager.setAttribute("aria-label", "Lesson page controls");
    pager.innerHTML = `
      <button id="prev-page" type="button">Previous</button>
      <div class="page-status">
        <span id="page-count"></span>
        <strong id="page-title"></strong>
      </div>
      <button id="next-page" type="button">Next</button>
    `;
    courseBody.appendChild(pager);

    pager.querySelector("#prev-page").addEventListener("click", () => movePage(-1));
    pager.querySelector("#next-page").addEventListener("click", () => movePage(1));
  }

  function pageIndex(id) {
    return pages.findIndex(([pageId]) => pageId === id);
  }

  function pageIdForHash() {
    const raw = window.location.hash.replace("#", "");
    if (!raw) return "cover";
    if (pageIndex(raw) >= 0) return raw;
    const target = document.getElementById(raw);
    const parentPage = target ? target.closest(".opening, .lesson, .sources") : null;
    return parentPage && parentPage.id ? parentPage.id : "cover";
  }

  function routeToCurrentHash() {
    currentPage = pageIdForHash();
    const index = pageIndex(currentPage);

    document.querySelectorAll(".course-body > section").forEach((section) => {
      section.classList.toggle("page-hidden", section.id !== currentPage);
      section.classList.toggle("active-page", section.id === currentPage);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${currentPage}`);
    });

    if (pager) {
      const prev = pager.querySelector("#prev-page");
      const next = pager.querySelector("#next-page");
      pager.querySelector("#page-count").textContent = `Page ${index + 1} of ${pages.length}`;
      pager.querySelector("#page-title").textContent = pages[index][1];
      prev.disabled = index <= 0;
      next.disabled = index >= pages.length - 1;
      next.textContent = index >= pages.length - 1 ? "Finished" : "Next";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(drawAll, 40);
  }

  function movePage(direction) {
    const index = pageIndex(currentPage);
    const nextIndex = Math.min(pages.length - 1, Math.max(0, index + direction));
    window.location.hash = pages[nextIndex][0];
  }

  function setupPageMode() {
    courseBody.classList.add("page-mode");
    buildPager();
    window.addEventListener("hashchange", routeToCurrentHash);
    document.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowRight") movePage(1);
      if (event.key === "ArrowLeft") movePage(-1);
    });
    routeToCurrentHash();
  }

  function prepareCanvas(canvas, baseWidth, baseHeight) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.round(rect.width || baseWidth));
    const height = Math.round(width * (baseHeight / baseWidth));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBrainBase(ctx, width, height, options) {
    const cx = width * 0.5;
    const cy = height * 0.52;
    const rx = width * 0.35;
    const ry = height * 0.36;
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#10282b");
    bg.addColorStop(1, "#e9efe8");
    ctx.fillStyle = options.light ? "#f8f4e9" : bg;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.88, cy - ry * 0.12);
    ctx.bezierCurveTo(cx - rx * 0.86, cy - ry * 0.72, cx - rx * 0.42, cy - ry, cx + rx * 0.02, cy - ry * 0.94);
    ctx.bezierCurveTo(cx + rx * 0.52, cy - ry, cx + rx * 0.93, cy - ry * 0.66, cx + rx * 0.9, cy - ry * 0.08);
    ctx.bezierCurveTo(cx + rx * 0.94, cy + ry * 0.48, cx + rx * 0.45, cy + ry * 0.92, cx + rx * 0.04, cy + ry * 0.88);
    ctx.bezierCurveTo(cx - rx * 0.45, cy + ry * 0.94, cx - rx * 0.94, cy + ry * 0.55, cx - rx * 0.88, cy - ry * 0.12);
    ctx.closePath();
    ctx.fillStyle = options.light ? "#e2ded5" : "#d5ddd9";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = options.light ? "#807c72" : "rgba(255,255,255,0.58)";
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = options.light ? "rgba(56,70,70,0.28)" : "rgba(20,50,55,0.33)";
    ctx.lineWidth = 2;
    for (let i = -5; i <= 5; i += 1) {
      ctx.beginPath();
      const y = i * ry * 0.13;
      ctx.moveTo(-rx * 0.72, y);
      ctx.bezierCurveTo(-rx * 0.36, y - 30, rx * 0.08, y + 36, rx * 0.72, y - 12);
      ctx.stroke();
    }
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      const x = i * rx * 0.18;
      ctx.moveTo(x, -ry * 0.78);
      ctx.bezierCurveTo(x - 42, -ry * 0.2, x + 46, ry * 0.18, x - 8, ry * 0.78);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = options.light ? "#f8f4e9" : "rgba(13,28,30,0.55)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.12, rx * 0.11, ry * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawActivations(ctx, width, height, threshold, phase) {
    const spots = [
      [0.36, 0.42, 0.07, 0.92, "#e66f4d"],
      [0.62, 0.43, 0.06, 0.72, "#d54f8a"],
      [0.49, 0.62, 0.055, 0.55, "#f0b84b"],
      [0.58, 0.26, 0.04, 0.42, "#6f77c8"],
      [0.31, 0.59, 0.045, 0.35, "#46a783"]
    ];
    spots.forEach(([x, y, r, strength, color], index) => {
      const adjusted = strength + Math.sin(phase * 0.08 + index) * 0.08;
      if (adjusted < threshold) return;
      const gx = x * width;
      const gy = y * height;
      const radius = r * width * (0.8 + adjusted * 0.4);
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 0.74;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawHero() {
    const canvas = document.getElementById("hero-scan");
    if (!canvas) return;
    const { ctx, width, height } = prepareCanvas(canvas, 760, 520);
    drawBrainBase(ctx, width, height, { light: false });
    drawActivations(ctx, width, height, 0.2, 4);
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.font = "700 14px Aptos, sans-serif";
    ctx.fillText("contrast: navigation > control", 24, 34);
    ctx.fillText("threshold: teaching overlay", 24, 56);
  }

  function drawSliceLab() {
    const canvas = document.getElementById("slice-canvas");
    if (!canvas) return;
    const slice = Number(document.getElementById("slice-slider").value);
    const threshold = Number(document.getElementById("threshold-slider").value) / 100;
    const { ctx, width, height } = prepareCanvas(canvas, 720, 520);
    drawBrainBase(ctx, width, height, { light: true });

    const phase = slice / 6;
    drawActivations(ctx, width, height, threshold, phase);

    ctx.fillStyle = "rgba(18,40,43,0.78)";
    ctx.font = "700 13px Aptos, sans-serif";
    ctx.fillText(`slice ${slice}`, 22, 30);
    ctx.fillText(`overlay threshold ${(threshold * 100).toFixed(0)}%`, 22, 50);

    const readout = document.getElementById("slice-readout");
    readout.innerHTML = `
      <span><strong>Current question:</strong> are colored clusters anatomical, statistical, or artifact?</span>
      <span><strong>Reading habit:</strong> threshold changes the story, so report it every time.</span>
    `;
  }

  function drawSignalLab() {
    const canvas = document.getElementById("signal-canvas");
    if (!canvas) return;
    const visible = {};
    document.querySelectorAll("[data-signal]").forEach((input) => {
      visible[input.dataset.signal] = input.checked;
    });
    const { ctx, width, height } = prepareCanvas(canvas, 900, 360);
    ctx.fillStyle = "#fbf7eb";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(34,58,60,0.18)";
    ctx.lineWidth = 1;
    for (let x = 48; x < width - 28; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, height - 42);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(34,58,60,0.55)";
    ctx.beginPath();
    ctx.moveTo(44, height - 64);
    ctx.lineTo(width - 28, height - 64);
    ctx.moveTo(44, 34);
    ctx.lineTo(44, height - 64);
    ctx.stroke();

    const events = [70, 142, 272, 356, 480, 646, 724];
    if (visible.neural) {
      ctx.strokeStyle = "#d85f40";
      ctx.lineWidth = 3;
      events.forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, height - 64);
        ctx.lineTo(x, height - 132);
        ctx.stroke();
      });
    }

    function hrf(t) {
      if (t < 0) return 0;
      const peak = Math.pow(t, 5) * Math.exp(-t / 1.1);
      const undershoot = 0.28 * Math.pow(Math.max(t - 7, 0), 5) * Math.exp(-(t - 7) / 1.4);
      return (peak - undershoot) / 120;
    }

    if (visible.bold || visible.drift || visible.motion) {
      ctx.beginPath();
      for (let px = 44; px <= width - 28; px += 3) {
        let y = 0;
        if (visible.bold) {
          events.forEach((event) => {
            y += hrf((px - event) / 12) * 82;
          });
        }
        if (visible.drift) y += Math.sin(px / 180) * 22 + (px / width) * 28;
        if (visible.motion) y += Math.exp(-Math.pow(px - width * 0.68, 2) / 120) * 86;
        const plotted = height - 110 - y;
        if (px === 44) ctx.moveTo(px, plotted);
        else ctx.lineTo(px, plotted);
      }
      ctx.strokeStyle = "#236f75";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.fillStyle = "#304c4f";
    ctx.font = "700 13px Aptos, sans-serif";
    ctx.fillText("seconds", width - 92, height - 26);
    ctx.fillText("signal", 18, 28);
  }

  function buildDesignMatrix() {
    const matrix = document.getElementById("design-matrix");
    if (!matrix) return;
    const cells = [];
    for (let row = 0; row < 22; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const active = (col === 0 && [2, 3, 4, 11, 12, 13].includes(row)) ||
          (col === 1 && [6, 7, 16, 17].includes(row)) ||
          (col === 2 && row % 6 === 0) ||
          (col === 3 && row === 15);
        const cls = col === 0 && active ? "hot" : col === 1 && active ? "warm" : col === 3 && active ? "motion" : "";
        cells.push(`<button type="button" class="design-cell ${cls}" aria-label="design matrix row ${row + 1} column ${col + 1}"></button>`);
      }
    }
    matrix.innerHTML = cells.join("");
    matrix.querySelectorAll("button").forEach((button, index) => {
      button.addEventListener("click", () => drawGlm(index));
    });
  }

  function drawGlm(seed) {
    const canvas = document.getElementById("glm-canvas");
    if (!canvas) return;
    const { ctx, width, height } = prepareCanvas(canvas, 580, 420);
    drawBrainBase(ctx, width, height, { light: true });
    const offset = ((seed || 0) % 5) * 0.015;
    const spots = [
      [0.38 + offset, 0.38, 0.08, "#d85f40"],
      [0.61 - offset, 0.36, 0.055, "#e0a947"],
      [0.52, 0.63, 0.05, "#6d75bd"]
    ];
    spots.forEach(([x, y, r, color]) => {
      const gx = x * width;
      const gy = y * height;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * width);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.arc(gx, gy, r * width, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = "rgba(18,40,43,0.76)";
    ctx.font = "700 13px Aptos, sans-serif";
    ctx.fillText("contrast preview: navigation > control", 18, 30);
  }

  const networkNodes = {
    default: [[0.5, 0.36], [0.42, 0.58], [0.58, 0.58], [0.5, 0.68]],
    visual: [[0.43, 0.78], [0.57, 0.78], [0.5, 0.7], [0.34, 0.7], [0.66, 0.7]],
    motor: [[0.34, 0.3], [0.66, 0.3], [0.38, 0.5], [0.62, 0.5]],
    attention: [[0.3, 0.42], [0.7, 0.42], [0.4, 0.24], [0.6, 0.24], [0.5, 0.62]]
  };

  function drawConnectivity(network) {
    const canvas = document.getElementById("connectivity-canvas");
    if (!canvas) return;
    const { ctx, width, height } = prepareCanvas(canvas, 820, 480);
    drawBrainBase(ctx, width, height, { light: true });
    const nodes = networkNodes[network] || networkNodes.default;
    ctx.lineWidth = 3;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const [x1, y1] = nodes[i];
        const [x2, y2] = nodes[j];
        ctx.strokeStyle = "rgba(35,111,117,0.38)";
        ctx.beginPath();
        ctx.moveTo(x1 * width, y1 * height);
        ctx.lineTo(x2 * width, y2 * height);
        ctx.stroke();
      }
    }
    nodes.forEach(([x, y], index) => {
      ctx.fillStyle = index % 2 ? "#d85f40" : "#236f75";
      ctx.beginPath();
      ctx.arc(x * width, y * height, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fbf7eb";
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    ctx.fillStyle = "rgba(18,40,43,0.76)";
    ctx.font = "700 13px Aptos, sans-serif";
    ctx.fillText(`${network} network: correlated BOLD fluctuations`, 18, 30);
  }

  function setupConnectivity() {
    document.querySelectorAll(".network-choice").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".network-choice").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        drawConnectivity(button.dataset.network);
      });
    });
  }

  function drawGridLab() {
    const canvas = document.getElementById("grid-canvas");
    if (!canvas) return;
    const angle = Number(document.getElementById("grid-angle").value);
    const { ctx, width, height } = prepareCanvas(canvas, 760, 520);
    ctx.fillStyle = "#fbf7eb";
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.38;
    const cy = height * 0.52;
    const spacing = Math.min(width, height) * 0.11;
    ctx.strokeStyle = "rgba(35,111,117,0.22)";
    ctx.lineWidth = 1.4;

    for (let q = -5; q <= 5; q += 1) {
      for (let r = -5; r <= 5; r += 1) {
        const x = cx + spacing * (q + r / 2);
        const y = cy + spacing * r * 0.866;
        if (x < 40 || x > width * 0.72 || y < 50 || y > height - 50) continue;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const radians = angle * Math.PI / 180;
    const length = Math.min(width, height) * 0.32;
    ctx.strokeStyle = "#d85f40";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(radians) * length, cy + Math.sin(radians) * length);
    ctx.stroke();
    ctx.fillStyle = "#d85f40";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(radians) * length, cy + Math.sin(radians) * length, 8, 0, Math.PI * 2);
    ctx.fill();

    const signal = 0.5 + 0.5 * Math.cos(6 * (radians - Math.PI / 9));
    const chartX = width * 0.72;
    const chartY = height * 0.2;
    const chartW = width * 0.22;
    const chartH = height * 0.55;
    ctx.strokeStyle = "rgba(18,40,43,0.38)";
    ctx.lineWidth = 2;
    ctx.strokeRect(chartX, chartY, chartW, chartH);
    ctx.beginPath();
    for (let x = 0; x <= chartW; x += 2) {
      const theta = (x / chartW) * Math.PI * 2;
      const y = chartY + chartH * (0.5 - 0.38 * Math.cos(6 * (theta - Math.PI / 9)));
      if (x === 0) ctx.moveTo(chartX + x, y);
      else ctx.lineTo(chartX + x, y);
    }
    ctx.strokeStyle = "#236f75";
    ctx.lineWidth = 3;
    ctx.stroke();

    const markerX = chartX + (angle / 360) * chartW;
    const markerY = chartY + chartH * (1 - signal);
    ctx.fillStyle = "#d85f40";
    ctx.beginPath();
    ctx.arc(markerX, markerY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(18,40,43,0.8)";
    ctx.font = "700 13px Aptos, sans-serif";
    ctx.fillText("six-fold direction model", chartX, chartY - 14);
    ctx.fillText("movement path", 22, 32);

    document.getElementById("grid-readout").innerHTML = `
      <span><strong>Movement angle:</strong> ${angle} degrees</span>
      <span><strong>Predicted grid-like signal:</strong> ${(signal * 100).toFixed(0)}%</span>
    `;
  }

  function setupControls() {
    ["slice-slider", "threshold-slider"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.addEventListener("input", drawSliceLab);
    });
    document.querySelectorAll("[data-signal]").forEach((input) => {
      input.addEventListener("change", drawSignalLab);
    });
    const gridAngle = document.getElementById("grid-angle");
    if (gridAngle) gridAngle.addEventListener("input", drawGridLab);
  }

  function drawAll() {
    drawHero();
    drawSliceLab();
    drawSignalLab();
    drawGlm(0);
    drawConnectivity("default");
    drawGridLab();
  }

  buildNavigation();
  setupProgressButtons();
  setupControls();
  setupConnectivity();
  buildDesignMatrix();
  updateProgress();
  setupPageMode();
  drawAll();

  window.addEventListener("resize", () => {
    window.clearTimeout(window.__fmriResize);
    window.__fmriResize = window.setTimeout(drawAll, 120);
  });
})();
