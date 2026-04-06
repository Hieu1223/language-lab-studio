import type { PartOfSpeech, SRSFields } from '../common/types';

export interface FlashcardFieldConfig {
  field: string;
  label: string;
  showOnFront: boolean;
  showOnBack: boolean;
}

export interface Flashcard extends SRSFields {
  id: string;
  front: string;
  back: string;
  reading: string;
  partOfSpeech: PartOfSpeech;
  topicId: string;
  collectionId: string;
}

export interface FlashcardTopic {
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

export interface FlashcardCollection {
  id: string;
  name: string;
  description: string;
  topicCount: number;
  totalCards: number;
  isDefault: boolean;
}

export interface FlashcardReviewSession {
  cards: Flashcard[];
  currentIndex: number;
  totalCount: number;
  undoStack: FlashcardReviewAction[];
}

export interface FlashcardReviewAction {
  cardId: string;
  previousState: Flashcard;
  rating: string;
}

export interface FlashcardPreset {
  id: string;
  name: string;
  newCardsPerDay: number;
  fieldConfig: FlashcardFieldConfig[];
  topicWeights: Record<string, number>;
}

export interface AddFlashcardRequest {
  front: string;
  topicId: string;
  collectionId: string;
}

export interface AddFlashcardResponse {
  card: Flashcard;
}

export interface ReviewFlashcardRequest {
  cardId: string;
  rating: string;
}

export interface ReviewFlashcardResponse {
  card: Flashcard;
}

export interface LookupWordRequest {
  word: string;
}

export interface LookupWordResponse {
  word: string;
  reading: string;
  meaning: string;
  partOfSpeech: PartOfSpeech;
  examples: string[];
  existsInFlashcards: boolean;
  flashcardId: string | null;
}
