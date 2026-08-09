import { describe, it, expect } from 'vitest';
import { createGlobRegistry } from '@/lib/registry/createGlobRegistry';
import type { MetaModule } from '@/lib/registry/ui-registry-contract';

function fakeLazy() {
  return Promise.resolve({ default: () => null });
}

describe('createGlobRegistry', () => {
  const metaModules = {
    './cloze/meta.ts': (): MetaModule => ({ uiType: 'cloze', label: 'Cloze' }),
    './anki/meta.ts': (): MetaModule => ({ uiType: 'anki', label: 'Anki' }),
  };
  const componentLoaders = {
    './cloze/ClozeUI.tsx': fakeLazy,
    './anki/AnkiUI.tsx': fakeLazy,
  };

  it('lists types known only from their meta modules (eager)', () => {
    const registry = createGlobRegistry({
      metaModules,
      componentLoaders,
      typeExportName: 'uiType',
      componentSuffix: 'UI',
      settingsSuffix: 'Settings',
    });
    const list = registry.list();
    expect(list.map((e) => e.type).sort()).toEqual(['anki', 'cloze']);
  });

  it('resolves a lazy Component per type', () => {
    const registry = createGlobRegistry({
      metaModules,
      componentLoaders,
      typeExportName: 'uiType',
      componentSuffix: 'UI',
      settingsSuffix: 'Settings',
    });
    expect(registry.get('cloze')?.Component).toBeDefined();
    expect(registry.get('cloze')?.label).toBe('Cloze');
  });

  it('picks up a new type without registry edits (glob-driven)', () => {
    const withThird = {
      ...metaModules,
      './flip/meta.ts': (): MetaModule => ({ uiType: 'flip', label: 'Flip' }),
    } as Record<string, () => MetaModule>;
    const withThirdLoaders = {
      ...componentLoaders,
      './flip/FlipUI.tsx': fakeLazy,
    } as Record<string, () => Promise<{ default: () => null }>>;
    const registry = createGlobRegistry({
      metaModules: withThird,
      componentLoaders: withThirdLoaders,
      typeExportName: 'uiType',
      componentSuffix: 'UI',
      settingsSuffix: 'Settings',
    });
    expect(registry.list().map((e) => e.type)).toContain('flip');
  });

  it('exposes a lazy Settings component when present', () => {
    const registry = createGlobRegistry({
      metaModules,
      componentLoaders,
      settingsLoaders: {
        './cloze/ClozeSettings.tsx': fakeLazy,
        './anki/AnkiSettings.tsx': fakeLazy,
      },
      typeExportName: 'uiType',
      componentSuffix: 'UI',
      settingsSuffix: 'Settings',
    });
    expect(registry.get('cloze')?.Settings).toBeDefined();
    expect(registry.get('anki')?.Settings).toBeDefined();
  });
});
