const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface TranslationSentence {
  id: string;
  japanese: string;
  meaning: string;
}

export interface TranslationCheckResult {
  isCorrect: boolean;
  feedback: string;
  suggestion: string;
}

export function splitIntoSentences(text: string): string[] {
  return text.split(/(?<=[。！？])/).filter(s => s.trim().length > 0);
}

export async function checkTranslation(japanese: string, userTranslation: string): Promise<TranslationCheckResult> {
  await delay(800);
  const correct = userTranslation.trim().length > 5;
  return {
    isCorrect: correct,
    feedback: correct ? 'Tốt lắm! Bản dịch của bạn khá chính xác.' : 'Bản dịch chưa đầy đủ. Hãy thử dịch chi tiết hơn.',
    suggestion: 'Gợi ý: Chú ý các trợ từ は、が、を và thì của động từ.',
  };
}
