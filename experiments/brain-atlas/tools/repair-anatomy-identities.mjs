import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import {
  ATLAS_IDS,
  EXPECTED_OFFICIAL_SHA256,
  IDENTITY_CORRECTIONS,
} from "./anatomy-identity-correction.mjs";

const [sourcePath, outputPath, metadataPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error(
    "Usage: node repair-anatomy-identities.mjs SOURCE.glb OUTPUT.glb [NODES.json]",
  );
}

function sha256(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex").toUpperCase()));
  });
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);

const sourceSha256 = await sha256(sourcePath);
if (sourceSha256 !== EXPECTED_OFFICIAL_SHA256) {
  throw new Error(
    `Identity repair only supports the audited NIH source (${EXPECTED_OFFICIAL_SHA256}); received ${sourceSha256}.`,
  );
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
const document = await io.read(sourcePath);
const nodes = document.getRoot().listNodes();
const corrected = [];

for (const side of ["L", "R"]) {
  const staged = [];
  const semanticExtrasByName = new Map();
  for (const correctedStem of IDENTITY_CORRECTIONS.values()) {
    const correctedName = `Allen_${correctedStem}_${side}`;
    const semanticNode = nodes.find((candidate) => candidate.getName() === correctedName);
    if (!semanticNode?.getMesh()) {
      throw new Error(`Expected semantic source node named ${correctedName}.`);
    }
    semanticExtrasByName.set(correctedName, semanticNode.getExtras());
  }
  for (const [sourceStem, correctedStem] of IDENTITY_CORRECTIONS) {
    const sourceName = `Allen_${sourceStem}_${side}`;
    const node = nodes.find((candidate) => candidate.getName() === sourceName);
    if (!node?.getMesh()) {
      throw new Error(`Expected one mesh node named ${sourceName}.`);
    }
    const temporaryName = `__identity_repair_${correctedStem}_${side}`;
    const sourceMeshName = node.getMesh().getName();
    node.setName(temporaryName);
    node.getMesh().setName(temporaryName);
    staged.push({
      node,
      sourceName,
      sourceMeshName,
      correctedName: `Allen_${correctedStem}_${side}`,
      correctedStem,
    });
  }

  for (const item of staged) {
    const semanticExtras = semanticExtrasByName.get(item.correctedName);
    item.node.setName(item.correctedName);
    item.node.getMesh().setName(item.correctedName);
    item.node.setExtras({
      ...semanticExtras,
      identity_corrected_from: item.sourceName,
      allen_annotation_id: ATLAS_IDS.get(item.correctedStem),
    });
    corrected.push({
      side,
      sourceName: item.sourceName,
      sourceMeshName: item.sourceMeshName,
      correctedName: item.correctedName,
      atlasId: ATLAS_IDS.get(item.correctedStem),
    });
  }
}

const meshNodes = nodes.filter((node) => node.getMesh());
const names = meshNodes.map((node) => node.getName());
if (new Set(names).size !== names.length) {
  throw new Error("Identity repair produced duplicate mesh-node names.");
}
if (corrected.length !== IDENTITY_CORRECTIONS.size * 2) {
  throw new Error(`Expected 16 identity corrections, found ${corrected.length}.`);
}

await io.write(outputPath, document);

if (metadataPath) {
  const payload = JSON.parse(await readFile(metadataPath, "utf8"));
  const records = payload.meshes || payload.nodes;
  if (!Array.isArray(records)) {
    throw new Error("Anatomy metadata must contain a meshes or nodes array.");
  }
  const byName = new Map(records.map((record) => [record.meshName || record.name, record]));
  const physicalByName = new Map(records.map((record) => [record.meshName || record.name, {
    triangleCount: record.triangleCount,
    originalMeshIndex: record.extras?.originalMeshIndex,
    originalNodeIndex: record.extras?.originalNodeIndex,
  }]));

  for (const { sourceName, correctedName, atlasId } of corrected) {
    const physicalRecord = physicalByName.get(sourceName);
    const semanticRecord = byName.get(correctedName);
    if (!physicalRecord || !semanticRecord) {
      throw new Error(`Missing metadata for ${sourceName} or ${correctedName}.`);
    }
    semanticRecord.triangleCount = physicalRecord.triangleCount;
    semanticRecord.extras = {
      ...semanticRecord.extras,
      originalMeshIndex: physicalRecord.originalMeshIndex,
      originalNodeIndex: physicalRecord.originalNodeIndex,
      identityCorrectedFrom: sourceName,
      allenAnnotationId: atlasId,
    };
  }

  payload.source.identityCorrection = {
    reason: "NIH/HRA GLB node-name permutation checked against the Allen 2020 annotation volume",
    allenAnnotation: "annotation_full.nii.gz, version 1.0.0",
    correctedMeshCount: corrected.length,
    correctionMap: Object.fromEntries(IDENTITY_CORRECTIONS),
  };
  await writeFile(metadataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  sourcePath,
  sourceSha256,
  outputPath,
  metadataPath: metadataPath || null,
  correctedMeshCount: corrected.length,
  corrected,
}, null, 2));
