import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  TcasDeadline,
  TcasProgram,
  TcasRound,
  TcasScoreField,
  TcasWhatIfResult,
  SubjectGap,
} from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TcasService {
  constructor(private readonly prisma: PrismaService) {}

  async listPrograms(round?: string): Promise<TcasProgram[]> {
    const rows = await this.prisma.tcasProgram.findMany({
      where: round ? { round } : undefined,
      orderBy: [{ university: "asc" }, { major: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      university: r.university,
      faculty: r.faculty,
      major: r.major,
      round: r.round as TcasRound,
      minScore: r.minScore,
      weights: r.weights as Partial<Record<TcasScoreField, number>>,
      tags: r.tags,
    }));
  }

  async listDeadlines(): Promise<TcasDeadline[]> {
    const rows = await this.prisma.tcasDeadline.findMany({
      orderBy: { date: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date.toISOString(),
      type: r.type as "exam" | "registration" | "announcement",
    }));
  }

  /**
   * FR-TC-03: per-subject score gap, plus Plan B suggestions (FR-TC-05 deferred to P2 by §11
   * but keeping a stub so the contract is stable).
   */
  async whatIf(
    programId: string,
    scores: Record<string, number>,
  ): Promise<TcasWhatIfResult> {
    const program = await this.prisma.tcasProgram.findUnique({
      where: { id: programId },
    });
    if (!program) throw new NotFoundException();
    const weights = program.weights as Record<string, number>;

    let weightedAverage = 0;
    const subjectGaps: SubjectGap[] = [];

    for (const [field, weightPct] of Object.entries(weights)) {
      const raw = scores[field] ?? 0;
      const normalized = field === "gpax" ? (raw / 4.0) * 100 : raw;
      weightedAverage += normalized * (weightPct / 100);
    }

    const gap = weightedAverage - program.minScore;
    const isOnTrack = gap >= 0;

    if (!isOnTrack) {
      const deficit = program.minScore - weightedAverage;
      // Distribute deficit per subject by weight share so each row is achievable.
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
      for (const [field, weightPct] of Object.entries(weights)) {
        const share = deficit * (weightPct / totalWeight);
        const pointsNeeded = Math.ceil(share / (weightPct / 100));
        const currentScore =
          field === "gpax" ? (scores[field] ?? 0) : scores[field] ?? 0;
        subjectGaps.push({
          field: field as TcasScoreField,
          weightPct,
          currentScore,
          requiredScore: currentScore + pointsNeeded,
          pointsNeeded,
        });
      }
    }

    const planBRows = await this.prisma.tcasProgram.findMany({
      where: {
        id: { not: programId },
        round: program.round,
        tags: { hasSome: program.tags },
        minScore: { lte: weightedAverage + 5 },
      },
      orderBy: { minScore: "asc" },
      take: 3,
    });

    return {
      programId,
      weightedAverage: Number(weightedAverage.toFixed(2)),
      gap: Number(gap.toFixed(2)),
      isOnTrack,
      subjectGaps,
      planB: planBRows.map((p) => ({
        id: p.id,
        university: p.university,
        faculty: p.faculty,
        major: p.major,
        minScore: p.minScore,
      })),
    };
  }
}
