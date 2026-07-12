#!/usr/bin/env python3
"""Extract one NTA CBT Life Sciences paper into a validated web dataset.

The CBT PDFs store each English question and its four options as one JPEG image.
Keeping that original image is the authoritative transcription; OCR is retained only
as searchable auxiliary text and is never used to redraw the question.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

import fitz
from PIL import Image
from pypdf import PdfReader


QUESTION_RE = re.compile(r"Question Number\s*:\s*(\d+)\s+Question Id\s*:\s*(\d+)")
KEY_RE = re.compile(
    r"(?P<id>\d{6,12})\s+(?P<key>Drop|\d(?:\s+(?:or|and)\s+\d)*)",
    re.IGNORECASE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--paper", required=True, type=Path)
    parser.add_argument("--key", required=True, type=Path)
    parser.add_argument("--key-page", required=True, type=int, help="One-based PDF page")
    parser.add_argument("--id", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--session", required=True)
    parser.add_argument("--exam-date", required=True)
    parser.add_argument("--paper-url", required=True)
    parser.add_argument("--key-url", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--ocr", action="store_true")
    return parser.parse_args()


def block_text(block: dict) -> str:
    if block.get("type") != 0:
        return ""
    return "".join(
        span.get("text", "")
        for line in block.get("lines", [])
        for span in line.get("spans", [])
    )


def section_for(number: int) -> str:
    if number <= 20:
        return "A"
    if number <= 70:
        return "B"
    return "C"


def scoring_for(section: str) -> dict:
    if section in {"A", "B"}:
        return {"correct": 2, "incorrect": -0.5}
    return {"correct": 4, "incorrect": -1}


def read_key(path: Path, page_number: int, known_question_ids: list[str]) -> dict[str, dict]:
    reader = PdfReader(str(path))
    if not 1 <= page_number <= len(reader.pages):
        raise ValueError(f"Key page {page_number} is outside 1..{len(reader.pages)}")
    text = " ".join((reader.pages[page_number - 1].extract_text() or "").split())
    answers: dict[str, dict] = {}
    if "Correct Option ID" in text:
        for question_id in known_question_ids:
            match = re.search(
                rf"\b{re.escape(question_id)}\b\s+(?P<value>-{{4,}}|\d{{9,12}}(?:\s*,\s*\d{{9,12}})*)",
                text,
            )
            if not match:
                continue
            raw = match.group("value")
            answers[question_id] = {
                "status": "dropped" if raw.startswith("-") else "scored",
                "values": [] if raw.startswith("-") else [int(value) for value in re.findall(r"\d{9,12}", raw)],
            }
        return answers
    for match in KEY_RE.finditer(text):
        question_id = match.group("id")
        raw = match.group("key")
        if raw.lower() == "drop":
            answers[question_id] = {"status": "dropped", "values": []}
            continue
        options = [int(value) for value in re.findall(r"\d", raw)]
        answers[question_id] = {"status": "scored", "values": options}
    return answers


def read_option_ids(document: fitz.Document) -> dict[str, list[int]]:
    text = "\n".join(page.get_text() for page in document)
    markers = list(QUESTION_RE.finditer(text))
    options: dict[str, list[int]] = {}
    for index, marker in enumerate(markers):
        question_id = marker.group(2)
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        ids = [
            int(value)
            for value in re.findall(r"(\d{8,12})\.", text[marker.end() : end])
        ]
        if ids and question_id not in options:
            options[question_id] = list(dict.fromkeys(ids))[:4]
    return options


def create_ocr_engine(enabled: bool):
    if not enabled:
        return None
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


def ocr_image(engine, image_path: Path) -> str:
    if engine is None:
        return ""
    result, _ = engine(str(image_path))
    if not result:
        return ""
    return "\n".join(item[1] for item in result)


def extract_questions(
    paper_path: Path,
    image_dir: Path,
    image_web_prefix: str,
    key: dict[str, dict],
    ocr_engine,
) -> list[dict]:
    document = fitz.open(str(paper_path))
    option_ids = read_option_ids(document)
    occurrences: dict[int, list[tuple[int, str, fitz.Rect]]] = {}
    for page_index, page in enumerate(document):
        for block in page.get_text("dict").get("blocks", []):
            match = QUESTION_RE.search(block_text(block))
            if not match:
                continue
            number = int(match.group(1))
            occurrences.setdefault(number, []).append(
                (page_index, match.group(2), fitz.Rect(block["bbox"]))
            )

    if sorted(occurrences) != list(range(1, 146)):
        missing = sorted(set(range(1, 146)) - set(occurrences))
        raise ValueError(f"Paper metadata failed 145-question check; missing={missing}")

    questions: dict[int, dict] = {}
    for number in range(1, 146):
        page_index, question_id, first_box = occurrences[number][0]
        if len(occurrences[number]) >= 2:
            end_page, _, end_box = occurrences[number][1]
            end_y = end_box.y0
        elif number < 145:
            end_page, _, end_box = occurrences[number + 1][0]
            end_y = end_box.y0
        else:
            end_page = len(document) - 1
            end_y = document[end_page].rect.height

        answer = key.get(question_id)
        if answer is None:
            raise ValueError(
                f"Question {number} (ID {question_id}) is missing from the selected key page"
            )

        raw_values = answer["values"]
        if raw_values and any(value > 4 for value in raw_values):
            ids = option_ids.get(question_id, [])
            if len(ids) != 4:
                raise ValueError(f"Question {number} has {len(ids)} option IDs instead of four")
            correct_options = [ids.index(value) + 1 for value in raw_values if value in ids]
            if len(correct_options) != len(raw_values):
                raise ValueError(f"Question {number} key option ID is absent from the paper")
        else:
            correct_options = raw_values

        source_images: list[str] = []
        segment = 0
        for crop_page_index in range(page_index, end_page + 1):
            page = document[crop_page_index]
            top = first_box.y1 + 2 if crop_page_index == page_index else 0
            bottom = end_y - 2 if crop_page_index == end_page else page.rect.height
            if bottom - top < 2:
                continue
            segment += 1
            image_name = f"q{number:03d}-{segment}.webp"
            image_path = image_dir / image_name
            pixmap = page.get_pixmap(
                matrix=fitz.Matrix(1.65, 1.65),
                clip=fitz.Rect(24, top, page.rect.width - 18, bottom),
                alpha=False,
            )
            temporary = image_path.with_suffix(".png")
            pixmap.save(str(temporary))
            with Image.open(temporary) as image:
                image.save(image_path, "WEBP", quality=88, method=6)
            temporary.unlink()
            source_images.append(f"{image_web_prefix}/{image_name}")
        if not source_images:
            raise ValueError(f"Question {number} produced no visual segments")

        section = section_for(number)
        questions[number] = {
            "number": number,
            "questionId": question_id,
            "section": section,
            "sourcePage": page_index + 1,
            "sourceImages": source_images,
            "ocrText": "",
            "correctOptions": correct_options,
            "status": answer["status"],
            "marks": scoring_for(section),
            "explanation": "",
        }

    actual = sorted(questions)
    expected = list(range(1, 146))
    if actual != expected:
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        raise ValueError(f"Paper failed 145-question check; missing={missing}, extra={extra}")
    return [questions[number] for number in expected]


def main() -> None:
    args = parse_args()
    output_root = args.output.resolve()
    image_dir = output_root / "assets" / "questions" / args.id
    data_dir = output_root / "data" / "papers"
    if image_dir.exists():
        shutil.rmtree(image_dir)
    image_dir.mkdir(parents=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    paper_document = fitz.open(str(args.paper))
    known_question_ids = []
    for page in paper_document:
        for match in QUESTION_RE.finditer(page.get_text()):
            question_id = match.group(2)
            if question_id not in known_question_ids:
                known_question_ids.append(question_id)
    answers = read_key(args.key, args.key_page, known_question_ids)
    questions = extract_questions(
        args.paper,
        image_dir,
        f"assets/questions/{args.id}",
        answers,
        create_ocr_engine(args.ocr),
    )
    dataset = {
        "schemaVersion": 1,
        "id": args.id,
        "label": args.label,
        "session": args.session,
        "examDate": args.exam_date,
        "subject": "Life Sciences",
        "questionCount": len(questions),
        "source": {
            "paperUrl": args.paper_url,
            "answerKeyUrl": args.key_url,
            "answerKeyPage": args.key_page,
        },
        "attemptLimits": {"A": 15, "B": 35, "C": 25},
        "questions": questions,
    }
    output_path = data_dir / f"{args.id}.json"
    output_path.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "paper": args.id,
                "questions": len(questions),
                "keyEntriesOnPage": len(answers),
                "output": str(output_path),
            }
        )
    )


if __name__ == "__main__":
    main()
