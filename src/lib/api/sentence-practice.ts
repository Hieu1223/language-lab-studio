import type { SentencePractice, PracticeResult, SRSRating } from './types';
import { mockSentences } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let sentences = [...mockSentences];

export async function getDueSentences(): Promise<SentencePractice[]> {
  await delay(300);
  const now = new Date();
  return sentences.filter(s => new Date(s.nextReview) <= now);
}

export async function getAllSentences(): Promise<SentencePractice[]> {
  await delay(200);
  return [...sentences];
}

export async function checkAnswer(sentenceId: string, userAnswer: string): Promise<PracticeResult> {
  await delay(800);
  const sentence = sentences.find(s => s.id === sentenceId);
  if (!sentence) throw new Error('Sentence not found');

  const target = sentence.targetSentence.toLowerCase().trim();
  const answer = userAnswer.toLowerCase().trim();
  const isCorrect = answer === target;

  const grammarNotes: string[] = [];
  if (!isCorrect) {
    if (!answer.includes('the') && target.includes('the')) grammarNotes.push('Article usage: Japanese doesn\'t use articles, but English requires "the/a/an"');
    if (!answer.endsWith('.') && target.endsWith('.')) grammarNotes.push('Punctuation: Remember to end sentences with proper punctuation');
    if (answer.split(' ').length < target.split(' ').length - 2) grammarNotes.push('Your translation seems too short — check for missing particles or auxiliary verbs');
    if (grammarNotes.length === 0) grammarNotes.push('Check word order, tense, and particle usage (は, が, を, に, で, etc.)');
  }

  return {
    isCorrect,
    userAnswer,
    targetSentence: sentence.targetSentence,
    feedback: isCorrect ? 'Perfect! Your translation is correct. よくできました！' : `Not quite. The target was: "${sentence.targetSentence}"`,
    grammarNotes,
  };
}

export async function reviewSentence(sentenceId: string, rating: SRSRating): Promise<void> {
  await delay(200);
  sentences = sentences.map(s => {
    if (s.id !== sentenceId) return s;
    let { interval, easeFactor, repetitions } = s;
    if (rating === 'again') { repetitions = 0; interval = 1; }
    else {
      repetitions += 1;
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 6;
      else interval = Math.round(interval * easeFactor);
    }
    return { ...s, interval, easeFactor, repetitions, nextReview: new Date(Date.now() + interval * 86400000).toISOString() };
  });
}
