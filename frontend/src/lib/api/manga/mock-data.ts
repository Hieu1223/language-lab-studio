import type { Manga, MangaChapter, MangaPage, OcrResult, OcrWord } from './types';

const placeholderPage = 'https://placehold.co/800x1200/f5f5f5/888?text=Manga+Page';

export const mockMangas: Manga[] = [
  { id: 'manga-1', title: 'One Piece', author: 'Oda Eiichiro', coverUrl: 'https://placehold.co/300x450/1a1a2e/58cc02?text=One+Piece', description: 'Hải tặc Luffy và hành trình tìm kho báu One Piece.', genres: ['Phiêu lưu', 'Hành động'], chapterCount: 3, isSaved: true, lastRead: 'Ch. 2', lastChapterId: 'ch-op-2' },
  { id: 'manga-2', title: 'Naruto', author: 'Kishimoto Masashi', coverUrl: 'https://placehold.co/300x450/1a1a2e/ff6b35?text=Naruto', description: 'Câu chuyện về cậu bé ninja Naruto.', genres: ['Hành động', 'Ninja'], chapterCount: 3, isSaved: true, lastRead: null, lastChapterId: null },
  { id: 'manga-3', title: 'Spy × Family', author: 'Tatsuya Endo', coverUrl: 'https://placehold.co/300x450/1a1a2e/e91e63?text=Spy+Family', description: 'Gia đình gián điệp kỳ lạ nhất.', genres: ['Hài hước', 'Hành động'], chapterCount: 2, isSaved: false, lastRead: null, lastChapterId: null },
  { id: 'manga-4', title: 'Jujutsu Kaisen', author: 'Gege Akutami', coverUrl: 'https://placehold.co/300x450/1a1a2e/7c4dff?text=JJK', description: 'Thế giới chú thuật hồi chiến.', genres: ['Hành động', 'Kinh dị'], chapterCount: 2, isSaved: false, lastRead: null, lastChapterId: null },
];

export const mockChapters: Record<string, MangaChapter[]> = {
  'manga-1': [
    { id: 'ch-op-1', mangaId: 'manga-1', number: 1, title: 'Khởi đầu', pageCount: 4 },
    { id: 'ch-op-2', mangaId: 'manga-1', number: 2, title: 'Hành trình', pageCount: 4 },
    { id: 'ch-op-3', mangaId: 'manga-1', number: 3, title: 'Trận chiến', pageCount: 3 },
  ],
  'manga-2': [
    { id: 'ch-nr-1', mangaId: 'manga-2', number: 1, title: 'Uzumaki Naruto', pageCount: 4 },
    { id: 'ch-nr-2', mangaId: 'manga-2', number: 2, title: 'Konohamaru', pageCount: 3 },
    { id: 'ch-nr-3', mangaId: 'manga-2', number: 3, title: 'Sakura', pageCount: 3 },
  ],
  'manga-3': [
    { id: 'ch-sf-1', mangaId: 'manga-3', number: 1, title: 'Nhiệm vụ', pageCount: 4 },
    { id: 'ch-sf-2', mangaId: 'manga-3', number: 2, title: 'Gia đình', pageCount: 3 },
  ],
  'manga-4': [
    { id: 'ch-jk-1', mangaId: 'manga-4', number: 1, title: 'Chú thuật sư', pageCount: 4 },
    { id: 'ch-jk-2', mangaId: 'manga-4', number: 2, title: 'Ngón tay', pageCount: 3 },
  ],
};

export function getMockPages(chapterId: string): MangaPage[] {
  const chapter = Object.values(mockChapters).flat().find(c => c.id === chapterId);
  if (!chapter) return [];
  return Array.from({ length: chapter.pageCount }, (_, i) => ({
    id: `${chapterId}-p${i + 1}`,
    chapterId,
    pageNumber: i + 1,
    imageUrl: `https://placehold.co/800x1200/f0f0f0/333?text=Page+${i + 1}`,
    width: 800,
    height: 1200,
  }));
}

export function getMockOcrResult(pageId: string): OcrResult {
  return {
    pageId,
    ocrText: 'おれはモンキー・D・ルフィだ！海賊王になる男だ！',
    translation: 'Tao là Monkey D. Luffy! Người sẽ trở thành Vua Hải Tặc!',
    words: [
      { text: 'おれ', meaning: 'tao/tôi', reading: 'おれ', x: 50, y: 100, width: 60, height: 30, existsInFlashcards: false, flashcardId: null },
      { text: 'モンキー', meaning: 'Monkey', reading: 'もんきー', x: 120, y: 100, width: 80, height: 30, existsInFlashcards: false, flashcardId: null },
      { text: '海賊王', meaning: 'Vua Hải Tặc', reading: 'かいぞくおう', x: 50, y: 150, width: 90, height: 30, existsInFlashcards: false, flashcardId: null },
      { text: 'なる', meaning: 'trở thành', reading: 'なる', x: 150, y: 150, width: 50, height: 30, existsInFlashcards: true, flashcardId: 'card-0' },
      { text: '男', meaning: 'người đàn ông', reading: 'おとこ', x: 210, y: 150, width: 40, height: 30, existsInFlashcards: false, flashcardId: null },
    ],
  };
}
