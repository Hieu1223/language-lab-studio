import type { SRSFields } from '../common/types';

export interface GrammarCard extends SRSFields {
  id: string;
  pattern: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  topicId: string;
  collectionId: string;
}

export interface GrammarTopic {
  id: string;
  name: string;
  collectionId: string;
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
  addedToTopic: boolean;
  topicId: string | null;
}
