# Minimal, game-like browser visualization plan for SN–FPN–DMN switching in schizophrenia

A browser-first visualization of SN–FPN–DMN switching in schizophrenia is feasible if you treat the browser as a **playback + inquiry console** (rendering & interaction) and do the heavy lifting **offline** (preprocessing, parcellation, dynamic FC, state modeling, summary metrics). The core scientific target is the triple-network model in which the salience network (SN)—anchored in the anterior insula and dorsal anterior cingulate—supports context-appropriate switching between the frontoparietal network (FPN) and default mode network (DMN), and schizophrenia is associated with dysregulated *dynamic* SN-centered interactions that relate to symptom severity. citeturn29view2turn30view0

## Research goal and minimal viable approach

The integrative triple-network framing you want to visualize is explicitly about **time-varying circuit dynamics**: the SN is hypothesized to “switch” engagement/disengagement of FPN and DMN, and schizophrenia is described as having altered dynamic temporal interactions among these networks. citeturn29view2turn30view0

A concrete, minimal operationalization (that’s easy to ship to a browser) is:

1. Reduce each subject’s rs-fMRI into **ROI time series** with an atlas that includes clear DMN / FPN / SN labels.
2. Convert ROI time series into (a) **static FC** and (b) **sliding-window dynamic FC**.
3. Fit a **state model** (k-means on windowed FC features, and optionally an HMM later), yielding a **state label sequence** per subject.
4. Compute switching metrics (dwell time, transition entropy, state counts, SN-centered interaction index) and store them in browser-loadable formats.
5. Build UI “levels” that progressively reveal complexity (from a mocked state machine → real cohorts → dynamic states → optional EEG/MEG overlay → exploratory analytics). citeturn30view0turn33search0

This aligns directly with the review’s Figure-4-style narrative: schizophrenia shows **more states**, **shorter mean lifetimes**, **more variable SN-centered interaction**, and these dynamics correlate with positive symptoms in their reported cohort analysis. citeturn30view0

## Public datasets and download links

The plan below uses one rs-fMRI dataset reachable through SchizConnect (COBRE), one rs-fMRI dataset packaged on OpenNeuro (ds000030), and one optional EEG/MEG dataset that already contains symptom and cognitive scales in a “phenotype” directory (ds003944). citeturn3view3turn3view0turn4view0turn10view0turn26view0

### Dataset table

| Dataset | Where to get it | Modalities (relevant here) | Sample size notes | Symptom / clinical metadata notes |
|---|---|---|---|---|
| COBRE (Center for Biomedical Research Excellence) | SchizConnect query builder (federated) and NITRC mirror | rs-fMRI + T1 (plus phenotypic table) | NITRC summary reports **72 schizophrenia** and **75 controls**; rs-fMRI + T1 released per participant. citeturn3view0 | NITRC summary explicitly includes “phenotypic data…including…diagnostic information”; SchizConnect/COINS workflows attach additional assessments depending on what you query. citeturn3view0turn19view0 |
| ds000030 (UCLA Consortium for Neuropsychiatric Phenomics LA5c) | OpenNeuro (and OpenNeuroDatasets GitHub mirror) | rs-fMRI (with physio), T1, diffusion + tasks | OpenfMRI/OpenNeuro legacy page reports **273 total** with **58 schizophrenia**, **49 bipolar**, **45 ADHD**, **138 controls**. citeturn4view0 | The dataset’s `phenotype/` directory contains symptom scales and clinical measures including **BPRS**, **SANS**, **SAPS**, **SCID**, and medication-related files. citeturn26view0 |
| ds003944 (optional EEG/MEG) “First Episode Psychosis vs Control Resting Task 1” | OpenNeuro (and OpenNeuroDatasets GitHub mirror) | Resting EEG (+ MEG mentioned in dataset README) | The dataset’s `participants.tsv` file page shows **83 lines** in the participants table (practically: ~82 participants + header; exact count depends on QC / inclusion). citeturn15view0turn16view0 | README states a `phenotype` directory with clinical, cognitive, and medication measures including **BPRS**, **SANS**, **SAPS**, **GAF/GAS**, **MATRICS**, **WASI**, and chlorpromazine-equivalent medication. citeturn12view0turn11view0 |

### Exact download links (copy/paste)

**SchizConnect portal (query + download)**
```text
https://schizconnect.org/
https://schizconnect.org/data
https://schizconnect.org/documentation/introduction
```
SchizConnect is described as a “search-and-download virtual database,” but note the portal currently warns that several sources are down and that results may come only from COINS. citeturn3view3turn19view0

**COBRE (NITRC dataset landing page + files)**
```text
https://fcon_1000.projects.nitrc.org/indi/retro/cobre.html
```
The NITRC landing page lists the released rs-fMRI/T1 plus phenotypic CSVs and indicates NITRC account-based access requirements and licensing. citeturn3view0turn20view0

**OpenNeuro rs-fMRI example: ds000030**
```text
https://openneuro.org/datasets/ds000030
https://github.com/OpenNeuroDatasets/ds000030
https://openfmri.org/dataset/ds000030/
```
The legacy OpenfMRI page provides an immediately readable snapshot of sample composition and modalities, and the OpenNeuroDatasets GitHub mirror is a standard route for DataLad-based downloads. citeturn4view0turn10view3turn10view2

**Optional EEG/MEG: ds003944**
```text
https://openneuro.org/datasets/ds003944
https://github.com/OpenNeuroDatasets/ds003944
```
The OpenNeuroDatasets GitHub mirror is particularly useful because it exposes `participants.tsv` and `phenotype/` without needing the OpenNeuro web UI to behave nicely. citeturn10view0turn15view0turn10view3

**DataLad (recommended download mechanism for OpenNeuro)**
The DataLad handbook documents cloning OpenNeuro datasets from the GitHub mirrors and (optionally) via the `///openneuro/` superdataset. citeturn10view3

## Preprocessing and derivative outputs

Your browser app will be dramatically simpler if every subject becomes a small bundle of: **ROI time series**, **static FC**, **dynamic FC**, **state labels**, and a **symptom row**. The “boss fights” here are (a) BIDS harmonization (especially if starting from DICOM) and (b) motion + denoising consistency across cohorts.

### Tooling assumption

Use BIDS-compatible pipelines so the output directory is consistent and shareable:

- fMRIPrep for core anatomical + functional preprocessing; its outputs are designed to conform to BIDS Derivatives. citeturn28search0turn34search2  
- XCP-D (optional but very practical) for resting-state postprocessing, producing denoised BOLD, parcellated time series, and connectivity matrices. citeturn28search4turn28search2  

Even if you later compute the “game metrics” yourself, starting from fMRIPrep + (optionally) XCP-D keeps your steps reproducible and audit-friendly. citeturn28search0turn34search5

### Atlas choice for ROI time series

Pick an atlas that already tags parcels by canonical networks so DMN/FPN/SN slices are direct.

A clean default is **Schaefer 2018** parcellation with **7-network labeling (Yeo)**, because each ROI is annotated with a network label and you can map:
- DMN → “Default”
- FPN → “Control” (often treated as central executive / frontoparietal control)
- SN → “Salience/Ventral Attention” (naming varies across releases; the intent is the salience/ventral-attention family) citeturn28search7turn28search3

### Exactly what derivatives to produce

The following is a precise “derivatives contract” you can implement regardless of whether the upstream is COBRE or ds000030.

1. **Preprocessed BOLD + confounds**  
   Run fMRIPrep and retain:
   - preprocessed BOLD in a standard space (e.g., MNI)  
   - confounds time series (motion, aCompCor, etc.)  
   - QC report for visual checks citeturn28search0

2. **Denoised BOLD (optional but recommended)**  
   Run XCP-D (or your own nuisance regression) to obtain denoised BOLD and/or parcellated outputs. XCP-D explicitly outputs denoised BOLD plus time series and FC matrices as standard products. citeturn28search4turn28search2

3. **ROI time series** (required)  
   Output: `T × R` matrix where `R = 200` (Schaefer 200 as default) and `T` is number of time points after any censoring policy is applied.

4. **Static connectivity** (required)  
   Output: `R × R` Fisher-z correlation matrix (or just the upper triangle vector).

5. **Sliding-window dynamic FC** (required)  
   Output: `W × E` matrix where `W` is number of windows and `E = R(R−1)/2` edges.  
   Use a consistent window length policy; for example, in one triple-network dynamic workflow the window length is derived from TR (they give a concrete example of 39s window length when TR=3s, step=1 TR). citeturn31view1

6. **State labels** (required)  
   Output: `W` labels per subject using either:
   - k-means on windowed FC vectors (fast, interpretable)  
   - HMM later (Level 4) for probabilistic switching

7. **Symptom + covariate CSV** (required)  
   Output: 1 row per subject with diagnosis, age, sex, motion summary, plus symptom scales present in the dataset (e.g., BPRS/SANS/SAPS/SCID and meds). ds000030 and ds003944 explicitly expose many of these as phenotype TSVs / directories. citeturn26view0turn12view0

### Derivative file schema table (browser-oriented)

| File (relative to your app’s `public/data/<study>/`) | Format | Minimal shape | Purpose | Notes |
|---|---|---:|---|---|
| `manifest.json` | JSON | — | Study-wide index | Lists subjects, groups, TR, atlas metadata, available runs; easiest first fetch. (BIDS-style organization recommended.) citeturn34search5turn34search2 |
| `atlas/schaefer200_7net_labels.json` | JSON | `R=200` | ROI → network label | Store `{roi_id, roi_name, network}` to build SN/FPN/DMN subsets. citeturn28search7 |
| `subjects/sub-XXXX/timeseries.f32` | Float32 binary | `T × R` | ROI time series | Pair with `timeseries.json` sidecar containing `{T,R,TR,censoring}`. |
| `subjects/sub-XXXX/static_fc.f32` | Float32 binary | `R × R` | Static FC | Store Fisher-z; browser can render as adjacency or matrix. |
| `subjects/sub-XXXX/dyn_fc.f32` | Float32 binary | `W × E` | Dynamic FC per window | E is upper triangle: `R(R−1)/2`. |
| `subjects/sub-XXXX/state_labels.u8` | Uint8 binary | `W` | State per window | Small, fast, drives animation. |
| `subjects/sub-XXXX/nii_ts.f32` | Float32 binary | `W` | SN-centered interaction index over time | Lets you animate a single “salience dial” quickly. citeturn31view1 |
| `subjects.csv` | CSV | `N × K` | Symptoms + demographics | Use dataset phenotypes (e.g., BPRS/SANS/SAPS/SCID, meds). citeturn26view0turn12view0 |

## Switching models and metrics

This section is the “rules of the game”: what exactly you compute so the UI can visualize switching.

### State estimation methods

**Sliding-window dFC + k-means (Level 2 default)**  
- Compute windowed FC vectors `x_w ∈ ℝ^E` for each time window `w`.
- Concatenate windows across subjects (optionally within group for stability).
- k-means clusters the window vectors into `K` centroids (states).
- Assign each window to nearest centroid → label sequence `s_w ∈ {1..K}`.  
This is conceptually aligned with triple-network dynamic workflows that explicitly use windowed dFC and k-means styles. citeturn31view1turn30view0

**HMM (Level 4 upgrade)**  
HMM becomes useful once you want probabilistic transitions, uncertainty, and principled dwell-time estimation instead of hard labels. Treat it as the “late-game unlock,” not a Day-1 dependency.

### Metrics to compute with formulas / pseudocode

Below, `s_1..s_W` is the window-level state sequence for one subject, `Δt = step_size * TR`, and `K` is #states.

**Dwell time (mean consecutive time in a state)**  
Let runs be maximal consecutive segments where `s_w = k`. If run lengths in windows for state `k` are `L_{k,1..m}`, then:
- `dwell_k = mean(L_{k,*}) * Δt`

Pseudocode:
```python
def dwell_times(labels, K, dt):
    # labels: length W, ints 0..K-1
    runs = {k: [] for k in range(K)}
    cur = labels[0]; L = 1
    for w in range(1, len(labels)):
        if labels[w] == cur:
            L += 1
        else:
            runs[cur].append(L); cur = labels[w]; L = 1
    runs[cur].append(L)
    return {k: (sum(runs[k])/len(runs[k]))*dt if runs[k] else 0.0 for k in range(K)}
```

**State fractional occupancy (FO)**  
- `FO_k = (1/W) * Σ_w 𝟙[s_w = k]`

**Transition counts and transition matrix**  
- `C_{ij} = # of w such that s_w=i and s_{w+1}=j`  
- `P_{ij} = C_{ij} / Σ_j C_{ij}`  (row-normalized, excluding terminal)

**Transition entropy**  
Per-state entropy:
- `H_i = − Σ_j P_{ij} log(P_{ij} + ε)`  
Overall weighted entropy:
- `H = Σ_i FO_i * H_i`

**State count / switching rate**  
- distinct visited states: `|{s_w}|`
- switching rate: `(# of transitions where s_w != s_{w+1}) / ((W−1) * Δt)`

**SN-centered interaction index (NII) over time**  
Use the “network interaction index” definition described as computing Fisher-z SN–CEN edges and subtracting Fisher-z SN–DMN edges (with left/right CEN summed). citeturn31view1

A direct implementation (adapted to SN–FPN–DMN by treating FPN ≈ CEN/control network):

Let `r(A,B,w)` be Pearson correlation between network-average time series of networks `A` and `B` in window `w`. Let `z(r)` be Fisher-z transform.

- `NII(w) = z(r(SN, FPN_L, w)) + z(r(SN, FPN_R, w)) − z(r(SN, DMN, w))` citeturn31view1

If you prefer not to split left/right FPN initially:
- `NII_simple(w) = z(r(SN, FPN, w)) − z(r(SN, DMN, w))` (a minimal approximation that preserves the “SN favors FPN vs DMN” interpretation).

Then compute:
- `meanNII = mean_w NII(w)`
- `varNII = std_w NII(w)`
The review reports that temporal mean and variability of these dynamic NIIs correlate strongly with positive symptoms in their canonical correlation analysis. citeturn30view0

**Why these metrics are worth visualizing**  
They map cleanly onto published schizophrenia dynamic findings: evidence that time-varying connectivity is meaningfully altered in schizophrenia and can be “less dynamically active,” with group differences observable in large samples. citeturn33search0turn30view0

## Browser data package and progressive game-like levels

The browser should never parse NIfTI time series or re-run clustering. Instead, it loads a small manifest + binary arrays and focuses on **interactive narrative**: “What state am I in?”, “How often do I switch?”, “Is SN pulling toward FPN or DMN right now?”, and “Does this relate to symptoms?”.

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["salience network anterior insula dorsal anterior cingulate fMRI map","default mode network brain map","frontoparietal control network brain map","dynamic functional connectivity states brain network animation"],"num_per_query":1}

### Minimal browser-load schema

A workable minimal schema is:

- `manifest.json`  
  - study id, TR, atlas, windowing policy, K, list of subjects, group assignment, links to files
- per-subject binary blobs:
  - `timeseries.f32` (optional to visualize raw ROI traces)
  - `static_fc.f32`
  - `state_labels.u8`
  - `nii_ts.f32` (or `nii_simple.f32`)
- `subjects.csv`
  - merges phenotypes (BPRS/SANS/SAPS/SCID/meds where available) with QC metrics and state summaries citeturn26view0turn12view0turn34search5

### Level-by-level UI features table (your “game progression”)

| Level | Data source | Core UI controls | Expected visuals | What you learn / unblock |
|---|---|---|---|---|
| Level 0 (mock) | Synthetic graph + scripted states | Play/pause, speed, “salience boost” slider, state dropdown | Cytoscape network with edges pulsing by state; simple time bar | Locks down animation model + UI vocabulary before real data. |
| Level 1 (static cohort) | COBRE or ds000030 static FC | Cohort selector, group toggle, threshold slider, SN/FPN/DMN focus toggle | Static connectome & matrix heatmap; group-average diff view | Confirms your atlas mapping + baseline group differences view. |
| Level 2 (dynamic states) | Windowed dFC + k-means labels | Subject picker, time scrubber, autoplay, state legend, “show dwell” | State strip over time; animated connectome; dwell-time bars; NII time series line | The main event: switching behavior & SN-centered interaction dynamics. |
| Level 3 (EEG/MEG overlay) | ds003944 + fMRI-derived state timeline (aligned loosely) | Band selector (alpha/beta/gamma), alignment slider, “couple to fMRI state” toggle | EEG band-power trace + microstate/state markers; side-by-side with fMRI state strip | Adds temporal richness and lets you test cross-modal hypotheses about switching. citeturn12view0turn15view0 |
| Level 4 (exploratory analysis) | All cohorts + symptom CSV | Filters (e.g., high/low symptoms), permutation-test button, export | Scatterplots (NII vs symptoms), group effect size, transition matrix view | Turns the browser into a lightweight hypothesis lab instead of a movie player. citeturn30view0turn33search0 |

### Recommended libraries and minimal code snippets

#### NIfTI / reference maps viewer
Use niivue for in-browser neuroimaging viewing; its docs emphasize loading and rendering NIfTI in a WebGL context, and describe `loadVolumes`/`loadImages` as the convenient loading entry points. citeturn33search9turn33search18

```js
import { Niivue } from "@niivue/niivue";

const nv = new Niivue();           // attach to canvas in your UI init
nv.attachToCanvas(document.getElementById("nvCanvas"));

// Load a background template + an SN mask (or network map)
await nv.loadVolumes([
  { url: "/data/templates/MNI152_T1_1mm.nii.gz", colormap: "gray" },
  { url: "/data/atlas/sn_mask.nii.gz", colormap: "red", opacity: 0.4 }
]);

nv.setSliceType(nv.sliceTypeMultiplanar);
nv.updateGLVolume();
```

#### Network view (connectome)
Use cytoscape.js for the graph; its documentation highlights class-based styling (`addClass`, `removeClass`) which is perfect for “state-based edge emphasis.” citeturn34search0

```js
import cytoscape from "cytoscape";

const cy = cytoscape({
  container: document.getElementById("graph"),
  elements: [
    // nodes: { data:{ id:"roi-001", network:"DMN" } }
    // edges: { data:{ id:"e1", source:"roi-001", target:"roi-002", w:0.12 } }
  ],
  style: [
    { selector: "node", style: { label: "data(id)" } },
    { selector: "edge", style: { width: "mapData(w, -1, 1, 0.5, 6)" } },
    { selector: "edge.active", style: { opacity: 1 } },
    { selector: "edge.inactive", style: { opacity: 0.1 } }
  ]
});

function applyStateEdges(edgeWeightsForState) {
  // edgeWeightsForState: Map edgeId -> weight
  cy.edges().addClass("inactive").removeClass("active");
  for (const [edgeId, w] of edgeWeightsForState.entries()) {
    cy.getElementById(edgeId).data("w", w).addClass("active").removeClass("inactive");
  }
}
```

#### Time-series + animation controls
Plotly’s JavaScript docs describe `Plotly.animate` as the core mechanism to transition traces through states, and reference frames (`addFrames`) for efficient animation sequences. citeturn34search1turn34search4

```js
// Once you've drawn a baseline NII time series:
Plotly.newPlot("niiPlot", [{ x: t, y: nii, mode: "lines" }], {});

// Animate a moving vertical cursor over time (simple approach: update a shape)
function moveCursor(idx) {
  Plotly.relayout("niiPlot", {
    shapes: [{
      type: "line",
      x0: t[idx], x1: t[idx],
      y0: Math.min(...nii), y1: Math.max(...nii)
    }]
  });
}
```

## Validation, statistics, timeline, compute, and prioritized sources

### Validation and analysis steps

Start with “sanity checks,” then move to inference.

1. **QC + exclusions**
   - Visual QC using fMRIPrep reports (per subject) and motion summaries; fMRIPrep explicitly produces QA reports for transparency. citeturn28search0  
   - Establish a single, explicit censoring rule (e.g., FD threshold) and record `n_volumes_kept` per subject in `subjects.csv`.

2. **Internal validity checks**
   - Confirm atlas/network mapping: SN parcels should cluster around insula/dACC hubs conceptually consistent with the triple-network description. citeturn29view2  
   - Confirm that your NII time series behaves sensibly (e.g., shifts sign when SN is more coupled to FPN than DMN vs the opposite), matching the NII definition. citeturn31view1

3. **Primary group comparisons**
   - Two-sample t-tests (or Welch’s t) for:
     - `meanNII`, `varNII`
     - dwell times (overall mean, state-specific)
     - switching rate
     - transition entropy
   - Report effect sizes (Cohen’s d) with confidence intervals.

4. **Permutation tests (recommended)**
   - For each metric, permute group labels (e.g., 10,000 permutations) to obtain p-values robust to non-normality.
   - For transition matrices, use a permutation-based difference of matrices (e.g., Frobenius norm) and compare to null.

5. **Symptom associations**
   - Correlate `meanNII` and `varNII` with symptom scales available in your dataset(s) (e.g., BPRS/SANS/SAPS in ds000030; phenotype scales in ds003944; COBRE diagnostic/phenotypic tables). citeturn26view0turn12view0turn3view0  
   - The review’s Figure 4 specifically reports that temporal mean and variability of dynamic NII correlate strongly with positive symptoms in their canonical correlation analysis, making this a high-value replication target. citeturn30view0

### Expected effects to anchor hypotheses

Two “prior-informed” targets (good for Level 4’s hypothesis panel):

- **Shorter mean lifetimes + altered NII variability**: The review summarizes (adapted from prior work) that schizophrenia shows more states, shorter lifetimes, and intermittently reduced/more variable SN-centered cross-network interaction, with correlations to positive symptoms. citeturn30view0  
- **Reduced dynamism at scale**: A large PLOS ONE analysis reports that time-varying whole-brain connectivity patterns are “markedly less dynamically active” in schizophrenia (N≈151 patients vs N≈163 controls) and links the effect to hallucinatory behavior severity. citeturn33search0turn33search10  

### Timeline and minimal compute envelope

A pragmatic pacing that matches your “levels” idea:

- **Week 1:** Level 0 + data plumbing skeleton (manifest schema, binary loaders, basic network animation).  
- **Week 2:** One real cohort end-to-end (pick ds000030 first because phenotype files are plainly listed; then add COBRE once the download gate is solved). citeturn26view0turn3view0  
- **Week 3:** Level 2 dynamic states + metrics + caching (k-means, dwell, entropy, NII) and first group comparisons. citeturn31view1turn30view0  
- **Week 4:** Level 3 optional EEG/MEG overlay (ds003944) and Level 4 exploratory statistics panel with permutation tests and symptom correlations. citeturn12view0turn15view0  

Compute-wise (rule-of-thumb planning): you can preprocess on a single workstation, but fMRIPrep/XCP-D pipelines are much happier with **multi-core CPU + ≥32–64 GB RAM** for parallel subjects. The browser itself only needs to serve static files (any basic hosting works), because you’ve precomputed the expensive arrays.

### Prioritized sources to cite and build on

1. entity["people","Vinod Menon","neuroscientist"] and colleagues’ integrative triple-network salience model review (your uploaded review) for the conceptual and dynamic targets (Figure 4 narrative, SN switching framing). citeturn29view2turn30view0  
2. COBRE dataset summary and release details (sample sizes, modalities, phenotypic availability, access/license constraints). citeturn3view0turn20view0  
3. ds000030 dataset description (sample composition + modalities) and its phenotype directory contents showing BPRS/SANS/SAPS/SCID/medication files. citeturn4view0turn26view0  
4. ds003944 README + participants table for optional EEG/MEG overlay with symptom/cognitive scales. citeturn12view0turn15view0  
5. fMRIPrep outputs documentation (BIDS-derivatives-conformant products and QC reports) + BIDS derivatives spec for packaging. citeturn28search0turn34search2turn34search5  
6. Network Interaction Index (NII) definition (Fisher-z SN–CEN summed minus SN–DMN) to formalize your SN-centered “interaction dial.” citeturn31view1  
7. Cytoscape.js and Plotly animation APIs plus niivue loading docs for the minimal browser implementation hooks. citeturn34search0turn34search1turn33search18turn33search9