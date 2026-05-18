import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  FailedPerSubjectMin,
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
   * per-subject deficit distribution. FR-TC-05 Plan B kept as a stub.
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

    // Gate 1: GPAX threshold (no weight; a flat eligibility check).
    const gpax = scores["gpax"] ?? 0;
    const meetsGpax =
      components.gpaxMin === null || gpax >= components.gpaxMin;

    // Gate 2 + weighted average.
    let weighted = 0;
    const failedPerSubjectMins: FailedPerSubjectMin[] = [];
    for (const comp of components.exams) {
      const key = componentKey(comp.system, comp.code);
      const score = scores[key] ?? 0;
      if (comp.min !== null && score < comp.min) {
        failedPerSubjectMins.push({
          system: comp.system,
          code: comp.code,
          name: comp.name,
          need: comp.min,
          have: score,
        });
      }
      weighted += score * (comp.weight / 100);
    }
    const weightedAverage = Number(weighted.toFixed(2));

    // Gate 3: overall threshold (e.g. KKU's 30).
    const meetsTotalMin =
      program.totalMinScore === null || weighted >= program.totalMinScore;

    const isOnTrack =
      meetsGpax && meetsTotalMin && failedPerSubjectMins.length === 0;

    // Reference value for the deficit calc — use whichever cut-off the program
    // actually publishes. If neither is set the gap is meaningless, so leave it at 0.
    const target = program.totalMinScore ?? 0;
    const gap = Number((weighted - target).toFixed(2));

    const subjectGaps: SubjectGap[] = [];
    if (!isOnTrack && target > 0 && weighted < target) {
      const deficit = target - weighted;
      const totalWeight =
        components.exams.reduce((a, e) => a + e.weight, 0) || 1;
      for (const comp of components.exams) {
        const share = deficit * (comp.weight / totalWeight);
        // pointsNeeded is on the subject's own scale: share / weightFraction.
        const pointsNeeded = Math.ceil(share / (comp.weight / 100));
        const key = componentKey(comp.system, comp.code);
        const currentScore = scores[key] ?? 0;
        subjectGaps.push({
          system: comp.system,
          code: comp.code,
          name: comp.name,
          weightPct: comp.weight,
          currentScore,
          requiredScore: currentScore + pointsNeeded,
          pointsNeeded,
        });
      }
    }

    // FR-TC-05: 3 nearest reachable programs in same round, sharing tags, with
    // a totalMinScore at or below the candidate's weighted average + 5. Phase 1 stub.
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
