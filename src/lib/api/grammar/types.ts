import type { JLPTLevel, SRSFields } from '../common/types';

export interface GrammarCard extends SRSFields {
  id: string;
  pattern: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: JLPTLevel;
  topicId: string;
  collectionId: string;
}

export interface GrammarTopic {
  id: string;
  name: string;
  collectionId: string;
  level: JLPTLevel;
  cardCount: number;
  dueCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  selected: boolean;
  newCardsPerDay: number;
  weight: number;
}

export interface GrammarCollection {
  id: string;
  name: string;
  description: string;
  topicCount: number;
  totalCards: number;
  isDefault: boolean;
}

export type GrammarReviewMode = 'flashcard' | 'translate';

export interface GrammarListItem {
  id: string;
  pattern: string;
  meaning: string;
  level: JLPTLevel;
  addedToTopic: boolean;
  topicId: string | null;
}
