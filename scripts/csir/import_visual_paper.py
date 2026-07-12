#!/usr/bin/env python3
"""Import a searchable CSIR paper by rendering exact per-question PDF crops."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

import fitz
from PIL import Image
from pypdf import PdfReader


DIRECT_KEY_RE = re.compile(
    r"(?P<id>\d{6,12})\s+(?P<key>Drop|\d(?:\s*(?:,|or|and)\s*\d)*)",
    re.IGNORECASE,
)
QUESTION_ID_RE = re.compile(r"(?:\[Question ID\s*=|^\s*=)\s*(\d+)\]", re.MULTILINE)
OPTION_ID_RE = re.compile(r"\[Option ID\s*=\s*(\d+)\]")


@dataclass(frozen=True)
class Start:
    question_id: str
    page: int
    y: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--format", required=True, choices=("numbered", "table"))
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


def normalized_key_text(path: Path) -> str:
    reader = PdfReader(str(path))
    if len(reader.pages) != 1:
        raise ValueError(f"Expected a one-page subject/shift key, got {len(reader.pages)} pages")
    return " ".join((reader.pages[0].extract_text() or "").split())


def parse_direct_key(path: Path) -> dict[str, dict]:
    answers: dict[str, dict] = {}
    for match in DIRECT_KEY_RE.finditer(normalized_key_text(path)):
        raw = match.group("key")
        if raw.lower() == "drop":
            answers[match.group("id")] = {"status": "dropped", "values": []}
        else:
            answers[match.group("id")] = {
                "status": "scored",
                "values": [int(value) for value in re.findall(r"\d", raw)],
            }
    return answers


def parse_option_id_key(path: Path) -> dict[str, dict]:
    text = normalized_key_text(path)
    marker = text.lower().find("correct option id")
    if marker < 0:
        raise ValueError("The option-ID key header was not found")
    body = re.sub(r"\s*,\s*", ",", text[marker + len("correct option id") :])
    pairs = re.findall(r"\b(\d{1,3})\s+(\*|Dropped|\d+(?:,\d+)*)", body, re.IGNORECASE)
    answers: dict[str, dict] = {}
    for question_id, raw in pairs:
        if question_id in answers:
            continue
        if raw == "*" or raw.lower() == "dropped":
            answers[question_id] = {"status": "dropped", "values": []}
        else:
            answers[question_id] = {
                "status": "scored",
                "values": [int(value) for value in raw.split(",")],
            }
    if len(answers) != 145:
        raise ValueError(f"Expected 145 option-ID key entries, found {len(answers)}")
    return answers


def parse_numbered_paper(document: fitz.Document) -> tuple[list[Start], dict[str, list[int]]]:
    visual_starts: list[tuple[int, int, float]] = []
    option_ids: dict[str, list[int]] = {}
    ids_in_visual_order: list[str] = []

    for page_index, page in enumerate(document):
        for word in page.get_text("words"):
            match = re.fullmatch(r"(\d+)\)", word[4])
            if not match:
                continue
            number = int(match.group(1))
            if 1 <= number <= 75 and word[0] < 90:
                candidate = (number, page_index, max(0, word[1] - 8))
                if not visual_starts or candidate[1:] != visual_starts[-1][1:]:
                    visual_starts.append(candidate)

    document_text = "\n".join(page.get_text() for page in document)
    matches = list(QUESTION_ID_RE.finditer(document_text))
    for index, match in enumerate(matches):
        question_id = match.group(1)
        ids_in_visual_order.append(question_id)
        end = matches[index + 1].start() if index + 1 < len(matches) else len(document_text)
        ids = [int(value) for value in OPTION_ID_RE.findall(document_text[match.end() : end])]
        option_ids.setdefault(question_id, []).extend(ids)

    expected_local_numbers = list(range(1, 21)) + list(range(1, 51)) + list(range(1, 76))
    actual_local_numbers = [item[0] for item in visual_starts]
    if actual_local_numbers != expected_local_numbers:
        raise ValueError(
            "Question-start detection did not match the expected Part A/B/C numbering; "
            f"found {len(actual_local_numbers)} starts"
        )

    unique_ids: list[str] = []
    for question_id in ids_in_visual_order:
        if question_id not in unique_ids:
            unique_ids.append(question_id)
    if len(unique_ids) != 145:
        raise ValueError(f"Expected 145 question IDs, found {len(unique_ids)}")

    starts = [
        Start(unique_ids[index], visual_starts[index][1], visual_starts[index][2])
        for index in range(145)
    ]
    for question_id, values in option_ids.items():
        option_ids[question_id] = list(dict.fromkeys(values))[:4]
    return starts, option_ids


def parse_table_paper(document: fitz.Document, answers: dict[str, dict]) -> list[Start]:
    found: dict[str, Start] = {}
    for page_index, page in enumerate(document):
        for question_id in answers:
            if question_id in found:
                continue
            rectangles = page.search_for(question_id)
            if not rectangles:
                continue
            rectangle = min(rectangles, key=lambda item: (item.y0, item.x0))
            found[question_id] = Start(question_id, page_index, max(0, rectangle.y0 - 18))
    if len(found) != 145:
        missing = sorted(set(answers) - set(found))
        raise ValueError(f"Expected 145 question IDs in paper, found {len(found)}; missing={missing}")
    return sorted(found.values(), key=lambda item: (item.page, item.y))


def render_clip(page: fitz.Page, clip: fitz.Rect, output: Path) -> None:
    if clip.height < 2:
        return
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.65, 1.65), clip=clip, alpha=False)
    temporary = output.with_suffix(".png")
    pixmap.save(str(temporary))
    with Image.open(temporary) as image:
        image.save(output, "WEBP", quality=88, method=6)
    temporary.unlink()


def render_question(
    document: fitz.Document,
    current: Start,
    following: Start | None,
    image_dir: Path,
    web_prefix: str,
    number: int,
) -> list[str]:
    final_page = following.page if following else len(document) - 1
    outputs: list[str] = []
    segment = 0
    for page_index in range(current.page, final_page + 1):
        page = document[page_index]
        top = current.y if page_index == current.page else 0
        bottom = following.y if following and page_index == following.page else page.rect.height
        if bottom - top < 2:
            continue
        segment += 1
        name = f"q{number:03d}-{segment}.webp"
        render_clip(page, fitz.Rect(24, top, page.rect.width - 18, bottom), image_dir / name)
        outputs.append(f"{web_prefix}/{name}")
    if not outputs:
        raise ValueError(f"Question {number} produced no visual segments")
    return outputs


def section_for(number: int) -> str:
    return "A" if number <= 20 else "B" if number <= 70 else "C"


def marks_for(section: str) -> dict:
    return {"correct": 2, "incorrect": -0.5} if section != "C" else {"correct": 4, "incorrect": -1}


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
    if args.format == "numbered":
        answers = parse_option_id_key(args.key)
        starts, option_ids = parse_numbered_paper(document)
    else:
        answers = parse_direct_key(args.key)
        starts = parse_table_paper(document, answers)
        option_ids = {}

    if len(starts) != 145:
        raise ValueError(f"Expected 145 ordered starts, found {len(starts)}")
    questions = []
    for index, start in enumerate(starts):
        number = index + 1
        answer = answers.get(start.question_id)
        if answer is None:
            raise ValueError(f"Question {number} ID {start.question_id} is absent from the key")
        raw_values = answer["values"]
        if args.format == "numbered":
            ids = option_ids.get(start.question_id, [])
            if len(ids) != 4:
                raise ValueError(f"Question {number} has {len(ids)} option IDs instead of four")
            correct = [ids.index(value) + 1 for value in raw_values if value in ids]
            if len(correct) != len(raw_values):
                raise ValueError(f"Question {number} key option ID is absent from the paper")
        else:
            correct = raw_values
        section = section_for(number)
        following = starts[index + 1] if index + 1 < len(starts) else None
        questions.append(
            {
                "number": number,
                "questionId": start.question_id,
                "section": section,
                "sourcePage": start.page + 1,
                "sourceImages": render_question(
                    document,
                    start,
                    following,
                    image_dir,
                    f"assets/questions/{args.id}",
                    number,
                ),
                "ocrText": "",
                "correctOptions": correct,
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
