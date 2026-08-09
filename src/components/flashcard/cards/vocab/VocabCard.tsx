import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { parseCardData, type VocabCardData } from "@/lib/api/flashcard";
import type { CardWithSrsResponse } from "@/lib/api/flashcard";
import { cardType } from "./meta";

export interface CardRendererProps {
  card: CardWithSrsResponse;
  revealed: boolean;
  onReveal: () => void;
  onSpeak?: (text: string) => void;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/**
 * Vocab card renderer (doc §4 / §5.8 `cards/vocab/VocabCard.tsx`).
 * Default export is the component; `cardType` is the registry key. The `data`
 * blob is a JSON string parsed via `parseCardData`.
 */
export default function VocabCard({ card, revealed, onReveal, onSpeak }: CardRendererProps) {
  const { t } = useTranslation("flashcard");
  const data: VocabCardData = parseCardData<VocabCardData>(card.data) ?? { word: "" };

  return (
    <div
      className="flex-1 rounded-2xl border bg-card p-8 flex flex-col items-center justify-center text-center gap-3"
      data-testid="review-card"
    >
      <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
        {t("card.front")}
      </span>
      <p className="text-5xl md:text-6xl font-bold font-japanese leading-tight">{data.word}</p>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => (onSpeak ?? speak)(data.word)}
        title={t("card.speak")}
      >
        <Volume2 className="w-4 h-4" />
      </Button>

      {revealed ? (
        <div className="space-y-2 mt-6 animate-fade-in" data-testid="card-back">
          <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
            {t("card.back")}
          </span>
          {data.reading && (
            <p className="text-xl text-muted-foreground font-japanese">{data.reading}</p>
          )}
          <p className="text-xl font-medium leading-snug">{data.meaning}</p>
        </div>
      ) : (
        <Button
          size="lg"
          className="mt-8 gap-2"
          onClick={onReveal}
          data-testid="reveal-card-btn"
        >
          {t("card.showAnswer")}
          <span className="text-[10px] opacity-60 ml-2">{t("card.spaceHint")}</span>
        </Button>
      )}
    </div>
  );
}

// Re-export the registry key so call sites can import it alongside the component.
export { cardType };
export const metaCardType = cardType;
