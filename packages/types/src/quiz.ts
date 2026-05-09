import { z } from "zod";

import { type Subject, subjectSchema } from "./tutor";

export interface QuizQuestion {
  id: string;
  subject: Subject;
  topic: string;
  question: string;
  options: string[];
}

export const quizAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0),
});

export const quizSubmissionSchema = z.object({
  subject: subjectSchema,
  answers: z.array(quizAnswerSchema).min(1),
});

export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type QuizSubmissionDto = z.infer<typeof quizSubmissionSchema>;

export interface QuizResult {
  subject: Subject;
  scorePct: number;
  weakTopics: string[];
  recommendedTutorIds: string[];
}
