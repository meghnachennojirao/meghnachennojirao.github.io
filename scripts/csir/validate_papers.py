#!/usr/bin/env python3
"""Fail when a published CSIR paper is incomplete or internally inconsistent."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def validate(path: Path, root: Path) -> list[str]:
    errors: list[str] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    questions = data.get("questions", [])
    numbers = [question.get("number") for question in questions]
    if data.get("questionCount") != 145 or len(questions) != 145:
        errors.append(f"{path.name}: expected 145 questions, found {len(questions)}")
    if numbers != list(range(1, 146)):
        errors.append(f"{path.name}: numbering is not exactly 1..145")
    ids = [question.get("questionId") for question in questions]
    if len(ids) != len(set(ids)):
        errors.append(f"{path.name}: duplicate question IDs")
    for question in questions:
        number = question.get("number")
        images = question.get("sourceImages") or [question.get("sourceImage", "")]
        if not images:
            errors.append(f"{path.name}: Q{number} has no source images")
        for image_name in images:
            image = root / image_name
            if not image.is_file() or image.stat().st_size == 0:
                errors.append(f"{path.name}: Q{number} source image is missing")
        status = question.get("status")
        answers = question.get("correctOptions", [])
        if status == "scored" and not answers:
            errors.append(f"{path.name}: Q{number} has no keyed answer")
        if any(answer not in {1, 2, 3, 4} for answer in answers):
            errors.append(f"{path.name}: Q{number} has an invalid keyed option")
    return errors


def main() -> None:
    root = Path(__file__).resolve().parents[2] / "csir-life-sciences-mock"
    files = sorted((root / "data" / "papers").glob("*.json"))
    catalogue = json.loads((root / "data" / "papers.json").read_text(encoding="utf-8"))
    listed = {Path(item["dataUrl"]).name for item in catalogue}
    actual = {path.name for path in files}
    errors = [error for path in files for error in validate(path, root)]
    if listed != actual:
        errors.append(f"Catalogue mismatch; missing={sorted(actual - listed)}, extra={sorted(listed - actual)}")
    if len(files) != 22:
        errors.append(f"Expected 22 distinct exam papers, found {len(files)}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)
    print(
        f"Validated {len(files)} paper(s) and {len(files) * 145} questions; "
        "every published dataset contains questions 1..145."
    )


if __name__ == "__main__":
    main()
