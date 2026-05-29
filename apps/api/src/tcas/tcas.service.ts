import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ExamOption,
  ExamSystem,
  FailedPerSubjectMin,
  MissingSubject,
  ProgramComponent,
  ProgramComponents,
  ScoreProgram,
  ScoreWeight,
  SubjectGap,
  TcasDeadline,
  TcasProgram,
  TcasScores,
  TcasWhatIfResult,
  TcasWhatIfWarning,
} from "@peerahat/types";
import { calculateScore, componentKey, isGpaxCode } from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TcasService {
  constructor(private readonly prisma: PrismaService) {}

  async listPrograms(round?: string): Promise<TcasProgram[]> {
    const rows = await this.prisma.tcasProgram.findMany({
      where: round ? { round: round as TcasProgram["round"] } : undefined,
      orderBy: [{ university: "asc" }, { major: "asc" }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async listDeadlines(): Promise<TcasDeadline[]> {
    const rows = await this.prisma.tcasDeadline.findMany({
      orderBy: { date: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date.toISOString(),
      type: r.type as TcasDeadline["type"],
    }));
  }

  /**
   * FR-TC-03: three independent gates (GPAX, total-min, per-subject-min) +
   * per-subject deficit distribution.
   *
   * The actual scoring math is delegated to `calculateScore` (canonical
   * implementation in @peerahat/types/score-algorithm.ts). This service
   * only handles:
   *   1. The adapter: ProgramComponents (with chooseHighest groups) →
   *      flat ScoreProgram. chooseHighest groups are resolved to the
   *      single highest-scoring option before the algorithm sees them.
   *   2. The mapping: ScoreResult → TcasWhatIfResult shape (preserves
   *      all legacy fields; adds the Phase-2 additive ones).
   *   3. Backend-only extensions: planB program suggestions and
   *      subject-gap deficit distribution.
   */
  async whatIf(
    programId: string,
    scores: TcasScores,
  ): Promise<TcasWhatIfResult> {
    const program = await this.prisma.tcasProgram.findUnique({
      where: { id: programId },
    });
    if (!program) throw new NotFoundException();
    const components = program.components as unknown as ProgramComponents;

    // Resolve chooseHighest groups so the algorithm sees a flat weight
    // list. Each resolution remembers which option won, so the gap loop
    // below can attribute the deficit back to the correct option for UI.
    const resolved = components.exams.map((comp) =>
      resolveComponentToFlat(comp, scores),
    );
    const flatWeights: ScoreWeight[] = resolved.map((r) => r.weight);

    const algorithmInput: ScoreProgram = {
      minGpax: components.gpaxMin,
      minTotalPercent: program.totalMinScore,
      weights: flatWeights,
    };
    const result = calculateScore(algorithmInput, {
      scores,
      gpax: scores["gpax"] ?? null,
    });

    // Map algorithm output → existing TcasWhatIfResult fields. Resolved
    // bookkeeping carries the system/code/name for each entry so we
    // can label backend-specific arrays correctly. dedupBy keeps the
    // first occurrence per examCode so chooseHighest groups that resolve
    // to the same winning option (rare but possible — e.g. two science
    // groups both picking A-Level 61) don't show as duplicate rows.
    const failedPerSubjectMins: FailedPerSubjectMin[] = dedupBy(
      result.failedSubjectMins
        .map((f) => {
          const r = resolved.find((x) => x.weight.examCode === f.examCode);
          if (!r) return null;
          return {
            system: r.identity.system,
            code: r.identity.code,
            name: r.identity.name,
            need: f.required ?? 0,
            have: f.actual ?? 0,
          } as FailedPerSubjectMin;
        })
        .filter((x): x is FailedPerSubjectMin => x !== null),
      (x) => componentKey(x.system, x.code),
    );

    const missingSubjects: MissingSubject[] = dedupBy(
      result.missingSubjects
        .map((m) => {
          const r = resolved.find((x) => x.weight.examCode === m.examCode);
          if (!r) return null;
          return {
            system: r.identity.system,
            code: r.identity.code,
            name: r.identity.name,
          } as MissingSubject;
        })
        .filter((x): x is MissingSubject => x !== null),
      (x) => componentKey(x.system, x.code),
    );

    const warnings: TcasWhatIfWarning[] = result.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      details: w.details,
    }));

    // Legacy `weightedAverage` preserves the OLD UX: missing subjects
    // contribute 0, so the user sees a meaningful partial as they
    // populate the form one subject at a time. The new `partialScore`
    // field carries the spec-true null when subjects are missing —
    // consumers that need the strict semantic read that instead.
    //
    // We compute the legacy value by re-running the algorithm with
    // missing scores filled in as 0. Pure CPU on ≤10 subjects, no I/O.
    const scoresWithZeros: TcasScores = { ...scores };
    for (const r of resolved) {
      if (
        !isGpaxCode(r.weight.examCode) &&
        scoresWithZeros[r.weight.examCode] == null
      ) {
        scoresWithZeros[r.weight.examCode] = 0;
      }
    }
    const legacyResult = calculateScore(algorithmInput, {
      scores: scoresWithZeros,
      gpax: scores["gpax"] ?? 0,
    });
    const weightedAverage = Number(
      (legacyResult.weightedScore ?? 0).toFixed(2),
    );
    const target = program.totalMinScore ?? 0;
    const gap = Number((weightedAverage - target).toFixed(2));

    // Subject-gap distribution — backend-only UI helper. Only meaningful
    // when there's a real partial score (no missing subjects) and the
    // student fell short of the threshold.
    const subjectGaps: SubjectGap[] = [];
    if (
      !result.eligible &&
      result.weightedScore != null &&
      target > 0 &&
      result.weightedScore < target
    ) {
      const deficit = target - result.weightedScore;
      const totalWeight =
        flatWeights.reduce((a, w) => a + w.weightPercent, 0) || 1;
      for (const r of resolved) {
        const share = deficit * (r.weight.weightPercent / totalWeight);
        const pointsNeeded = Math.ceil(
          share / (r.weight.weightPercent / 100 || 1),
        );
        const currentScore = scores[r.weight.examCode] ?? 0;
        subjectGaps.push({
          system: r.identity.system,
          code: r.identity.code,
          name: r.identity.name,
          weightPct: r.weight.weightPercent,
          currentScore,
          requiredScore: currentScore + pointsNeeded,
          pointsNeeded,
          groupOptions:
            r.origin.type === "chooseHighest" ? r.origin.options : undefined,
        });
      }
    }

    // FR-TC-05: 3 nearest reachable programs (stub).
    const planBRows = await this.prisma.tcasProgram.findMany({
      where: {
        id: { not: programId },
        round: program.round,
        admissionYear: program.admissionYear,
        tags: { hasSome: program.tags },
        OR: [
          { totalMinScore: null },
          { totalMinScore: { lte: weightedAverage + 5 } },
        ],
      },
      orderBy: { totalMinScore: "asc" },
      take: 3,
    });

    return {
      programId,
      weightedAverage,
      gap,
      isOnTrack: result.eligible,
      meetsGpax: result.meetsGpax,
      meetsTotalMin: result.meetsTotalMin,
      failedPerSubjectMins,
      subjectGaps,
      planB: planBRows.map((p) => ({
        id: p.id,
        university: p.university,
        faculty: p.faculty,
        major: p.major,
      })),
      missingSubjects,
      warnings,
      partialScore:
        result.weightedScore == null
          ? null
          : Number(result.weightedScore.toFixed(2)),
    };
  }

  private toDto(r: {
    id: string;
    university: string;
    campus: string | null;
    faculty: string;
    major: string;
    subTrack: string | null;
    programType: string | null;
    courseCode: string | null;
    round: string;
    admissionYear: number;
    quotaSeats: number;
    components: unknown;
    totalMinScore: number | null;
    tags: string[];
    sourceUrl: string | null;
  }): TcasProgram {
    return {
      id: r.id,
      university: r.university,
      campus: r.campus,
      faculty: r.faculty,
      major: r.major,
      subTrack: r.subTrack,
      programType: r.programType,
      courseCode: r.courseCode,
      round: r.round as TcasProgram["round"],
      admissionYear: r.admissionYear,
      quotaSeats: r.quotaSeats,
      components: r.components as ProgramComponents,
      totalMinScore: r.totalMinScore,
      tags: r.tags,
      sourceUrl: r.sourceUrl,
    };
  }
}

/**
 * Keep the first occurrence per key. Used to collapse duplicate
 * (system, code) rows produced when multiple chooseHighest groups
 * resolve to the same winning option.
 */
function dedupBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

interface ResolvedComponent {
  /** Flat weight passed into the canonical algorithm. */
  weight: ScoreWeight;
  /** system/code/name of the underlying exam (for chooseHighest groups,
   *  this is the winning option). Used for backend-specific labels. */
  identity: { system: ExamSystem; code: string; name: string };
  /** The original program component — kept so subjectGaps can re-expose
   *  `groupOptions` for chooseHighest groups. */
  origin: ProgramComponent;
}

/**
 * Translate one `ProgramComponent` into a single flat weight for the
 * canonical algorithm. `single` is a direct copy; `chooseHighest` picks
 * the option with the best score in `scores` (ties → first) so the group
 * contributes that score × the group's weight, matching the existing
 * backend behavior.
 *
 * The `examCode` used for the flat weight is the `componentKey` of the
 * chosen identity, ensuring it matches the key the student's score was
 * filed under in `TcasScores`.
 */
function resolveComponentToFlat(
  comp: ProgramComponent,
  scores: TcasScores,
): ResolvedComponent {
  if (comp.type === "single") {
    const key = componentKey(comp.system, comp.code);
    return {
      weight: {
        examCode: key,
        weightPercent: comp.weight,
        minSubjectScore: comp.min,
        // GPAX gets max=4 automatically via the algorithm's maxScoreFor;
        // explicit here makes the contract visible at the adapter seam.
        maxScore: isGpaxCode(key) ? 4 : undefined,
      },
      identity: { system: comp.system, code: comp.code, name: comp.name },
      origin: comp,
    };
  }
  // chooseHighest: pick the option with the highest score. Ties resolve
  // to the first option to keep output deterministic.
  let bestOption: ExamOption = comp.options[0]!;
  let bestScore = scores[componentKey(bestOption)] ?? 0;
  for (let i = 1; i < comp.options.length; i++) {
    const opt = comp.options[i]!;
    const s = scores[componentKey(opt)] ?? 0;
    if (s > bestScore) {
      bestOption = opt;
      bestScore = s;
    }
  }
  const key = componentKey(bestOption);
  return {
    weight: {
      examCode: key,
      weightPercent: comp.weight,
      minSubjectScore: comp.min,
      maxScore: isGpaxCode(key) ? 4 : undefined,
    },
    identity: {
      system: bestOption.system,
      code: bestOption.code,
      name: bestOption.name,
    },
    origin: comp,
  };
}
