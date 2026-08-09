import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface CardMeta {
  cardType: string;
  label: string;
  labelKey?: string;
}

export interface CardRendererProps {
  card: import("@/lib/api/flashcard").CardWithSrsResponse;
  revealed: boolean;
  onReveal: () => void;
  onSpeak?: (text: string) => void;
}

const metaModules = import.meta.glob("./**/meta.ts", { eager: true }) as Record<
  string,
  { cardType: string; label: string; labelKey?: string }
>;

const componentLoaders = import.meta.glob("./**/*Card.tsx") as Record<
  string,
  () => Promise<{ default: ComponentType<CardRendererProps>; cardType?: string }>
>;

interface Entry {
  meta: CardMeta;
  loader: () => Promise<{ default: ComponentType<CardRendererProps>; cardType?: string }>;
}

const entries = new Map<string, Entry>();

for (const path in metaModules) {
  const meta = metaModules[path];
  if (!meta?.cardType) continue;
  // Match the *Card.tsx loader that lives in the same folder as this meta.ts.
  const folder = path.replace(/meta\.ts$/, "");
  const loaderKey = Object.keys(componentLoaders).find((k) => k.startsWith(folder) && k.endsWith("Card.tsx"));
  if (!loaderKey) continue;
  entries.set(meta.cardType, { meta, loader: componentLoaders[loaderKey] });
}

function load(type: string): LazyExoticComponent<ComponentType<CardRendererProps>> | null {
  const entry = entries.get(type);
  if (!entry) return null;
  return lazy(async () => {
    const mod = await entry.loader();
    return { default: mod.default };
  });
}

/** Resolve metadata for a card type (label, i18n key). */
export function getCardMeta(type: string): CardMeta | null {
  return entries.get(type)?.meta ?? null;
}

/** Resolve the lazy renderer component for a card type, or null if unknown. */
export function getCardRenderer(type: string) {
  return load(type);
}

/** All registered card types. */
export function listCardTypes(): string[] {
  return [...entries.keys()];
}
