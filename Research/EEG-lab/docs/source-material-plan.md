# EEG Lab Source Material Plan

## Source Strategy

Use a tiered material strategy so the app can ship safely before large EEG downloads or access-controlled reports are available.

Tier 1: directly open-access metadata and recordings.
- Use public datasets that can be accessed without credentials.
- Store only small metadata, source manifests, and curated excerpts in the repo.
- Avoid committing large EDF files.

Tier 2: access-controlled clinical reports.
- Use Temple/TUH material after access is requested and license terms are reviewed.
- Store only de-identified excerpts needed for teaching.
- Keep source IDs and attribution separate from educational copy.

Tier 3: simulated teaching traces.
- Use generated/simulated traces when real data is unavailable, too large, or not ideal for a first learner exercise.
- Label these as simulated.
- Use real data later to replace or validate examples.

## Candidate Open Material

### PhysioNet EEG Motor Movement/Imagery

Use for:
- Normal resting baseline.
- Eyes open versus eyes closed.
- Electrode layout and channel naming.
- Task annotations and event interpretation.

Why:
- PhysioNet lists it as an open-access database.
- It contains 64-channel EEG from 109 subjects, recorded in the 10-10 system.
- Files are EDF+ with annotation channels and event files.
- It is small enough compared with clinical corpora to curate selectively.

Source:
- https://physionet.org/content/eegmmidb/1.0.0/

### CHB-MIT Scalp EEG Database

Use for:
- Pediatric seizure examples.
- Seizure onset and offset recognition.
- Evolution and post-ictal changes.
- Annotation-based exercises.

Why:
- PhysioNet lists it as an open-access database.
- It includes pediatric scalp EEG recorded with the 10-20 system.
- It includes seizure start/end annotations and per-case summary files.

Source:
- https://physionet.org/content/chbmit/1.0.0/

### Siena Scalp EEG Database

Use for:
- Adult seizure cases.
- Focal seizure classification.
- Seizure timing practice.
- Comparison with pediatric CHB-MIT cases.

Why:
- PhysioNet lists it as an open-access database under CC BY 4.0.
- It includes adult video-EEG recordings, seizure classifications, and text files with seizure timing and channel information.

Source:
- https://physionet.org/content/siena-scalp-eeg/1.0.0/

### CAP Sleep Database

Use for:
- Sleep state exercises.
- Spindles, K-complexes, and CAP-related sleep instability.
- Distinguishing physiological sleep phenomena from pathological rhythmicity.

Why:
- PhysioNet lists it as an open-access database.
- It includes 108 polysomnographic recordings with EEG, EOG, EMG, respiratory signals, ECG, sleep stage annotations, and CAP annotations.

Source:
- https://physionet.org/content/capslpdb/1.0.0/

### Temple University Hospital EEG Corpus

Use for:
- Clinical EEG report practice.
- Report language.
- Real-world abnormal/normal classification.
- Physician-report interpretation.

Important limitation:
- TUH is the best fit for "EEG reports", but access must be requested. The public landing page describes a large public EEG resource and asks users to request access. The Frontiers data report describes the corpus as a clinical EEG corpus built around EEG signals and physician reports.

Sources:
- https://isip.piconepress.com/projects/tuh_eeg/
- https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2016.00196/full

## Repo Storage Policy

Do not commit raw EDF downloads.

Allowed in the repo:
- Source manifests.
- Dataset citations and license notes.
- Small de-identified report excerpts.
- Derived teaching annotations.
- Simulated trace presets.
- Screenshots only when license permits and patient privacy is protected.

Recommended folder shape:

```text
Research/EEG-lab/
  docs/
    design-plan.md
    source-material-plan.md
  reports/
    README.md
    manifest.example.json
  data/
    sources.json
    cases/
      case-001.json
      case-002.json
```

## Case Schema

```json
{
  "id": "case-001",
  "title": "Normal awake adult baseline",
  "dataset": "physionet-eegmmidb",
  "sourceUrl": "https://physionet.org/content/eegmmidb/1.0.0/",
  "license": "Open Data Commons Attribution License v1.0",
  "materialType": "eeg-snippet",
  "patientContext": {
    "ageBand": "adult",
    "state": "awake",
    "clinicalQuestion": "baseline rhythm"
  },
  "excerpt": {
    "referral": "",
    "description": "",
    "impression": ""
  },
  "annotations": [
    {
      "label": "posterior dominant rhythm",
      "channels": ["O1", "O2"],
      "timeRangeSec": [0, 10]
    }
  ],
  "teachingUse": ["normal background", "alpha rhythm"],
  "commonError": "Calling posterior alpha asymmetry abnormal without checking age, state, and montage."
}
```

## Curation Sequence

1. Add direct-source manifests for EEGMMI, CHB-MIT, Siena, and CAP Sleep.
2. Build 10 simulated/metadata-backed beginner cases using existing canvas presets.
3. Add 10 real open-access annotation-backed cases from PhysioNet metadata.
4. Request TUH access for report-backed cases.
5. Add 10 report-backed cases after reviewing license and de-identification constraints.

## Attribution Pattern

Every exercise using real material should expose:

- Dataset name.
- Version.
- Source URL.
- License/access status.
- Original citation.
- Whether the displayed trace/report is real, excerpted, derived, or simulated.

