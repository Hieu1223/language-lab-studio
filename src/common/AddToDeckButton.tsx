import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AddToDeckDialog } from "@/components/dictionary/AddToDeckDialog";
import type { WordLookupEntry } from "@/lib/api/dictionary";

interface AddToDeckButtonProps {
  words: WordLookupEntry[];
  /** Overrides the default translated label. */
  label?: string;
  className?: string;
}

/**
 * Shared "add to deck" trigger (doc §3 `common/AddToDeckButton.tsx`).
 * Opens the deck picker and creates vocab cards via
 * `POST /flashcard/decks/{deck_id}/cards/vocab`.
 */
export function AddToDeckButton({ words, label, className }: AddToDeckButtonProps) {
  const { t } = useTranslation("dictionary");
  const [open, setOpen] = useState(false);
  if (words.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "text-xs px-2 py-1 rounded-md border border-border hover:bg-muted/50 transition-colors"}
      >
        {label ?? t("deck.addToDeck")}
      </button>
      <AddToDeckDialog open={open} onOpenChange={setOpen} words={words} />
    </>
  );
}
