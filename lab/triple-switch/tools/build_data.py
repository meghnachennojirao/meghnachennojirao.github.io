#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
import warnings
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen, urlretrieve

import numpy as np
import pandas as pd
from scipy.stats import pearsonr

try:
    from nilearn import datasets
    from nilearn.maskers import NiftiLabelsMasker
    from sklearn.cluster import KMeans
except ImportError as exc:  # pragma: no cover - dependency guard
    raise SystemExit(
        "Missing builder dependencies. Install with "
        "`python3 -m pip install --user nibabel nilearn scikit-learn`."
    ) from exc


DATASET_ROOT = (
    "https://s3.amazonaws.com/openneuro/ds000030/ds000030_R1.0.5/uncompressed"
)
DERIVATIVE_ROOT = f"{DATASET_ROOT}/derivatives/fmriprep"
WINDOW_SIZE_TR = 20
WINDOW_STEP_TR = 1
TR_SECONDS = 2.0
N_STATES = 3
GROUP_SIZE = 5
RANDOM_SEED = 42
ROUND_DIGITS = 4

SOURCE_URLS = {
    "mask-500": (
        "https://static-content.springer.com/esm/art%3A10.1038%2Fs41598-024-84152-2/"
        "MediaObjects/41598_2024_84152_MOESM1_ESM.csv"
    ),
    "mask-1000": (
        "https://static-content.springer.com/esm/art%3A10.1038%2Fs41598-024-84152-2/"
        "MediaObjects/41598_2024_84152_MOESM2_ESM.csv"
    ),
    "mask-5000": (
        "https://static-content.springer.com/esm/art%3A10.1038%2Fs41598-024-84152-2/"
        "MediaObjects/41598_2024_84152_MOESM3_ESM.csv"
    ),
}

NETWORK_LOOKUP = {
    "Vis": "Visual",
    "SomMot": "Somatomotor",
    "DorsAttn": "Dorsal Attention",
    "SalVentAttn": "Salience",
    "Limbic": "Limbic",
    "Cont": "Frontoparietal",
    "Default": "Default Mode",
}

FOCUS_ID = {
    "Salience": "sn",
    "Frontoparietal": "fpn",
    "Default Mode": "dmn",
}

FOCUS_PAIR_KEYS = {
    frozenset({"sn", "fpn"}): "sn_fpn",
    frozenset({"sn", "dmn"}): "sn_dmn",
    frozenset({"fpn", "dmn"}): "fpn_dmn",
}

CONFOUND_COLUMNS = [
    "X",
    "Y",
    "Z",
    "RotX",
    "RotY",
    "RotZ",
    "WhiteMatter",
    "aCompCor00",
    "aCompCor01",
    "aCompCor02",
    "aCompCor03",
    "aCompCor04",
    "aCompCor05",
]

NETWORKS = [
    {
        "id": "sn",
        "short": "SN",
        "label": "Salience",
        "atlas_index": 3,
        "atlas_label": "Ventral Attention",
        "meaning": "Helps redirect attention when something matters.",
    },
    {
        "id": "fpn",
        "short": "FPN",
        "label": "Frontoparietal",
        "atlas_index": 5,
        "atlas_label": "Frontoparietal",
        "meaning": "Supports goal-directed, task-focused control.",
    },
    {
        "id": "dmn",
        "short": "DMN",
        "label": "Default Mode",
        "atlas_index": 6,
        "atlas_label": "Default Mode",
        "meaning": "Often rises during internal thought and self-reference.",
    },
]


@dataclass
class SubjectBundle:
    subject_id: str
    group: str
    age: int | None
    sex: str | None
    positive_symptoms: float | None
    hallucinations: float | None
    avolition: float | None
    time_series: dict[str, list[float]]
    raw_time_seconds: list[float]
    window_seconds: list[float]
    edges: dict[str, list[float]]
    nii: list[float]
    static_edges: dict[str, float]
    state_labels: list[int] | None = None
    metrics: dict | None = None


def request(url: str):
    return Request(url, headers={"User-Agent": "Mozilla/5.0"})


def fetch_table(url: str, sep: str = "\t") -> pd.DataFrame:
    with urlopen(request(url)) as response:
        return pd.read_csv(response, sep=sep)


def fetch_csv(url: str) -> pd.DataFrame:
    with urlopen(request(url)) as response:
        return pd.read_csv(response)


def ensure_download(url: str, path: Path) -> Path:
    if path.exists():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {path.name} …", flush=True)
    urlretrieve(url, path)
    return path


def parse_network(parcel: str) -> str:
    for part in parcel.split("_"):
        if part in NETWORK_LOOKUP:
            return NETWORK_LOOKUP[part]
    raise ValueError(f"Unknown network label: {parcel}")


def aggregate_mask(df: pd.DataFrame) -> dict:
    parcels = df.iloc[:, 0].tolist()
    networks = [parse_network(parcel) for parcel in parcels]
    matrix = df.iloc[:, 1:].apply(pd.to_numeric, errors="coerce").fillna(0).to_numpy()

    all_pair_counts: dict[tuple[str, str], int] = {}
    node_counts = {"sn": 0, "fpn": 0, "dmn": 0}
    bridge_counts = {"sn_fpn": 0, "sn_dmn": 0, "fpn_dmn": 0}

    for row_index, source_network in enumerate(networks):
        for col_index in range(row_index + 1, len(networks)):
            if matrix[row_index, col_index] != 1:
                continue

            target_network = networks[col_index]
            pair = tuple(sorted((source_network, target_network)))
            all_pair_counts[pair] = all_pair_counts.get(pair, 0) + 1

            if source_network in FOCUS_ID and target_network in FOCUS_ID:
                source_id = FOCUS_ID[source_network]
                target_id = FOCUS_ID[target_network]

                if source_id == target_id:
                    node_counts[source_id] += 1
                else:
                    bridge_key = FOCUS_PAIR_KEYS[frozenset({source_id, target_id})]
                    bridge_counts[bridge_key] += 1

    total_selected_edges = int(matrix.sum() // 2)
    triple_edges = sum(node_counts.values()) + sum(bridge_counts.values())
    selected_mask = (matrix.sum(axis=0) + matrix.sum(axis=1)) > 0

    return {
        "selected_edges": total_selected_edges,
        "selected_parcels": int(selected_mask.sum()),
        "triple_edges": triple_edges,
        "triple_share": round(triple_edges / total_selected_edges, 4),
        "nodes": node_counts,
        "bridges": bridge_counts,
        "top_pairs": [
            {"source": source, "target": target, "count": count}
            for (source, target), count in sorted(
                all_pair_counts.items(), key=lambda item: (-item[1], item[0])
            )[:12]
        ],
    }


def build_static_masks() -> list[dict]:
    masks = []
    for mask_id, url in SOURCE_URLS.items():
        mask = aggregate_mask(fetch_csv(url))
        mask["id"] = mask_id
        mask["label"] = f"{mask['selected_edges']:,} edges"
        masks.append(mask)

    masks.sort(key=lambda item: item["selected_edges"])
    return masks


def load_metadata() -> pd.DataFrame:
    participants = fetch_table(f"{DATASET_ROOT}/participants.tsv")
    bprs = fetch_table(f"{DATASET_ROOT}/phenotype/bprs.tsv")[
        ["participant_id", "bprs_positive"]
    ]
    sans = fetch_table(f"{DATASET_ROOT}/phenotype/sans.tsv")[
        ["participant_id", "factor_avolition"]
    ]
    saps = fetch_table(f"{DATASET_ROOT}/phenotype/saps.tsv")[
        ["participant_id", "factor_hallucinations"]
    ]

    meta = (
        participants.merge(bprs, on="participant_id", how="left")
        .merge(sans, on="participant_id", how="left")
        .merge(saps, on="participant_id", how="left")
    )

    meta = meta[meta["rest"] == 1].copy()
    meta = meta[meta["diagnosis"].isin(["CONTROL", "SCHZ"])].copy()
    return meta


def evenly_spaced_rows(frame: pd.DataFrame, count: int, sort_by: str) -> pd.DataFrame:
    ordered = frame.sort_values(sort_by, na_position="last").reset_index(drop=True)
    if len(ordered) <= count:
        return ordered

    idx = np.linspace(0, len(ordered) - 1, count)
    idx = np.unique(np.round(idx).astype(int))
    while len(idx) < count:
        missing = next(i for i in range(len(ordered)) if i not in idx)
        idx = np.sort(np.append(idx, missing))
    return ordered.iloc[idx[:count]].reset_index(drop=True)


def select_subject_rows(meta: pd.DataFrame) -> pd.DataFrame:
    controls = evenly_spaced_rows(
        meta[meta["diagnosis"] == "CONTROL"], GROUP_SIZE, sort_by="age"
    )
    patients = evenly_spaced_rows(
        meta[
            (meta["diagnosis"] == "SCHZ")
            & meta["bprs_positive"].notna()
            & meta["factor_hallucinations"].notna()
        ],
        GROUP_SIZE,
        sort_by="bprs_positive",
    )
    return (
        pd.concat([controls, patients], ignore_index=True)
        .sort_values(["diagnosis", "participant_id"])
        .reset_index(drop=True)
    )


def fetch_atlas(cache_dir: Path) -> Path:
    atlas = datasets.fetch_atlas_yeo_2011(
        data_dir=str(cache_dir / "nilearn"),
        n_networks=7,
        thickness="thick",
    )
    return Path(atlas["maps"])


def round_list(values: list[float] | np.ndarray, digits: int = ROUND_DIGITS) -> list[float]:
    return [round(float(value), digits) for value in values]


def fisher_z(value: float) -> float:
    clipped = float(np.clip(value, -0.999999, 0.999999))
    return float(np.arctanh(clipped))


def correlation_edges(values: np.ndarray) -> dict[str, float]:
    corr = np.corrcoef(values.T)
    return {
        "sn_fpn": round(fisher_z(corr[0, 1]), ROUND_DIGITS),
        "sn_dmn": round(fisher_z(corr[0, 2]), ROUND_DIGITS),
        "fpn_dmn": round(fisher_z(corr[1, 2]), ROUND_DIGITS),
    }


def build_windows(values: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    features = []
    centers = []

    for start in range(0, values.shape[0] - WINDOW_SIZE_TR + 1, WINDOW_STEP_TR):
        window = values[start : start + WINDOW_SIZE_TR]
        edges = correlation_edges(window)
        features.append([edges["sn_fpn"], edges["sn_dmn"], edges["fpn_dmn"]])
        centers.append((start + WINDOW_SIZE_TR / 2) * TR_SECONDS)

    return np.asarray(features, dtype=np.float32), np.asarray(centers, dtype=np.float32)


def confounds_for_subject(path: Path) -> np.ndarray:
    frame = pd.read_csv(path, sep="\t")
    columns = [name for name in CONFOUND_COLUMNS if name in frame.columns]
    return frame[columns].bfill().ffill().fillna(0.0).to_numpy(dtype=np.float32)


def build_subject_bundle(row: pd.Series, atlas_path: Path, cache_dir: Path) -> SubjectBundle:
    subject_id = row["participant_id"]
    preproc_path = ensure_download(
        f"{DERIVATIVE_ROOT}/{subject_id}/func/"
        f"{subject_id}_task-rest_bold_space-MNI152NLin2009cAsym_preproc.nii.gz",
        cache_dir / f"{subject_id}_preproc.nii.gz",
    )
    confounds_path = ensure_download(
        f"{DERIVATIVE_ROOT}/{subject_id}/func/{subject_id}_task-rest_bold_confounds.tsv",
        cache_dir / f"{subject_id}_confounds.tsv",
    )

    masker = NiftiLabelsMasker(
        labels_img=str(atlas_path),
        standardize="zscore_sample",
        detrend=True,
        low_pass=0.1,
        high_pass=0.01,
        t_r=TR_SECONDS,
    )
    timeseries_7 = masker.fit_transform(
        str(preproc_path), confounds=confounds_for_subject(confounds_path)
    )
    focus = timeseries_7[:, [item["atlas_index"] for item in NETWORKS]]
    edges, centers = build_windows(focus)
    nii = edges[:, 0] - edges[:, 1]

    return SubjectBundle(
        subject_id=subject_id,
        group="control" if row["diagnosis"] == "CONTROL" else "schizophrenia",
        age=int(row["age"]) if pd.notna(row["age"]) else None,
        sex=str(row["gender"]) if pd.notna(row["gender"]) else None,
        positive_symptoms=(
            round(float(row["bprs_positive"]), 3)
            if pd.notna(row["bprs_positive"])
            else None
        ),
        hallucinations=(
            round(float(row["factor_hallucinations"]), 3)
            if pd.notna(row["factor_hallucinations"])
            else None
        ),
        avolition=(
            round(float(row["factor_avolition"]), 3)
            if pd.notna(row["factor_avolition"])
            else None
        ),
        time_series={
            "sn": round_list(focus[:, 0]),
            "fpn": round_list(focus[:, 1]),
            "dmn": round_list(focus[:, 2]),
        },
        raw_time_seconds=round_list(np.arange(focus.shape[0]) * TR_SECONDS, 1),
        window_seconds=round_list(centers, 1),
        edges={
            "sn_fpn": round_list(edges[:, 0]),
            "sn_dmn": round_list(edges[:, 1]),
            "fpn_dmn": round_list(edges[:, 2]),
        },
        nii=round_list(nii),
        static_edges=correlation_edges(focus),
    )


def assign_states(subjects: list[SubjectBundle]) -> list[dict]:
    stacked = np.vstack(
        [
            np.column_stack(
                [
                    subject.edges["sn_fpn"],
                    subject.edges["sn_dmn"],
                    subject.edges["fpn_dmn"],
                ]
            )
            for subject in subjects
        ]
    ).astype(np.float64)

    feature_mean = stacked.mean(axis=0)
    feature_std = stacked.std(axis=0)
    feature_std[feature_std == 0] = 1.0
    scaled = (stacked - feature_mean) / feature_std

    model = KMeans(n_clusters=N_STATES, n_init=20, random_state=RANDOM_SEED)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        labels = model.fit_predict(scaled)
    centroids = model.cluster_centers_ * feature_std + feature_mean

    order = np.argsort(centroids[:, 0] - centroids[:, 1])
    remap = {int(old): int(new) for new, old in enumerate(order)}

    state_specs = [
        {
            "label": "DMN-side",
            "description": (
                "This recurring pattern sits closest to the default-mode side of the map."
            ),
        },
        {
            "label": "Middle",
            "description": "This recurring pattern sits between the two outer states.",
        },
        {
            "label": "FPN-side",
            "description": (
                "This recurring pattern sits closest to the frontoparietal side of the map."
            ),
        },
    ]

    cursor = 0
    for subject in subjects:
        n_windows = len(subject.nii)
        original = labels[cursor : cursor + n_windows]
        subject.state_labels = [remap[int(label)] for label in original]
        cursor += n_windows

    states = []
    for new_index, old_index in enumerate(order):
        centroid = centroids[int(old_index)]
        states.append(
            {
                "id": f"state-{new_index}",
                "index": int(new_index),
                "label": state_specs[new_index]["label"],
                "description": state_specs[new_index]["description"],
                "centroid": {
                    "sn_fpn": round(float(centroid[0]), ROUND_DIGITS),
                    "sn_dmn": round(float(centroid[1]), ROUND_DIGITS),
                    "fpn_dmn": round(float(centroid[2]), ROUND_DIGITS),
                    "nii": round(float(centroid[0] - centroid[1]), ROUND_DIGITS),
                },
            }
        )

    return states


def dwell_seconds(labels: list[int], state_index: int) -> float:
    runs = []
    current = None
    length = 0

    for label in labels:
        if label == current:
            length += 1
            continue

        if current == state_index and length:
            runs.append(length)
        current = label
        length = 1

    if current == state_index and length:
        runs.append(length)

    if not runs:
        return 0.0
    return round(float(np.mean(runs) * WINDOW_STEP_TR * TR_SECONDS), 2)


def transition_matrix(labels: list[int]) -> list[list[float]]:
    counts = np.zeros((N_STATES, N_STATES), dtype=np.float32)
    for source, target in zip(labels[:-1], labels[1:]):
        counts[source, target] += 1

    normalized = []
    for row in counts:
        total = float(row.sum())
        if total == 0:
            normalized.append([0.0] * N_STATES)
        else:
            normalized.append(round_list(row / total, 4))
    return normalized


def summarize_subject(subject: SubjectBundle) -> dict:
    if subject.state_labels is None:
        raise ValueError("States must be assigned before subject summary.")

    labels = subject.state_labels
    switches = sum(1 for left, right in zip(labels[:-1], labels[1:]) if left != right)
    window_count = len(labels)
    duration_minutes = window_count * WINDOW_STEP_TR * TR_SECONDS / 60
    occupancy = [labels.count(state_index) / window_count for state_index in range(N_STATES)]

    subject.metrics = {
        "switches_per_minute": round(switches / duration_minutes, 3),
        "mean_nii": round(float(np.mean(subject.nii)), 4),
        "nii_std": round(float(np.std(subject.nii)), 4),
        "state_occupancy": round_list(occupancy, 4),
        "dwell_seconds": [
            dwell_seconds(labels, state_index) for state_index in range(N_STATES)
        ],
        "transition_matrix": transition_matrix(labels),
        "dominant_state": int(np.argmax(occupancy)),
    }

    return {
        "id": subject.subject_id,
        "group": subject.group,
        "age": subject.age,
        "sex": subject.sex,
        "positive_symptoms": subject.positive_symptoms,
        "hallucinations": subject.hallucinations,
        "avolition": subject.avolition,
        "metrics": subject.metrics,
        "file": f"./data/subjects/{subject.subject_id}.json",
    }


def mean_metric(subjects: list[SubjectBundle], key: str) -> float:
    values = [subject.metrics[key] for subject in subjects if subject.metrics is not None]
    return round(float(np.mean(values)), 4)


def mean_state_occupancy(subjects: list[SubjectBundle]) -> list[float]:
    occupancies = np.asarray(
        [subject.metrics["state_occupancy"] for subject in subjects if subject.metrics],
        dtype=np.float32,
    )
    return round_list(occupancies.mean(axis=0), 4)


def symptom_associations(subjects: list[SubjectBundle]) -> dict:
    patients = [subject for subject in subjects if subject.group == "schizophrenia"]
    positives = np.asarray(
        [subject.positive_symptoms for subject in patients if subject.positive_symptoms is not None],
        dtype=np.float32,
    )

    def association(key: str) -> dict:
        metric_values = np.asarray(
            [subject.metrics[key] for subject in patients if subject.positive_symptoms is not None],
            dtype=np.float32,
        )
        if len(positives) < 3 or len(metric_values) != len(positives):
            return {"r": None, "p": None}
        r_value, p_value = pearsonr(positives, metric_values)
        return {
            "r": round(float(r_value), 4),
            "p": round(float(p_value), 4),
        }

    return {
        "positive_vs_switches_per_minute": association("switches_per_minute"),
        "positive_vs_nii_std": association("nii_std"),
    }


def group_summary(subjects: list[SubjectBundle]) -> dict:
    controls = [subject for subject in subjects if subject.group == "control"]
    patients = [subject for subject in subjects if subject.group == "schizophrenia"]

    summary = {
        "control": {
            "n": len(controls),
            "mean_switches_per_minute": mean_metric(controls, "switches_per_minute"),
            "mean_nii": mean_metric(controls, "mean_nii"),
            "mean_nii_std": mean_metric(controls, "nii_std"),
            "mean_state_occupancy": mean_state_occupancy(controls),
        },
        "schizophrenia": {
            "n": len(patients),
            "mean_switches_per_minute": mean_metric(patients, "switches_per_minute"),
            "mean_nii": mean_metric(patients, "mean_nii"),
            "mean_nii_std": mean_metric(patients, "nii_std"),
            "mean_state_occupancy": mean_state_occupancy(patients),
        },
    }

    summary["delta"] = {
        "switches_per_minute": round(
            summary["schizophrenia"]["mean_switches_per_minute"]
            - summary["control"]["mean_switches_per_minute"],
            4,
        ),
        "nii_std": round(
            summary["schizophrenia"]["mean_nii_std"]
            - summary["control"]["mean_nii_std"],
            4,
        ),
    }
    return summary


def featured_subjects(subjects: list[SubjectBundle]) -> dict:
    controls = [subject for subject in subjects if subject.group == "control"]
    patients = [subject for subject in subjects if subject.group == "schizophrenia"]

    guide_patient = max(patients, key=lambda subject: subject.metrics["nii_std"])
    reference_control = min(
        controls,
        key=lambda subject: abs(
            subject.metrics["switches_per_minute"]
            - np.median([item.metrics["switches_per_minute"] for item in controls])
        ),
    )

    return {
        "guide_subject_id": guide_patient.subject_id,
        "comparison_control_id": reference_control.subject_id,
        "comparison_patient_id": guide_patient.subject_id,
    }


def build_manifest(subjects: list[SubjectBundle], states: list[dict]) -> dict:
    summary_rows = [summarize_subject(subject) for subject in subjects]
    static_masks = build_static_masks()

    return {
        "version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "study": {
            "id": "ds000030",
            "title": "UCLA Consortium for Neuropsychiatric Phenomics LA5c Study",
            "source_url": "https://openneuro.org/datasets/ds000030",
            "modality": "resting-state fMRI",
            "subset_note": (
                "Curated sample of 10 participants with public fMRIPrep derivatives: "
                "5 controls and 5 schizophrenia subjects."
            ),
            "tr_seconds": TR_SECONDS,
            "window": {
                "size_tr": WINDOW_SIZE_TR,
                "size_seconds": WINDOW_SIZE_TR * TR_SECONDS,
                "step_tr": WINDOW_STEP_TR,
                "step_seconds": WINDOW_STEP_TR * TR_SECONDS,
            },
            "state_model": {
                "kind": "k-means",
                "k": N_STATES,
                "features": ["sn_fpn", "sn_dmn", "fpn_dmn"],
                "description": (
                    "Each state is a recurring pattern of coupling across the three "
                    "network pairs."
                ),
            },
        },
        "sources": {
            "dynamic_data": {
                "title": "Public fMRIPrep derivatives for ds000030",
                "url": f"{DATASET_ROOT}/derivatives/fmriprep/",
            },
            "static_masks": {
                "title": (
                    "A comparative machine learning study of schizophrenia biomarkers "
                    "derived from functional connectivity"
                ),
                "authors": "Shevchenko et al.",
                "year": 2025,
                "doi": "10.1038/s41598-024-84152-2",
                "description": (
                    "Top 500, 1,000, and 5,000 connectivity masks used here as a "
                    "static framing layer."
                ),
            },
        },
        "networks": NETWORKS,
        "lexicon": {
            "node": "A circle is one large brain network, not a single brain region.",
            "edge": (
                "A line is the correlation between two network-average signals inside "
                "one 40-second window."
            ),
            "state": (
                "A state is a recurring window pattern discovered by grouping similar "
                "windows together."
            ),
            "nii": (
                "NII is salience-to-frontoparietal coupling minus salience-to-default "
                "coupling."
            ),
        },
        "static_masks": static_masks,
        "states": states,
        "subjects": summary_rows,
        "group_summary": group_summary(subjects),
        "symptom_associations": symptom_associations(subjects),
        "featured": featured_subjects(subjects),
    }


def subject_payload(subject: SubjectBundle) -> dict:
    if subject.state_labels is None or subject.metrics is None:
        raise ValueError("Subject states and metrics must exist before serialization.")

    return {
        "id": subject.subject_id,
        "group": subject.group,
        "age": subject.age,
        "sex": subject.sex,
        "positive_symptoms": subject.positive_symptoms,
        "hallucinations": subject.hallucinations,
        "avolition": subject.avolition,
        "time_series": subject.time_series,
        "raw_time_seconds": subject.raw_time_seconds,
        "window_seconds": subject.window_seconds,
        "edges": subject.edges,
        "nii": subject.nii,
        "static_edges": subject.static_edges,
        "state_labels": subject.state_labels,
        "metrics": subject.metrics,
    }


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_inline_bundle(path: Path, manifest: dict, subjects: dict[str, dict]) -> None:
    payload = {
        "manifest": manifest,
        "subjects": subjects,
    }
    script = "window.TRIPLE_SWITCH_DATA = " + json.dumps(payload, separators=(",", ":")) + ";\n"
    path.write_text(script, encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    data_dir = root / "data"
    subjects_dir = data_dir / "subjects"
    data_dir.mkdir(parents=True, exist_ok=True)
    subjects_dir.mkdir(parents=True, exist_ok=True)

    cache_dir = Path(tempfile.gettempdir()) / "triple-switch"
    cache_dir.mkdir(parents=True, exist_ok=True)

    atlas_path = fetch_atlas(cache_dir)
    selected_rows = select_subject_rows(load_metadata())

    bundles: list[SubjectBundle] = []
    for _, row in selected_rows.iterrows():
        print(f"Processing {row['participant_id']} …", flush=True)
        bundles.append(build_subject_bundle(row, atlas_path, cache_dir))

    states = assign_states(bundles)
    manifest = build_manifest(bundles, states)
    subject_payloads: dict[str, dict] = {}

    for subject in bundles:
        payload = subject_payload(subject)
        subject_payloads[subject.subject_id] = payload
        write_json(subjects_dir / f"{subject.subject_id}.json", payload)

    write_json(data_dir / "manifest.json", manifest)
    write_json(
        data_dir / "triple-network.json",
        {
            "version": 1,
            "generated_at": manifest["generated_at"],
            "source": manifest["sources"]["static_masks"],
            "focus_networks": [
                {"id": item["id"], "label": item["label"]} for item in NETWORKS
            ],
            "masks": manifest["static_masks"],
        },
    )
    write_inline_bundle(data_dir / "inline-data.js", manifest, subject_payloads)


if __name__ == "__main__":
    main()
