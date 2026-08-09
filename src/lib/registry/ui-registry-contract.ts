import React, { type ComponentType } from 'react';

/**
 * Shared contract every pluggable UI / card-type module must satisfy.
 *
 * A module exports a `default` component plus a named type key
 * (`uiType` for review UIs, `cardType` for card renderers) and a `label`.
 * Because the key string can't be known without importing the (heavy)
 * component, the convention is to co-locate a tiny eager `meta.ts` that
 * exports only the cheap metadata, while the component itself is lazy-loaded.
 */
export interface MetaModule {
  /** `uiType` for transcription review UIs, `cardType` for flashcard cards. */
  uiType?: string;
  cardType?: string;
  label: string;
  labelKey?: string;
}

export interface RegistryEntry<TProps> {
  type: string;
  label: string;
  labelKey?: string;
  Component: React.LazyExoticComponent<ComponentType<TProps>>;
  Settings?: React.LazyExoticComponent<ComponentType<TProps>>;
}

export interface GlobModule {
  [path: string]: () => Promise<MetaModule> | MetaModule;
}

export interface GlobLoader {
  [path: string]: () => Promise<unknown>;
}

export interface CreateGlobRegistryArgs {
  metaModules: GlobModule;
  componentLoaders: GlobLoader;
  settingsLoaders?: GlobLoader;
  typeExportName: 'uiType' | 'cardType';
  componentSuffix: string;
  settingsSuffix: string;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dirOf(path: string): string {
  return path.replace(/\/[^/]*$/, '');
}

/**
 * Generic registry factory shared by BOTH the transcription review-UIs and the
 * flashcard card-types. It reads cheap `meta.ts` modules eagerly (so the list
 * of available types/labels is known synchronously for building tab/dropdown
 * UI) while deferring the heavy component code behind `React.lazy`.
 *
 * No per-type registry edits are needed when adding a new UI/card: just drop a
 * folder with `meta.ts`, `<Type>UI.tsx` (or `<Type>Card.tsx`), and an optional
 * `<Type>Settings.tsx` and the glob picks it up automatically.
 */
export function createGlobRegistry<TProps>(args: CreateGlobRegistryArgs): {
  list: () => RegistryEntry<TProps>[];
  get: (type: string) => RegistryEntry<TProps> | undefined;
} {
  const { metaModules, componentLoaders, settingsLoaders, typeExportName, componentSuffix, settingsSuffix } = args;

  const entries = new Map<string, RegistryEntry<TProps>>();

  for (const path in metaModules) {
    const mod = metaModules[path];
    const meta = typeof mod === 'function' ? (mod as () => MetaModule)() : (mod as MetaModule);
    const type = meta[typeExportName];
    if (!type) continue;

    const dir = dirOf(path);
    const componentLoader = componentLoaders[`${dir}/${capitalize(type)}${componentSuffix}.tsx`];
    if (!componentLoader) continue;

    const settingsPath = `${dir}/${capitalize(type)}${settingsSuffix}.tsx`;
    const settingsLoader = settingsLoaders?.[settingsPath];

    entries.set(type, {
      type,
      label: meta.label,
      labelKey: meta.labelKey,
      Component: React.lazy(
        () => componentLoader() as Promise<{ default: ComponentType<TProps> }>,
      ),
      ...(settingsLoader
        ? {
            Settings: React.lazy(
              () => settingsLoader() as Promise<{ default: ComponentType<TProps> }>,
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
