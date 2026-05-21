# TO-DO — TCAS & NETSAT Data Acquisition Guide

> **Complete data acquisition playbook** for both NETSAT (KKU Round 2) and TCAS (Rounds 1-4)
> 
> Last updated: 2026-05-21 | TCAS Year: 69 (academic year 2569)
> 
> Stack: Pee Rahat monorepo (Next.js 14 + NestJS + Prisma + Supabase Postgres)

---

## 🗂️ Work Breakdown

| # | Task | Output File | Est. Time |
|---|---|---|---|
| 0 | Setup environment | — | 30 min |
| 1 | KKU NETSAT criteria (weights) | `data/kku-quota-69.json` | 30 min |
| 2 | KKU NETSAT historical scores | `data/kku-stat-68.json` | 30 min |
| 3 | TCAS official calendar | `data/tcas-calendar-69.json` | 30 min (manual) |
| 4 | TCAS Round 3 criteria | `data/tcas-quota-69.json` | 1-2 hr |
| 5 | TCAS Round 3 historical scores | `data/tcas-stat-68.json` | (combined with #4) |
| 6 | Validate + Import to Prisma DB | DB rows | 1 hr |
| 7 | Annual update playbook | — | — |

**Total: ~6-8 hours** (mostly scrape waiting time)

**Run frequency:** Once per academic year (October/November after MUA publishes criteria)

---

## 0. Setup Environment

### Project location

Scrapers are Python utilities that run outside the Node/TypeScript app. Place them in:

```
apps/api/scripts/scrapers/
├── .venv/                       # gitignored
├── data/                        # gitignored — JSON outputs
├── tcas_checkpoints/            # gitignored — resumable scrape state
├── kku_quota.py
├── kku_stat.py
├── tcas_calendar.py             # optional (manual is recommended)
├── tcas_admission.py            # quota + stat combined
└── README.md
```

### Add to `.gitignore`

```
apps/api/scripts/scrapers/.venv/
apps/api/scripts/scrapers/data/
apps/api/scripts/scrapers/tcas_checkpoints/
```

### Python dependencies

```bash
cd apps/api/scripts/scrapers
python3 -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate

pip install requests beautifulsoup4 lxml playwright python-dateutil
playwright install chromium
```

### Verify connectivity before scraping

```bash
curl -I https://apps.admissions.kku.ac.th/web/Quota
curl -I https://apps.admissions.kku.ac.th/web/Stat
curl -I https://course.mytcas.com/
# All should return 200
```

---

## 1. KKU NETSAT — Criteria (Weights)

### Data source

- **Index:** `https://apps.admissions.kku.ac.th/web/Quota`
- **Detail pattern:** `/web/quota/detail/{group_id}/{program_id}`

**Page structure:** Standard server-rendered HTML (not SPA). Detail pages have a clean `<table>` with subject codes, names, weight %, and minimum scores.

**Volume:** ~150 programs
**Scrape time:** ~3 minutes (1 second delay per request)

### Fields to extract

| Field | Source | Example |
|---|---|---|
| `external_id` | URL path | `13540` |
| `group_id` | URL path | `5524` |
| `university` | hardcoded | `"มหาวิทยาลัยขอนแก่น"` |
| `faculty` | index column 1 | `"คณะวิศวกรรมศาสตร์"` |
| `program_name` | index column 2 | `"วศ.บ. (วิศวกรรมคอมพิวเตอร์)"` |
| `min_total_percent` | regex `คะแนนรวมขั้นต่ำ X คะแนน` | `30` (default), `50` (medical) |
| `min_gpax` | regex `GPAX.*X.XX` | `2.50` or `null` |
| `weights[].exam_code` | mapped from KKU code | `NETSAT_MATH`, `TPAT3` |
| `weights[].weight_percent` | table column 4 | `30` |
| `weights[].min_subject_score` | table column 5 (optional) | `20` or `null` |
| `source_url` | full detail URL | — |

### Exam code mapping (critical — keep stable)

KKU uses numeric codes. Map them to standard codes used throughout the app:

```python
EXAM_CODE_MAP = {
    # NETSAT SAT1 — general aptitude
    "101": "NETSAT_THAI",
    "102": "NETSAT_ENG",
    "103": "NETSAT_MATH",
    "104": "NETSAT_SCI",
    "105": "NETSAT_SOC",
    # NETSAT SAT2 — subject-specific aptitude
    "201": "NETSAT_BIO_BASIC",
    "202": "NETSAT_CHEM",
    "203": "NETSAT_BIO",
    "204": "NETSAT_PHYSICS",
    "205": "NETSAT_MATH_ADV",
    # TPAT (some programs mix NETSAT with TPAT)
    "10": "TPAT1",
    "20": "TPAT2",
    "30": "TPAT3",
    "40": "TPAT4",
    "50": "TPAT5",
}
```

⚠️ If a code isn't in this map, the script tags it `UNKNOWN_xxx` in the JSON. **Always update the map before importing**, never silently drop unknown subjects.

### Run

```bash
python kku_quota.py 3              # sanity check on 3 programs
python kku_quota.py                # full run
# → data/kku-quota-69.json
```

### Acceptance criteria

- [ ] ≥ 95% of programs scraped successfully (≥ 145/150)
- [ ] Every program has `weights[]` with length ≥ 1
- [ ] Sum of `weight_percent` ≈ 100 for every program (warn if ≠ 100)
- [ ] Manual QA on 10 random programs against the live site
- [ ] Zero `UNKNOWN_*` exam codes (extend the map if any appear)

---

## 2. KKU NETSAT — Historical Scores (min/max/mean)

### Data source

- **Index:** `https://apps.admissions.kku.ac.th/web/Stat`
- **Detail pattern:** `/web/stat/detail/{group_id}/{program_id}`

**Important:** KKU is unique in publishing **mean scores** alongside min/max. Most other sources only publish min.

**Volume:** ~197 programs (more than `/web/Quota` because it includes programs once offered but not this year)

### Fields to extract

| Field | Notes |
|---|---|
| `external_id` | URL path |
| `year` | `2568` (the academic year the stats apply to) |
| `round` | `"2_NETSAT"` |
| `min_score` | regex `คะแนนต่ำสุด X.XX` |
| `max_score` | regex `คะแนนสูงสุด X.XX` |
| `mean_score` | regex `คะแนนเฉลี่ย X.XX` (KKU-specific) |
| `applicants` | optional |
| `admitted` | optional |
| `is_predicted` | `false` (these are actuals, not forecasts) |
| `source` | `"kku_official_stat"` |

### 🚨 The 197 vs 150 mismatch

This is **expected** and important:

- **~120 programs:** Have both quota + stat → matched, `status='active'`
- **~30 programs:** Have quota but no stat → new programs this year, `status='active'`, no history
- **~77 programs:** Have stat but no quota → not offered this year, `status='inactive'`

**Decision:** Keep all 197. The 77 inactive programs:
- Still appear in the web UI (with "Not offered this year" badge)
- Calculator is disabled for them
- Historical stats are shown for reference

The import script handles this automatically (see Section 6).

### Run

```bash
python kku_stat.py 3              # test
python kku_stat.py                # full run
# → data/kku-stat-68.json
```

### Acceptance criteria

- [ ] ≥ 190/197 programs scraped
- [ ] Every record has `min_score < max_score`
- [ ] `mean_score` (when present) is between `[min, max]`
- [ ] Manual QA on 10 random programs

---

## 3. TCAS Official Calendar

### Data source

- **Primary:** `https://www.mytcas.com/` (homepage timeline)
- **Detailed:** `https://www.mytcas.com/news/67/` (official TCAS69 calendar)

### Why manual entry beats scraping here

The official calendar:
1. Is published once a year (around October/November)
2. Contains only **~30 events** total
3. Often appears as images or PDFs on mytcas.com — hard to parse reliably
4. Is stable once published (changes are rare and announced via news)

**Recommendation: enter manually.** It takes 20-30 minutes and produces cleaner data than fragile scraping.

### Target JSON structure

```json
{
  "year": 69,
  "academic_year": 2569,
  "scraped_at": "2026-05-21T10:00:00Z",
  "source": "https://www.mytcas.com/news/67/",
  "rounds": [
    {
      "round_code": "R1_PORTFOLIO",
      "round_name_th": "รอบที่ 1 Portfolio",
      "events": [
        {
          "event_type": "register",
          "title_th": "เปิดรับสมัคร",
          "date_start": "2025-11-01",
          "date_end": "2025-12-15",
          "note": "มหาวิทยาลัยกำหนด"
        },
        {
          "event_type": "confirm",
          "title_th": "ยืนยันสิทธิ์",
          "date_start": "2026-03-06",
          "date_end": "2026-03-06"
        }
      ]
    },
    { "round_code": "R2_QUOTA", "...": "..." },
    { "round_code": "R3_ADMISSION", "...": "..." },
    { "round_code": "R4_DIRECT", "...": "..." }
  ],
  "exam_events": [
    {
      "exam_code": "TGAT_TPAT",
      "event_type": "register",
      "title_th": "รับสมัครสอบ TGAT/TPAT",
      "date_start": "2025-10-30",
      "date_end": "2025-11-06"
    },
    {
      "exam_code": "TGAT_TPAT",
      "event_type": "exam",
      "title_th": "สอบ TGAT/TPAT",
      "date_start": "2025-12-13",
      "date_end": "2025-12-15"
    },
    {
      "exam_code": "A_LEVEL",
      "event_type": "exam",
      "title_th": "สอบ A-Level",
      "date_start": "2026-03-07",
      "date_end": "2026-03-10"
    },
    {
      "exam_code": "NETSAT",
      "event_type": "exam",
      "title_th": "สอบ NETSAT",
      "date_start": "2025-12-20",
      "date_end": "2025-12-21"
    }
  ]
}
```

### Event type vocabulary

Use these exact codes (matches `CalendarEventType` enum in Prisma — see `NETSAT-TCAS-DB.md`):

| Code | Meaning |
|---|---|
| `register` | Application open/close |
| `exam` | Exam day(s) |
| `result` | Result announcement |
| `confirm` | Confirm seat (ยืนยันสิทธิ์) |
| `release` | Release seat (สละสิทธิ์) |
| `interview` | Interview day(s) |

### TCAS69 round overview (verify against mytcas.com)

| Round | Apply | Confirm |
|---|---|---|
| 1 Portfolio | University-determined | 6 มี.ค. 69 |
| 2 Quota | University-determined | 4 พ.ค. 69 |
| 3 Admission | 6-12 พ.ค. 69 | 20-21 พ.ค. 69 |
| 4 Direct | 28 พ.ค. - 14 มิ.ย. 69 | University-determined |

### KKU-specific dates (for NETSAT tab)

- Apply Round 2: 25 ก.พ. - 12 มี.ค. 69
- First result: 24 มี.ค. 69
- Clearing house: 2 พ.ค. 69
- Source: `https://admissions.kku.ac.th/`

### Acceptance criteria

- [ ] All 4 TCAS rounds present
- [ ] `exam_events[]` covers TGAT/TPAT, A-Level, and NETSAT
- [ ] All dates are ISO format (`YYYY-MM-DD`)
- [ ] All `event_type` values are from the allowed set
- [ ] Source URL recorded for traceability

---

## 4. TCAS Round 3 — Criteria (Weights)

### Data source

- **URL:** `https://course.mytcas.com/`
- **Detail pattern:** `/programs/{program_code}?major={major}` (e.g. `10020106700301A?major=K`)

⚠️ **This is a Single Page Application.** Initial HTML is empty — content loads via JavaScript. **Requires Playwright** or finding a hidden API.

### 🎯 Before scraping — try these three things first

**1. Look for a hidden API (10x faster if found)**

```
Open https://course.mytcas.com/ in Chrome
→ DevTools (F12) → Network tab → filter "Fetch/XHR"
→ Reload + perform a search
→ Look for /api/* endpoints returning JSON
```

If found, use `requests.get()` instead of Playwright. Document the endpoint in the scraper.

**2. Email CUPT/TCAS for an official data dump**

```
To: cupt-tcas@cupt.or.th
Subject: ขออนุญาตใช้ข้อมูลเกณฑ์การคัดเลือก TCAS69 เพื่อทำเครื่องคำนวณคะแนน

เรียน ทปอ.

ผม [name] จากทีม Pee Rahat (peerahat.com) กำลังพัฒนาเครื่องคำนวณคะแนน TCAS 
เพื่อช่วยน้องๆ ม.6 ประเมินโอกาสติดและวางแผนการอ่านหนังสือ

ขอเรียนถามว่า:
1. ทปอ. มี data dump (CSV/JSON) หรือ API ที่อนุญาตให้ใช้เพื่อ
   วัตถุประสงค์ทางการศึกษาไหมครับ?
2. ถ้าไม่มี ผมต้อง scrape เว็บ ขอเรียนถามมารยาทที่ควรปฏิบัติ
   (rate limit, ช่วงเวลาที่ควรหลีกเลี่ยง)

ผมยินดีใส่ลิงก์ source กลับไปยังเว็บไซต์ ทปอ. และใส่ disclaimer
ว่าข้อมูลอย่างเป็นทางการอยู่ที่ mytcas.com

ขอบพระคุณครับ
[name] | [email] | [phone]
```

Send this **2-3 days before** you plan to scrape. If they provide a data dump, you save 90% of the work.

**3. Check robots.txt and the existing Admin AI Import**

```bash
curl https://course.mytcas.com/robots.txt
```

The project already has `apps/api/src/admin/tcas-import/` which uses **Gemini** to parse TCAS criteria PDFs. If MUA publishes a master PDF this year, that pipeline may be easier than scraping the SPA. Check the admin tooling first.

### Fields to extract

| Field | Source |
|---|---|
| `external_id` | 18-char program code |
| `university` | Detail page heading |
| `faculty` | Detail page heading |
| `program_name` | Detail page heading |
| `campus` | Optional |
| `min_gpax` | Regex on detail page |
| `weights[].exam_code` | Subject name → mapped code (see below) |
| `weights[].weight_percent` | Criteria table |
| `weights[].min_subject_score` | Optional, criteria table |

### Subject name mapping

```python
SUBJECT_NAME_TO_CODE = {
    # TGAT
    "TGAT1": "TGAT1", "การสื่อสารภาษาอังกฤษ": "TGAT1",
    "TGAT2": "TGAT2", "การคิดอย่างมีเหตุผล": "TGAT2",
    "TGAT3": "TGAT3", "สมรรถนะการทำงาน": "TGAT3",
    # TPAT
    "TPAT1": "TPAT1", "กสพท": "TPAT1",
    "TPAT2": "TPAT2", "ศิลปกรรมศาสตร์": "TPAT2",
    "TPAT3": "TPAT3", "วิทยาศาสตร์ เทคโนโลยี วิศวกรรมศาสตร์": "TPAT3",
    "TPAT4": "TPAT4", "สถาปัตยกรรม": "TPAT4",
    "TPAT5": "TPAT5", "ครุศาสตร์": "TPAT5",
    # A-Level
    "คณิตศาสตร์ประยุกต์ 1": "A_LEVEL_MATH1",
    "คณิตศาสตร์ประยุกต์ 2": "A_LEVEL_MATH2",
    "วิทยาศาสตร์ประยุกต์": "A_LEVEL_SCI",
    "ฟิสิกส์": "A_LEVEL_PHY",
    "เคมี": "A_LEVEL_CHE",
    "ชีววิทยา": "A_LEVEL_BIO",
    "ภาษาไทย": "A_LEVEL_THAI",
    "สังคมศึกษา": "A_LEVEL_SOC",
    "ภาษาอังกฤษ": "A_LEVEL_ENG",
    "ภาษาฝรั่งเศส": "A_LEVEL_FR",
    "ภาษาเยอรมัน": "A_LEVEL_DE",
    "ภาษาญี่ปุ่น": "A_LEVEL_JP",
    "ภาษาจีน": "A_LEVEL_CN",
    "ภาษาเกาหลี": "A_LEVEL_KR",
    "ภาษาบาลี": "A_LEVEL_PALI",
    "ภาษาอาหรับ": "A_LEVEL_AR",
}
```

### Run strategy

```bash
# Phase A — discover all program codes (~10 min)
python tcas_admission.py --discover
# → tcas_checkpoints/discovered_codes.json

# Phase B — manual QA on 5 programs
python tcas_admission.py --limit 5
# Inspect JSON output against the live site

# Phase C — full scrape (~30-60 min)
python tcas_admission.py
# Checkpoints saved every 50 programs
# If it crashes, just re-run the same command — resumes automatically
```

### Scraping etiquette (mandatory)

The TCAS system is critical infrastructure used by hundreds of thousands of students annually. Disrupting it harms real people.

- ✅ **1.5-3 second delay per request** + jitter (don't reduce)
- ✅ **User-Agent identifies you + contact email**
- ✅ **Best time:** January-February (after criteria publish, before application opens)
- ❌ **Avoid peak periods:**
  - Oct 28 (registration opens)
  - May 6-12 (Round 3 applications)
  - Result announcement days
- ❌ **Never parallel scrape** — one browser, one page at a time
- ❌ **If rate-limited or IP-banned** → stop immediately and contact CUPT

### Acceptance criteria

- [ ] ≥ 95% of discovered programs scraped
- [ ] Every program has `weights[]` length ≥ 1
- [ ] `UNKNOWN_*` subjects < 1% (update mapping if higher)
- [ ] Manual QA on 20 random programs against `mytcas.com`

---

## 5. TCAS Round 3 — Historical Scores

### Data source

- **URL:** `https://www.mytcas.com/stat/`

Contains:
- **Predicted** minimum scores for the current year (`is_predicted: true`)
- **Actual** scores from previous years (`is_predicted: false`)
- Separate sections for "กสพท" (medical group) and standard programs

### Important: combined scrape

The `course.mytcas.com` detail pages typically show **both** the criteria table AND historical scores on the same page. So Section 4's scraper (`tcas_admission.py`) should produce **two** JSON files in a single run:

```
data/tcas-quota-69.json    # weights
data/tcas-stat-68.json     # historical scores
```

If `mytcas.com/stat/` is separate from `course.mytcas.com/programs/*`, write a third scraper. But check first — most likely they're on the same page.

### Fields

| Field | Notes |
|---|---|
| `external_id` | Must match programs from Section 4 |
| `year` | `2568` for last year's actuals |
| `round` | `"3_ADMISSION"` |
| `min_score` | Cutoff (lowest admitted score) |
| `max_score` | Highest admitted score (often absent) |
| `mean_score` | Usually `null` (CUPT doesn't publish means) |
| `is_predicted` | `true` for current year forecasts, `false` for past actuals |
| `source` | `"mytcas_stat"` |

### Acceptance criteria

- [ ] ≥ 80% match rate with programs scraped in Section 4
- [ ] All numeric scores in `[0, 100]` range
- [ ] `is_predicted` flag is correct (matters for UI labeling)

---

## 6. Validate + Import into Prisma DB

### Pre-import validation

Run this on every JSON file before importing:

```typescript
// apps/api/scripts/validate-tcas-data.ts
function validate(program: ProgramInput): string[] {
  const errors: string[] = [];
  
  // 1. Weights must sum to ~100
  const total = program.weights.reduce((s, w) => s + w.weight_percent, 0);
  if (Math.abs(total - 100) > 1) {
    errors.push(`Weight sum = ${total}, expected ~100`);
  }
  
  // 2. No UNKNOWN_* codes allowed
  for (const w of program.weights) {
    if (w.exam_code.startsWith('UNKNOWN_')) {
      errors.push(`Unmapped subject: ${w.raw_subject_name}`);
    }
  }
  
  // 3. Reasonable numeric ranges
  if (program.min_total_percent < 0 || program.min_total_percent > 100) {
    errors.push(`Invalid min_total_percent: ${program.min_total_percent}`);
  }
  
  // 4. Required fields
  if (!program.faculty || !program.program_name) {
    errors.push(`Missing faculty or program_name`);
  }
  
  return errors;
}
```

### Import order (do not change)

```
1. seedExams()                    — master subject list (28 rows)
2. importKkuQuota('kku-quota-69') — KKU active programs + weights
3. importKkuStat('kku-stat-68')   — KKU history (match active or create inactive)
4. importTcasQuota('tcas-quota')  — TCAS active programs + weights
5. importTcasStat('tcas-stat')    — TCAS history
6. importCalendar('tcas-cal-69')  — calendar events
```

### Run

The full import script is documented in `NETSAT-TCAS-DB.md` (Section: Import Flow). Run via:

```bash
cd apps/api
pnpm prisma migrate dev --name add_tcas_calculator_data    # first time only
pnpm tsx scripts/import-tcas-data.ts
```

### Acceptance criteria

- [ ] `tcas_programs` count ≥ 250 (150 KKU + Round 3 popular programs at minimum)
- [ ] `tcas_program_weights` count ≥ 3 × `tcas_programs`
- [ ] `tcas_historical_scores` count ≥ 190 (KKU stat at minimum)
- [ ] Zero `UNKNOWN_*` exam codes in `tcas_program_weights`
- [ ] `SELECT status, COUNT(*) FROM tcas_programs GROUP BY status` shows expected mix

---

## 7. Annual Update Playbook

### When to refresh data

| Month | Event | Action |
|---|---|---|
| **Oct** | CUPT publishes new-year criteria | Run `tcas_admission.py` + `kku_quota.py` |
| **Oct-Nov** | TCAS registration opens | Update calendar JSON |
| **Nov-Dec** | TGAT/TPAT exams | No action |
| **Mar** | Round 1+2 results announced | Run `kku_stat.py` for previous year's actuals |
| **May** | Round 3 applications + results | Run TCAS stat scraper for previous year |
| **Jun-Jul** | TCAS year closes | Cleanup, prep for next year |

### Yearly checklist (end of October every year)

- [ ] Verify KKU `/web/Quota` and `/web/Stat` URLs are still live
- [ ] Inspect `course.mytcas.com` DOM (selectors may have changed)
- [ ] Update `year` constants in all scrapers (2569 → 2570)
- [ ] Update `EXAM_CODE_MAP` if KKU added new subject codes
- [ ] Run all scrapers with `--limit 5` first
- [ ] Run full scrapes
- [ ] Update calendar JSON manually from mytcas.com
- [ ] Backup current DB: `pg_dump $DATABASE_URL > backups/before-YYYY-import.sql`
- [ ] Run import script
- [ ] Manual QA on 20 programs
- [ ] Deploy + announce on social media

### Rollback plan

If a new year's import is broken:

```bash
# Restore previous backup
psql $DATABASE_URL < backups/before-2570-import.sql

# Investigate, fix, re-run
```

---

## 📞 Contacts & Resources

| Org | Contact | Purpose |
|---|---|---|
| KKU Admissions | `admissions@kku.ac.th` / 095-6694704 | Pre-launch courtesy notice |
| CUPT/TCAS | `cupt-tcas@cupt.or.th` | Request official data dump |

### Reference URLs

- KKU Quota criteria: `https://apps.admissions.kku.ac.th/web/Quota`
- KKU historical stats: `https://apps.admissions.kku.ac.th/web/Stat`
- KKU all-years stat index: `https://admissions.kku.ac.th/quota-scores/`
- TCAS course catalog: `https://course.mytcas.com/`
- TCAS official calendar: `https://www.mytcas.com/news/67/`
- TCAS stat: `https://www.mytcas.com/stat/`

---

## 🚨 Critical Reminders

1. **Scrape at most once per year per source.** Cache the JSON in git so you don't need to re-scrape.
2. **Always check `UNKNOWN_*` exam codes** before importing. New subjects appear yearly.
3. **Manual QA has no shortcut** — at least 10-20 programs per source, every year.
4. **Disclaimer is mandatory** in the UI: "Historical data is not a guarantee."
5. **Always email organizations** before first scrape and before each yearly refresh.
