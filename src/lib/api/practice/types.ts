import type { SRSFields } from '../common/types';

export type PracticeMode = 'jp-to-vn' | 'vn-to-jp';
export type PracticeType = 'cloze-fill' | 'sentence-fill' | 'translate-jp-vn' | 'translate-vn-jp';

export interface PracticeTypeConfig {
  type: PracticeType;
  label: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface SentencePractice extends SRSFields {
  id: string;
  japanese: string;
  vietnamese: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  creditCost: number;
}

export interface PracticeResult {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  feedback: string;
  grammarNotes: string[];
}

export interface ClozeFillItem {
  id: string;
  sentence: string;
  clozedWord: string;
  clozedIndex: number;
  options: string[];
  correctOption: string;
}

export interface SentenceFillItem {
  id: string;
  meaning: string;
  options: string[];
  correctOption: string;
}

export interface TranslationPracticeItem {
  id: string;
  source: string;
  target: string;
  mode: PracticeMode;
}

export interface TranslationCheckResult {
  isCorrect: boolean;
  feedback: string;
  suggestion: string;
}
