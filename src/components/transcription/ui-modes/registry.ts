import { createGlobRegistry } from '@/lib/registry/createGlobRegistry';
import type { TranscriptModeProps } from '@/components/transcription/TranscriptModeProps';
import type { GlobModule, GlobLoader } from '@/lib/registry/ui-registry-contract';

const metaModules = import.meta.glob<Record<string, unknown>>(
  './*/meta.ts',
  { eager: true },
);

const componentLoaders = import.meta.glob<Record<string, unknown>>(
  './*/*Mode.tsx',
);

export const transcriptModeRegistry = createGlobRegistry<TranscriptModeProps>({
  metaModules: metaModules as unknown as GlobModule,
  componentLoaders: componentLoaders as unknown as GlobLoader,
  typeExportName: 'uiType',
  componentSuffix: 'Mode',
  settingsSuffix: 'Settings',
});
