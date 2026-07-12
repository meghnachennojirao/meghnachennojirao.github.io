import { createMRIViewer } from "./mri-viewer.js";
import { createSettingsController, describeDevice } from "./settings.js";
import {
  ANATOMY_SYSTEMS,
  ATLAS_GROUPS,
  MRI_LANDMARK_STYLES,
  MRI_TOUR_STOPS,
  getSystem
} from "./data/atlas.js";

const settingsController = createSettingsController();
const elements = {
  settingsButton: document.querySelector("#settings-button"),
  settingsPanel: document.querySelector("#settings-panel"),
  settingsClose: document.querySelector("#settings-close"),
  motionToggle: document.querySelector("#motion-toggle"),
  deviceProfile: document.querySelector("#device-profile"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  mriView: document.querySelector("#mri-view"),
  anatomyView: document.querySelector("#anatomy-view"),
  mriCanvas: document.querySelector("#mri-canvas"),
  anatomyCanvas: document.querySelector("#anatomy-canvas"),
  mriLoader: document.querySelector("#mri-loader"),
  anatomyLoader: document.querySelector("#anatomy-loader"),
  sliceRange: document.querySelector("#slice-range"),
  sliceOutput: document.querySelector("#slice-output"),
  sliceCoordinate: document.querySelector("#slice-coordinate"),
  sliceTitle: document.querySelector("#slice-title"),
  sliceNote: document.querySelector("#slice-note"),
  regionList: document.querySelector("#slice-region-list"),
  overlayToggle: document.querySelector("#overlay-toggle"),
  stackToggle: document.querySelector("#stack-toggle"),
  slicePlay: document.querySelector("#slice-play"),
  mriReset: document.querySelector("#mri-reset"),
  anatomyReset: document.querySelector("#anatomy-reset"),
  tourList: document.querySelector("#tour-list"),
  tourCount: document.querySelector("#tour-count"),
  tourNext: document.querySelector("#tour-next"),
  mriHint: document.querySelector("#mri-gesture-hint"),
  anatomyHint: document.querySelector("#anatomy-gesture-hint"),
  explodeToggle: document.querySelector("#explode-toggle"),
  showAll: document.querySelector("#show-all"),
  systemList: document.querySelector("#system-list"),
  selectedStructure: document.querySelector("#selected-structure"),
  hideSelected: document.querySelector("#hide-selected"),
  isolateSelected: document.querySelector("#isolate-selected"),
  visibleCount: document.querySelector("#visible-count"),
  toast: document.querySelector("#status-toast")
};

let activeMode = "mri";
let mriViewer = null;
let anatomyViewer = null;
let anatomyLoading = null;
let currentTourIndex = 0;
let playbackTimer = 0;
let toastTimer = 0;
let loadedModelAsset = null;

function showToast(message, duration = 2600) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), duration);
}

function handleViewerError(error) {
  console.error(error);
  showToast(error.message || "The 3D view could not be prepared on this device.", 4800);
}

function setSettingsOpen(open) {
  elements.settingsPanel.hidden = !open;
  elements.settingsButton.setAttribute("aria-expanded", String(open));
  if (open) elements.settingsClose.focus({ preventScroll: true });
  else elements.settingsButton.focus({ preventScroll: true });
}

function syncSettingsUI(settings) {
  document.querySelectorAll('input[name="quality"]').forEach((input) => {
    input.checked = input.value === settings.quality;
  });
  elements.motionToggle.checked = settings.motion;
  elements.motionToggle.disabled = settings.hints.reducedMotion;
  elements.deviceProfile.textContent = settings.hints.reducedMotion
    ? `${describeDevice(settings)} · reduced motion requested by device`
    : describeDevice(settings);
}

function nearestTourIndex(sliceIndex) {
  let closest = 0;
  let distance = Infinity;
  MRI_TOUR_STOPS.forEach((stop, index) => {
    const nextDistance = Math.abs(stop.slice - sliceIndex);
    if (nextDistance < distance) {
      distance = nextDistance;
      closest = index;
    }
  });
  return closest;
}

function updateTour(index, { moveSlice = true } = {}) {
  currentTourIndex = (index + MRI_TOUR_STOPS.length) % MRI_TOUR_STOPS.length;
  elements.tourList.querySelectorAll("li").forEach((item, itemIndex) => {
    item.classList.toggle("is-current", itemIndex === currentTourIndex);
  });
  elements.tourCount.textContent = `${currentTourIndex + 1} / ${MRI_TOUR_STOPS.length}`;
  if (moveSlice && mriViewer) {
    const target = MRI_TOUR_STOPS[currentTourIndex].slice;
    elements.sliceRange.value = String(target);
    mriViewer.setSlice(target, { animate: true }).catch(handleViewerError);
  }
}

function landmarkStyle(landmark) {
  const style = MRI_LANDMARK_STYLES[landmark.id];
  const group = style ? ATLAS_GROUPS[style.group] : null;
  return {
    color: style?.color || landmark.color,
    detail: group?.detail || landmark.description
  };
}

function renderLandmarks(landmarks) {
  if (!landmarks.length) {
    elements.regionList.innerHTML = `
      <div class="region-legend__item">
        <span class="region-swatch" style="background:var(--paper-muted)"></span>
        <span><strong>No highlighted landmark</strong><small>Keep moving toward the central brain</small></span>
      </div>`;
    return;
  }
  elements.regionList.innerHTML = landmarks.map((landmark, index) => {
    const style = landmarkStyle(landmark);
    return `
      <div class="region-legend__item" style="animation-delay:${index * 35}ms">
        <span class="region-swatch" style="background:${style.color}"></span>
        <span><strong>${landmark.name}</strong><small>${style.detail}</small></span>
      </div>`;
  }).join("");
}

function handleSliceChange({ index, slice, landmarks, manifest }) {
  const total = manifest.slices.length;
  const progress = total > 1 ? (index / (total - 1)) * 100 : 0;
  const tourIndex = nearestTourIndex(index);
  const tour = MRI_TOUR_STOPS[tourIndex];
  const coordinate = Number(slice.yMm);
  const signedCoordinate = coordinate >= 0 ? `+${coordinate}` : `−${Math.abs(coordinate)}`;

  elements.sliceRange.max = String(total - 1);
  elements.sliceRange.value = String(index);
  elements.sliceRange.style.setProperty("--range-progress", `${progress}%`);
  elements.sliceRange.setAttribute("aria-valuetext", `Coronal plane ${index + 1} of ${total}, MNI y ${signedCoordinate} millimetres`);
  elements.sliceOutput.textContent = `${String(index + 1).padStart(2, "0")} / ${total}`;
  elements.sliceCoordinate.textContent = `Y ${signedCoordinate} mm`;
  elements.sliceTitle.textContent = tour.title;
  elements.sliceNote.textContent = tour.note;
  renderLandmarks(landmarks);
  updateTour(tourIndex, { moveSlice: false });
}

function stopPlayback() {
  clearInterval(playbackTimer);
  playbackTimer = 0;
  elements.slicePlay.setAttribute("aria-pressed", "false");
}

function startPlayback() {
  if (!mriViewer) return;
  elements.slicePlay.setAttribute("aria-pressed", "true");
  const interval = settingsController.get().motion ? 165 : 260;
  playbackTimer = window.setInterval(() => {
    const max = Number(elements.sliceRange.max);
    let next = Number(elements.sliceRange.value) + 1;
    if (next > max) next = 0;
    elements.sliceRange.value = String(next);
    mriViewer.setSlice(next).catch(() => stopPlayback());
  }, interval);
}

async function initializeMRI() {
  try {
    mriViewer = await createMRIViewer({
      canvas: elements.mriCanvas,
      manifestUrl: "assets/mri/manifest.json",
      initialSlice: Number(elements.sliceRange.value),
      settings: settingsController.get(),
      onSliceChange: handleSliceChange,
      onReady: ({ manifest }) => {
        elements.sliceRange.max = String(manifest.slices.length - 1);
        elements.mriLoader.classList.add("is-complete");
      },
      onError: handleViewerError
    });
  } catch (error) {
    elements.mriLoader.textContent = "This browser could not open the 3D MRI viewer.";
    handleViewerError(error);
  }
}

function visibilityIcon(visible) {
  return visible
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 6 9 6a17 17 0 0 1-2.1 2.8M6.6 6.6C4.2 8.2 3 10 3 10s3.5 6 9 6c1 0 2-.2 2.9-.5"/></svg>';
}

function renderSystemList(systems) {
  elements.systemList.innerHTML = systems.map((system) => `
    <div class="system-row" data-system-row="${system.id}" style="--system-color:${system.color}">
      <span class="system-row__swatch" aria-hidden="true"></span>
      <button class="system-row__select" type="button" data-select-system="${system.id}">
        <strong>${system.name}</strong>
        <small>${system.detail} · ${system.count} parts</small>
      </button>
      <button class="system-row__visibility" type="button" data-toggle-system="${system.id}" aria-label="Hide ${system.name}" aria-pressed="true">
        ${visibilityIcon(true)}
      </button>
    </div>`).join("");

  elements.systemList.querySelectorAll("[data-select-system]").forEach((button) => {
    button.addEventListener("click", () => anatomyViewer?.selectSystem(button.dataset.selectSystem));
  });
  elements.systemList.querySelectorAll("[data-toggle-system]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!anatomyViewer) return;
      const systemId = button.dataset.toggleSystem;
      const visible = anatomyViewer.getSystemVisibility(systemId);
      anatomyViewer.setSystemVisible(systemId, !visible);
      syncSystemRow(systemId, !visible);
    });
  });
}

function syncSystemRow(systemId, visible) {
  const row = elements.systemList.querySelector(`[data-system-row="${systemId}"]`);
  const button = elements.systemList.querySelector(`[data-toggle-system="${systemId}"]`);
  if (!row || !button) return;
  const system = getSystem(systemId);
  row.classList.toggle("is-hidden", !visible);
  button.setAttribute("aria-pressed", String(visible));
  button.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${system.name}`);
  button.innerHTML = visibilityIcon(visible);
}

function updateSelection(selection) {
  const header = elements.selectedStructure.querySelector(".selection-empty");
  const text = elements.selectedStructure.querySelector(":scope > p");
  const actions = elements.selectedStructure.querySelector(".selection-actions");
  const title = header.querySelector("h2");
  const label = header.querySelector(".micro-label");
  const system = getSystem(selection.systemId);

  elements.selectedStructure.style.setProperty("--selected-color", selection.color);
  label.textContent = selection.type === "system" ? "Selected system" : `${selection.side} · ${selection.systemName}`;
  title.textContent = selection.displayName;
  text.textContent = selection.type === "system"
    ? `${selection.count} separable atlas structures grouped for this view. ${system.detail}.`
    : selection.ontologyId
      ? `${system.detail}. Ontology reference: ${selection.ontologyId}.`
      : `${system.detail}. Select Hide part to reveal structures beneath it.`;
  actions.hidden = false;
  elements.hideSelected.innerHTML = selection.hidden
    ? `${visibilityIcon(true)} Show part`
    : `${visibilityIcon(false)} Hide part`;
  elements.hideSelected.dataset.action = selection.hidden ? "show" : "hide";
}

function handleVisibilityChange({ visible, total }) {
  elements.visibleCount.textContent = `${visible} / ${total} parts visible`;
  ANATOMY_SYSTEMS.forEach((system) => {
    if (!anatomyViewer) return;
    syncSystemRow(system.id, anatomyViewer.getSystemVisibility(system.id));
  });
}

async function initializeAnatomy() {
  if (anatomyViewer) return anatomyViewer;
  if (anatomyLoading) return anatomyLoading;
  anatomyLoading = (async () => {
    try {
      const { createAnatomyViewer } = await import("./anatomy-viewer.js");
      const currentSettings = settingsController.get();
      loadedModelAsset = currentSettings.render.modelAsset;
      anatomyViewer = await createAnatomyViewer({
        canvas: elements.anatomyCanvas,
        modelUrl: currentSettings.render.modelAsset,
        metadataUrl: "assets/anatomy/nodes.json",
        settings: currentSettings,
        onProgress: (progress) => {
          if (progress == null) return;
          elements.anatomyLoader.lastChild.textContent = ` Loading anatomy · ${Math.round(progress * 100)}%`;
        },
        onReady: ({ systems }) => {
          elements.anatomyLoader.classList.add("is-complete");
          renderSystemList(systems);
        },
        onSelectionChange: updateSelection,
        onVisibilityChange: handleVisibilityChange,
        onError: handleViewerError
      });
      anatomyViewer.setActive(activeMode === "anatomy");
      return anatomyViewer;
    } catch (error) {
      elements.anatomyLoader.textContent = "This browser could not open the anatomy model.";
      handleViewerError(error);
      throw error;
    } finally {
      anatomyLoading = null;
    }
  })();
  return anatomyLoading;
}

async function setMode(mode) {
  if (mode === activeMode) return;
  stopPlayback();
  activeMode = mode;
  elements.modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const showMRI = mode === "mri";
  elements.mriView.hidden = !showMRI;
  elements.mriView.classList.toggle("is-active", showMRI);
  elements.anatomyView.hidden = showMRI;
  elements.anatomyView.classList.toggle("is-active", !showMRI);
  mriViewer?.setActive(showMRI);
  if (!showMRI) {
    const viewer = await initializeAnatomy();
    viewer.setActive(true);
  } else {
    anatomyViewer?.setActive(false);
  }
}

elements.settingsButton.addEventListener("click", () => {
  setSettingsOpen(elements.settingsButton.getAttribute("aria-expanded") !== "true");
});
elements.settingsClose.addEventListener("click", () => setSettingsOpen(false));
document.addEventListener("pointerdown", (event) => {
  if (elements.settingsPanel.hidden) return;
  if (!elements.settingsPanel.contains(event.target) && !elements.settingsButton.contains(event.target)) {
    elements.settingsPanel.hidden = true;
    elements.settingsButton.setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.settingsPanel.hidden) setSettingsOpen(false);
});

document.querySelectorAll('input[name="quality"]').forEach((input) => {
  input.addEventListener("change", () => settingsController.setQuality(input.value));
});
elements.motionToggle.addEventListener("change", () => settingsController.setMotion(elements.motionToggle.checked));

settingsController.subscribe((settings) => {
  syncSettingsUI(settings);
  mriViewer?.applySettings(settings);
  anatomyViewer?.applySettings(settings);
  if (anatomyViewer && loadedModelAsset !== settings.render.modelAsset) {
    showToast(`Display density updated · reload to switch the anatomy mesh to ${settings.render.effective}`);
  } else {
    showToast(`Using ${settings.render.effective} rendering · ${settings.render.pixelRatio}× pixels`);
  }
});

elements.modeButtons.forEach((button, index) => {
  button.addEventListener("click", () => setMode(button.dataset.mode).catch(handleViewerError));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "ArrowRight"
      ? (index + 1) % elements.modeButtons.length
      : (index - 1 + elements.modeButtons.length) % elements.modeButtons.length;
    elements.modeButtons[nextIndex].focus();
    setMode(elements.modeButtons[nextIndex].dataset.mode).catch(handleViewerError);
  });
});

elements.sliceRange.addEventListener("input", () => {
  stopPlayback();
  mriViewer?.setSlice(Number(elements.sliceRange.value)).catch(handleViewerError);
});
elements.slicePlay.addEventListener("click", () => {
  if (playbackTimer) stopPlayback();
  else startPlayback();
});
elements.overlayToggle.addEventListener("click", () => {
  const active = elements.overlayToggle.getAttribute("aria-pressed") !== "true";
  elements.overlayToggle.setAttribute("aria-pressed", String(active));
  elements.overlayToggle.classList.toggle("is-active", active);
  mriViewer?.setOverlayEnabled(active);
});
elements.stackToggle.addEventListener("click", () => {
  const active = elements.stackToggle.getAttribute("aria-pressed") !== "true";
  elements.stackToggle.setAttribute("aria-pressed", String(active));
  elements.stackToggle.classList.toggle("is-active", active);
  mriViewer?.setStackEnabled(active);
});
elements.mriReset.addEventListener("click", () => mriViewer?.resetCamera());
elements.tourList.querySelectorAll("[data-tour]").forEach((button) => {
  button.addEventListener("click", () => updateTour(Number(button.dataset.tour)));
});
elements.tourNext.addEventListener("click", () => updateTour(currentTourIndex + 1));

elements.explodeToggle.addEventListener("click", () => {
  const exploded = elements.explodeToggle.getAttribute("aria-pressed") !== "true";
  elements.explodeToggle.setAttribute("aria-pressed", String(exploded));
  elements.explodeToggle.lastChild.textContent = exploded ? " Assemble parts" : " Separate parts";
  anatomyViewer?.setExploded(exploded);
});
elements.showAll.addEventListener("click", () => {
  anatomyViewer?.showAll();
  showToast("All anatomical structures restored");
});
elements.anatomyReset.addEventListener("click", () => anatomyViewer?.resetCamera());
elements.hideSelected.addEventListener("click", () => {
  if (!anatomyViewer) return;
  if (elements.hideSelected.dataset.action === "show") anatomyViewer.showSelected();
  else anatomyViewer.hideSelected();
});
elements.isolateSelected.addEventListener("click", () => anatomyViewer?.isolateSelected());

elements.mriCanvas.addEventListener("pointerdown", () => elements.mriHint.classList.add("is-dismissed"), { once: true });
elements.anatomyCanvas.addEventListener("pointerdown", () => elements.anatomyHint.classList.add("is-dismissed"), { once: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopPlayback();
});

syncSettingsUI(settingsController.get());
initializeMRI();
