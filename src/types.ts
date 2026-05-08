export type UserRole = 'm6' | 'university' | 'senior' | 'parent';

export type AIPersona = 'friendly_senior' | 'formal_professor' | 'cool_mentor' | 'strict_coach' | 'skeptical_freshman' | 'researcher';

export type TeachingMethod = 'socratic' | 'direct' | 'step_by_step';
export type ToneOfVoice = 'formal' | 'casual' | 'direct' | 'empathetic';

export interface PersonaConfig {
  id: AIPersona;
  name: string;
  description: string;
  instruction: string;
}

export interface AdvancedAISettings {
  method: TeachingMethod;
  tone: ToneOfVoice;
  depth: number; // 0 to 100
}

export interface University {
  id: string;
  nameEn: string;
  nameTh: string;
  location: string;
}

export interface TcasScores {
  gpax: number | null;
  tGat: number | null;
  tPat1?: number | null; // Med
  tPat2?: number | null; // Art
  tPat3?: number | null; // Engineering
  tPat4?: number | null; // Architecture
  tPat5?: number | null; // Education
  aLevelMath1: number | null;
  aLevelMath2: number | null;
  aLevelPhy: number | null;
  aLevelChe: number | null;
  aLevelBio: number | null;
  aLevelSci: number | null;
  aLevelThai: number | null;
  aLevelSoc: number | null;
  aLevelEng: number | null;
}

export interface TcasDeadline {
  id: string;
  title: string;
  date: string;
  type: 'exam' | 'registration' | 'announcement';
}

export interface Tutor {
  id: string;
  name: string;
  bio: string;
  university: string;
  faculty: string;
  subjects: string[];
  hourlyRate: number;
  rating: number;
  isVerified: boolean;
  introVideoUrl?: string;
  avatarUrl: string;
}

export type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

export interface KycData {
  userId: string;
  idPhotoUrl: string;
  selfieUrl: string;
  transcriptUrl: string;
  status: KycStatus;
}

export interface Booking {
  id: string;
  studentId: string;
  tutorId: string;
  subject: string;
  status: 'requested' | 'accepted' | 'paid' | 'completed' | 'reported';
  scheduledAt: string;
  amount: number;
  slipUrl?: string;
}

export interface StudySheet {
  id: string;
  title: string;
  subject: string;
  price: number;
  sellerId: string;
  university: string;
  faculty: string;
  rating: number;
  previewUrls: string[];
  introVideoUrl?: string;
  pdfUrl: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorBadge?: string; // e.g. "University/Faculty"
  title: string;
  content: string;
  upvotes: number;
  replies: Reply[];
  createdAt: string;
}

export interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctAnswer: number;
}
