import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { getCardRenderer, getCardMeta, type CardRendererProps } from "./registry";
import type { CardWithSrsResponse } from "@/lib/api/flashcard";

interface CardRendererHostProps {
  card: CardWithSrsResponse;
  revealed: boolean;
  onReveal: () => void;
  onSpeak?: (text: string) => void;
}

/**
 * Picks the registered renderer by `card.card_type` and renders it inside
 * <Suspense> (doc §4 / §5.8). Unknown types fall back to a safe "unsupported"
 * card so a bad `card_type` never crashes the review session.
 */
export function CardRenderer({ card, revealed, onReveal, onSpeak }: CardRendererHostProps) {
  const { t } = useTranslation("flashcard");
  const Renderer = getCardRenderer(card.card_type);
  const meta = getCardMeta(card.card_type);

  if (!Renderer) {
    return (
      <div
        className="flex-1 rounded-2xl border border-dashed bg-card p-8 flex flex-col items-center justify-center text-center gap-2"
        data-testid="card-unsupported"
      >
        <p className="text-sm font-medium">{t("card.unsupported")}</p>
        <p className="text-xs text-muted-foreground font-mono">{card.card_type}</p>
      </div>
    );
  }

  const props: CardRendererProps = { card, revealed, onReveal, onSpeak };

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center" data-testid="card-loading">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <Renderer {...props} />
    </Suspense>
  );
}
