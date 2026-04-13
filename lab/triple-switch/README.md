# Triple Switch

Minimal step-by-step visualization for the SN / FPN / DMN story in schizophrenia.

You can open [index.html](/Volumes/Mishu%201/Github/meghnachennojirao.github.io/lab/triple-switch/index.html:1) directly in a browser. The builder emits an inline data bundle for that path, so a dev server is optional.

What is in the current build:

- A small real subset from `ds000030` using public `fMRIPrep` derivatives
- Three-network extraction with Yeo 7 labels
- Sliding-window coupling, NII, recurring states, group comparison, and symptom overlay
- Static mask context from Shevchenko et al. 2025

Rebuild the data pack with:

```bash
python3 -m pip install --user nibabel nilearn scikit-learn
python3 lab/triple-switch/tools/build_data.py
```

The builder writes:

- `lab/triple-switch/data/manifest.json`
- `lab/triple-switch/data/subjects/*.json`
- `lab/triple-switch/data/triple-network.json`
- `lab/triple-switch/data/inline-data.js`
