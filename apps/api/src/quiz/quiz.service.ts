import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  QuizQuestion,
  QuizResult,
  QuizSubmissionDto,
  Subject,
} from "@peerahat/types";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async questions(subject: Subject): Promise<QuizQuestion[]> {
    const rows = await this.prisma.quizQuestion.findMany({
      where: { subject },
      take: 15,
    });
    return rows.map((r) => ({
      id: r.id,
      subject: r.subject as Subject,
      topic: r.topic,
      question: r.question,
      options: r.options,
    }));
  }

  async submit(supabaseId: string, dto: QuizSubmissionDto): Promise<QuizResult> {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new BadRequestException();

    const questions = await this.prisma.quizQuestion.findMany({
      where: { id: { in: dto.answers.map((a) => a.questionId) } },
    });

    const byId = new Map(questions.map((q) => [q.id, q]));
    let correct = 0;
    const wrongTopics = new Set<string>();
    for (const a of dto.answers) {
      const q = byId.get(a.questionId);
      if (!q) continue;
      if (q.correctIndex === a.selectedIndex) correct++;
      else wrongTopics.add(q.topic);
    }
    const scorePct = (correct / Math.max(dto.answers.length, 1)) * 100;

    await this.prisma.quizSubmission.create({
      data: {
        userId: user.id,
        subject: dto.subject,
        scorePct,
        weakTopics: [...wrongTopics],
      },
    });

    const recommended = await this.prisma.tutorProfile.findMany({
      where: { isVerified: true, subjects: { has: dto.subject } },
      orderBy: { rating: "desc" },
      take: 3,
    });

    return {
      subject: dto.subject,
      scorePct: Math.round(scorePct),
      weakTopics: [...wrongTopics],
      recommendedTutorIds: recommended.map((t) => t.id),
    };
  }
}
