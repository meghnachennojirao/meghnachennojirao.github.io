# Brain, Layer by Layer — data provenance

This page is an educational atlas. It is not a diagnostic viewer and must not be used to interpret an individual MRI.

## Coronal MRI passage

The grayscale slices come from the **MNI-ICBM 152 nonlinear symmetric template, version 2009c**, a population-average T1-weighted reference built from the MNI152 normal-population database. Anatomical contours come from **CerebrA**, a 102-label atlas registered to that same 1 mm template grid and manually corrected.

- Template: MNI152NLin2009cSym, 1 mm, shape `193 × 229 × 193`, RAS orientation.
- Atlas: CerebrA, 51 structure classes per hemisphere / 102 integer labels.
- Template citation: Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. *Unbiased average age-appropriate atlases for pediatric studies*. NeuroImage 54(1), 2011. DOI: [10.1016/j.neuroimage.2010.07.033](https://doi.org/10.1016/j.neuroimage.2010.07.033).
- Atlas citation: Manera AL, Dadar M, Fonov V, Collins DL. *CerebrA, registration and manual label correction of Mindboggle-101 atlas for MNI-ICBM152 template*. Scientific Data 7:237, 2020. DOI: [10.1038/s41597-020-0557-9](https://doi.org/10.1038/s41597-020-0557-9).
- Distribution source: [TemplateFlow](https://www.templateflow.org/). TemplateFlow citation: Ciric R et al. *TemplateFlow: FAIR-sharing of multi-scale, multi-species brain models*. Nature Methods 19, 2022. DOI: [10.1038/s41592-022-01681-2](https://doi.org/10.1038/s41592-022-01681-2).
- Official references: [MNI ICBM152](https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009), [CerebrA](https://nist.mni.mcgill.ca/cerebra/).

### Web derivative

The source volume is displayed from in front of the subject: anatomical right appears at image left, and anatomical left appears at image right. Fifty-six anterior-to-posterior coronal samples cover MNI `y = +73 mm` through `y = −106 mm`. Grayscale images are 384 × 384 WebP files windowed from the source T1 volume (`1–90`, gamma `0.88`).

The colored layer contains simplified vector contours, not recolored MRI signal. It highlights:

- cerebral cortex — union of CerebrA’s 62 mapped cortical/gyral parcels;
- cerebral white matter — the co-registered MNI2009c symmetric white-matter probability segmentation thresholded at `0.5`, excluding CerebrA cerebellum/brainstem labels and split at MNI `x = 0`;
- ventricles, thalamus, hippocampus, amygdala, caudate, putamen, brainstem, and cerebellum — unions of the exact CerebrA label IDs listed in `assets/mri/manifest.json`.

The MNI permission notice is retained at `assets/mri/LICENSE-MNI.txt`. CerebrA is released under CC0 1.0, but this combined derivative must not be described as CC0 alone because the MNI notice also applies.

## Removable 3D anatomy

The assembly view is adapted from the **Human Reference Atlas brain, male v1.3**, NIH 3D accession **3DPX-020960**. NIH states that its 141 anatomical structures originate in the Allen Human Reference Atlas—3D, 2020; one annotated hemisphere was mirrored to form a whole brain and resized to the Visible Human reference body.

- NIH 3D record: [3DPX-020960](https://3d.nih.gov/entries/20960).
- Human Reference Atlas object: [Brain, male v1.3](https://purl.humanatlas.io/ref-organ/brain-male/v1.3).
- Allen dataset: Ding S-L, Royall JJ, Sunkin SM, Facer BAC, Lesnar P, Bernard A, Ng L, Lein ES. *Allen Human Reference Atlas – 3D, 2020*, RRID:SCR_017764, version 1.0.0.
- Atlas ontology publication: Ding S-L et al. *Comprehensive cellular-resolution atlas of the adult human brain*. Journal of Comparative Neurology 524(16), 2016. DOI: [10.1002/cne.24080](https://doi.org/10.1002/cne.24080).
- License: **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

### Web derivative

The [official NIH 3D download](https://3d.nih.gov/entries/download/20960/1) contains 283 independently named meshes (141 left/right pairs plus the optic chiasm), 324,855 vertices, and 656,268 triangles. The audited source file is `3d-vh-m-allen-brain.glb`, 11,977,312 bytes, SHA-256 `2B9AD5B53E40E9F0936DA74F7BE38D2EED15604E26358C3870A0EA13499B9A35`.

The lossless identity-corrected source has SHA-256 `BE7681648288E1C27627800393468ADF8D8A49942BE78F337E3AEAEE437CF9BE`. Its web derivatives retain all 283 physical meshes and every semantic node-extra field:

- `brain-hq.glb`: Meshopt-compressed, 656,268 triangles, 3,504,648 bytes, SHA-256 `C7C1855A5C2A04B12998FE4DF68FF2AB2C9E287C69D02C9A2FC55CF1114D31F1`;
- `brain-mobile.glb`: Meshopt-compressed and selectively simplified, 384,174 triangles, 2,304,104 bytes, SHA-256 `C274A427CBE509C8641CB170AFE672E83DFD16EC11F0BD502FD1E9A78E75FEB0`.

The browser chooses a tier from viewport, pointer, reported memory, and logical core hints; the user can override it in Performance settings. Geometry is regrouped into an educational eight-system color taxonomy after the identity audit described below. The interface exposes 276 logical structures: genuinely midline structures that the source stores as mirrored left/right facets are selected, hidden, and restored together. The underlying 283 meshes remain intact. `assets/anatomy/nodes.json` records corrected names, side, Allen annotation ID, source-name provenance, triangle count, visualization group, classification rationale, and review flags.

### Mesh-identity audit and correction

The NIH/HRA file's vertices are sound, but eight node names are cyclically attached to the neighboring Allen label geometry on both mirrored sides. This was checked against Allen's official 0.5 mm [`annotation_full.nii.gz`](https://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/annotation_full.nii.gz), SHA-256 `2B05581E39C44F2623D9B0A69F64E3DF0823C20D054ABEF92973812313335`, and the official [voxel-count/structure-ID table](https://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/examples/voxel_count/voxel_count.csv).

The repair changes node and mesh identities, not vertices. For each hemisphere, the source name maps to the anatomical identity of its attached geometry as follows:

| NIH/HRA source name | Correct Allen geometry identity |
| --- | --- |
| optic radiation | posteroventral putamen |
| posteroventral putamen | paracingulate gyrus |
| atrium of lateral ventricle | rostral gyrus |
| paracingulate gyrus | frontomarginal gyrus |
| rostral gyrus | frontal pole |
| frontomarginal gyrus | perirhinal gyrus, rostral part |
| frontal pole | optic radiation |
| perirhinal gyrus, rostral part | atrium of lateral ventricle |

A single affine relating the official Allen masks to the HRA object reproduced all 16 corrected left/right mesh centroids within `0.070 mm`; pairing geometry by the uncorrected names missed by `26.0–117.2 mm`. Corrected GLB-to-Allen volume ratios were consistently `0.779–0.831`, providing a second independent check. Semantic metadata moves with the corrected identity—for example, the optic-radiation UBERON fields now accompany the deep posterior white-matter geometry.

The audit then matched all 141 annotated Allen labels to the repaired lossless GLB and checked 282 left/right volume centroids. Of 268 exact normalized-name comparisons, the median error was `0.040 mm`, `98.5%` were within `1 mm`, and the maximum was `1.810 mm`; seven separately resolved naming synonyms were within `0.031–0.282 mm`. No other gross mesh-identity permutation was found.

Allen annotation ID `146034872` places the paracingulate gyrus on the medial/dorsal frontal wall (MNI bounding box `x = −16…+16`, `y = −16.5…+57.5`, `z = −11.5…+58 mm`). ID `146034876` places the rostral gyrus on the anteroinferior medial wall (`x = −13.5…+13.5`, `y = +15.5…+55`, `z = −21…−6 mm`). From a straight anterior view, either can expose only a small midline sliver; a broad frontal patch is anatomically inconsistent with these source masks.

### Anatomical interpretation

- Paracingulate gyrus is grouped with cerebral cortex. It is a variable medial-frontal gyrus between the cingulate and paracingulate sulci and may be asymmetric or absent in an individual brain, consistent with the MRI morphology study by [Paus et al. (1996)](https://doi.org/10.1093/cercor/6.2.207). Its bilateral symmetry here is a property of the mirrored Allen/HRA reference model, not a population claim.
- “Rostral gyrus” is displayed as **Rostral gyrus — Allen combined medial frontal parcel**. The [HRA-subset UBERON term UBERON:0019280](https://amigo.geneontology.org/amigo/term/UBERON%3A0019280?relation=isa_partof) relates the inferior and superior rostral gyri as component terms. This legacy Allen aggregate is not the rostral part of the cingulate gyrus; current common-terminology guidance favors describing its inferomedial frontal landmarks explicitly. See [ten Donkelaar et al. (2018)](https://doi.org/10.3389/fnana.2018.00093).
- Hypothalamic and pretectal regions are grouped with diencephalon. The preoptic region keeps a review flag because formal developmental terminology commonly places it in telencephalic subpallium even though the Allen source hierarchy presents it with the hypothalamic parcels.
- Corpus callosum, pineal body, third and fourth ventricles, cerebral aqueduct, central canal, and cerebellar vermis are presented as midline logical structures. Their left/right source facets are never shown as two independent anatomical organs.

### Reproducible identity repair and builds

The pinned rebuild and verification programs live in `tools/`. From that directory, run `npm ci`, then:

```text
node repair-anatomy-identities.mjs OFFICIAL.glb CORRECTED.glb ../assets/anatomy/nodes.json
node build-hq-anatomy.mjs CORRECTED.glb ../assets/anatomy/brain-hq.glb
node build-mobile-anatomy.mjs CORRECTED.glb ../assets/anatomy/brain-mobile.glb
node verify-anatomy-identities.mjs OFFICIAL.glb ../assets/anatomy/brain-hq.glb ../assets/anatomy/nodes.json
node verify-mobile-anatomy.mjs CORRECTED.glb ../assets/anatomy/brain-mobile.glb
```

The identity repair accepts only the audited official source SHA-256, performs a collision-safe bilateral rename, transfers semantic extras, records the Allen annotation IDs, and updates the metadata manifest. The builds use glTF-Transform 4.4.1 and meshoptimizer 1.0.1. The mobile build simplifies to a 0.55 ratio with a 0.005 error target, then applies high-level Meshopt compression with 14-bit per-mesh position quantization. A one-ring lock protects the extrema of both forebrain-white-matter and amygdaloid-complex meshes, correcting the multi-millimetre extent loss in the previous mobile derivative.

Identity verification checks all 283 HQ meshes against the intended official-source geometry, all semantic extras, all 16 corrected annotation IDs/source names, and every metadata triangle count/index; its maximum HQ bounding-box difference is `0.00604 mm`. Mobile verification requires all 286 named nodes, all 283 mesh nodes, every node `extras` object, and valid primitives to remain unchanged from the corrected lossless source; at most 385,000 triangles and 2,310,000 bytes; no bounding-box face more than 0.25 mm from source; and no protected face more than 0.01 mm from source. This build passes with a `0.22671 mm` worst-case face difference overall and `0.00604 mm` across the protected meshes. Khronos glTF Validator reports zero errors and zero warnings (apart from informational notices for Meshopt compression and its fallback buffer).

Suggested attribution: “Brain model adapted from the Allen Human Reference Atlas–3D 2020 / HRA brain v1.3, NIH 3D accession 3DPX-020960, licensed CC BY 4.0. Geometry simplified, regrouped, and recolored for interactive web display.”

## Limits

- Both views are reference atlases, not an individual scan.
- The MRI is deliberately symmetric and does not represent normal left/right anatomical variation.
- Atlas boundaries are estimates and vary across individuals and parcellation methods.
- The slice atlas and removable model are related reference resources but not the same parcellation; the interface presents them as separate views and does not claim voxel-to-mesh alignment.
- Small HRA structures have uneven source mesh resolution. Visual smoothness must not be interpreted as diagnostic precision.

## Rendering

The interactive views use [Three.js](https://threejs.org/) r185 under the MIT license. Rendering is event-driven while idle, pixel density is capped, shadows and post-processing are omitted, MRI texture loading is local and lazy, and the anatomy model is loaded only when its view is opened. Motion honors `prefers-reduced-motion` and can be disabled manually.
