import { describe, it, expect } from 'vitest';
import { transcriptModeRegistry } from '@/components/transcription/ui-modes/registry';

describe('transcription mode registry', () => {
  it('discovers all three modes via glob', () => {
    const types = transcriptModeRegistry.list().map((e) => e.type).sort();
    expect(types).toEqual(['anki', 'read', 'study']);
  });

  it('each mode resolves with label and component', () => {
    const study = transcriptModeRegistry.get('study');
    expect(study?.label).toBe('Study');
    expect(study?.labelKey).toBe('transcription.settings.modeStudy');
    expect(study?.Component).toBeDefined();

    const read = transcriptModeRegistry.get('read');
    expect(read?.label).toBe('Read');
    expect(read?.Component).toBeDefined();

    const anki = transcriptModeRegistry.get('anki');
    expect(anki?.label).toBe('Anki');
    expect(anki?.Component).toBeDefined();
  });

  it('returns undefined for unknown mode', () => {
    expect(transcriptModeRegistry.get('nonexistent')).toBeUndefined();
  });
});
