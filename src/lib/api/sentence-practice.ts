import type { SentencePractice, PracticeResult, SRSRating, PracticeMode } from './types';
import { mockSentences } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let sentences = [...mockSentences];

export async function getDueSentences(): Promise<SentencePractice[]> {
  await delay(300);
  const now = new Date();
  return sentences.filter(s => new Date(s.nextReview) <= now);
}

export async function checkAnswer(sentenceId: string, userAnswer: string, mode: PracticeMode): Promise<PracticeResult> {
  await delay(800);
  const sentence = sentences.find(s => s.id === sentenceId);
  if (!sentence) throw new Error('Sentence not found');

  const correctAnswer = mode === 'jp-to-vn' ? sentence.vietnamese : sentence.japanese;
  const answer = userAnswer.trim();
  const isCorrect = answer.toLowerCase() === correctAnswer.toLowerCase();

  const grammarNotes: string[] = [];
  if (!isCorrect) {
    if (mode === 'jp-to-vn') {
      grammarNotes.push('Kiểm tra lại cách dịch trợ từ は, が, を, に, で');
      if (answer.length < correctAnswer.length * 0.5) grammarNotes.push('Bản dịch có vẻ quá ngắn — kiểm tra lại các thành phần câu');
    } else {
      grammarNotes.push('Kiểm tra lại thứ tự từ trong tiếng Nhật (SOV)');
      if (!answer.includes('。')) grammarNotes.push('Nhớ kết thúc câu bằng dấu 。');
      grammarNotes.push('Kiểm tra lại cách chia động từ (ます形, て形, た形)');
    }
  }

  return {
    isCorrect,
    userAnswer,
    correctAnswer,
    feedback: isCorrect ? 'Chính xác! よくできました！🎉' : `Chưa đúng. Đáp án: "${correctAnswer}"`,
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
