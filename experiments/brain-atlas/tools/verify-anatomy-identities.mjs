import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getGLPrimitiveCount } from "@gltf-transform/functions";
import { MeshoptDecoder } from "meshoptimizer";
import {
  ATLAS_IDS,
  EXPECTED_OFFICIAL_SHA256,
  IDENTITY_CORRECTIONS,
} from "./anatomy-identity-correction.mjs";

const [officialPath, correctedPath, metadataPath] = process.argv.slice(2);
if (!officialPath || !correctedPath || !metadataPath) {
  throw new Error(
    "Usage: node verify-anatomy-identities.mjs OFFICIAL.glb CORRECTED.glb NODES.json",
  );
}

const BBOX_LIMIT_MM = 0.01;

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
  const meshes = root.listMeshes();
  const records = new Map();

  nodes.forEach((node, nodeIndex) => {
    const mesh = node.getMesh();
    if (!mesh) return;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const matrix = node.getWorldMatrix();
    let triangles = 0;

    for (const primitive of mesh.listPrimitives()) {
      triangles += getGLPrimitiveCount(primitive);
      const position = primitive.getAttribute("POSITION");
      const point = [0, 0, 0];
      for (let index = 0; index < position.getCount(); index += 1) {
        position.getElement(index, point);
        const world = transformPoint(matrix, point);
        for (let axis = 0; axis < 3; axis += 1) {
          min[axis] = Math.min(min[axis], world[axis]);
          max[axis] = Math.max(max[axis], world[axis]);
        }
      }
    }

    records.set(node.getName(), {
      node,
      nodeIndex,
      meshIndex: meshes.indexOf(mesh),
      meshName: mesh.getName(),
      triangles,
      bbox: { min, max },
      extras: node.getExtras(),
    });
  });

  return { root, nodes, meshes, records };
}

function bboxDifferenceMm(left, right) {
  return Math.max(
    ...left.min.map((value, axis) => Math.abs(value - right.min[axis]) * 1000),
    ...left.max.map((value, axis) => Math.abs(value - right.max[axis]) * 1000),
  );
}

function semanticExtras(extras) {
  const clean = { ...extras };
  delete clean.identity_corrected_from;
  delete clean.allen_annotation_id;
  return clean;
}

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const [officialSha256, officialDocument, correctedDocument, metadataText] = await Promise.all([
  sha256(officialPath),
  io.read(officialPath),
  io.read(correctedPath),
  readFile(metadataPath, "utf8"),
]);

const official = summarize(officialDocument);
const corrected = summarize(correctedDocument);
const metadataPayload = JSON.parse(metadataText);
const metadataRecords = metadataPayload.meshes || metadataPayload.nodes;
const metadata = new Map(metadataRecords.map((record) => [record.meshName || record.name, record]));
const correctedToSource = new Map(
  [...IDENTITY_CORRECTIONS].map(([sourceStem, correctedStem]) => [correctedStem, sourceStem]),
);
const issues = [];
let maxBboxDifferenceMm = 0;

if (officialSha256 !== EXPECTED_OFFICIAL_SHA256) {
  issues.push(`official-sha256:${officialSha256}`);
}
if (official.nodes.length !== corrected.nodes.length) issues.push("node-count");
if (official.meshes.length !== corrected.meshes.length) issues.push("mesh-count");
if (metadata.size !== corrected.records.size) issues.push("metadata-count");

for (const [correctedName, candidate] of corrected.records) {
  const match = /^Allen_(.+)_([LR])$/.exec(correctedName);
  const correctedStem = match?.[1];
  const side = match?.[2];
  const sourceStem = correctedToSource.get(correctedStem) || correctedStem;
  const sourceName = side ? `Allen_${sourceStem}_${side}` : correctedName;
  const source = official.records.get(sourceName);
  const semanticSource = official.records.get(correctedName);
  const metadataRecord = metadata.get(correctedName);

  if (!source || !semanticSource || !metadataRecord) {
    issues.push(`${correctedName}:missing-reference`);
    continue;
  }
  if (candidate.meshName !== correctedName) issues.push(`${correctedName}:mesh-name`);
  if (candidate.triangles !== source.triangles) issues.push(`${correctedName}:triangles`);
  const difference = bboxDifferenceMm(candidate.bbox, source.bbox);
  maxBboxDifferenceMm = Math.max(maxBboxDifferenceMm, difference);
  if (difference > BBOX_LIMIT_MM) issues.push(`${correctedName}:bbox:${difference.toFixed(6)}`);
  if (!isDeepStrictEqual(semanticExtras(candidate.extras), semanticSource.extras)) {
    issues.push(`${correctedName}:semantic-extras`);
  }
  if (metadataRecord.triangleCount !== candidate.triangles) {
    issues.push(`${correctedName}:metadata-triangles`);
  }

  if (correctedToSource.has(correctedStem)) {
    const atlasId = ATLAS_IDS.get(correctedStem);
    if (candidate.extras.identity_corrected_from !== sourceName) {
      issues.push(`${correctedName}:correction-source`);
    }
    if (candidate.extras.allen_annotation_id !== atlasId) {
      issues.push(`${correctedName}:atlas-id`);
    }
    if (metadataRecord.extras?.identityCorrectedFrom !== sourceName) {
      issues.push(`${correctedName}:metadata-correction-source`);
    }
    if (metadataRecord.extras?.allenAnnotationId !== atlasId) {
      issues.push(`${correctedName}:metadata-atlas-id`);
    }
    if (metadataRecord.extras?.originalNodeIndex !== source.nodeIndex) {
      issues.push(`${correctedName}:metadata-node-index`);
    }
    if (metadataRecord.extras?.originalMeshIndex !== source.meshIndex) {
      issues.push(`${correctedName}:metadata-mesh-index`);
    }
  }
}

const pass = issues.length === 0;
console.log(JSON.stringify({
  pass,
  officialSha256,
  correctedMeshes: corrected.records.size,
  metadataRecords: metadata.size,
  correctedIdentities: IDENTITY_CORRECTIONS.size * 2,
  bboxLimitMm: BBOX_LIMIT_MM,
  maxBboxDifferenceMm,
  issues,
}, null, 2));
if (!pass) process.exitCode = 1;
