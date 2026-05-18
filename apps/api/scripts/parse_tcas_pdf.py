#!/usr/bin/env python3
"""
Pre-fill a TCAS criteria CSV from an admission-criteria PDF.

This is a draft generator — every emitted row gets `# REVIEW` in the major
field and an empty `components` column, because the weight DSL
(tgat=20;tpat:30=30;...) can't be reliably extracted from PDF text. The
admin opens the CSV, fixes review rows, fills components, then uploads via
the regular /admin/tcas/import/criteria flow.

Setup (one-time, on the API host):
    pip install -r apps/api/scripts/requirements.txt

Usage (invoked by TcasPdfParseService.parsePdfToCsv):
    python parse_tcas_pdf.py <pdf_path> <university> <round> <year> [<source_url>]

The script writes the CSV to stdout and a one-line summary to stderr.
Non-zero exit means parsing blew up; the wrapping service surfaces it
back to the admin UI.
"""
from __future__ import annotations

import csv
import re
import sys

import pdfplumber

# Force UTF-8 on stdout/stderr regardless of Windows codepage. NestJS reads
# the buffer as UTF-8; without this, Thai characters get encoded in cp874
# / cp1252 and arrive corrupted.
sys.stdout.reconfigure(encoding="utf-8", newline="")
sys.stderr.reconfigure(encoding="utf-8")

HEADER = [
    "university",
    "campus",
    "faculty",
    "major",
    "subTrack",
    "programType",
    "courseCode",
    "round",
    "admissionYear",
    "quotaSeats",
    "gpaxMin",
    "totalMinScore",
    "sourceUrl",
    "components",
]

THAI_CHAR = re.compile(r"[฀-๿]")
INT_ONLY = re.compile(r"^\s*\d{1,4}\s*$")
FLOAT_ONLY = re.compile(r"^\s*\d{1,3}(?:\.\d+)?\s*$")
FACULTY_HINT = ("คณะ", "วิทยาลัย", "สำนักวิชา")
MAJOR_HINT = ("สาขาวิชา", "หลักสูตร", "วิชาเอก")


def cell_str(c) -> str:
    if c is None:
        return ""
    # pdfplumber occasionally returns lists for merged cells; flatten.
    if isinstance(c, list):
        return " ".join(cell_str(x) for x in c).strip()
    return str(c).strip()


def looks_like_program(cells: list[str]) -> bool:
    """Quick heuristic: has Thai text + at least one numeric column.

    Filters out subheader rows, footnotes, and the table caption.
    """
    if not any(THAI_CHAR.search(c) for c in cells if c):
        return False
    return any(INT_ONLY.match(c) or FLOAT_ONLY.match(c) for c in cells if c)


def find_first(cells: list[str], hints: tuple[str, ...]) -> str:
    for c in cells:
        if any(h in c for h in hints):
            return c
    return ""


def extract_quota(cells: list[str]) -> str:
    """Prefer an integer cell that looks like seat count (1-9999)."""
    for c in cells:
        if INT_ONLY.match(c) and 1 <= int(c.strip()) <= 9999:
            return c.strip()
    return ""


def extract_cutoff(cells: list[str]) -> str:
    """Prefer a float ≤ 100 with at least one decimal (e.g. 59.98)."""
    best = ""
    for c in cells:
        c = c.strip()
        if not FLOAT_ONLY.match(c) or "." not in c:
            continue
        try:
            n = float(c)
        except ValueError:
            continue
        if 0 < n <= 100:
            # Prefer the highest value as the published cut-off
            # (small floats in PDFs are often weights, not scores).
            if not best or n > float(best):
                best = c
    return best


def main() -> int:
    if len(sys.argv) < 5:
        print(
            "usage: parse_tcas_pdf.py <pdf> <university> <round> <year> [source_url]",
            file=sys.stderr,
        )
        return 2

    pdf_path = sys.argv[1]
    university = sys.argv[2]
    round_key = sys.argv[3]
    year = sys.argv[4]
    source_url = sys.argv[5] if len(sys.argv) > 5 else ""

    # csv.writer + sys.stdout. lineterminator="\n" so the response over HTTP
    # doesn't carry CRLF; the criteria parser strips both anyway, but
    # consistency keeps fixture diffs sane.
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(HEADER)

    extracted = 0
    pages_with_tables = 0
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() or []
                if tables:
                    pages_with_tables += 1
                for table in tables:
                    if not table:
                        continue
                    for row in table:
                        cells = [cell_str(c) for c in row]
                        if not looks_like_program(cells):
                            continue
                        faculty = find_first(cells, FACULTY_HINT)
                        major_raw = find_first(cells, MAJOR_HINT)
                        # If neither faculty nor major surfaced, this row is
                        # probably a table caption or a stray number block.
                        if not (faculty or major_raw):
                            continue
                        quota = extract_quota(cells)
                        cutoff = extract_cutoff(cells)
                        # Always # REVIEW: components weren't extracted and
                        # the heuristics above are loose by design.
                        major = (
                            f"# REVIEW: {major_raw}"
                            if major_raw
                            else "# REVIEW"
                        )
                        writer.writerow(
                            [
                                university,
                                "",  # campus
                                faculty,
                                major,
                                "",  # subTrack
                                "",  # programType
                                "",  # courseCode
                                round_key,
                                year,
                                quota,
                                "",  # gpaxMin
                                cutoff,
                                source_url,
                                "",  # components — admin fills in
                            ]
                        )
                        extracted += 1
    except FileNotFoundError:
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        return 1
    except Exception as e:
        # pdfplumber raises a variety of pdfminer-derived errors; we
        # surface the message so the admin sees what blew up.
        print(f"pdfplumber error: {type(e).__name__}: {e}", file=sys.stderr)
        return 1

    print(
        f"parse_tcas_pdf: extracted {extracted} candidate row(s) "
        f"from {pages_with_tables} page(s) with tables",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
