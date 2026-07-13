import { stat } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getGLPrimitiveCount, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error("Usage: node build-hq-anatomy.mjs SOURCE.glb OUTPUT.glb");
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
const document = await io.read(sourcePath);
const root = document.getRoot();

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
}, null, 2));
