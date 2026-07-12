#!/usr/bin/env python3
"""Import the June 2023 image-based preview-bank PDF using its vector row markers."""

from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass
from pathlib import Path

import fitz

from import_visual_paper import marks_for, parse_direct_key, render_clip, section_for


@dataclass(frozen=True)
class Marker:
    page: int
    top: float
    bottom: float


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
    return parser.parse_args()


def find_question_markers(document: fitz.Document) -> list[Marker]:
    markers: list[Marker] = []
    for page_index, page in enumerate(document):
        for drawing in page.get_drawings():
            color = drawing.get("color")
            if not color or not 0.6 < color[0] < 0.9:
                continue
            for item in drawing.get("items", []):
                if item[0] != "qu":
                    continue
                rectangle = item[1].rect
                if rectangle.width > 500 and rectangle.height < 30:
                    markers.append(Marker(page_index, rectangle.y0, rectangle.y1))
    markers.sort(key=lambda item: (item.page, item.top))
    if len(markers) == 146:
        markers = markers[1:]  # The first wide quad is the document's column-heading row.
    if len(markers) != 145:
        raise ValueError(f"Expected 145 question-row markers, found {len(markers)}")
    return markers


def main() -> None:
    args = parse_args()
    root = args.output.resolve()
    image_dir = root / "assets" / "questions" / args.id
    data_dir = root / "data" / "papers"
    if image_dir.exists():
        shutil.rmtree(image_dir)
    image_dir.mkdir(parents=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    document = fitz.open(str(args.paper))
    markers = find_question_markers(document)
    answers = parse_direct_key(args.key)
    question_ids = list(answers)
    if len(question_ids) != 145:
        raise ValueError(f"Expected 145 final-key entries, found {len(question_ids)}")

    questions = []
    web_prefix = f"assets/questions/{args.id}"
    for index, marker in enumerate(markers):
        number = index + 1
        following = markers[index + 1] if index + 1 < len(markers) else None
        end_page = following.page if following else len(document) - 1
        source_images: list[str] = []
        segment = 0
        for page_index in range(marker.page, end_page + 1):
            page = document[page_index]
            top = marker.bottom + 2 if page_index == marker.page else 0
            bottom = following.top - 2 if following and page_index == following.page else page.rect.height
            if bottom - top < 2:
                continue
            segment += 1
            image_name = f"q{number:03d}-{segment}.webp"
            render_clip(page, fitz.Rect(18, top, page.rect.width - 8, bottom), image_dir / image_name)
            source_images.append(f"{web_prefix}/{image_name}")
        if not source_images:
            raise ValueError(f"Question {number} produced no source images")

        question_id = question_ids[index]
        answer = answers[question_id]
        section = section_for(number)
        questions.append(
            {
                "number": number,
                "questionId": question_id,
                "section": section,
                "sourcePage": marker.page + 1,
                "sourceImages": source_images,
                "ocrText": "",
                "correctOptions": answer["values"],
                "status": answer["status"],
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
    }
    output_path = data_dir / f"{args.id}.json"
    output_path.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"paper": args.id, "questions": 145, "keyEntries": len(answers)}))


if __name__ == "__main__":
    main()
