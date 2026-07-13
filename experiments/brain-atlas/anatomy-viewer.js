import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  ANATOMY_SYSTEMS,
  anatomySide,
  classifyAnatomyMesh,
  cleanAnatomyName,
  getSystem
} from "./data/atlas.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutQuint(value) {
  return 1 - Math.pow(1 - value, 5);
}

function materialForSystem(system) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(system.color),
    roughness: 0.68,
    metalness: 0.015,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1
  });
}

export async function createAnatomyViewer({
  canvas,
  modelUrl,
  metadataUrl,
  settings,
  onReady = () => {},
  onProgress = () => {},
  onSelectionChange = () => {},
  onVisibilityChange = () => {},
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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 4);
  const modelStage = new THREE.Group();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const mobileTouchLayout = window.matchMedia("(max-width: 47.99rem), (max-height: 32rem) and (orientation: landscape) and (pointer: coarse)");
  const meshes = [];
  const meshByName = new Map();
  const meshesBySystem = new Map(ANATOMY_SYSTEMS.map((system) => [system.id, []]));
  const materialTemplates = new Map(ANATOMY_SYSTEMS.map((system) => [system.id, materialForSystem(system)]));
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0xf4f0e6,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  let metadata = new Map();
  let modelRoot = null;
  let selected = null;
  let outline = null;
  let exploded = false;
  let destroyed = false;
  let visible = !document.hidden;
  let renderQueued = false;
  let transitionFrame = 0;
  let pointerStart = null;
  let userHasInteracted = false;

  renderer.setPixelRatio(settings.render.pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  camera.position.set(0.02, 0.015, 0.39);
  scene.add(modelStage);
  scene.add(new THREE.HemisphereLight(0xf7eee2, 0x1a3031, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffe5ca, 3.1);
  keyLight.position.set(-0.8, 1.2, 1.5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x80b7ac, 2.1);
  rimLight.position.set(1.4, 0.3, -1.2);
  scene.add(rimLight);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.zoomSpeed = mobileTouchLayout.matches ? 1.65 : 1;
  controls.minDistance = 0.22;
  controls.maxDistance = mobileTouchLayout.matches ? 0.95 : 0.72;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.target.set(0, 0, 0);
  controls.update();
  controls.addEventListener("change", requestRender);
  controls.addEventListener("start", () => { userHasInteracted = true; });

  function render() {
    renderQueued = false;
    if (!destroyed && visible) renderer.render(scene, camera);
  }

  function requestRender() {
    if (renderQueued || destroyed || !visible) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

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

  function loadMetadata() {
    if (!metadataUrl) return Promise.resolve();
    return fetch(metadataUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Anatomy metadata could not be loaded (${response.status})`);
        return response.json();
      })
      .then((payload) => {
        const entries = payload.meshes || payload.nodes || payload;
        if (Array.isArray(entries)) {
          metadata = new Map(entries.map((entry) => {
            const name = entry.name || entry.meshName;
            return [name, {
              ...entry,
              name,
              displayName: entry.displayName || entry.displayLabelWithSide || entry.displayLabel,
              system: (entry.system || entry.majorSystem) === "brainstem-other"
                ? "brainstem"
                : (entry.system || entry.majorSystem),
              ontologyId: entry.ontologyId || entry.extras?.ontologyId,
              representationOf: entry.representationOf || entry.extras?.representationOf
            }];
          }));
        }
      })
      .catch((error) => {
        console.warn(error);
      });
  }

  function setupMesh(mesh) {
    const record = metadata.get(mesh.name) || {};
    const systemId = record.system || classifyAnatomyMesh(mesh.name, { ...mesh.userData, ...record });
    const system = getSystem(systemId);
    const side = record.side || anatomySide(mesh.name);
    const displayName = record.displayName || cleanAnatomyName(mesh.name, mesh.userData.label || record.label);
    const originalMaterial = mesh.material;
    mesh.material = materialTemplates.get(system.id).clone();
    if (originalMaterial?.dispose) originalMaterial.dispose();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.userData.atlas = {
      rawName: mesh.name,
      displayName,
      systemId: system.id,
      systemName: system.name,
      side,
      ontologyId: mesh.userData.ontologyid || record.ontologyId || null,
      representationOf: mesh.userData.representation_of || record.representationOf || null,
      displayLevel: record.displayLevel || "detail",
      defaultVisible: record.defaultVisible !== false,
      hidden: record.defaultVisible === false,
      originalPosition: mesh.position.clone(),
      explodeOffset: new THREE.Vector3()
    };
    mesh.visible = mesh.userData.atlas.defaultVisible;
    meshes.push(mesh);
    meshByName.set(mesh.name, mesh);
    if (!meshesBySystem.has(system.id)) meshesBySystem.set(system.id, []);
    meshesBySystem.get(system.id).push(mesh);
  }

  function prepareExplodeOffsets() {
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    const bounds = new THREE.Box3();
    meshes.forEach((mesh) => {
      bounds.setFromObject(mesh);
      bounds.getCenter(center);
      bounds.getSize(size);
      const direction = center.clone();
      if (direction.lengthSq() < 0.000001) {
        direction.set(mesh.userData.atlas.side === "left" ? -1 : mesh.userData.atlas.side === "right" ? 1 : 0, 0.18, 0.2);
      }
      direction.normalize();
      const scale = clamp(size.length() * 0.28, 0.008, 0.027);
      mesh.userData.atlas.explodeOffset.copy(direction.multiplyScalar(scale));
    });
  }

  function updateVisibilityCount() {
    const shown = meshes.filter((mesh) => mesh.visible && !mesh.userData.atlas.hidden).length;
    onVisibilityChange({ visible: shown, total: meshes.length });
  }

  function clearOutline() {
    if (!outline) return;
    outline.parent?.remove(outline);
    outline = null;
  }

  function resetHighlights() {
    meshes.forEach((mesh) => {
      mesh.material.emissive.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
      mesh.material.color.set(getSystem(mesh.userData.atlas.systemId).color);
    });
    clearOutline();
  }

  function applySelectionHighlight() {
    resetHighlights();
    if (!selected) return;
    const targets = selected.type === "system" ? meshesBySystem.get(selected.systemId) || [] : [selected.mesh];
    targets.forEach((mesh) => {
      mesh.material.emissive.set(0x403725);
      mesh.material.emissiveIntensity = 0.95;
    });
    if (selected.type === "mesh" && selected.mesh.visible) {
      outline = new THREE.Mesh(selected.mesh.geometry, outlineMaterial);
      outline.name = "selection-outline";
      outline.scale.setScalar(1.018);
      outline.raycast = () => {};
      selected.mesh.add(outline);
    }
    requestRender();
  }

  function selectMesh(mesh) {
    if (!mesh?.userData?.atlas) return;
    selected = {
      type: "mesh",
      mesh,
      rawName: mesh.name,
      displayName: mesh.userData.atlas.displayName,
      systemId: mesh.userData.atlas.systemId,
      systemName: mesh.userData.atlas.systemName,
      side: mesh.userData.atlas.side,
      color: getSystem(mesh.userData.atlas.systemId).color,
      ontologyId: mesh.userData.atlas.ontologyId,
      hidden: mesh.userData.atlas.hidden
    };
    applySelectionHighlight();
    onSelectionChange(selected);
  }

  function selectSystem(systemId) {
    const system = getSystem(systemId);
    const targets = meshesBySystem.get(systemId) || [];
    selected = {
      type: "system",
      systemId,
      systemName: system.name,
      displayName: system.name,
      color: system.color,
      side: "bilateral",
      hidden: targets.every((mesh) => mesh.userData.atlas.hidden),
      count: targets.length
    };
    applySelectionHighlight();
    onSelectionChange(selected);
  }

  function pointerPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  }

  function handlePointerDown(event) {
    pointerStart = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event) {
    if (!pointerStart || !modelRoot) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    const tapTolerance = event.pointerType === "touch" && mobileTouchLayout.matches ? 15 : 7;
    if (distance > tapTolerance) return;
    pointerPosition(event);
    raycaster.setFromCamera(pointer, camera);
    const clickable = meshes.filter((mesh) => mesh.visible && !mesh.userData.atlas.hidden);
    const hit = raycaster.intersectObjects(clickable, false)[0];
    if (hit) selectMesh(hit.object);
  }

  function tweenMeshes(targets, update, duration = 260, complete = () => {}) {
    cancelAnimationFrame(transitionFrame);
    if (!settings.motion) {
      update(1);
      complete();
      render();
      return;
    }
    const startTime = performance.now();
    function tick(time) {
      const progress = easeOutQuint(clamp((time - startTime) / duration, 0, 1));
      update(progress, targets);
      render();
      if (progress < 1 && !destroyed) transitionFrame = requestAnimationFrame(tick);
      else complete();
    }
    transitionFrame = requestAnimationFrame(tick);
  }

  function setMeshesVisible(targets, shouldShow) {
    const actionable = targets.filter((mesh) => mesh.userData.atlas.hidden === shouldShow);
    if (!actionable.length) return;
    const starts = actionable.map((mesh) => ({
      mesh,
      opacity: mesh.material.opacity,
      scale: mesh.scale.clone()
    }));
    if (shouldShow) {
      actionable.forEach((mesh) => {
        mesh.visible = true;
        mesh.material.transparent = true;
        mesh.material.depthWrite = false;
        mesh.material.opacity = 0;
        mesh.scale.setScalar(0.965);
      });
    } else {
      clearOutline();
      actionable.forEach((mesh) => {
        mesh.material.transparent = true;
        mesh.material.depthWrite = false;
      });
    }
    tweenMeshes(actionable, (progress) => {
      starts.forEach(({ mesh, opacity, scale }) => {
        mesh.material.opacity = shouldShow
          ? progress
          : THREE.MathUtils.lerp(opacity, 0, progress);
        const scaleFactor = shouldShow
          ? THREE.MathUtils.lerp(0.965, 1, progress)
          : THREE.MathUtils.lerp(1, 0.965, progress);
        mesh.scale.copy(scale).multiplyScalar(scaleFactor);
      });
    }, shouldShow ? 300 : 220, () => {
      actionable.forEach((mesh) => {
        mesh.userData.atlas.hidden = !shouldShow;
        mesh.visible = shouldShow;
        mesh.material.opacity = 1;
        mesh.material.transparent = false;
        mesh.material.depthWrite = true;
        mesh.scale.setScalar(1);
      });
      applySelectionHighlight();
      updateVisibilityCount();
      if (selected) {
        selected.hidden = selected.type === "mesh"
          ? selected.mesh.userData.atlas.hidden
          : (meshesBySystem.get(selected.systemId) || []).every((mesh) => mesh.userData.atlas.hidden);
        onSelectionChange(selected);
      }
      requestRender();
    });
  }

  function setSystemVisible(systemId, shouldShow) {
    setMeshesVisible(meshesBySystem.get(systemId) || [], shouldShow);
  }

  function hideSelected() {
    if (!selected) return;
    const targets = selected.type === "system" ? meshesBySystem.get(selected.systemId) || [] : [selected.mesh];
    setMeshesVisible(targets, false);
  }

  function showSelected() {
    if (!selected) return;
    const targets = selected.type === "system" ? meshesBySystem.get(selected.systemId) || [] : [selected.mesh];
    setMeshesVisible(targets, true);
  }

  function isolateSelected() {
    if (!selected) return;
    const targets = new Set(selected.type === "system" ? meshesBySystem.get(selected.systemId) || [] : [selected.mesh]);
    const hideTargets = meshes.filter((mesh) => !targets.has(mesh) && !mesh.userData.atlas.hidden);
    const showTargets = [...targets].filter((mesh) => mesh.userData.atlas.hidden);
    if (showTargets.length) setMeshesVisible(showTargets, true);
    if (hideTargets.length) setMeshesVisible(hideTargets, false);
  }

  function showAll() {
    setMeshesVisible(meshes.filter((mesh) => mesh.userData.atlas.hidden), true);
  }

  function setExploded(nextExploded) {
    exploded = Boolean(nextExploded);
    const starts = meshes.map((mesh) => mesh.position.clone());
    tweenMeshes(meshes, (progress) => {
      meshes.forEach((mesh, index) => {
        const atlas = mesh.userData.atlas;
        const target = atlas.originalPosition.clone();
        if (exploded) target.add(atlas.explodeOffset);
        mesh.position.lerpVectors(starts[index], target, progress);
      });
    }, exploded ? 620 : 480, requestRender);
  }

  function resetCamera({ animated = true } = {}) {
    const destination = new THREE.Vector3(0.02, 0.015, 0.39);
    const start = camera.position.clone();
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);
    if (!animated || !settings.motion) {
      camera.position.copy(destination);
      controls.target.copy(endTarget);
      controls.update();
      requestRender();
      return;
    }
    tweenMeshes([], (progress) => {
      camera.position.lerpVectors(start, destination, progress);
      controls.target.lerpVectors(startTarget, endTarget, progress);
      controls.update();
    }, 520, requestRender);
  }

  function applySettings(nextSettings) {
    settings = nextSettings;
    renderer.setPixelRatio(nextSettings.render.pixelRatio);
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
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    onError(new Error("The anatomy WebGL context was interrupted. It will resume when the browser restores it."));
  });
  canvas.addEventListener("webglcontextrestored", requestRender);

  resize();
  await loadMetadata();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      modelUrl,
      resolve,
      (event) => {
        if (event.total) onProgress(event.loaded / event.total);
        else onProgress(null);
      },
      reject
    );
  }).catch((error) => {
    onError(error);
    throw error;
  });

  modelRoot = gltf.scene;
  modelRoot.traverse((object) => {
    if (object.isMesh) setupMesh(object);
  });
  modelStage.add(modelRoot);

  const bounds = new THREE.Box3().setFromObject(modelRoot);
  const center = bounds.getCenter(new THREE.Vector3());
  modelRoot.position.sub(center);
  modelRoot.updateMatrixWorld(true);
  prepareExplodeOffsets();
  updateVisibilityCount();

  if (settings.motion) {
    modelStage.scale.setScalar(0.91);
    modelStage.rotation.y = -0.18;
    const startTime = performance.now();
    const duration = 760;
    function reveal(time) {
      const progress = easeOutQuint(clamp((time - startTime) / duration, 0, 1));
      modelStage.scale.setScalar(THREE.MathUtils.lerp(0.91, 1, progress));
      modelStage.rotation.y = THREE.MathUtils.lerp(-0.18, 0, progress);
      render();
      if (progress < 1 && !destroyed && !userHasInteracted) transitionFrame = requestAnimationFrame(reveal);
    }
    transitionFrame = requestAnimationFrame(reveal);
  } else {
    requestRender();
  }

  onReady({
    meshCount: meshes.length,
    systems: ANATOMY_SYSTEMS.map((system) => ({
      ...system,
      count: (meshesBySystem.get(system.id) || []).length
    }))
  });

  return {
    selectSystem,
    setSystemVisible,
    hideSelected,
    showSelected,
    isolateSelected,
    showAll,
    setExploded,
    resetCamera,
    applySettings,
    setActive,
    getSelection: () => selected,
    getSystemVisibility(systemId) {
      const targets = meshesBySystem.get(systemId) || [];
      return targets.some((mesh) => !mesh.userData.atlas.hidden);
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(transitionFrame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      clearOutline();
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      materialTemplates.forEach((material) => material.dispose());
      outlineMaterial.dispose();
      renderer.dispose();
    }
  };
}
