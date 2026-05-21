"""
KKU NETSAT — Criteria (weights) scraper.
Source:  https://apps.admissions.kku.ac.th/web/Quota
Output:  data/kku-quota-69.json

Usage:
    python kku_quota.py            # full run (~3.5 min, ~197 programs)
    python kku_quota.py 3          # smoke test, first 3
"""

import json
import os
import re
import sys
import time
from dataclasses import dataclass, field, asdict
from typing import Optional
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup


BASE_URL = "https://apps.admissions.kku.ac.th"
INDEX_URL = f"{BASE_URL}/web/Quota"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TCAS-Calculator-Bot/1.0; +contact: labs@zentrix.co.th)"
}
REQUEST_DELAY = 1.0
YEAR = 2569
ROUND = "2_NETSAT"

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "kku-quota-69.json")

EXAM_CODE_MAP = {
    # ภาษาต่างประเทศ (สมรรถนะเฉพาะด้านภาษา)
    "011": "LANG_FRENCH",
    "012": "LANG_GERMAN",
    "013": "LANG_CHINESE",
    "014": "LANG_JAPANESE",
    "015": "LANG_KOREAN",
    "016": "LANG_SPANISH",
    # สมรรถนะเฉพาะด้าน (KKU practical aptitude tests)
    "021": "APT_MUSIC",
    "023": "APT_DRAWING",
    "024": "APT_VISUAL_ART",
    "025": "APT_DRAWING_COMM",
    "026": "APT_VISCOM_DESIGN",
    "041": "APT_ARCH",
    "042": "APT_DESIGN",
    "051": "APT_ART",
    "052": "APT_PHYSICAL",
    "061": "APT_MEDILLUS_TECH",
    "062": "APT_MEDILLUS_ART",
    # NETSAT SAT1
    "101": "NETSAT_THAI",
    "102": "NETSAT_ENG",
    "103": "NETSAT_MATH",
    "104": "NETSAT_SCI",
    "105": "NETSAT_SOC",
    # NETSAT SAT2
    "201": "NETSAT_BIO_BASIC",
    "202": "NETSAT_CHEM",
    "203": "NETSAT_BIO",
    "204": "NETSAT_PHYSICS",
    "205": "NETSAT_MATH_ADV",
    # TPAT
    "10": "TPAT1",
    "20": "TPAT2",
    "30": "TPAT3",
    "40": "TPAT4",
    "50": "TPAT5",
    # TGAT
    "90": "TGAT",
    "91": "TGAT1",
    "92": "TGAT2",
    "93": "TGAT3",
}


@dataclass
class ProgramWeight:
    exam_code: str
    weight_percent: float
    min_subject_score: Optional[float] = None
    raw_subject_code: str = ""
    raw_subject_name: str = ""


@dataclass
class Program:
    id: int
    group_id: int
    year: int
    round: str
    university: str
    faculty: str
    program_name: str
    min_total_percent: float
    source_url: str
    weights: list[ProgramWeight] = field(default_factory=list)
    notes: str = ""


def fetch(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    r.encoding = "utf-8"
    time.sleep(REQUEST_DELAY)
    return r.text


def parse_index(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    rows = []
    table = soup.find("table")
    if not table:
        raise RuntimeError("ไม่พบ table ในหน้าหลัก")
    for tr in table.find_all("tr"):
        cells = tr.find_all("td")
        if len(cells) < 3:
            continue
        faculty = cells[0].get_text(strip=True)
        program = cells[1].get_text(strip=True)
        link = cells[2].find("a")
        if not link or not link.get("href"):
            continue
        rows.append({
            "faculty": faculty,
            "program_name": program,
            "detail_url": urljoin(INDEX_URL, link["href"]),
        })
    return rows


def parse_detail(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    m = re.search(r"/quota/detail/(\d+)/(\d+)", url)
    if not m:
        raise ValueError(f"URL ไม่ตรง pattern: {url}")
    group_id, program_id = int(m.group(1)), int(m.group(2))

    full_text = soup.get_text(" ", strip=True)
    min_total = 30.0
    m = re.search(r"คะแนนรวมขั้นต่ำ\s*(\d+(?:\.\d+)?)\s*คะแนน", full_text)
    if m:
        min_total = float(m.group(1))

    faculty, program_name = "", ""
    for h in soup.find_all(["h4", "h3", "h2"]):
        txt = h.get_text(strip=True)
        if txt.startswith("คณะ") or txt.startswith("วิทยาลัย"):
            parts = txt.split(" ", 1)
            if len(parts) == 2:
                faculty, program_name = parts[0], parts[1]
            else:
                faculty = txt
            break

    weights = []
    for table in soup.find_all("table"):
        headers_text = " ".join(th.get_text(strip=True) for th in table.find_all("th"))
        if "ค่าน้ำหนัก" not in headers_text and "น้ำหนัก" not in headers_text:
            continue
        for tr in table.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < 4:
                continue
            raw_code = tds[0].get_text(strip=True)
            raw_name = tds[1].get_text(strip=True)
            try:
                weight = float(tds[3].get_text(strip=True))
            except ValueError:
                continue
            min_score = None
            if len(tds) >= 5:
                t = tds[4].get_text(strip=True)
                if t:
                    try:
                        min_score = float(t)
                    except ValueError:
                        pass
            exam_code = EXAM_CODE_MAP.get(raw_code, f"UNKNOWN_{raw_code}")
            weights.append(ProgramWeight(
                exam_code=exam_code,
                weight_percent=weight,
                min_subject_score=min_score,
                raw_subject_code=raw_code,
                raw_subject_name=raw_name,
            ))
        break

    return {
        "id": program_id,
        "group_id": group_id,
        "year": YEAR,
        "round": ROUND,
        "university": "มหาวิทยาลัยขอนแก่น",
        "faculty": faculty,
        "program_name": program_name,
        "min_total_percent": min_total,
        "source_url": url,
        "weights": weights,
    }


def main(limit: Optional[int] = None):
    print(f"📥 ดึงหน้าหลัก: {INDEX_URL}")
    items = parse_index(fetch(INDEX_URL))
    print(f"✅ พบ {len(items)} สาขา")
    if limit:
        items = items[:limit]
        print(f"⚠️  จำกัดที่ {limit} สาขา (โหมดทดสอบ)")

    programs: list[Program] = []
    unknown_codes: set[str] = set()
    failed: list[tuple[str, str]] = []

    for i, item in enumerate(items, 1):
        url = item["detail_url"]
        print(f"  [{i}/{len(items)}] {item['faculty']} | {item['program_name'][:50]}...")
        try:
            data = parse_detail(fetch(url), url)
            if not data["faculty"]:
                data["faculty"] = item["faculty"]
            if not data["program_name"]:
                data["program_name"] = item["program_name"]
            prog = Program(**{k: v for k, v in data.items() if k != "weights"})
            prog.weights = data["weights"]
            programs.append(prog)
            for w in prog.weights:
                if w.exam_code.startswith("UNKNOWN_"):
                    unknown_codes.add(f"{w.raw_subject_code}: {w.raw_subject_name}")
        except Exception as e:
            print(f"     ❌ error: {e}")
            failed.append((url, str(e)))

    out = {
        "metadata": {
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": INDEX_URL,
            "year": YEAR,
            "round": ROUND,
            "total_programs": len(programs),
            "failed": len(failed),
        },
        "programs": [asdict(p) for p in programs],
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\n✅ บันทึก {len(programs)} สาขา → {OUT_PATH}")
    if failed:
        print(f"❌ ดึงไม่สำเร็จ {len(failed)} สาขา")
        for u, e in failed[:5]:
            print(f"   - {u}: {e}")
    if unknown_codes:
        print(f"\n⚠️  พบรหัสวิชาที่ map ไม่ได้ {len(unknown_codes)} รหัส:")
        for c in sorted(unknown_codes):
            print(f"   - {c}")


if __name__ == "__main__":
    lim = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else None
    main(limit=lim)
