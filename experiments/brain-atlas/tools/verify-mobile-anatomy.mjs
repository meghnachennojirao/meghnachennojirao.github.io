import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getGLPrimitiveCount } from "@gltf-transform/functions";
import { MeshoptDecoder } from "meshoptimizer";
import { EXPECTED_CORRECTED_SOURCE_SHA256 } from "./anatomy-identity-correction.mjs";

const [sourcePath, candidatePath] = process.argv.slice(2);
if (!sourcePath || !candidatePath) {
  throw new Error(
    "Usage: node verify-mobile-anatomy.mjs SOURCE.glb CANDIDATE.glb",
  );
}

const PROTECTED_NAMES = new Set([
  "Allen_white_matter_of_forebrain_L",
  "Allen_white_matter_of_forebrain_R",
  "Allen_amygdaloid_complex_L",
  "Allen_amygdaloid_complex_R",
]);
const ALL_BBOX_LIMIT_MM = 0.25;
const PROTECTED_BBOX_LIMIT_MM = 0.01;
const MAX_BYTES = 2_310_000;
const MAX_TRIANGLES = 385_000;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });

function sha256(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex").toUpperCase()));
  });
}

function transformPoint(matrix, [x, y, z]) {
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  return [
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
    (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
  ];
}

function summarize(document) {
  const root = document.getRoot();
  const nodes = root.listNodes();
  const namedNodes = nodes.filter((node) => node.getName());
  const nodeMap = new Map();
  let primitiveCount = 0;
  let triangles = 0;
  const invalidPrimitives = [];

  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      primitiveCount += 1;
      triangles += getGLPrimitiveCount(primitive);
      const position = primitive.getAttribute("POSITION");
      const indices = primitive.getIndices();
      const indexCount = indices?.getCount() ?? position?.getCount() ?? 0;
      if (!position || indexCount === 0 || indexCount % 3 !== 0) {
        invalidPrimitives.push(mesh.getName() || `<mesh-${primitiveCount - 1}>`);
      }
    }
  }

  for (const node of namedNodes) {
    const mesh = node.getMesh();
    const record = { extras: node.getExtras(), bbox: null };
    if (mesh) {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      const matrix = node.getWorldMatrix();
      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute("POSITION");
        const indexArray = primitive.getIndices()?.getArray();
        const renderCount = indexArray?.length ?? position.getCount();
        const element = [];
        for (let index = 0; index < renderCount; index += 1) {
          const vertexIndex = indexArray ? indexArray[index] : index;
          position.getElement(vertexIndex, element);
          if (!element.every(Number.isFinite)) {
            invalidPrimitives.push(`${node.getName()}:non-finite-position`);
            continue;
          }
          const point = transformPoint(matrix, element);
          for (let axis = 0; axis < 3; axis += 1) {
            min[axis] = Math.min(min[axis], point[axis]);
            max[axis] = Math.max(max[axis], point[axis]);
          }
        }
      }
      record.bbox = { min, max };
    }
    nodeMap.set(node.getName(), record);
  }

  return {
    nodeCount: nodes.length,
    namedNodeCount: namedNodes.length,
    namedMeshNodeCount: namedNodes.filter((node) => node.getMesh()).length,
    meshCount: root.listMeshes().length,
    primitiveCount,
    triangles,
    invalidPrimitives,
    nodeMap,
  };
}

const source = summarize(await io.read(sourcePath));
const candidate = summarize(await io.read(candidatePath));
const [sourceSha256, candidateSha256] = await Promise.all([
  sha256(sourcePath),
  sha256(candidatePath),
]);
const missingNames = [...source.nodeMap.keys()].filter(
  (name) => !candidate.nodeMap.has(name),
);
const addedNames = [...candidate.nodeMap.keys()].filter(
  (name) => !source.nodeMap.has(name),
);
const changedExtras = [...source.nodeMap.keys()].filter((name) => {
  const candidateNode = candidate.nodeMap.get(name);
  return candidateNode
    && !isDeepStrictEqual(source.nodeMap.get(name).extras, candidateNode.extras);
});

const bboxDeviations = [];
for (const [name, sourceNode] of source.nodeMap) {
  const candidateNode = candidate.nodeMap.get(name);
  if (!sourceNode.bbox || !candidateNode?.bbox) continue;
  const facesMm = [
    ...sourceNode.bbox.min.map(
      (value, axis) => Math.abs(value - candidateNode.bbox.min[axis]) * 1000,
    ),
    ...sourceNode.bbox.max.map(
      (value, axis) => Math.abs(value - candidateNode.bbox.max[axis]) * 1000,
    ),
  ];
  bboxDeviations.push({ name, maxFaceMm: Math.max(...facesMm), facesMm });
}
bboxDeviations.sort((a, b) => b.maxFaceMm - a.maxFaceMm);
const maxOverallBboxFaceMm = bboxDeviations[0]?.maxFaceMm ?? Infinity;
const protectedDeviations = bboxDeviations.filter(({ name }) =>
  PROTECTED_NAMES.has(name));
const maxProtectedBboxFaceMm = Math.max(
  ...protectedDeviations.map(({ maxFaceMm }) => maxFaceMm),
);
const { size: bytes } = await stat(candidatePath);

const countsPass = candidate.nodeCount === 286
  && candidate.namedNodeCount === 286
  && candidate.namedMeshNodeCount === 283
  && candidate.meshCount === 283
  && candidate.primitiveCount === 283;
const pass = countsPass
  && sourceSha256 === EXPECTED_CORRECTED_SOURCE_SHA256
  && candidate.triangles <= MAX_TRIANGLES
  && bytes <= MAX_BYTES
  && missingNames.length === 0
  && addedNames.length === 0
  && changedExtras.length === 0
  && candidate.invalidPrimitives.length === 0
  && maxOverallBboxFaceMm <= ALL_BBOX_LIMIT_MM
  && maxProtectedBboxFaceMm <= PROTECTED_BBOX_LIMIT_MM;

const omitNodeMap = ({ nodeMap, ...summary }) => summary;
console.log(JSON.stringify({
  pass,
  bytes,
  sourceSha256,
  candidateSha256,
  source: omitNodeMap(source),
  candidate: omitNodeMap(candidate),
  missingNames,
  addedNames,
  changedExtras,
  maxOverallBboxFaceMm,
  maxProtectedBboxFaceMm,
  protectedDeviations,
  worstBboxDeviations: bboxDeviations.slice(0, 12),
}, null, 2));
if (!pass) process.exitCode = 1;
