const STORAGE_KEY = "brain-atlas-renderer-v1";

function readStoredSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function getDeviceHints() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const memory = navigator.deviceMemory || null;
  const cores = navigator.hardwareConcurrency || null;
  const compactViewport = Math.min(window.innerWidth, window.innerHeight) < 720;
  const constrained = compactViewport || coarsePointer || (memory && memory <= 4) || (cores && cores <= 4);

  return { reducedMotion, coarsePointer, memory, cores, compactViewport, constrained };
}

function resolveQuality(choice, hints = getDeviceHints()) {
  const effective = choice === "auto" ? (hints.constrained ? "performance" : "quality") : choice;
  const pixelRatio = effective === "quality" ? Math.min(window.devicePixelRatio || 1, 1.75) : 1;
  return {
    choice,
    effective,
    pixelRatio: Math.round(pixelRatio * 100) / 100,
    antialias: effective === "quality",
    stackLayers: effective === "quality" ? 9 : 5,
    modelAsset: effective === "quality"
      ? "assets/anatomy/brain-hq.glb?v=20260713-anatomy-identities"
      : "assets/anatomy/brain-mobile.glb?v=20260713-anatomy-identities"
  };
}

export function createSettingsController() {
  const hints = getDeviceHints();
  const stored = readStoredSettings();
  const subscribers = new Set();
  const state = {
    quality: stored.quality || "auto",
    motion: typeof stored.motion === "boolean" ? stored.motion : !hints.reducedMotion
  };

  function snapshot() {
    return {
      ...state,
      hints,
      render: resolveQuality(state.quality, hints),
      motion: state.motion && !hints.reducedMotion
    };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private browsing. Settings still work for the session.
    }
  }

  function update(patch) {
    Object.assign(state, patch);
    persist();
    const next = snapshot();
    subscribers.forEach((subscriber) => subscriber(next));
  }

  return {
    get: snapshot,
    setQuality(quality) {
      if (["auto", "quality", "performance"].includes(quality)) update({ quality });
    },
    setMotion(motion) {
      update({ motion: Boolean(motion) });
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    }
  };
}

export function describeDevice(settings) {
  const { hints, render } = settings;
  const pieces = [render.effective === "quality" ? "High-detail profile" : "Mobile-efficient profile"];
  if (hints.memory) pieces.push(`${hints.memory} GB device memory`);
  if (hints.cores) pieces.push(`${hints.cores} logical cores`);
  pieces.push(`${Number.isInteger(render.pixelRatio) ? render.pixelRatio : render.pixelRatio.toFixed(2)}× render density`);
  return pieces.join(" · ");
}
