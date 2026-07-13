import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  ANATOMY_SYSTEMS,
  anatomyDisplayLabel,
  anatomyLogicalKey,
  anatomySide,
  anatomyStructureNote,
  classifyAnatomyMesh,
  cleanAnatomyName,
  getSystem,
  isMirroredMidlineMesh
} from "./data/atlas.js?v=20260713-anatomy-identities";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutQuint(value) {
  return 1 - Math.pow(1 - value, 5);
}

function metadataValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim() && value.trim() !== "-") || null;
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
  const logicalMeshes = new Map();
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
  let outlines = [];
  let explodeAmount = 0;
  let targetExplodeAmount = 0;
  let destroyed = false;
  let visible = !document.hidden;
  let renderQueued = false;
  let animationFrame = 0;
  let animationTicking = false;
  let pointerStart = null;
  const animations = new Map();
  const EXPLODE_ANIMATION = Symbol("explode");
  const CAMERA_ANIMATION = Symbol("camera");
  const REVEAL_ANIMATION = Symbol("reveal");

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
  function handleControlsStart() {
    cancelAnimation(CAMERA_ANIMATION);
    finishAnimation(REVEAL_ANIMATION);
  }
  controls.addEventListener("change", requestRender);
  controls.addEventListener("start", handleControlsStart);

  function render() {
    renderQueued = false;
    if (!destroyed && visible) renderer.render(scene, camera);
  }

  function requestRender() {
    if (renderQueued || animationFrame || animationTicking || destroyed || !visible) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  function runAnimations(time) {
    animationFrame = 0;
    if (destroyed) return;
    animationTicking = true;
    try {
      const active = [...animations.entries()];
      active.forEach(([key, job]) => {
        if (animations.get(key) !== job) return;
        const linearProgress = clamp((time - job.startTime) / job.duration, 0, 1);
        job.update(easeOutQuint(linearProgress));
        if (linearProgress >= 1) {
          animations.delete(key);
          job.complete();
        }
      });
      render();
    } finally {
      animationTicking = false;
    }
    if (animations.size && !destroyed) animationFrame = requestAnimationFrame(runAnimations);
  }

  function ensureAnimationFrame() {
    if (!animationFrame && animations.size && !destroyed) {
      animationFrame = requestAnimationFrame(runAnimations);
    }
  }

  function animate(key, { duration, update, complete = () => {} }) {
    cancelAnimation(key);
    animationTicking = true;
    try {
      update(0);
    } finally {
      animationTicking = false;
    }
    if (!settings.motion || duration <= 0) {
      update(1);
      complete();
      requestRender();
      return;
    }
    animations.set(key, {
      startTime: performance.now(),
      duration,
      update,
      complete
    });
    ensureAnimationFrame();
  }

  function cancelAnimation(key) {
    animations.delete(key);
    if (!animations.size && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  function finishAnimation(key) {
    const job = animations.get(key);
    if (!job) return;
    animations.delete(key);
    job.update(1);
    job.complete();
    if (!animations.size && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    requestRender();
  }

  function finishAllAnimations() {
    [...animations.keys()].forEach(finishAnimation);
  }

  function cancelAllAnimations() {
    animations.clear();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
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
    const systemId = classifyAnatomyMesh(mesh.name, { ...mesh.userData, ...record });
    const system = getSystem(systemId);
    const mirroredMidline = isMirroredMidlineMesh(mesh.name);
    const side = mirroredMidline ? "midline" : (record.side || anatomySide(mesh.name));
    const sourceDisplayName = mirroredMidline
      ? (record.displayLabel || cleanAnatomyName(mesh.name, mesh.userData.label || record.label))
      : (record.displayName || cleanAnatomyName(mesh.name, mesh.userData.label || record.label));
    const displayName = anatomyDisplayLabel(mesh.name, sourceDisplayName);
    const logicalKey = anatomyLogicalKey(mesh.name);
    const defaultVisible = record.defaultVisible !== false;
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
      logicalKey,
      structureNote: anatomyStructureNote(mesh.name),
      ontologyId: metadataValue(mesh.userData.ontologyid, record.ontologyId),
      representationOf: metadataValue(mesh.userData.representation_of, record.representationOf),
      displayLevel: record.displayLevel ?? "detail",
      defaultVisible,
      targetVisible: defaultVisible,
      visibilityAmount: defaultVisible ? 1 : 0,
      hidden: !defaultVisible,
      originalPosition: mesh.position.clone(),
      originalQuaternion: mesh.quaternion.clone(),
      originalScale: mesh.scale.clone(),
      explodeOffset: new THREE.Vector3()
    };
    mesh.visible = defaultVisible;
    meshes.push(mesh);
    if (!logicalMeshes.has(logicalKey)) logicalMeshes.set(logicalKey, []);
    logicalMeshes.get(logicalKey).push(mesh);
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
    const groups = [...logicalMeshes.values()];
    const shown = groups.filter((group) => group.some((mesh) => mesh.userData.atlas.targetVisible)).length;
    onVisibilityChange({ visible: shown, total: groups.length });
  }

  function clearOutline() {
    outlines.forEach((outline) => outline.parent?.remove(outline));
    outlines = [];
  }

  function resetHighlights() {
    meshes.forEach((mesh) => {
      mesh.material.emissive.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
      mesh.material.color.set(getSystem(mesh.userData.atlas.systemId).color);
    });
    clearOutline();
  }

  function selectionTargets() {
    if (!selected) return [];
    return selected.type === "system"
      ? meshesBySystem.get(selected.systemId) || []
      : selected.meshes || [selected.mesh];
  }

  function applySelectionHighlight() {
    resetHighlights();
    if (!selected) return;
    const targets = selectionTargets();
    targets.forEach((mesh) => {
      mesh.material.emissive.set(0x403725);
      mesh.material.emissiveIntensity = 0.95;
    });
    if (selected.type === "mesh") {
      targets
        .filter((mesh) => mesh.visible && mesh.userData.atlas.targetVisible)
        .forEach((mesh) => {
          const outline = new THREE.Mesh(mesh.geometry, outlineMaterial);
          outline.name = "selection-outline";
          outline.scale.setScalar(1.018);
          outline.raycast = () => {};
          mesh.add(outline);
          outlines.push(outline);
        });
    }
    requestRender();
  }

  function selectMesh(mesh) {
    if (!mesh?.userData?.atlas) return;
    const targets = logicalMeshes.get(mesh.userData.atlas.logicalKey) || [mesh];
    const primary = targets.find((target) => target.userData.atlas.targetVisible) || mesh;
    const ontologyId = targets.map((target) => target.userData.atlas.ontologyId).find(Boolean) || null;
    selected = {
      type: "mesh",
      mesh: primary,
      meshes: targets,
      rawName: primary.name,
      displayName: primary.userData.atlas.displayName,
      systemId: primary.userData.atlas.systemId,
      systemName: primary.userData.atlas.systemName,
      side: primary.userData.atlas.side,
      color: getSystem(primary.userData.atlas.systemId).color,
      ontologyId,
      structureNote: primary.userData.atlas.structureNote,
      sourceMeshCount: targets.length,
      hidden: targets.every((target) => !target.userData.atlas.targetVisible)
    };
    applySelectionHighlight();
    onSelectionChange(selected);
  }

  function selectSystem(systemId) {
    const system = getSystem(systemId);
    const targets = meshesBySystem.get(systemId) || [];
    const logicalCount = new Set(targets.map((mesh) => mesh.userData.atlas.logicalKey)).size;
    selected = {
      type: "system",
      systemId,
      systemName: system.name,
      displayName: system.name,
      color: system.color,
      side: "bilateral",
      hidden: targets.every((mesh) => !mesh.userData.atlas.targetVisible),
      count: logicalCount,
      structureNote: null
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

  function syncSelectedState() {
    if (!selected) return;
    selected.hidden = selectionTargets().every((mesh) => !mesh.userData.atlas.targetVisible);
    onSelectionChange(selected);
  }

  function applyVisibilityFrame(mesh, amount) {
    const atlas = mesh.userData.atlas;
    atlas.visibilityAmount = clamp(amount, 0, 1);
    mesh.visible = true;
    mesh.material.transparent = true;
    mesh.material.depthWrite = false;
    mesh.material.opacity = atlas.visibilityAmount;
    mesh.scale
      .copy(atlas.originalScale)
      .multiplyScalar(THREE.MathUtils.lerp(0.965, 1, atlas.visibilityAmount));
  }

  function settleVisibility(mesh) {
    const atlas = mesh.userData.atlas;
    atlas.visibilityAmount = atlas.targetVisible ? 1 : 0;
    atlas.hidden = !atlas.targetVisible;
    mesh.visible = atlas.targetVisible;
    mesh.material.opacity = 1;
    mesh.material.transparent = false;
    mesh.material.depthWrite = true;
    mesh.quaternion.copy(atlas.originalQuaternion);
    mesh.scale.copy(atlas.originalScale);
  }

  function applyVisibilityPlan(plan) {
    const actionable = [...plan.entries()].filter(
      ([mesh, shouldShow]) => mesh.userData.atlas.targetVisible !== shouldShow
    );
    if (!actionable.length) return;
    clearOutline();
    actionable.forEach(([mesh, shouldShow]) => {
      mesh.userData.atlas.targetVisible = shouldShow;
      mesh.userData.atlas.hidden = !shouldShow;
      if (shouldShow) mesh.visible = true;
    });
    updateVisibilityCount();
    syncSelectedState();
    applySelectionHighlight();

    let remaining = actionable.length;
    actionable.forEach(([mesh, shouldShow]) => {
      const startAmount = mesh.userData.atlas.visibilityAmount;
      const targetAmount = shouldShow ? 1 : 0;
      const distance = Math.abs(targetAmount - startAmount);
      const baseDuration = shouldShow ? 300 : 220;
      animate(mesh, {
        duration: baseDuration * distance,
        update(progress) {
          applyVisibilityFrame(mesh, THREE.MathUtils.lerp(startAmount, targetAmount, progress));
        },
        complete() {
          settleVisibility(mesh);
          remaining -= 1;
          if (remaining === 0) {
            applySelectionHighlight();
            requestRender();
          }
        }
      });
    });
  }

  function setMeshesVisible(targets, shouldShow) {
    applyVisibilityPlan(new Map(targets.map((mesh) => [mesh, shouldShow])));
  }

  function setSystemVisible(systemId, shouldShow) {
    setMeshesVisible(meshesBySystem.get(systemId) || [], shouldShow);
  }

  function hideSelected() {
    if (!selected) return;
    setMeshesVisible(selectionTargets(), false);
  }

  function showSelected() {
    if (!selected) return;
    setMeshesVisible(selectionTargets(), true);
  }

  function isolateSelected() {
    if (!selected) return;
    const keep = new Set(selectionTargets());
    applyVisibilityPlan(new Map(meshes.map((mesh) => [mesh, keep.has(mesh)])));
  }

  function showAll() {
    setMeshesVisible(meshes, true);
  }

  function setExploded(nextExploded) {
    targetExplodeAmount = nextExploded ? 1 : 0;
    const startAmount = explodeAmount;
    const targetAmount = targetExplodeAmount;
    const distance = Math.abs(targetAmount - startAmount);
    animate(EXPLODE_ANIMATION, {
      duration: (targetAmount ? 620 : 480) * distance,
      update(progress) {
        explodeAmount = THREE.MathUtils.lerp(startAmount, targetAmount, progress);
        meshes.forEach((mesh) => {
          const atlas = mesh.userData.atlas;
          mesh.position
            .copy(atlas.originalPosition)
            .addScaledVector(atlas.explodeOffset, explodeAmount);
        });
      },
      complete() {
        explodeAmount = targetAmount;
      }
    });
  }

  function resetCamera({ animated = true } = {}) {
    cancelAnimation(CAMERA_ANIMATION);
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
    animate(CAMERA_ANIMATION, {
      duration: 520,
      update(progress) {
        camera.position.lerpVectors(start, destination, progress);
        controls.target.lerpVectors(startTarget, endTarget, progress);
        controls.update();
      }
    });
  }

  function applySettings(nextSettings) {
    const motionWasEnabled = settings.motion;
    settings = nextSettings;
    if (motionWasEnabled && !nextSettings.motion) finishAllAnimations();
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
  const handleContextLost = (event) => {
    event.preventDefault();
    onError(new Error("The anatomy WebGL context was interrupted. It will resume when the browser restores it."));
  };
  const handleContextRestored = () => requestRender();
  document.addEventListener("visibilitychange", handleVisibility);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    cancelAllAnimations();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", handleVisibility);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    controls.removeEventListener("change", requestRender);
    controls.removeEventListener("start", handleControlsStart);
    controls.dispose();
    clearOutline();
    const geometries = new Set();
    const materials = new Set();
    modelRoot?.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry) geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      objectMaterials.filter(Boolean).forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    materialTemplates.forEach((material) => material.dispose());
    outlineMaterial.dispose();
    renderer.dispose();
  }

  resize();
  await loadMetadata();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let gltf;
  try {
    gltf = await new Promise((resolve, reject) => {
      loader.load(
        modelUrl,
        resolve,
        (event) => {
          if (event.total) onProgress(event.loaded / event.total);
          else onProgress(null);
        },
        reject
      );
    });
  } catch (error) {
    cleanup();
    onError(error);
    throw error;
  }

  try {
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

    modelStage.scale.setScalar(0.91);
    modelStage.rotation.y = -0.18;
    animate(REVEAL_ANIMATION, {
      duration: 760,
      update(progress) {
        modelStage.scale.setScalar(THREE.MathUtils.lerp(0.91, 1, progress));
        modelStage.rotation.y = THREE.MathUtils.lerp(-0.18, 0, progress);
      },
      complete() {
        modelStage.scale.setScalar(1);
        modelStage.rotation.y = 0;
      }
    });

    onReady({
      meshCount: meshes.length,
      structureCount: logicalMeshes.size,
      systems: ANATOMY_SYSTEMS.map((system) => ({
        ...system,
        count: new Set(
          (meshesBySystem.get(system.id) || []).map((mesh) => mesh.userData.atlas.logicalKey)
        ).size
      }))
    });
  } catch (error) {
    cleanup();
    onError(error);
    throw error;
  }

  function validateState(epsilon = 1e-7) {
    const issues = [];
    const expectedPosition = new THREE.Vector3();
    meshes.forEach((mesh) => {
      const atlas = mesh.userData.atlas;
      expectedPosition
        .copy(atlas.originalPosition)
        .addScaledVector(atlas.explodeOffset, explodeAmount);
      if (mesh.position.distanceTo(expectedPosition) > epsilon) issues.push(`${mesh.name}:position`);
      if (mesh.quaternion.angleTo(atlas.originalQuaternion) > epsilon) issues.push(`${mesh.name}:rotation`);
      if (mesh.scale.distanceTo(atlas.originalScale) > epsilon) issues.push(`${mesh.name}:scale`);
      if (mesh.visible !== atlas.targetVisible) issues.push(`${mesh.name}:visibility`);
      if (atlas.hidden === atlas.targetVisible) issues.push(`${mesh.name}:hidden-state`);
      if (Math.abs(mesh.material.opacity - 1) > epsilon) issues.push(`${mesh.name}:opacity`);
      if (mesh.material.transparent) issues.push(`${mesh.name}:transparent`);
      if (!mesh.material.depthWrite) issues.push(`${mesh.name}:depth-write`);
    });
    if (modelStage.scale.distanceTo(new THREE.Vector3(1, 1, 1)) > epsilon) issues.push("model-stage:scale");
    if (Math.abs(modelStage.rotation.y) > epsilon) issues.push("model-stage:rotation");
    return {
      valid: issues.length === 0 && animations.size === 0,
      issues,
      activeAnimations: animations.size,
      meshCount: meshes.length,
      structureCount: logicalMeshes.size,
      visibleStructures: [...logicalMeshes.values()].filter(
        (group) => group.some((mesh) => mesh.userData.atlas.targetVisible)
      ).length,
      explodeAmount,
      cameraDistance: camera.position.distanceTo(controls.target)
    };
  }

  return {
    selectSystem,
    selectStructure(rawName) {
      const mesh = meshes.find((candidate) => candidate.name === rawName);
      if (!mesh) return false;
      selectMesh(mesh);
      return true;
    },
    setSystemVisible,
    hideSelected,
    showSelected,
    isolateSelected,
    showAll,
    setExploded,
    resetCamera,
    applySettings,
    setActive,
    finishAnimations: finishAllAnimations,
    validateState,
    getSelection: () => selected,
    getSystemVisibility(systemId) {
      const targets = meshesBySystem.get(systemId) || [];
      return targets.some((mesh) => mesh.userData.atlas.targetVisible);
    },
    destroy: cleanup
  };
}
