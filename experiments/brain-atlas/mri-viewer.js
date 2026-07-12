import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MRI_LANDMARK_STYLES } from "./data/atlas.js";

const MAX_STACK_LAYERS = 9;
const TEXTURE_CACHE_LIMIT = 14;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutQuint(value) {
  return 1 - Math.pow(1 - value, 5);
}

export async function createMRIViewer({
  canvas,
  manifestUrl,
  initialSlice = 8,
  settings,
  onSliceChange = () => {},
  onReady = () => {},
  onError = () => {}
}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: settings.render.antialias,
      alpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false
    });
  } catch (error) {
    onError(error);
    throw error;
  }

  const manifest = await fetch(manifestUrl).then((response) => {
    if (!response.ok) throw new Error(`MRI manifest could not be loaded (${response.status})`);
    return response.json();
  });
  const baseUrl = new URL(".", new URL(manifestUrl, window.location.href));
  const textureLoader = new THREE.TextureLoader();
  const textureCache = new Map();
  const overlayCache = new Map();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
  const stackGroup = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(4, 4, 1, 1);
  const planes = [];
  const overlayCanvas = document.createElement("canvas");
  const overlaySize = manifest.display?.pixelSize?.[0] || 384;
  const overlayContext = overlayCanvas.getContext("2d");
  const overlayTexture = new THREE.CanvasTexture(overlayCanvas);
  const overlayMaterial = new THREE.MeshBasicMaterial({
    map: overlayTexture,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: THREE.DoubleSide
  });
  const overlayMesh = new THREE.Mesh(geometry, overlayMaterial);
  let currentIndex = clamp(initialSlice, 0, manifest.slices.length - 1);
  let stackEnabled = true;
  let overlaysEnabled = true;
  let stackLayers = settings.render.stackLayers;
  let updateToken = 0;
  let destroyed = false;
  let renderQueued = false;
  let transitionFrame = 0;
  let visible = !document.hidden;

  overlayCanvas.width = overlaySize;
  overlayCanvas.height = overlaySize;
  overlayTexture.colorSpace = THREE.SRGBColorSpace;
  overlayTexture.minFilter = THREE.LinearFilter;
  overlayTexture.magFilter = THREE.LinearFilter;
  overlayMesh.position.z = 0.012;
  overlayMesh.renderOrder = 20;

  renderer.setPixelRatio(settings.render.pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  camera.position.set(0.12, 0.05, 5.5);
  scene.add(stackGroup);

  for (let index = 0; index < MAX_STACK_LAYERS; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: index === 0 ? 1 : Math.max(0.055, 0.18 - index * 0.014),
      depthWrite: index === 0,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.renderOrder = MAX_STACK_LAYERS - index;
    plane.userData.stackIndex = index;
    if (index === 0) plane.add(overlayMesh);
    stackGroup.add(plane);
    planes.push(plane);
  }

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 8;
  controls.minAzimuthAngle = -0.68;
  controls.maxAzimuthAngle = 0.68;
  controls.minPolarAngle = Math.PI * 0.34;
  controls.maxPolarAngle = Math.PI * 0.66;
  controls.target.set(0, 0, -0.25);
  controls.update();
  controls.addEventListener("change", requestRender);

  function resize() {
    if (destroyed) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const targetWidth = Math.floor(width * renderer.getPixelRatio());
    const targetHeight = Math.floor(height * renderer.getPixelRatio());
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    requestRender();
  }

  function render() {
    renderQueued = false;
    if (!destroyed && visible) renderer.render(scene, camera);
  }

  function requestRender() {
    if (renderQueued || destroyed || !visible) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  function textureUrl(slice) {
    return new URL(slice.image, baseUrl).href;
  }

  async function getTexture(index) {
    const safeIndex = clamp(index, 0, manifest.slices.length - 1);
    if (textureCache.has(safeIndex)) {
      const entry = textureCache.get(safeIndex);
      entry.usedAt = performance.now();
      return entry.promise;
    }
    const entry = {
      usedAt: performance.now(),
      promise: textureLoader.loadAsync(textureUrl(manifest.slices[safeIndex])).then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        return texture;
      })
    };
    textureCache.set(safeIndex, entry);
    return entry.promise;
  }

  function trimTextureCache(activeIndexes) {
    if (textureCache.size <= TEXTURE_CACHE_LIMIT) return;
    const candidates = [...textureCache.entries()]
      .filter(([index]) => !activeIndexes.has(index))
      .sort((a, b) => a[1].usedAt - b[1].usedAt);
    while (textureCache.size > TEXTURE_CACHE_LIMIT && candidates.length) {
      const [index, entry] = candidates.shift();
      entry.promise.then((texture) => texture.dispose()).catch(() => {});
      textureCache.delete(index);
    }
  }

  async function getOverlay(index) {
    if (overlayCache.has(index)) return overlayCache.get(index);
    const promise = fetch(new URL(manifest.slices[index].overlay, baseUrl)).then((response) => {
      if (!response.ok) throw new Error(`Atlas overlay could not be loaded (${response.status})`);
      return response.json();
    });
    overlayCache.set(index, promise);
    return promise;
  }

  function drawOverlay(data) {
    overlayContext.clearRect(0, 0, overlaySize, overlaySize);
    if (!overlaysEnabled) {
      overlayTexture.needsUpdate = true;
      return;
    }

    data.layers.forEach((layer) => {
      const style = MRI_LANDMARK_STYLES[layer.id];
      const color = style?.color || layer.color;
      const isTissueField = layer.id === "cerebral-cortex" || layer.id === "cerebral-white-matter";
      layer.paths.forEach((points) => {
        if (!points.length) return;
        overlayContext.beginPath();
        points.forEach(([x, y], pointIndex) => {
          const px = x * overlaySize;
          const py = y * overlaySize;
          if (pointIndex === 0) overlayContext.moveTo(px, py);
          else overlayContext.lineTo(px, py);
        });
        overlayContext.closePath();
        overlayContext.globalAlpha = isTissueField ? 0.075 : 0.22;
        overlayContext.fillStyle = color;
        overlayContext.fill();
        overlayContext.globalAlpha = isTissueField ? 0.68 : 0.9;
        overlayContext.strokeStyle = color;
        overlayContext.lineWidth = isTissueField ? 1.35 : 2;
        overlayContext.stroke();
      });
    });
    overlayContext.globalAlpha = 1;
    overlayTexture.needsUpdate = true;
  }

  function positionPlanes(animated = true) {
    cancelAnimationFrame(transitionFrame);
    const layerTargets = planes.map((plane, index) => ({
      plane,
      z: index === 0 ? 0 : (stackEnabled ? -index * 0.16 : -index * 0.012),
      x: index === 0 ? 0 : (stackEnabled ? index * 0.022 : 0),
      y: index === 0 ? 0 : (stackEnabled ? -index * 0.012 : 0),
      opacity: index === 0 ? 1 : (stackEnabled ? Math.max(0.045, 0.17 - index * 0.014) : 0),
      visible: index < stackLayers
    }));
    if (!animated || !settings.motion) {
      layerTargets.forEach(({ plane, x, y, z, opacity, visible: isVisible }) => {
        plane.position.set(x, y, z);
        plane.material.opacity = opacity;
        plane.visible = isVisible && (plane.userData.stackIndex === 0 || opacity > 0);
      });
      requestRender();
      return;
    }
    const starts = layerTargets.map(({ plane }) => ({
      x: plane.position.x,
      y: plane.position.y,
      z: plane.position.z,
      opacity: plane.material.opacity
    }));
    const startTime = performance.now();
    const duration = 360;
    function tick(time) {
      const eased = easeOutQuint(clamp((time - startTime) / duration, 0, 1));
      layerTargets.forEach(({ plane, x, y, z, opacity, visible: isVisible }, index) => {
        plane.visible = isVisible;
        plane.position.set(
          THREE.MathUtils.lerp(starts[index].x, x, eased),
          THREE.MathUtils.lerp(starts[index].y, y, eased),
          THREE.MathUtils.lerp(starts[index].z, z, eased)
        );
        plane.material.opacity = THREE.MathUtils.lerp(starts[index].opacity, opacity, eased);
      });
      render();
      if (eased < 1 && !destroyed) transitionFrame = requestAnimationFrame(tick);
      else layerTargets.forEach(({ plane, opacity, visible: isVisible }) => {
        plane.visible = isVisible && (plane.userData.stackIndex === 0 || opacity > 0);
      });
    }
    transitionFrame = requestAnimationFrame(tick);
  }

  async function setSlice(index, { animate = false } = {}) {
    const nextIndex = clamp(Math.round(index), 0, manifest.slices.length - 1);
    const token = ++updateToken;
    currentIndex = nextIndex;
    const activeIndexes = new Set();
    const textureRequests = planes.map(async (plane, layerIndex) => {
      const sliceIndex = clamp(nextIndex + layerIndex, 0, manifest.slices.length - 1);
      activeIndexes.add(sliceIndex);
      const texture = await getTexture(sliceIndex);
      if (destroyed || token !== updateToken) return;
      plane.material.map = texture;
      plane.material.needsUpdate = true;
      plane.visible = layerIndex < stackLayers && (layerIndex === 0 || stackEnabled);
    });
    const overlayRequest = getOverlay(nextIndex).then((data) => {
      if (destroyed || token !== updateToken) return null;
      drawOverlay(data);
      return data;
    });

    const [overlay] = await Promise.all([overlayRequest, ...textureRequests]);
    if (destroyed || token !== updateToken) return;
    trimTextureCache(activeIndexes);
    positionPlanes(animate);
    const slice = manifest.slices[nextIndex];
    const landmarks = (slice.visibleLandmarks || [])
      .map((id) => manifest.landmarks.find((landmark) => landmark.id === id))
      .filter(Boolean);
    onSliceChange({ index: nextIndex, slice, landmarks, overlay, manifest });
    requestRender();
  }

  function setOverlayEnabled(enabled) {
    overlaysEnabled = Boolean(enabled);
    overlayMaterial.visible = overlaysEnabled;
    if (overlaysEnabled) getOverlay(currentIndex).then(drawOverlay).catch(onError);
    requestRender();
  }

  function setStackEnabled(enabled) {
    stackEnabled = Boolean(enabled);
    positionPlanes(true);
  }

  function resetCamera({ animated = true } = {}) {
    const destination = new THREE.Vector3(0.12, 0.05, 5.5);
    const start = camera.position.clone();
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, -0.25);
    if (!animated || !settings.motion) {
      camera.position.copy(destination);
      controls.target.copy(endTarget);
      controls.update();
      requestRender();
      return;
    }
    const startTime = performance.now();
    const duration = 520;
    function tick(time) {
      const eased = easeOutQuint(clamp((time - startTime) / duration, 0, 1));
      camera.position.lerpVectors(start, destination, eased);
      controls.target.lerpVectors(startTarget, endTarget, eased);
      controls.update();
      render();
      if (eased < 1 && !destroyed) transitionFrame = requestAnimationFrame(tick);
    }
    cancelAnimationFrame(transitionFrame);
    transitionFrame = requestAnimationFrame(tick);
  }

  function applySettings(nextSettings) {
    settings = nextSettings;
    stackLayers = nextSettings.render.stackLayers;
    renderer.setPixelRatio(nextSettings.render.pixelRatio);
    planes.forEach((plane, index) => {
      plane.visible = index < stackLayers && (index === 0 || stackEnabled);
    });
    resize();
  }

  function setActive(isActive) {
    visible = Boolean(isActive) && !document.hidden;
    if (visible) requestRender();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const handleVisibility = () => {
    visible = !document.hidden && canvas.offsetParent !== null;
    if (visible) requestRender();
  };
  document.addEventListener("visibilitychange", handleVisibility);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    onError(new Error("The MRI WebGL context was interrupted. It will resume when the browser restores it."));
  });
  canvas.addEventListener("webglcontextrestored", requestRender);

  resize();
  positionPlanes(false);
  await setSlice(currentIndex);
  onReady({ manifest });

  return {
    manifest,
    setSlice,
    setOverlayEnabled,
    setStackEnabled,
    resetCamera,
    applySettings,
    setActive,
    getCurrentSlice: () => currentIndex,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(transitionFrame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      controls.dispose();
      geometry.dispose();
      overlayTexture.dispose();
      overlayMaterial.dispose();
      planes.forEach((plane) => plane.material.dispose());
      textureCache.forEach((entry) => entry.promise.then((texture) => texture.dispose()).catch(() => {}));
      renderer.dispose();
    }
  };
}
