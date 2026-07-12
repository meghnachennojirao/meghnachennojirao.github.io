#!/usr/bin/env python3
"""Import a complete pre-CBT Set A scan with OCR-assisted page anchoring.

OCR is used only to locate printed question numbers. The website displays the
original scan page, so OCR output can never change the question or its options.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from pathlib import Path

import fitz
from PIL import Image
from pypdf import PdfReader

from import_visual_paper import marks_for, section_for


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--paper", required=True, type=Path)
    parser.add_argument("--key", required=True, type=Path)
    parser.add_argument("--id", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--session", required=True)
    parser.add_argument("--exam-date", required=True)
    parser.add_argument("--paper-url", required=True)
    parser.add_argument("--key-url", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--tesseract", required=True, type=Path)
    parser.add_argument("--tessdata", required=True, type=Path)
    parser.add_argument("--language", default="eng")
    return parser.parse_args()


def parse_set_a_key(path: Path) -> dict[int, dict]:
    reader = PdfReader(str(path))
    text = " ".join((reader.pages[0].extract_text() or "").split())
    header = text.lower().find("question no")
    if header >= 0:
        text = text[header:]
    text = text.split("*Benefit", 1)[0].split("Note", 1)[0]
    answers: dict[int, dict] = {}
    for question, raw in re.findall(
        r"\b(\d{1,3})\s+(\*|[1-4](?:\s+(?:or|and)\s+[1-4])?)(?=\s|$)",
        text,
        re.IGNORECASE,
    ):
        number = int(question)
        if not 1 <= number <= 145 or number in answers:
            continue
        answers[number] = {
            "status": "dropped" if raw == "*" else "scored",
            "correctOptions": [] if raw == "*" else [int(value) for value in re.findall(r"[1-4]", raw)],
        }
    if sorted(answers) != list(range(1, 146)):
        missing = sorted(set(range(1, 146)) - set(answers))
        raise ValueError(f"Set A key failed 145-entry check; missing={missing}")
    return answers


def ocr_column(
    paper_path: Path,
    page_index: int,
    side: int,
    tesseract: Path,
    tessdata: Path,
    language: str,
    temp_dir: Path,
) -> tuple[int, list[int]]:
    document = fitz.open(str(paper_path))
    page = document[page_index]
    x0, x1 = ((20, 300) if side == 0 else (285, 575))
    pixmap = page.get_pixmap(
        matrix=fitz.Matrix(3, 3),
        clip=fitz.Rect(x0, 35, min(x1, page.rect.width), min(810, page.rect.height)),
        alpha=False,
    )
    image_path = temp_dir / f"p{page_index + 1:03d}-{side}.png"
    pixmap.save(str(image_path))
    environment = os.environ.copy()
    environment["TESSDATA_PREFIX"] = str(tessdata.resolve())
    result = subprocess.run(
        [str(tesseract.resolve()), str(image_path), "stdout", "-l", language, "--psm", "6"],
        capture_output=True,
        check=False,
        env=environment,
    )
    image_path.unlink(missing_ok=True)
    text = result.stdout.decode("utf-8", "ignore")
    numbers = [
        int(value)
        for value in re.findall(r"(?m)^\s*([0-9]{1,3})[.)]\s+", text)
        if 5 <= int(value) <= 145
    ]
    return page_index, numbers


def longest_monotonic_anchors(candidates: dict[int, Counter]) -> dict[int, int]:
    points = [
        (question, page, min(2, count))
        for page, counts in candidates.items()
        for question, count in counts.items()
    ]
    points.sort(key=lambda item: (item[1], item[0]))
    scores = [point[2] for point in points]
    previous = [-1] * len(points)
    for index, (question, page, weight) in enumerate(points):
        for prior in range(index):
            prior_question, prior_page, _ = points[prior]
            if prior_question >= question or prior_page > page:
                continue
            candidate_score = scores[prior] + weight
            if candidate_score > scores[index]:
                scores[index] = candidate_score
                previous[index] = prior
    if not points:
        return {}
    cursor = max(range(len(points)), key=lambda item: scores[item])
    chain: list[tuple[int, int]] = []
    while cursor >= 0:
        chain.append((points[cursor][0], points[cursor][1]))
        cursor = previous[cursor]
    chain.reverse()
    anchors: dict[int, int] = {}
    for question, page in chain:
        anchors.setdefault(question, page)
    return anchors


def source_pages_for(question: int, anchors: dict[int, int], first: int, last: int) -> list[int]:
    if question in anchors:
        page = anchors[question]
        return list(range(max(first, page - 1), min(last, page + 1) + 1))
    lower = max((value for value in anchors if value < question), default=1)
    upper = min((value for value in anchors if value > question), default=145)
    lower_page = anchors.get(lower, first)
    upper_page = anchors.get(upper, last)
    return list(range(max(first, lower_page - 1), min(last, upper_page + 1) + 1))


def render_pages(document: fitz.Document, first: int, last: int, output: Path) -> dict[int, str]:
    output.mkdir(parents=True, exist_ok=True)
    result: dict[int, str] = {}
    for page_index in range(first, last + 1):
        name = f"p{page_index + 1:03d}.webp"
        pixmap = document[page_index].get_pixmap(matrix=fitz.Matrix(1.65, 1.65), alpha=False)
        temporary = output / name.replace(".webp", ".png")
        pixmap.save(str(temporary))
        with Image.open(temporary) as image:
            image.save(output / name, "WEBP", quality=86, method=6)
        temporary.unlink()
        result[page_index] = name
    return result


def main() -> None:
    args = parse_args()
    root = args.output.resolve()
    page_dir = root / "assets" / "pages" / args.id
    data_dir = root / "data" / "papers"
    if page_dir.exists():
        shutil.rmtree(page_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    document = fitz.open(str(args.paper))
    candidates: dict[int, Counter] = {}
    with tempfile.TemporaryDirectory(prefix="csir-ocr-") as temporary:
        temp_dir = Path(temporary)
        jobs = [(page, side) for page in range(2, len(document)) for side in (0, 1)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(
                    ocr_column,
                    args.paper,
                    page,
                    side,
                    args.tesseract,
                    args.tessdata,
                    args.language,
                    temp_dir,
                )
                for page, side in jobs
            ]
            for future in concurrent.futures.as_completed(futures):
                page, numbers = future.result()
                candidates.setdefault(page, Counter()).update(numbers)

    pages_with_questions = sorted(page for page, values in candidates.items() if values)
    if not pages_with_questions:
        raise ValueError("OCR found no question-number anchors")
    first_page = max(2, pages_with_questions[0] - 1)
    last_page = min(len(document) - 1, pages_with_questions[-1] + 1)
    anchors = longest_monotonic_anchors(candidates)
    anchors.update({1: first_page, 2: first_page, 3: first_page, 4: first_page, 5: first_page, 145: last_page})
    if len(anchors) < 30:
        raise ValueError(f"Only {len(anchors)} monotonic question anchors were recovered")

    rendered = render_pages(document, first_page, last_page, page_dir)
    answers = parse_set_a_key(args.key)
    questions = []
    for number in range(1, 146):
        page_indexes = source_pages_for(number, anchors, first_page, last_page)
        section = section_for(number)
        questions.append(
            {
                "number": number,
                "questionId": f"set-a-{number}",
                "section": section,
                "sourcePage": page_indexes[0] + 1,
                "sourceImages": [f"assets/pages/{args.id}/{rendered[page]}" for page in page_indexes],
                "ocrText": "",
                "correctOptions": answers[number]["correctOptions"],
                "status": answers[number]["status"],
                "marks": marks_for(section),
                "explanation": "",
            }
        )

    dataset = {
        "schemaVersion": 1,
        "id": args.id,
        "label": args.label,
        "session": args.session,
        "examDate": args.exam_date,
        "subject": "Life Sciences",
        "questionCount": 145,
        "source": {"paperUrl": args.paper_url, "answerKeyUrl": args.key_url},
        "attemptLimits": {"A": 15, "B": 35, "C": 25},
        "questions": questions,
        "transcriptionMethod": "Original scanned page with OCR-assisted question-page anchoring",
        "anchorCount": len(anchors),
    }
    output_path = data_dir / f"{args.id}.json"
    output_path.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"paper": args.id, "questions": 145, "keyEntries": 145, "anchors": len(anchors)}))


if __name__ == "__main__":
    main()
