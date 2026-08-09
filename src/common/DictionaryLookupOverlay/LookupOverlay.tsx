import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLookup } from "./useLookup";
import { AddToDeckButton } from "@/common/AddToDeckButton";
import type { WordLookupEntry } from "@/lib/api/dictionary";

interface LookupOverlayProps {
  children: React.ReactNode;
  query: string;
}

export function LookupOverlay({ children, query }: LookupOverlayProps) {
  const { t } = useTranslation("dictionary");
  const [open, setOpen] = useState(false);
  const { results, loading, error, lookup } = useLookup();

  useEffect(() => {
    if (open && query) void lookup(query);
  }, [open, query, lookup]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-72 p-3" data-testid="lookup-overlay">
          <div className="space-y-2">
            {loading && <p className="text-xs text-muted-foreground">{t("overlay.loading")}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
            {!loading && !error && results.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("overlay.empty")}</p>
            )}
            {results.length > 0 && (
              <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {results.map((w, i) => (
                  <li key={`${w.id}-${i}`} className="rounded bg-muted/40 p-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-japanese font-semibold text-sm">
                          {w.word}{" "}
                          <span className="text-muted-foreground font-normal text-xs">{w.reading}</span>
                        </p>
                        <p className="text-muted-foreground text-xs line-clamp-2 mt-0.5">{w.meaning}</p>
                      </div>
                      <AddToDeckButton
                        words={[w]}
                        label={t("overlay.addToDeck")}
                        className="text-xs px-1.5 py-0.5 rounded border border-border hover:bg-muted/50 transition-colors shrink-0"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
