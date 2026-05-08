import type { Subject } from "./tutor";

export interface QuizQuestion {
  id: string;
  subject: Subject;
  topic: string;
  question: string;
  options: string[];
}

export interface QuizSubmissionDto {
  subject: Subject;
  answers: Array<{ questionId: string; selectedIndex: number }>;
}

export interface QuizResult {
  subject: Subject;
  scorePct: number;
  weakTopics: string[];
  recommendedTutorIds: string[];
}
