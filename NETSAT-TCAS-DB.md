# NETSAT-TCAS-DB — Database Integration & Frontend Data Flow

> **How to connect the scraped data to the Pee Rahat system + what shows up on the frontend**
> 
> Companion to `TO-DO.md` (data acquisition). This file covers everything that happens *after* you have JSON files in `data/`.
> 
> Stack: Next.js 14 + NestJS + Prisma + Supabase Postgres

---

## 📐 Architecture Overview

```
┌─────────────────┐
│  Python         │
│  Scrapers       │ ─→  JSON files in data/
│  (TO-DO.md)     │
└─────────────────┘
                          │
                          ↓
                   ┌────────────────────────┐
                   │ Import Script          │
                   │ (TypeScript + Prisma)  │
                   └────────────────────────┘
                          │
                          ↓
        ┌─────────────────────────────────────────┐
        │  Supabase Postgres (via Prisma)         │
        │  ┌────────────────────────────────────┐ │
        │  │ TcasExam (master)                  │ │
        │  │ TcasProgram (active | inactive)    │ │
        │  │ ProgramWeight                      │ │
        │  │ HistoricalScore                    │ │
        │  │ TcasCalendarEvent                  │ │
        │  └────────────────────────────────────┘ │
        └─────────────────────────────────────────┘
                          │
                          ↓
        ┌─────────────────────────────────────────┐
        │  NestJS API (apps/api/src/tcas/)        │
        │  GET  /tcas/calendar                    │
        │  GET  /tcas/exams                       │
        │  GET  /tcas/programs                    │
        │  GET  /tcas/programs/:id                │
        │  POST /tcas/calculate                   │
        │  POST /tcas/similar                     │
        └─────────────────────────────────────────┘
                          │
                          ↓
        ┌─────────────────────────────────────────┐
        │  Next.js Frontend (apps/web/app/tcas)   │
        │  ┌────────────────────────────────────┐ │
        │  │  [ NETSAT ] [ TCAS ]  ← Tabs       │ │
        │  │  Calendar | Picker | Form | Result │ │
        │  └────────────────────────────────────┘ │
        └─────────────────────────────────────────┘
```

---

## 🗄️ Prisma Schema Additions

Add the following to `apps/api/prisma/schema.prisma`. The existing TCAS calculator and admin AI import will keep working — these models add the scraped-data backbone.

### Enums

```prisma
enum ProgramStatus {
  active     // Currently accepting applications this year
  inactive   // Not offered this year but has historical scores (still shown)
  closed     // Permanently closed (reserved for future use)
}

enum ExamFamily {
  NETSAT     // KKU's NETSAT subjects
  TCAS       // Standard TCAS subjects (TGAT/TPAT/A-Level)
}

enum TcasRound {
  R1_PORTFOLIO        // Round 1
  R2_QUOTA            // Round 2 (generic quota)
  R2_NETSAT           // Round 2 KKU-specific (uses NETSAT exam)
  R3_ADMISSION        // Round 3
  R4_DIRECT           // Round 4
}

enum CalendarEventType {
  register     // Application open/close
  exam         // Exam day(s)
  result       // Result announcement
  confirm      // Confirm seat (ยืนยันสิทธิ์)
  release      // Release seat (สละสิทธิ์)
  interview    // Interview day(s)
}
```

### Models

```prisma
// Master list of all exam subjects (NETSAT + TCAS)
model TcasExam {
  code         String     @id                          // 'NETSAT_MATH', 'TGAT1', 'A_LEVEL_PHY'
  nameTh       String
  nameEn       String?
  maxScore     Decimal    @default(100) @db.Decimal(6, 2)
  examFamily   ExamFamily
  displayOrder Int        @default(0)
  
  weights      ProgramWeight[]
  
  @@map("tcas_exams")
}

// Programs/faculties
model TcasProgram {
  id               Int            @id @default(autoincrement())
  externalId       String                                   // ID from source URL
  groupId          String?
  year             Int                                      // 2569
  round            TcasRound
  university       String
  faculty          String
  programName      String
  campus           String?
  seats            Int?
  minGpax          Decimal?       @db.Decimal(3, 2)
  minTotalPercent  Decimal        @default(30) @db.Decimal(5, 2)
  englishRequired  Boolean        @default(false)
  status           ProgramStatus  @default(active)
  notes            String?
  sourceUrl        String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  
  weights          ProgramWeight[]
  history          HistoricalScore[]
  
  @@unique([externalId, year, round, university])
  @@index([year, round, university, status])
  @@index([faculty])
  @@index([status])
  @@map("tcas_programs")
}

// Subject weights per program (the "criteria")
model ProgramWeight {
  id                Int          @id @default(autoincrement())
  programId         Int
  examCode          String
  weightPercent     Decimal      @db.Decimal(5, 2)
  minSubjectScore   Decimal?     @db.Decimal(6, 2)
  rawSubjectName    String?                                 // raw text from scrape, for debugging
  
  program           TcasProgram  @relation(fields: [programId], references: [id], onDelete: Cascade)
  exam              TcasExam     @relation(fields: [examCode], references: [code])
  
  @@unique([programId, examCode])
  @@index([programId])
  @@index([examCode])
  @@map("tcas_program_weights")
}

// Historical min/max/mean scores
model HistoricalScore {
  id            Int          @id @default(autoincrement())
  programId     Int
  year          Int
  round         TcasRound
  minScore      Decimal?     @db.Decimal(7, 4)
  maxScore      Decimal?     @db.Decimal(7, 4)
  meanScore     Decimal?     @db.Decimal(7, 4)
  medianScore   Decimal?     @db.Decimal(7, 4)
  applicants    Int?
  admitted      Int?
  isPredicted   Boolean      @default(false)              // true if forecast, false if actual
  source        String?                                    // 'kku_official_stat', 'mytcas_official'
  sourceUrl     String?
  scrapedAt     DateTime     @default(now())
  
  program       TcasProgram  @relation(fields: [programId], references: [id], onDelete: Cascade)
  
  @@unique([programId, year, round])
  @@index([programId, year(sort: Desc)])
  @@map("tcas_historical_scores")
}

// TCAS official calendar — application/exam/result dates
model TcasCalendarEvent {
  id            Int                @id @default(autoincrement())
  year          Int                                          // 2569
  round         TcasRound?                                   // null = exam-related (not round-specific)
  examCode      String?                                      // 'TGAT_TPAT', 'A_LEVEL', 'NETSAT'
  eventType     CalendarEventType
  titleTh       String                                       // e.g. "เปิดรับสมัครรอบ 3 Admission"
  dateStart     DateTime           @db.Date
  dateEnd       DateTime           @db.Date
  note          String?                                      // "มหาวิทยาลัยกำหนด" etc.
  sourceUrl     String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  
  @@index([year, round])
  @@index([dateStart])
  @@map("tcas_calendar_events")
}
```

### Run migration

```bash
cd apps/api
pnpm prisma migrate dev --name add_tcas_calculator_data
pnpm prisma generate
```

---

## 🔄 Import Flow

Create `apps/api/scripts/import-tcas-data.ts`. Uses Prisma Client (not raw SQL) to stay consistent with the rest of the codebase.

### Script structure

```typescript
import { PrismaClient, ProgramStatus, TcasRound, ExamFamily } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DATA_DIR = './apps/api/scripts/scrapers/data';

// ============================================================
// 1. Seed exams (master list)
// ============================================================
const EXAMS = [
  // NETSAT
  { code: 'NETSAT_THAI',     nameTh: 'ภาษาไทย',          examFamily: 'NETSAT', displayOrder: 1 },
  { code: 'NETSAT_ENG',      nameTh: 'ภาษาอังกฤษ',       examFamily: 'NETSAT', displayOrder: 2 },
  { code: 'NETSAT_MATH',     nameTh: 'คณิตศาสตร์',       examFamily: 'NETSAT', displayOrder: 3 },
  { code: 'NETSAT_SCI',      nameTh: 'วิทยาศาสตร์',      examFamily: 'NETSAT', displayOrder: 4 },
  { code: 'NETSAT_SOC',      nameTh: 'สังคมศึกษา',       examFamily: 'NETSAT', displayOrder: 5 },
  { code: 'NETSAT_PHYSICS',  nameTh: 'ฟิสิกส์',          examFamily: 'NETSAT', displayOrder: 6 },
  { code: 'NETSAT_CHEM',     nameTh: 'เคมี',             examFamily: 'NETSAT', displayOrder: 7 },
  { code: 'NETSAT_BIO',      nameTh: 'ชีววิทยา',         examFamily: 'NETSAT', displayOrder: 8 },
  // TPAT
  { code: 'TPAT1', nameTh: 'ความถนัดแพทย์ (กสพท)', examFamily: 'TCAS', displayOrder: 10 },
  { code: 'TPAT2', nameTh: 'ความถนัดศิลปกรรม',     examFamily: 'TCAS', displayOrder: 11 },
  { code: 'TPAT3', nameTh: 'ความถนัดวิทย์-วิศวะ',  examFamily: 'TCAS', displayOrder: 12 },
  { code: 'TPAT4', nameTh: 'ความถนัดสถาปัตย์',     examFamily: 'TCAS', displayOrder: 13 },
  { code: 'TPAT5', nameTh: 'ความถนัดครู',          examFamily: 'TCAS', displayOrder: 14 },
  // TGAT
  { code: 'TGAT1', nameTh: 'TGAT1 ภาษาอังกฤษ',      examFamily: 'TCAS', displayOrder: 20 },
  { code: 'TGAT2', nameTh: 'TGAT2 การคิดมีเหตุผล',  examFamily: 'TCAS', displayOrder: 21 },
  { code: 'TGAT3', nameTh: 'TGAT3 สมรรถนะการทำงาน', examFamily: 'TCAS', displayOrder: 22 },
  // A-Level (add full list of 18 subjects)
  { code: 'A_LEVEL_MATH1', nameTh: 'A-Level คณิตประยุกต์ 1', examFamily: 'TCAS', displayOrder: 30 },
  { code: 'A_LEVEL_PHY',   nameTh: 'A-Level ฟิสิกส์',         examFamily: 'TCAS', displayOrder: 31 },
  // ... etc.
];

async function seedExams() {
  for (const exam of EXAMS) {
    await prisma.tcasExam.upsert({
      where: { code: exam.code },
      create: exam,
      update: exam,
    });
  }
}

// ============================================================
// 2. Import KKU quota → active programs + weights
// ============================================================
async function importKkuQuota(jsonPath: string) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  for (const p of data.programs) {
    const program = await prisma.tcasProgram.upsert({
      where: {
        externalId_year_round_university: {
          externalId: String(p.id),
          year: p.year,
          round: 'R2_NETSAT',
          university: p.university,
        }
      },
      create: {
        externalId: String(p.id),
        groupId: p.group_id ? String(p.group_id) : null,
        year: p.year,
        round: 'R2_NETSAT',
        university: p.university,
        faculty: p.faculty,
        programName: p.program_name,
        minGpax: p.min_gpax,
        minTotalPercent: p.min_total_percent ?? 30,
        status: 'active',
        sourceUrl: p.source_url,
      },
      update: {
        faculty: p.faculty,
        programName: p.program_name,
        minGpax: p.min_gpax,
        minTotalPercent: p.min_total_percent ?? 30,
        status: 'active',
        sourceUrl: p.source_url,
      },
    });
    
    // Replace weights (in case criteria changed)
    await prisma.programWeight.deleteMany({ where: { programId: program.id } });
    await prisma.programWeight.createMany({
      data: p.weights
        .filter((w: any) => !w.exam_code.startsWith('UNKNOWN_'))
        .map((w: any) => ({
          programId: program.id,
          examCode: w.exam_code,
          weightPercent: w.weight_percent,
          minSubjectScore: w.min_subject_score,
          rawSubjectName: w.raw_subject_name,
        })),
    });
  }
}

// ============================================================
// 3. Import KKU stat → history (match active or create inactive)
// ============================================================
async function importKkuStat(jsonPath: string) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  let matched = 0;
  let createdInactive = 0;
  
  for (const s of data.historical_scores) {
    // Try to find existing program
    let program = await prisma.tcasProgram.findFirst({
      where: {
        externalId: String(s.program_id),
        university: 'มหาวิทยาลัยขอนแก่น',
      },
      orderBy: { year: 'desc' },
    });
    
    // If no match → create inactive program (key insight)
    if (!program) {
      program = await prisma.tcasProgram.create({
        data: {
          externalId: String(s.program_id),
          year: s.year,
          round: 'R2_NETSAT',
          university: 'มหาวิทยาลัยขอนแก่น',
          faculty: s.faculty || 'ไม่ระบุ',
          programName: s.program_name || 'ไม่ระบุ',
          status: 'inactive',                   // ← THIS is what keeps the 77 programs
          notes: 'หลักสูตรไม่เปิดรับในปีปัจจุบัน — แสดงข้อมูลย้อนหลัง',
          sourceUrl: s.source_url,
        },
      });
      createdInactive++;
    } else {
      matched++;
    }
    
    // Insert historical score
    await prisma.historicalScore.upsert({
      where: {
        programId_year_round: {
          programId: program.id,
          year: s.year,
          round: 'R2_NETSAT',
        }
      },
      create: {
        programId: program.id,
        year: s.year,
        round: 'R2_NETSAT',
        minScore: s.min_score,
        maxScore: s.max_score,
        meanScore: s.mean_score,
        applicants: s.applicants,
        admitted: s.admitted,
        isPredicted: s.is_predicted ?? false,
        source: s.source,
        sourceUrl: s.source_url,
      },
      update: {
        minScore: s.min_score,
        maxScore: s.max_score,
        meanScore: s.mean_score,
        scrapedAt: new Date(),
      },
    });
  }
  
  console.log(`✅ matched ${matched}, created ${createdInactive} inactive`);
}

// ============================================================
// 4-5. TCAS quota + stat — same pattern, just change round to R3_ADMISSION
// ============================================================
async function importTcasQuota(jsonPath: string) {
  // Similar to importKkuQuota but:
  //   - round: 'R3_ADMISSION'
  //   - university comes from the JSON record (not hardcoded)
}

async function importTcasStat(jsonPath: string) {
  // Similar to importKkuStat
}

// ============================================================
// 6. Import calendar
// ============================================================
async function importCalendar(jsonPath: string) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  // Wipe existing year's events and reinsert (simpler than diffing)
  await prisma.tcasCalendarEvent.deleteMany({ where: { year: data.year } });
  
  // Round-specific events
  for (const round of data.rounds) {
    for (const evt of round.events) {
      await prisma.tcasCalendarEvent.create({
        data: {
          year: data.year,
          round: round.round_code,
          eventType: evt.event_type,
          titleTh: evt.title_th,
          dateStart: new Date(evt.date_start),
          dateEnd: new Date(evt.date_end),
          note: evt.note,
          sourceUrl: data.source,
        },
      });
    }
  }
  
  // Exam-specific events (not round-specific)
  for (const evt of data.exam_events ?? []) {
    await prisma.tcasCalendarEvent.create({
      data: {
        year: data.year,
        round: null,
        examCode: evt.exam_code,
        eventType: evt.event_type,
        titleTh: evt.title_th,
        dateStart: new Date(evt.date_start),
        dateEnd: new Date(evt.date_end),
        sourceUrl: data.source,
      },
    });
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  await seedExams();
  await importKkuQuota(path.join(DATA_DIR, 'kku-quota-69.json'));
  await importKkuStat(path.join(DATA_DIR, 'kku-stat-68.json'));
  await importTcasQuota(path.join(DATA_DIR, 'tcas-quota-69.json'));
  await importTcasStat(path.join(DATA_DIR, 'tcas-stat-68.json'));
  await importCalendar(path.join(DATA_DIR, 'tcas-calendar-69.json'));
  await printSummary();
}

main().finally(() => prisma.$disconnect());
```

### Run

```bash
cd apps/api
pnpm tsx scripts/import-tcas-data.ts
```

---

## 🌐 NestJS API Endpoints

Extend `apps/api/src/tcas/` (existing module). Add these endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/tcas/calendar?year=69` | Calendar events for the year |
| `GET` | `/tcas/exams` | Master exam list (for dynamic form fields) |
| `GET` | `/tcas/programs` | List programs (filter: round, status, faculty, university) |
| `GET` | `/tcas/programs/:id` | One program + weights + history |
| `POST` | `/tcas/calculate` | Compute weighted score + zone + reverse advice |
| `POST` | `/tcas/similar` | Find similar programs (by subject vector similarity) |

### Zod schemas (in `packages/types/src/tcas.ts`)

These are shared between API + Web:

```typescript
import { z } from 'zod';

export const tcasRoundSchema = z.enum([
  'R1_PORTFOLIO', 'R2_QUOTA', 'R2_NETSAT', 'R3_ADMISSION', 'R4_DIRECT'
]);
export type TcasRound = z.infer<typeof tcasRoundSchema>;

export const programStatusSchema = z.enum(['active', 'inactive', 'closed']);
export type ProgramStatus = z.infer<typeof programStatusSchema>;

export const calendarEventTypeSchema = z.enum([
  'register', 'exam', 'result', 'confirm', 'release', 'interview'
]);

export const calendarEventSchema = z.object({
  id: z.number(),
  year: z.number(),
  round: tcasRoundSchema.nullable(),
  examCode: z.string().nullable(),
  eventType: calendarEventTypeSchema,
  titleTh: z.string(),
  dateStart: z.string(),                  // ISO date
  dateEnd: z.string(),
  note: z.string().nullable(),
});

export const programSummarySchema = z.object({
  id: z.number(),
  university: z.string(),
  faculty: z.string(),
  programName: z.string(),
  campus: z.string().nullable(),
  round: tcasRoundSchema,
  status: programStatusSchema,
  minGpax: z.number().nullable(),
  minTotalPercent: z.number(),
  latestHistory: z.object({
    year: z.number(),
    minScore: z.number().nullable(),
    maxScore: z.number().nullable(),
    meanScore: z.number().nullable(),
  }).nullable(),
});

export const calculateRequestSchema = z.object({
  programId: z.number(),
  scores: z.record(z.string(), z.number().min(0).max(100)),
  gpax: z.number().min(0).max(4).optional(),
});

export const zoneSchema = z.enum(['risky', 'borderline', 'competitive', 'safe', 'unknown']);

export const calculateResponseSchema = z.object({
  weightedScore: z.number(),
  eligible: z.boolean(),
  reason: z.string().nullable(),
  breakdown: z.array(z.object({
    examCode: z.string(),
    nameTh: z.string(),
    rawScore: z.number(),
    weightPercent: z.number(),
    contribution: z.number(),
  })),
  zone: zoneSchema,
  zoneInfo: z.object({
    labelTh: z.string(),
    color: z.string(),
    description: z.string(),
  }),
  history: z.object({
    year: z.number(),
    minScore: z.number().nullable(),
    maxScore: z.number().nullable(),
    meanScore: z.number().nullable(),
    isPredicted: z.boolean(),
  }).nullable(),
  bands: z.object({
    risky:       z.object({ from: z.number(), to: z.number() }),
    borderline:  z.object({ from: z.number(), to: z.number() }),
    competitive: z.object({ from: z.number(), to: z.number() }),
    safe:        z.object({ from: z.number(), to: z.number() }),
  }).nullable(),
  nextZone: z.object({
    targetZone: zoneSchema,
    pointsNeeded: z.number(),
  }).nullable(),
  reverseSuggestions: z.array(z.object({
    examCode: z.string(),
    nameTh: z.string(),
    currentScore: z.number(),
    targetScore: z.number(),
    weightPercent: z.number(),
    feasible: z.boolean(),
    efficiencyRank: z.number(),
  })),
});

export type CalculateResponse = z.infer<typeof calculateResponseSchema>;
```

### API_PATHS — `packages/types/src/api.ts`

```typescript
export const API_PATHS = {
  // ... existing
  TCAS_CALENDAR: '/tcas/calendar',
  TCAS_EXAMS: '/tcas/exams',
  TCAS_PROGRAMS: '/tcas/programs',
  TCAS_PROGRAM_DETAIL: (id: number) => `/tcas/programs/${id}`,
  TCAS_CALCULATE: '/tcas/calculate',
  TCAS_SIMILAR: '/tcas/similar',
};
```

### NestJS controller

```typescript
// apps/api/src/tcas/tcas.controller.ts
@Controller('tcas')
export class TcasController {
  constructor(private readonly tcasService: TcasService) {}
  
  @Get('calendar')
  getCalendar(
    @Query('year', new DefaultValuePipe(69), ParseIntPipe) year: number,
  ) {
    return this.tcasService.getCalendar(year);
  }
  
  @Get('exams')
  getExams() {
    return this.tcasService.getExams();
  }
  
  @Get('programs')
  listPrograms(@Query() query: ListProgramsDto) {
    // query: { round, status, faculty, university, search }
    return this.tcasService.listPrograms(query);
  }
  
  @Get('programs/:id')
  getProgram(@Param('id', ParseIntPipe) id: number) {
    return this.tcasService.getProgram(id);
  }
  
  @Post('calculate')
  calculate(@Body() body: CalculateRequestDto) {
    return this.tcasService.calculate(body);
  }
  
  @Post('similar')
  findSimilar(@Body() body: SimilarRequestDto) {
    return this.tcasService.findSimilar(body);
  }
}
```

---

## 📱 Frontend: `/tcas` Page Structure

The existing `apps/web/app/tcas/page.tsx` + `tcas-calculator.tsx` (716 lines) gets refactored into a tabbed layout. The current calculator logic stays — we add data sources and tab switching around it.

### File structure

```
apps/web/app/tcas/
├── page.tsx                          # Server component — fetch initial data
└── _components/
    ├── tcas-page-shell.tsx           # Tab switcher + layout
    ├── calendar-panel.tsx            # Calendar (changes per tab)
    ├── program-picker.tsx            # Faculty → program dropdown
    ├── score-form.tsx                # Dynamic input fields
    ├── result-panel.tsx              # Score + zone + advice
    ├── zone-visualization.tsx        # 4-band bar with user marker
    ├── reverse-advice.tsx            # "Bump this subject by X" suggestions
    ├── similar-programs.tsx          # Recommended similar programs
    ├── no-history-notice.tsx         # Banner when history is null
    ├── inactive-program-banner.tsx   # Banner when status='inactive'
    └── tcas-calculator.tsx           # Existing 716-line file (refactor target)
```

### Tab switcher

```typescript
// _components/tcas-page-shell.tsx
'use client';

import { useState, useMemo } from 'react';
import { TabSwitcher } from './tab-switcher';
import { CalendarPanel } from './calendar-panel';
import { ProgramPicker } from './program-picker';
import { ScoreForm } from './score-form';
import { ResultPanel } from './result-panel';

export type TcasTab = 'NETSAT' | 'TCAS';

export function TcasPageShell({ initialCalendar, initialExams }) {
  const [tab, setTab] = useState<TcasTab>('NETSAT');
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  
  const programFilter = useMemo(() => {
    if (tab === 'NETSAT') {
      return {
        round: 'R2_NETSAT' as const,
        university: 'มหาวิทยาลัยขอนแก่น',
        status: 'all',
      };
    }
    return {
      round: 'R3_ADMISSION' as const,
      status: 'active',
    };
  }, [tab]);
  
  return (
    <div className="brand-page">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-grape-deep">เครื่องคำนวณคะแนน</h1>
        <p className="text-ink-soft">เช็คโอกาสติด + วางแผนเตรียมตัว</p>
      </header>
      
      <TabSwitcher value={tab} onChange={setTab} />
      
      <div className="grid lg:grid-cols-[400px_1fr] gap-6 mt-6">
        <aside className="space-y-4">
          <CalendarPanel tab={tab} events={initialCalendar} />
        </aside>
        
        <main className="space-y-4">
          <ProgramPicker
            filter={programFilter}
            value={selectedProgramId}
            onChange={setSelectedProgramId}
          />
          
          {selectedProgramId && (
            <>
              <ScoreForm tab={tab} programId={selectedProgramId} />
              <ResultPanel tab={tab} programId={selectedProgramId} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
```

---

## 🎨 What Each Component Displays

### 1. Calendar Panel

**Position:** Left sidebar (always visible)

**Per-tab content:**

| Tab | Shows |
|---|---|
| **NETSAT** | NETSAT exam dates + KKU Round 2 events: application, exam, results, confirm |
| **TCAS** | TGAT/TPAT + A-Level exam dates + TCAS Rounds 1-4 events |

**Visual format:**
- Vertical timeline with icons
- Past events: muted color + ✓ checkmark
- Upcoming events: highlighted
- Currently-running events: pulse animation
- Each event card shows: title, date range, optional note

**Data fetch:**

```typescript
// useCalendar hook (React Query)
GET /api/tcas/calendar?year=69
→ [
  {
    id: 12,
    year: 69,
    round: 'R3_ADMISSION',
    eventType: 'register',
    titleTh: 'เปิดรับสมัครรอบ 3 Admission',
    dateStart: '2026-05-06',
    dateEnd: '2026-05-12',
    note: null,
  },
  // ...
]

// Filter per tab on the client
const events = useMemo(() => {
  if (tab === 'NETSAT') {
    return allEvents.filter(e =>
      e.round === 'R2_NETSAT' ||
      e.examCode === 'NETSAT'
    );
  }
  return allEvents.filter(e =>
    e.round !== 'R2_NETSAT'  // exclude KKU-specific
  );
}, [allEvents, tab]);
```

**Example NETSAT tab calendar:**

```
📅 NETSAT 2569

✓ 30 ต.ค. 68
  สมัครสอบ NETSAT

✓ 20-21 ธ.ค. 68
  สอบ NETSAT

🟢 25 ก.พ. - 12 มี.ค. 69
  รับสมัครรอบ 2 KKU
  (รับสมัครอยู่)

○ 24 มี.ค. 69
  ประกาศผลครั้งที่ 1

○ 8-9 เม.ย. 69
  สอบสัมภาษณ์

○ 2 พ.ค. 69
  Clearing house
```

### 2. Program Picker

**Data:**

```typescript
GET /api/tcas/programs?round=R2_NETSAT&status=all
→ {
  programs: [
    {
      id: 42,
      faculty: 'คณะวิศวกรรมศาสตร์',
      programName: 'วิศวกรรมคอมพิวเตอร์',
      status: 'active',
      latestHistory: { year: 2568, minScore: 65.2, maxScore: 82.7, meanScore: 76.1 },
    },
    {
      id: 99,
      faculty: 'คณะมนุษยศาสตร์',
      programName: 'เอเชียตะวันออกศึกษา',
      status: 'inactive',           // ← shown but flagged
      latestHistory: { year: 2567, minScore: 58.4, maxScore: 71.2, meanScore: null },
    },
  ],
  facets: {
    faculties: ['คณะวิศวกรรมศาสตร์', '...'],
    counts: { active: 150, inactive: 77 },
  },
}
```

**UI:**
- Two-level dropdown: Faculty (1st) → Program (2nd)
- Or: search bar with autocomplete
- Filter chips: "✅ เปิดปีนี้ (150)" / "📁 ดูข้อมูลย้อนหลัง (77)" / "ทั้งหมด"
- Inactive programs display with a `📁 ไม่เปิดปีนี้` badge

**Inactive program card example:**

```
┌─────────────────────────────────────────┐
│ คณะมนุษยศาสตร์ฯ                          │
│ เอเชียตะวันออกศึกษา                      │
│ ┌────────────────────────────────────┐  │
│ │ 📁 ไม่เปิดปีนี้ — ดูข้อมูลย้อนหลัง  │  │
│ └────────────────────────────────────┘  │
│ min ปี 67: 58.4  •  max: 71.2          │
└─────────────────────────────────────────┘
```

### 3. Score Form

**Data:**

```typescript
GET /api/tcas/programs/42
→ {
  program: { id, faculty, programName, minTotalPercent, minGpax, status },
  weights: [
    { examCode: 'NETSAT_MATH', nameTh: 'คณิตศาสตร์', 
      weightPercent: 30, minSubjectScore: 20 },
    { examCode: 'NETSAT_PHYSICS', nameTh: 'ฟิสิกส์',
      weightPercent: 20, minSubjectScore: 20 },
    // ... only the subjects this program needs
  ],
  history: [
    { year: 2568, minScore: 65.2, maxScore: 82.7, meanScore: 76.1 },
    { year: 2567, minScore: 62.5, maxScore: 80.1, meanScore: 74.3 },
  ],
}
```

**UI logic:**

- **Dynamic fields** — render only the subjects this program needs (not 25 fields)
- Each field shows: subject name (Thai), weight badge, optional min-score hint
- **GPAX field** appears only if `program.minGpax !== null`
- **Scores persist in localStorage** (key namespace differs by tab)
- **Submit button** disabled until required fields are filled
- **Validation:** `0 ≤ score ≤ 100`, `0 ≤ gpax ≤ 4`

**localStorage namespace per tab:**

```typescript
const STORAGE_KEY = tab === 'NETSAT'
  ? 'peerahat:netsat:scores:v1'
  : 'peerahat:tcas:scores:v1';
```

This lets students enter NETSAT scores and TCAS scores independently.

### 4. Result Panel

Triggered when user clicks "Calculate":

```typescript
POST /api/tcas/calculate
body: { programId: 42, scores: {...}, gpax: 3.20 }

→ See calculateResponseSchema above
```

#### A. Total score card

```
┌──────────────────────────────────┐
│ คะแนนของคุณ                       │
│                                  │
│   68.50 / 100                    │
│                                  │
│ ✅ ผ่านเกณฑ์ขั้นต่ำ 30%           │
│ ✅ GPAX ผ่านเกณฑ์ 2.50            │
└──────────────────────────────────┘
```

#### B. Score breakdown

```
┌──────────────────────────────────┐
│ คะแนนแยกวิชา                      │
│                                  │
│ NETSAT คณิต     85 × 30%  = 25.5 │
│ NETSAT อังกฤษ   70 × 30%  = 21.0 │
│ NETSAT ฟิสิกส์  60 × 20%  = 12.0 │
│ TPAT3            50 × 20%  = 10.0 │
│ ──────────────────────────────── │
│ รวม                       = 68.5 │
└──────────────────────────────────┘
```

#### C. Zone visualization (4 bands)

```
┌──────────────────────────────────┐
│ [🟡 Zone: ลุ้น]                   │
│                                  │
│ เทียบกับสถิติปี 2568:             │
│                                  │
│  ┌──────────────────────────┐    │
│  │เสี่ยง │ลุ้น│น่าจะติด│มั่นใจ│   │
│  │       ▲                  │    │
│  └──────────────────────────┘    │
│  65.2  68.5  76.1   82.7         │
│  min   you   mean   max          │
└──────────────────────────────────┘
```

Band thresholds:
- `risky`:       < min
- `borderline`:  min ≤ score < min + 30% × (max - min)
- `competitive`: borderline_end ≤ score < min + 70% × (max - min)  (or use mean if available)
- `safe`:        ≥ competitive_end

#### D. Reverse advice

```
┌──────────────────────────────────┐
│ 🎯 ขาดอีก 2.5 คะแนน → "น่าจะติด"  │
│                                  │
│ 🟢 NETSAT คณิต  +8.3 (คุ้มสุด)   │
│ ⚪ NETSAT อังกฤษ +8.3            │
│ ⚪ TPAT3         +12.5           │
└──────────────────────────────────┘
```

Efficiency = `(100 - currentScore) × weightPercent` — higher = better ROI.

#### E. No-history case

When `history === null`:

```
┌──────────────────────────────────┐
│ ℹ️ หลักสูตรนี้ยังไม่มีสถิติปีก่อน │
│                                  │
│ อาจเป็นหลักสูตรใหม่หรือเปลี่ยน    │
│ เกณฑ์ — แสดงเฉพาะเกณฑ์ขั้นต่ำ     │
│                                  │
│ คะแนน 68.5 ผ่านเกณฑ์ 30% ✓       │
└──────────────────────────────────┘
```

Zone visualization is hidden in this case; show only the threshold check.

#### F. Inactive-program case

When `program.status === 'inactive'`:

```
┌──────────────────────────────────┐
│ 📁 หลักสูตรนี้ไม่เปิดในปีนี้      │
│                                  │
│ แต่ยังแสดงสถิติย้อนหลังให้ดู      │
│ เผื่อมีประโยชน์ในการวางแผน        │
└──────────────────────────────────┘
```

The "Calculate" button changes to "View historical stats." The zone visualization renders using last available year's scores, but with a disclaimer.

### 5. Similar Programs

```typescript
POST /api/tcas/similar
body: { programId: 42, scores, gpax }

→ {
  similar: [
    {
      program: { id, faculty, programName, university },
      similarity: 0.95,
      estimatedUserScore: 70.2,
      zone: 'competitive',
      recommendationType: 'safer',
      reason: 'วิชาใช้คล้ายกัน 95% และคุณมีโอกาสน่าจะติด',
    },
    // ...
  ],
}
```

**Algorithm:** Cosine similarity over subject-weight vectors. Bonus +0.1 if same faculty. Threshold: similarity ≥ 0.5.

**UI grouping:**
- 🟢 ปลอดภัย (`safer`) — user is in `competitive` or `safe` zone
- 🟡 ลุ้น (`similar`) — user is in `borderline` zone
- ⚪ ลองดู (`stretch`) — user is in `risky` zone

### 6. Disclaimer footer

Show on every result panel:

```
ℹ️ ข้อมูลนี้เป็นการประมาณการจากสถิติปีก่อน 
ไม่ได้การันตีว่าจะติดจริง เพราะมีปัจจัยอื่น:
• ความเฟ้อ-ฝืดของข้อสอบปีนี้
• จำนวนผู้สมัครปีนี้
• การสัมภาษณ์, portfolio
• การจัดอันดับ
```

---

## 🎯 Tab-aware Behavior Matrix

Everything in `/tcas` changes per tab according to this matrix:

| Component | NETSAT tab | TCAS tab |
|---|---|---|
| **Calendar filter** | `round=R2_NETSAT` + `examCode=NETSAT` | All rounds + TGAT/TPAT/A-Level |
| **Program filter** | `round=R2_NETSAT`, KKU only | `round=R3_ADMISSION`, all universities |
| **Score form fields** | NETSAT_* + some TPAT | TGAT1-3, TPAT1-5, A_LEVEL_* |
| **Result zone** | Compare vs KKU stat | Compare vs mytcas stat |
| **Similar programs** | Within KKU only | Cross-university |
| **University display** | Hidden (KKU only) | Shown |
| **localStorage namespace** | `netsat:scores:v1` | `tcas:scores:v1` |
| **Disclaimer extra line** | "ข้อมูลจาก KKU Admissions" | "ข้อมูลจาก ทปอ./mytcas" |

---

## 🔧 React Query Setup

```typescript
// apps/web/app/tcas/_hooks/use-tcas-data.ts

export function useCalendar(year = 69) {
  return useQuery({
    queryKey: ['tcas', 'calendar', year],
    queryFn: () => apiClient.get(API_PATHS.TCAS_CALENDAR, { params: { year } }),
    staleTime: 24 * 60 * 60 * 1000,    // 1 day — calendar is stable
  });
}

export function usePrograms(filter: ProgramFilter) {
  return useQuery({
    queryKey: ['tcas', 'programs', filter],
    queryFn: () => apiClient.get(API_PATHS.TCAS_PROGRAMS, { params: filter }),
    staleTime: 60 * 60 * 1000,         // 1 hour
  });
}

export function useProgram(id: number | null) {
  return useQuery({
    queryKey: ['tcas', 'program', id],
    queryFn: () => apiClient.get(API_PATHS.TCAS_PROGRAM_DETAIL(id!)),
    enabled: id !== null && id > 0,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCalculate() {
  return useMutation({
    mutationFn: (req: CalculateRequest) =>
      apiClient.post(API_PATHS.TCAS_CALCULATE, req),
  });
}

export function useSimilarPrograms() {
  return useMutation({
    mutationFn: (req: SimilarRequest) =>
      apiClient.post(API_PATHS.TCAS_SIMILAR, req),
  });
}
```

---

## 💾 localStorage Persistence

```typescript
// apps/web/app/tcas/_hooks/use-saved-scores.ts

interface SavedScores {
  gpax?: number;
  scores: Record<string, number>;
  updatedAt: string;
}

export function useSavedScores(tab: TcasTab) {
  const STORAGE_KEY = tab === 'NETSAT'
    ? 'peerahat:netsat:scores:v1'
    : 'peerahat:tcas:scores:v1';
  
  const [scores, setScores] = useState<SavedScores>(() => {
    if (typeof window === 'undefined') return { scores: {}, updatedAt: '' };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { scores: {}, updatedAt: '' };
    } catch {
      return { scores: {}, updatedAt: '' };
    }
  });
  
  const updateScore = useCallback((examCode: string, value: number) => {
    setScores(prev => {
      const next = {
        ...prev,
        scores: { ...prev.scores, [examCode]: value },
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage might be full or disabled — proceed in-memory
      }
      return next;
    });
  }, [STORAGE_KEY]);
  
  const updateGpax = useCallback((value: number) => {
    setScores(prev => {
      const next = { ...prev, gpax: value, updatedAt: new Date().toISOString() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [STORAGE_KEY]);
  
  const clear = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setScores({ scores: {}, updatedAt: '' });
  }, [STORAGE_KEY]);
  
  return { scores, updateScore, updateGpax, clear };
}
```

**Why localStorage:**
- Students fill in scores once, reuse across many programs
- No backend auth required (calculator is public)
- Separate namespaces per tab prevent NETSAT scores from polluting TCAS calculations

---

## 🎨 Design Tokens to Use

The project's canonical violet palette (from `packages/config/tailwind/preset.ts`):

| Token | Hex | Use in calculator |
|---|---|---|
| `violet-500` (`dusty-grape`) | `#55418B` | Primary CTAs, tab active state |
| `grape-deep` | `#3F2F6B` | Headings |
| `grape-soft` | `#EDE8F7` | Card backgrounds |
| `accent-500` | `#F0CB67` | "Most efficient" highlight on reverse advice |
| `ink` | `#2A2240` | Body text |
| `ink-soft` | `#5B5176` | Secondary text |
| `surface-cream` / `surface-mist` | CSS vars | Page background gradient |

**Zone colors** (these should be defined as semantic tokens, not custom hex):

| Zone | Suggested color | Tailwind |
|---|---|---|
| `risky` | red-500 | Use existing semantic `--color-danger` |
| `borderline` | amber-500 | Use `accent-600` |
| `competitive` | green-500 | Use semantic `--color-success` |
| `safe` | blue-500 | Use `soft-periwinkle` or semantic `--color-info` |
| `unknown` | gray-400 | `neutral-400` |

---

## 🧪 Testing Strategy

- **API:** Add Jest tests for `calculate` and `findSimilar` in `apps/api/src/tcas/`
- **Web:** Project currently has no frontend tests; if adding any, focus on:
  - `score-form.tsx` validation (range checks)
  - localStorage persistence
  - Tab-switch state preservation

---

## 📋 Implementation Checklist

### Backend (`apps/api/`)
- [ ] Add 5 new Prisma models + 4 enums
- [ ] Run `prisma migrate dev --name add_tcas_calculator_data`
- [ ] Write `scripts/import-tcas-data.ts`
- [ ] Extend `src/tcas/tcas.controller.ts` with 6 endpoints
- [ ] Implement zone analysis logic in `src/tcas/tcas.service.ts`
- [ ] Implement similarity logic (cosine similarity over weight vectors)
- [ ] Add Jest tests for calculation logic

### Shared types (`packages/types/`)
- [ ] Add `tcas.ts` schemas: round, status, calendar, program, calculate request/response
- [ ] Update `API_PATHS` in `api.ts`

### Frontend (`apps/web/`)
- [ ] Refactor `tcas-calculator.tsx` (716 lines → smaller components)
- [ ] Build `tcas-page-shell.tsx` with tab switcher
- [ ] Build `calendar-panel.tsx` with per-tab filtering
- [ ] Build `program-picker.tsx` with active/inactive badges
- [ ] Build `score-form.tsx` with dynamic fields per program
- [ ] Build `result-panel.tsx` with all 6 sub-sections
- [ ] Build `zone-visualization.tsx` (4-band bar)
- [ ] Build `reverse-advice.tsx`
- [ ] Build `similar-programs.tsx`
- [ ] Build `no-history-notice.tsx` and `inactive-program-banner.tsx`
- [ ] Wire up React Query hooks
- [ ] Add localStorage persistence per tab
- [ ] Add disclaimer footer to all result views
- [ ] Mobile responsive testing

### Data
- [ ] Run all scrapers (`TO-DO.md`)
- [ ] Manual QA on 20 programs
- [ ] Run import script
- [ ] Verify `tcas_programs` counts match expectations

### Pre-launch
- [ ] Email KKU Admissions
- [ ] Verify disclaimer text with legal
- [ ] SEO meta tags on `/tcas` page
- [ ] Open Graph image for social sharing
