"""
KKU NETSAT — Historical scores scraper.
Source:  https://apps.admissions.kku.ac.th/web/Stat
Output:  data/kku-stat-68.json

The Stat page embeds the entire dataset as an inline JS `statData` array
(no pagination, no detail pages). One request gets everything.

Usage:
    python kku_stat.py
"""

import json
import os
import re
import time
import requests


URL = "https://apps.admissions.kku.ac.th/web/Stat"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TCAS-Calculator-Bot/1.0; +contact: labs@zentrix.co.th)"
}
YEAR = 2568          # ปีของสถิติ (ปีที่นำมาแสดง)
ROUND = "2_NETSAT"
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "kku-stat-68.json")


def main():
    print(f"📥 ดึง: {URL}")
    r = requests.get(URL, headers=HEADERS, timeout=30)
    r.raise_for_status()
    r.encoding = "utf-8"
    html = r.text

    m = re.search(r"const\s+statData\s*=\s*(\[.*?\])\s*;", html, re.S)
    if not m:
        raise RuntimeError("ไม่พบ statData array ในหน้า — โครงสร้างอาจเปลี่ยน")
    raw = json.loads(m.group(1))
    print(f"✅ พบ {len(raw)} record")

    def to_float(v):
        if v is None or v == "":
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    records = []
    bad = 0
    for row in raw:
        mn = to_float(row.get("MIN_SCORE"))
        mx = to_float(row.get("MAX_SCORE"))
        avg = to_float(row.get("AVG_SCORE"))
        rec = {
            "external_id": row.get("PROGRAMID", ""),
            "faculty_id": row.get("FACULTYID", ""),
            "faculty": row.get("FACULTYNAME", "").strip(),
            "program_name": row.get("PROGRAMNAME", "").strip(),
            "year": YEAR,
            "round": ROUND,
            "min_score": mn,
            "max_score": mx,
            "mean_score": avg,
            "applicants": None,
            "admitted": None,
            "is_predicted": False,
            "source": "kku_official_stat",
        }
        # sanity check: min < max if both present
        if mn is not None and mx is not None and mn > mx:
            bad += 1
        records.append(rec)

    out = {
        "metadata": {
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": URL,
            "year": YEAR,
            "round": ROUND,
            "total_records": len(records),
            "sanity_warnings": bad,
        },
        "records": records,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"✅ บันทึก {len(records)} record → {OUT_PATH}")
    if bad:
        print(f"⚠️  สงสัย {bad} record (min > max)")


if __name__ == "__main__":
    main()
