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

The original GLB contains 283 independently named meshes (141 left/right pairs plus the optic chiasm), 324,855 vertices, and 656,268 triangles. Two local derivatives preserve every named mesh and source node metadata:

- `brain-hq.glb`: Meshopt-compressed, 656,268 triangles, approximately 3.5 MB;
- `brain-mobile.glb`: Meshopt-compressed and simplified, 384,036 triangles, approximately 2.3 MB.

The browser chooses a tier from viewport, pointer, reported memory, and logical core hints; the user can override it in Performance settings. Geometry is regrouped into an educational eight-system color taxonomy without replacing or modifying the source names. Every source mesh remains independently selectable and hideable. `assets/anatomy/nodes.json` records source names, side, triangle count, visualization group, classification rationale, and review flags.

Suggested attribution: “Brain model adapted from the Allen Human Reference Atlas–3D 2020 / HRA brain v1.3, NIH 3D accession 3DPX-020960, licensed CC BY 4.0. Geometry simplified, regrouped, and recolored for interactive web display.”

## Limits

- Both views are reference atlases, not an individual scan.
- The MRI is deliberately symmetric and does not represent normal left/right anatomical variation.
- Atlas boundaries are estimates and vary across individuals and parcellation methods.
- The slice atlas and removable model are related reference resources but not the same parcellation; the interface presents them as separate views and does not claim voxel-to-mesh alignment.
- Small HRA structures have uneven source mesh resolution. Visual smoothness must not be interpreted as diagnostic precision.

## Rendering

The interactive views use [Three.js](https://threejs.org/) r185 under the MIT license. Rendering is event-driven while idle, pixel density is capped, shadows and post-processing are omitted, MRI texture loading is local and lazy, and the anatomy model is loaded only when its view is opened. Motion honors `prefers-reduced-motion` and can be disabled manually.
