import { stat } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  compactPrimitive,
  dequantize,
  getGLPrimitiveCount,
  meshopt,
  simplifyPrimitive,
  weld,
} from "@gltf-transform/functions";
import {
  MeshoptDecoder,
  MeshoptEncoder,
  MeshoptSimplifier,
} from "meshoptimizer";

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error(
    "Usage: node build-mobile-anatomy.mjs SOURCE.glb OUTPUT.glb",
  );
}

const PROTECTED_NAMES = new Set([
  "Allen_white_matter_of_forebrain_L",
  "Allen_white_matter_of_forebrain_R",
  "Allen_amygdaloid_complex_L",
  "Allen_amygdaloid_complex_R",
]);
const RATIO = 0.55;
const ERROR = 0.005;

await Promise.all([
  MeshoptDecoder.ready,
  MeshoptEncoder.ready,
  MeshoptSimplifier.ready,
]);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
const document = await io.read(sourcePath);
const root = document.getRoot();

const hasNonFloatPositions = root.listMeshes().some((mesh) =>
  mesh.listPrimitives().some((primitive) => {
    const position = primitive.getAttribute("POSITION");
    return position && !(position.getArray() instanceof Float32Array);
  }),
);
if (hasNonFloatPositions) await document.transform(dequantize());

await document.transform(weld({ overwrite: false }));

const protectedMeshes = new Set();
for (const node of root.listNodes()) {
  if (!PROTECTED_NAMES.has(node.getName())) continue;
  const mesh = node.getMesh();
  if (!mesh) throw new Error(`Protected node has no mesh: ${node.getName()}`);
  protectedMeshes.add(mesh);
}
if (protectedMeshes.size !== PROTECTED_NAMES.size) {
  throw new Error(
    `Expected ${PROTECTED_NAMES.size} protected meshes, found ${protectedMeshes.size}.`,
  );
}

function simplifyProtectedPrimitive(primitive) {
  const positionAccessor = primitive.getAttribute("POSITION");
  const indexAccessor = primitive.getIndices();
  if (!positionAccessor || !indexAccessor) {
    throw new Error("Protected HRA primitives must have POSITION and indices.");
  }

  const positions = positionAccessor.getArray();
  if (!(positions instanceof Float32Array)) {
    throw new Error("POSITION must be Float32 after dequantization.");
  }
  const sourceIndices = indexAccessor.getArray();
  const indices = sourceIndices instanceof Uint32Array
    ? sourceIndices
    : new Uint32Array(sourceIndices);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let offset = 0; offset < positions.length; offset += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[offset + axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }

  const locks = new Uint8Array(positions.length / 3);
  for (let offset = 0; offset < positions.length; offset += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[offset + axis];
      if (value === min[axis] || value === max[axis]) {
        locks[offset / 3] = 1;
        break;
      }
    }
  }

  // Protect each support point and its incident triangle vertices. This keeps
  // the four meshes whose outer extents drifted in the earlier mobile build.
  for (let offset = 0; offset < indices.length; offset += 3) {
    const a = indices[offset];
    const b = indices[offset + 1];
    const c = indices[offset + 2];
    if (locks[a] || locks[b] || locks[c]) {
      locks[a] = 1;
      locks[b] = 1;
      locks[c] = 1;
    }
  }

  const targetIndexCount = Math.floor((RATIO * indices.length) / 3) * 3;
  const [simplifiedIndices] = MeshoptSimplifier.simplifyWithAttributes(
    indices,
    positions,
    3,
    new Float32Array(),
    0,
    [],
    locks,
    targetIndexCount,
    ERROR,
    ["LockBorder"],
  );
  indexAccessor.setArray(simplifiedIndices);
  compactPrimitive(primitive);
}

for (const mesh of root.listMeshes()) {
  const isProtected = protectedMeshes.has(mesh)
    || PROTECTED_NAMES.has(mesh.getName());
  for (const primitive of mesh.listPrimitives()) {
    if (isProtected) {
      simplifyProtectedPrimitive(primitive);
    } else {
      simplifyPrimitive(primitive, {
        simplifier: MeshoptSimplifier,
        ratio: RATIO,
        error: ERROR,
        lockBorder: true,
      });
    }
  }
}

let triangles = 0;
for (const mesh of root.listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    triangles += getGLPrimitiveCount(primitive);
  }
}

await document.transform(meshopt({
  encoder: MeshoptEncoder,
  level: "high",
  quantizePosition: 14,
  quantizationVolume: "mesh",
}));
await io.write(outputPath, document);

const { size } = await stat(outputPath);
console.log(JSON.stringify({
  outputPath,
  bytes: size,
  triangles,
  nodes: root.listNodes().length,
  meshes: root.listMeshes().length,
  protectedMeshes: protectedMeshes.size,
}, null, 2));
