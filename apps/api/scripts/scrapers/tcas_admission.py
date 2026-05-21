"""
TCAS Round 3 — Criteria + Historical scores (combined scraper).

Uses the public S3 bucket that the mytcas.com SPA fetches from:
  https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/
  - /courses.json                       — master program list (~4900 entries)
  - /rounds/{program_id}.json           — admission projects per program
  - /ly-programs/{program_id}.json      — last-year score stats

Outputs:
  data/tcas-quota-69.json   — Round 3 (type "3_2569") entries with weights
  data/tcas-stat-68.json    — last-year min/max + weights snapshot
  scrapers/tcas_checkpoints/discovered_codes.json   — resume marker

Usage:
    python tcas_admission.py --discover     # just fetch courses.json
    python tcas_admission.py --limit 20     # sample N programs
    python tcas_admission.py                # full run (~10 min, concurrent)
"""

import argparse
import concurrent.futures as cf
import json
import os
import sys
import time
from typing import Optional
import requests

BASE = "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; TCAS-Calculator-Bot/1.0; +contact: labs@zentrix.co.th)"}
YEAR = 2569
ROUND_TYPE_PREFIX = "3_"        # Round 3 = Admission
STAT_YEAR = 2568                # ly-programs are last-year stats

HERE = os.path.dirname(__file__)
DATA_DIR = os.path.join(HERE, "..", "data")
CKPT_DIR = os.path.join(HERE, "tcas_checkpoints")
QUOTA_OUT = os.path.join(DATA_DIR, "tcas-quota-69.json")
STAT_OUT = os.path.join(DATA_DIR, "tcas-stat-68.json")
DISCOVER_OUT = os.path.join(CKPT_DIR, "discovered_codes.json")

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def fetch_json(url: str, retries: int = 2) -> Optional[object]:
    for i in range(retries + 1):
        try:
            r = SESSION.get(url, timeout=20)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except Exception:
            if i == retries:
                return None
            time.sleep(0.5)
    return None


def discover() -> list[dict]:
    print(f"📥 ดึง courses.json จาก S3 …")
    courses = fetch_json(f"{BASE}/courses.json")
    if not isinstance(courses, list):
        raise RuntimeError("courses.json ไม่ใช่ array")
    print(f"✅ พบ {len(courses)} หลักสูตร")
    os.makedirs(CKPT_DIR, exist_ok=True)
    with open(DISCOVER_OUT, "w", encoding="utf-8") as f:
        json.dump(
            {"scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"), "count": len(courses), "courses": courses},
            f, ensure_ascii=False,
        )
    print(f"   → {DISCOVER_OUT}")
    return courses


def fetch_one(course: dict) -> tuple[dict, list, Optional[dict]]:
    pid = course["program_id"]
    rounds = fetch_json(f"{BASE}/rounds/{pid}.json") or []
    ly = fetch_json(f"{BASE}/ly-programs/{pid}.json") or []
    ly_first = ly[0] if isinstance(ly, list) and ly else None
    return course, rounds, ly_first


def build_program_record(course: dict, project: dict) -> dict:
    scores = project.get("scores", {}) or {}
    weights = []
    for raw_code, w in scores.items():
        if not isinstance(w, (int, float)) or w <= 0:
            continue
        weights.append({
            "exam_code": raw_code.upper(),     # mytcas uses lowercase keys
            "weight_percent": float(w),
            "min_subject_score": None,
            "raw_subject_code": raw_code,
            "raw_subject_name": "",
        })
    return {
        "external_id": course["program_id"],
        "project_id": project.get("project_id", ""),
        "project_name_th": project.get("project_name_th", ""),
        "type": project.get("type", ""),
        "year": YEAR,
        "round": "3_ADMISSION",
        "university": course.get("university_name_th", ""),
        "university_id": course.get("university_id", ""),
        "faculty": course.get("faculty_name_th", ""),
        "campus": course.get("campus_name_th", ""),
        "program_name": course.get("program_name_th", ""),
        "program_type": course.get("program_type_name_th", ""),
        "min_gpax": project.get("min_gpax"),
        "min_total_score": project.get("min_total_score"),
        "receive_student_number": project.get("receive_student_number"),
        "weights": weights,
        "source_url": f"https://course.mytcas.com/programs/{course['program_id']}",
    }


def build_stat_record(course: dict, ly: dict) -> dict:
    scores = ly.get("scores", {}) or {}
    weights = []
    for raw_code, w in scores.items():
        if not isinstance(w, (int, float)) or w <= 0:
            continue
        weights.append({
            "exam_code": raw_code.upper(),
            "weight_percent": float(w),
            "raw_subject_code": raw_code,
        })
    return {
        "external_id": course["program_id"],
        "year": STAT_YEAR,
        "round": "3_ADMISSION",
        "university": course.get("university_name_th", ""),
        "faculty": course.get("faculty_name_th", ""),
        "program_name": ly.get("program_name_th") or course.get("program_name_th", ""),
        "min_score": ly.get("min_score"),
        "max_score": ly.get("max_score"),
        "mean_score": None,
        "est_min_score_mean": ly.get("est_min_score_mean"),
        "est_min_score_regression": ly.get("est_min_score_regression"),
        "is_predicted": False,
        "weights": weights,
        "source": "mytcas_ly_programs",
    }


def run(limit: Optional[int], workers: int = 20):
    courses = discover()
    if limit:
        courses = courses[:limit]
        print(f"⚠️  จำกัดที่ {limit} หลักสูตร")

    quota_records: list[dict] = []
    stat_records: list[dict] = []
    failures: list[str] = []
    rounds_seen: dict[str, int] = {}

    t0 = time.time()
    done = 0
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(fetch_one, c) for c in courses]
        for fut in cf.as_completed(futures):
            try:
                course, rounds, ly = fut.result()
            except Exception as e:
                failures.append(str(e))
                continue

            # quota: filter to Round 3 entries
            for project in rounds:
                t = project.get("type", "")
                rounds_seen[t] = rounds_seen.get(t, 0) + 1
                if t.startswith(ROUND_TYPE_PREFIX):
                    quota_records.append(build_program_record(course, project))

            # stat: take ly entry if present
            if ly:
                stat_records.append(build_stat_record(course, ly))

            done += 1
            if done % 250 == 0:
                dt = time.time() - t0
                eta = dt / done * (len(courses) - done)
                print(f"   [{done}/{len(courses)}] elapsed {dt:.0f}s, ETA {eta:.0f}s")

    os.makedirs(DATA_DIR, exist_ok=True)
    meta = {
        "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "source": BASE,
        "total_courses": len(courses),
        "round_types_seen": rounds_seen,
        "failures": len(failures),
    }
    with open(QUOTA_OUT, "w", encoding="utf-8") as f:
        json.dump({"metadata": {**meta, "year": YEAR, "round": "3_ADMISSION",
                                 "total_programs": len(quota_records)},
                   "programs": quota_records}, f, ensure_ascii=False, indent=2)
    with open(STAT_OUT, "w", encoding="utf-8") as f:
        json.dump({"metadata": {**meta, "year": STAT_YEAR, "round": "3_ADMISSION",
                                "total_records": len(stat_records)},
                   "records": stat_records}, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Round 3 weights:   {len(quota_records):>5} → {QUOTA_OUT}")
    print(f"✅ Last-year stats:   {len(stat_records):>5} → {STAT_OUT}")
    print(f"   round_types_seen: {rounds_seen}")
    print(f"   failures: {len(failures)}")
    print(f"   elapsed: {time.time()-t0:.0f}s")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--discover", action="store_true")
    p.add_argument("--limit", type=int)
    p.add_argument("--workers", type=int, default=20)
    args = p.parse_args()

    if args.discover:
        discover()
        return
    run(limit=args.limit, workers=args.workers)


if __name__ == "__main__":
    main()
