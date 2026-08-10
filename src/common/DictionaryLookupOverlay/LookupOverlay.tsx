import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLookup } from "./useLookup";
import { AddToDeckDialog } from "@/components/dictionary/AddToDeckDialog";
import { WordResultList } from "@/components/dictionary/WordResultList";
import type { WordLookupEntry } from "@/lib/api/dictionary";

interface LookupOverlayProps {
  children: React.ReactNode;
  query: string;
}

/** Lightweight lookup popover: always lists every matching entry. */
export function LookupOverlay({ children, query }: LookupOverlayProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<WordLookupEntry | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const { results, loading, error, lookup } = useLookup(30);

  useEffect(() => {
    if (open && query) void lookup(query);
  }, [open, query, lookup]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-[min(22rem,calc(100vw-2rem))] p-3"
          collisionPadding={12}
          data-testid="lookup-overlay"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <WordResultList
            results={results}
            loading={loading}
            error={error}
            onAdd={(w) => {
              setPicked(w);
              setAddOpen(true);
            }}
          />
        </PopoverContent>
      </Popover>

      <AddToDeckDialog
        open={addOpen && !!picked}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setPicked(null);
        }}
        words={picked ? [picked] : []}
      />
    </>
  );
}

export default LookupOverlay;
