export const MRI_SLICE_COUNT = 56;

export const MRI_TOUR_STOPS = [
  {
    slice: 8,
    title: "Face & frontal pole",
    note: "At the most anterior edge, the frontal cortex appears as separated islands before the hemispheres widen."
  },
  {
    slice: 20,
    title: "Frontal lobes",
    note: "The cerebral hemispheres broaden. Pale white matter gathers beneath a darker cortical ribbon and the frontal horns begin to appear."
  },
  {
    slice: 32,
    title: "Deep nuclei",
    note: "Near the brain’s central axis, the thalamus and basal ganglia sit around the ventricular spaces beneath the cerebral mantle."
  },
  {
    slice: 43,
    title: "Temporal memory",
    note: "The medial temporal lobe brings the hippocampal formation into view while the posterior cortex continues to taper around it."
  },
  {
    slice: 55,
    title: "Posterior fossa",
    note: "The occipital lobes recede and the folded cerebellum becomes a dominant structure behind the brainstem."
  }
];

export const ATLAS_GROUPS = {
  cortex: {
    name: "Cerebral cortex",
    detail: "Outer gray-matter mantle",
    color: "#d9786a"
  },
  "white-matter": {
    name: "White matter",
    detail: "Long-range fibre pathways",
    color: "#e4d7b5"
  },
  ventricles: {
    name: "Ventricular system",
    detail: "CSF-filled internal spaces",
    color: "#69a9d1"
  },
  thalamus: {
    name: "Thalamus & diencephalon",
    detail: "Deep relay and regulatory nuclei",
    color: "#70a9a1"
  },
  limbic: {
    name: "Limbic structures",
    detail: "Memory and affective circuitry",
    color: "#c18bc7"
  },
  "basal-ganglia": {
    name: "Basal ganglia",
    detail: "Action-selection nuclei",
    color: "#e1ad59"
  },
  cerebellum: {
    name: "Cerebellum",
    detail: "Coordination and prediction",
    color: "#b98d9f"
  },
  brainstem: {
    name: "Brainstem",
    detail: "Midbrain, pons, and medulla",
    color: "#89a86b"
  }
};

export const MRI_LANDMARK_STYLES = {
  "cerebral-cortex": { group: "cortex", color: ATLAS_GROUPS.cortex.color },
  "cerebral-white-matter": { group: "white-matter", color: ATLAS_GROUPS["white-matter"].color },
  "ventricular-system": { group: "ventricles", color: ATLAS_GROUPS.ventricles.color },
  thalamus: { group: "thalamus", color: ATLAS_GROUPS.thalamus.color },
  hippocampus: { group: "limbic", color: ATLAS_GROUPS.limbic.color },
  amygdala: { group: "limbic", color: "#d9786a" },
  caudate: { group: "basal-ganglia", color: ATLAS_GROUPS["basal-ganglia"].color },
  putamen: { group: "basal-ganglia", color: "#c69045" },
  cerebellum: { group: "cerebellum", color: ATLAS_GROUPS.cerebellum.color },
  brainstem: { group: "brainstem", color: ATLAS_GROUPS.brainstem.color }
};

export const ANATOMY_SYSTEMS = [
  {
    id: "cortex",
    name: "Cerebral cortex",
    detail: "Gyri and cortical regions",
    color: ATLAS_GROUPS.cortex.color,
    keywords: [
      "gyrus", "lobule", "cortex", "insula", "operculum", "cuneus", "precuneus", "paracentral",
      "occipital", "frontal", "parietal", "temporal", "fusiform", "lingual", "calcarine"
    ]
  },
  {
    id: "white-matter",
    name: "White matter",
    detail: "Forebrain and hindbrain fibres",
    color: ATLAS_GROUPS["white-matter"].color,
    keywords: ["white_matter", "corpus_callosum", "commissure", "fornix", "capsule", "radiation", "fascicul"]
  },
  {
    id: "basal-ganglia",
    name: "Basal ganglia",
    detail: "Caudate, putamen, pallidum",
    color: ATLAS_GROUPS["basal-ganglia"].color,
    keywords: ["caudate", "putamen", "pallid", "striat", "accumbens", "claustrum", "substantia_nigra", "subthalamic"]
  },
  {
    id: "thalamus",
    name: "Diencephalon",
    detail: "Thalamic and hypothalamic nuclei",
    color: ATLAS_GROUPS.thalamus.color,
    keywords: ["thalam", "hypothalam", "geniculate", "habenula", "mammillary", "epithalam"]
  },
  {
    id: "limbic",
    name: "Limbic structures",
    detail: "Hippocampus and amygdala",
    color: ATLAS_GROUPS.limbic.color,
    keywords: ["hippocamp", "amygdal", "subiculum", "entorhinal", "parahippocamp", "septal", "cingulate", "dentate"]
  },
  {
    id: "ventricles",
    name: "Ventricles & CSF",
    detail: "Internal fluid spaces",
    color: ATLAS_GROUPS.ventricles.color,
    keywords: ["ventricle", "aqueduct", "central_canal", "choroid", "cerebrospinal"]
  },
  {
    id: "cerebellum",
    name: "Cerebellum",
    detail: "Cortex, nuclei, and vermis",
    color: ATLAS_GROUPS.cerebellum.color,
    keywords: ["cerebell", "vermis", "dentate_nucleus", "fastigial", "emboliform", "globose"]
  },
  {
    id: "brainstem",
    name: "Brainstem & cranial",
    detail: "Midbrain, pons, medulla, nerves",
    color: ATLAS_GROUPS.brainstem.color,
    keywords: [
      "midbrain", "pons", "pontine", "medulla", "colliculus", "red_nucleus", "periaqueductal", "tegment",
      "olive", "olivary", "raphe", "reticular", "cranial", "optic", "vestibular", "cochlear", "solitary"
    ]
  }
];

const ANATOMY_OVERRIDES = new Map([
  ["VH_M_forebrain_L", "white-matter"],
  ["VH_M_forebrain_R", "white-matter"],
  ["VH_M_hindbrain_L", "brainstem"],
  ["VH_M_hindbrain_R", "brainstem"]
]);

export function classifyAnatomyMesh(name, metadata = {}) {
  if (metadata.system && ANATOMY_SYSTEMS.some((system) => system.id === metadata.system)) return metadata.system;
  if (ANATOMY_OVERRIDES.has(name)) return ANATOMY_OVERRIDES.get(name);
  const value = `${name} ${metadata.label || ""}`.toLowerCase();
  return ANATOMY_SYSTEMS.find((system) => system.keywords.some((keyword) => value.includes(keyword)))?.id || "brainstem";
}

export function cleanAnatomyName(rawName, explicitLabel) {
  if (explicitLabel && typeof explicitLabel === "string") return explicitLabel;
  return rawName
    .replace(/^VH_M_/, "")
    .replace(/_([LR])$/, (_, side) => ` · ${side === "L" ? "left" : "right"}`)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function anatomySide(rawName) {
  if (/_L$/.test(rawName)) return "left";
  if (/_R$/.test(rawName)) return "right";
  return "midline";
}

export function getSystem(id) {
  return ANATOMY_SYSTEMS.find((system) => system.id === id) || ANATOMY_SYSTEMS.at(-1);
}
