import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ExamOption,
  ExamSystem,
  FailedPerSubjectMin,
  ProgramComponent,
  ProgramComponents,
  SubjectGap,
  TcasDeadline,
  TcasProgram,
  TcasScores,
  TcasWhatIfResult,
} from "@peerahat/types";
import { componentKey } from "@peerahat/types";

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
   * per-subject deficit distribution. Supports both single components and
   * chooseHighest groups (the group contributes the max score among its
   * options × group weight).
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

    // Gate 1: GPAX threshold.
    const gpax = scores["gpax"] ?? 0;
    const meetsGpax =
      components.gpaxMin === null || gpax >= components.gpaxMin;

    // Gate 2 + weighted average.
    let weighted = 0;
    const failedPerSubjectMins: FailedPerSubjectMin[] = [];
    // Cache of (component → effective score) so the deficit loop can reuse it.
    const effective = new Map<ProgramComponent, EffectiveScore>();

    for (const comp of components.exams) {
      const eff = effectiveScoreFor(comp, scores);
      effective.set(comp, eff);
      if (comp.min !== null && eff.score < comp.min) {
        failedPerSubjectMins.push({
          system: eff.system,
          code: eff.code,
          name: eff.name,
          need: comp.min,
          have: eff.score,
        });
      }
      weighted += eff.score * (comp.weight / 100);
    }
    const weightedAverage = Number(weighted.toFixed(2));

    // Gate 3: overall threshold.
    const meetsTotalMin =
      program.totalMinScore === null || weighted >= program.totalMinScore;

    const isOnTrack =
      meetsGpax && meetsTotalMin && failedPerSubjectMins.length === 0;

    const target = program.totalMinScore ?? 0;
    const gap = Number((weighted - target).toFixed(2));

    const subjectGaps: SubjectGap[] = [];
    if (!isOnTrack && target > 0 && weighted < target) {
      const deficit = target - weighted;
      const totalWeight =
        components.exams.reduce((a, e) => a + e.weight, 0) || 1;
      for (const comp of components.exams) {
        const share = deficit * (comp.weight / totalWeight);
        const pointsNeeded = Math.ceil(share / (comp.weight / 100));
        const eff = effective.get(comp)!;
        subjectGaps.push({
          system: eff.system,
          code: eff.code,
          name: eff.name,
          weightPct: comp.weight,
          currentScore: eff.score,
          requiredScore: eff.score + pointsNeeded,
          pointsNeeded,
          groupOptions:
            comp.type === "chooseHighest" ? comp.options : undefined,
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
          { totalMinScore: { lte: weighted + 5 } },
        ],
      },
      orderBy: { totalMinScore: "asc" },
      take: 3,
    });

    return {
      programId,
      weightedAverage,
      gap,
      isOnTrack,
      meetsGpax,
      meetsTotalMin,
      failedPerSubjectMins,
      subjectGaps,
      planB: planBRows.map((p) => ({
        id: p.id,
        university: p.university,
        faculty: p.faculty,
        major: p.major,
      })),
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

interface EffectiveScore {
  system: ExamSystem;
  code: string;
  name: string;
  score: number;
}

// Picks the score a component contributes given the student's scores map.
// For a single component this is just lookup; for a chooseHighest group it's
// the max across all options (with the winning option's identity surfaced
// for the gap row so the UI can label it concretely).
function effectiveScoreFor(
  comp: ProgramComponent,
  scores: TcasScores,
): EffectiveScore {
  if (comp.type === "single") {
    const key = componentKey(comp.system, comp.code);
    return {
      system: comp.system,
      code: comp.code,
      name: comp.name,
      score: scores[key] ?? 0,
    };
  }
  // chooseHighest: pick the option with the highest score. Ties resolve to
  // the first option to keep output deterministic. If nothing is scored, the
  // first option still "wins" with 0 — gives the UI something to render.
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
  return {
    system: bestOption.system,
    code: bestOption.code,
    name: bestOption.name,
    score: bestScore,
  };
}
