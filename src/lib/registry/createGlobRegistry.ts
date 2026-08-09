import React from 'react';
import type {
  CreateGlobRegistryArgs,
  RegistryEntry,
} from './ui-registry-contract';

/**
 * Generic registry factory shared by BOTH the transcription review-UIs and the
 * flashcard card-types. See `ui-registry-contract.ts` for the contract types.
 *
 * It reads cheap `meta.ts` modules eagerly (so the list of available types /
 * labels is known synchronously for building tab/dropdown UI) while deferring
 * the heavy component code behind `React.lazy`. Adding a new UI/card type is
 * just "drop a folder" — no registry edits required.
 */
export function createGlobRegistry<TProps>(
  args: CreateGlobRegistryArgs,
): {
  list: () => RegistryEntry<TProps>[];
  get: (type: string) => RegistryEntry<TProps> | undefined;
} {
  const { metaModules, componentLoaders, settingsLoaders, typeExportName, componentSuffix, settingsSuffix } =
    args;

  const entries = new Map<string, RegistryEntry<TProps>>();

  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const dirOf = (path: string) => path.replace(/\/[^/]*$/, '');

  for (const path in metaModules) {
    const mod = (metaModules as Record<string, () => unknown>)[path];
    const meta = (typeof mod === 'function' ? (mod as () => Record<string, unknown>)() : mod) as Record<
      string,
      unknown
    >;
    const type = meta[typeExportName] as string | undefined;
    if (!type) continue;

    const dir = dirOf(path);
    const componentLoader = (componentLoaders as Record<string, () => Promise<unknown>>)[
      `${dir}/${capitalize(type)}${componentSuffix}.tsx`
    ];
    if (!componentLoader) continue;

    const settingsLoader = settingsLoaders?.[`${dir}/${capitalize(type)}${settingsSuffix}.tsx`];

    entries.set(type, {
      type,
      label: meta.label as string,
      labelKey: meta.labelKey as string | undefined,
      Component: React.lazy(() => componentLoader() as Promise<{ default: React.ComponentType<TProps> }>),
      ...(settingsLoader
        ? {
            Settings: React.lazy(
              () => settingsLoader() as Promise<{ default: React.ComponentType<TProps> }>,
            ),
          }
        : {}),
    });
  }

  return {
    list: () => Array.from(entries.values()),
    get: (type: string) => entries.get(type),
  };
}
