const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface Manga {
  id: string;
  title: string;
  coverUrl: string;
  author: string;
  description: string;
  genres: string[];
  chapterCount: number;
  lastRead?: string;
  isSaved: boolean;
}

export interface MangaChapter {
  id: string;
  mangaId: string;
  number: number;
  title: string;
  pageCount: number;
}

export interface MangaPage {
  id: string;
  pageNumber: number;
  imageUrl: string;
  ocrText?: string;
  translation?: string;
}

const mockMangaList: Manga[] = [
  { id: 'manga-1', title: 'よつばと！', coverUrl: 'https://placehold.co/200x280/58CC02/fff?text=よつばと', author: 'あずまきよひこ', description: 'Yotsuba, cô bé 5 tuổi hồn nhiên khám phá thế giới xung quanh.', genres: ['Slice of Life', 'Comedy'], chapterCount: 14, lastRead: 'Ch. 5', isSaved: true },
  { id: 'manga-2', title: 'ドラえもん', coverUrl: 'https://placehold.co/200x280/58CC02/fff?text=ドラえもん', author: '藤子・F・不二雄', description: 'Mèo máy đến từ tương lai giúp đỡ cậu bé Nobita.', genres: ['Comedy', 'Sci-Fi'], chapterCount: 45, isSaved: true },
  { id: 'manga-3', title: 'ワンピース', coverUrl: 'https://placehold.co/200x280/58CC02/fff?text=ワンピース', author: '尾田栄一郎', description: 'Hành trình tìm kho báu One Piece của Luffy.', genres: ['Action', 'Adventure'], chapterCount: 1100, lastRead: 'Ch. 120', isSaved: false },
  { id: 'manga-4', title: 'ナルト', coverUrl: 'https://placehold.co/200x280/58CC02/fff?text=ナルト', author: '岸本斉史', description: 'Ninja Naruto trên con đường trở thành Hokage.', genres: ['Action', 'Adventure'], chapterCount: 700, isSaved: false },
];

const mockChapters: Record<string, MangaChapter[]> = {
  'manga-1': Array.from({ length: 14 }, (_, i) => ({ id: `ch-1-${i+1}`, mangaId: 'manga-1', number: i + 1, title: `Chương ${i + 1}`, pageCount: 20 })),
  'manga-2': Array.from({ length: 10 }, (_, i) => ({ id: `ch-2-${i+1}`, mangaId: 'manga-2', number: i + 1, title: `Tập ${i + 1}`, pageCount: 18 })),
  'manga-3': Array.from({ length: 10 }, (_, i) => ({ id: `ch-3-${i+1}`, mangaId: 'manga-3', number: i + 1, title: `Chapter ${i + 1}`, pageCount: 22 })),
  'manga-4': Array.from({ length: 10 }, (_, i) => ({ id: `ch-4-${i+1}`, mangaId: 'manga-4', number: i + 1, title: `Chapter ${i + 1}`, pageCount: 19 })),
};

export async function getMangaList(): Promise<Manga[]> {
  await delay(300);
  return mockMangaList;
}

export async function searchManga(query: string): Promise<Manga[]> {
  await delay(400);
  if (!query) return mockMangaList;
  const q = query.toLowerCase();
  return mockMangaList.filter(m => m.title.toLowerCase().includes(q) || m.author.toLowerCase().includes(q));
}

export async function getMangaDetail(id: string): Promise<Manga | null> {
  await delay(200);
  return mockMangaList.find(m => m.id === id) ?? null;
}

export async function getMangaChapters(mangaId: string): Promise<MangaChapter[]> {
  await delay(200);
  return mockChapters[mangaId] ?? [];
}

export async function getChapterPages(chapterId: string): Promise<MangaPage[]> {
  await delay(400);
  return Array.from({ length: 8 }, (_, i) => ({
    id: `page-${chapterId}-${i+1}`,
    pageNumber: i + 1,
    imageUrl: `https://placehold.co/800x1200/f5f5f5/333?text=Page+${i+1}`,
  }));
}

export async function ocrMangaPage(pageId: string): Promise<{ ocrText: string; translation: string }> {
  await delay(1000);
  return {
    ocrText: 'おはようございます！今日はいい天気ですね。',
    translation: 'Chào buổi sáng! Hôm nay thời tiết đẹp nhỉ.',
  };
}
