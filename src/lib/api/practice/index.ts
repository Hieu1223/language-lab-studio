import type {
  SentencePractice, PracticeResult, PracticeMode, PracticeType, PracticeTypeConfig,
  ClozeFillItem, SentenceFillItem, TranslationCheckResult
} from './types';
import type { SRSRating } from '../common/types';
import { mockSentences, mockClozeFillItems, mockSentenceFillItems } from './mock-data';

export type {
  SentencePractice, PracticeResult, PracticeMode, PracticeType, PracticeTypeConfig,
  ClozeFillItem, SentenceFillItem, TranslationCheckResult
} from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let sentences = [...mockSentences];

export function getDefaultPracticeTypeConfig(): PracticeTypeConfig[] {
  return [
    { type: 'cloze-fill', label: 'Điền từ vào cloze', description: 'Chọn từ đúng để điền vào chỗ trống', enabled: true, order: 1 },
    { type: 'sentence-fill', label: 'Chọn câu đúng', description: 'Chọn câu tiếng Nhật đúng với nghĩa', enabled: true, order: 2 },
    { type: 'translate-jp-vn', label: 'Dịch Nhật → Việt', description: 'Dịch câu tiếng Nhật sang tiếng Việt', enabled: true, order: 3 },
    { type: 'translate-vn-jp', label: 'Dịch Việt → Nhật', description: 'Dịch câu tiếng Việt sang tiếng Nhật', enabled: true, order: 4 },
  ];
}

export async function getDueSentences(): Promise<SentencePractice[]> {
  await delay(300);
  const now = new Date();
  return sentences.filter(s => new Date(s.nextReview) <= now);
}

export async function checkAnswer(sentenceId: string, answer: string, mode: PracticeMode): Promise<PracticeResult> {
  await delay(800);
  const sentence = sentences.find(s => s.id === sentenceId);
  if (!sentence) throw new Error('Sentence not found');
  const correct = answer.trim().length > 5;
  return {
    isCorrect: correct,
    userAnswer: answer,
    correctAnswer: mode === 'jp-to-vn' ? sentence.vietnamese : sentence.japanese,
    feedback: correct ? 'Tốt lắm! Bản dịch chính xác.' : 'Chưa chính xác. Hãy thử lại.',
    grammarNotes: correct ? [] : ['Chú ý trợ từ は、が、を', 'Kiểm tra thì của động từ'],
  };
}

export async function reviewSentence(sentenceId: string, rating: SRSRating): Promise<SentencePractice> {
  await delay(200);
  const sentence = sentences.find(s => s.id === sentenceId);
  if (!sentence) throw new Error('Sentence not found');
  let { interval, easeFactor, repetitions } = sentence;
  if (rating === 'again') { repetitions = 0; interval = 1; }
  else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
    const q = rating === 'easy' ? 5 : rating === 'good' ? 4 : 3;
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  const updated: SentencePractice = { ...sentence, interval, easeFactor, repetitions, nextReview: new Date(Date.now() + interval * 86400000).toISOString(), lastReview: new Date().toISOString() };
  sentences = sentences.map(s => s.id === sentenceId ? updated : s);
  return updated;
}

export async function getClozeFillItems(): Promise<ClozeFillItem[]> {
  await delay(300);
  return [...mockClozeFillItems];
}

export async function getSentenceFillItems(): Promise<SentenceFillItem[]> {
  await delay(300);
  return [...mockSentenceFillItems];
}

export function splitIntoSentences(text: string): string[] {
  return text.split(/(?<=[。！？])/).filter(s => s.trim().length > 0);
}

export async function checkTranslation(japanese: string, userTranslation: string): Promise<TranslationCheckResult> {
  await delay(800);
  const correct = userTranslation.trim().length > 5;
  return {
    isCorrect: correct,
    feedback: correct ? 'Tốt lắm! Bản dịch khá chính xác.' : 'Bản dịch chưa đầy đủ.',
    suggestion: 'Gợi ý: Chú ý các trợ từ は、が、を và thì của động từ.',
  };
}
