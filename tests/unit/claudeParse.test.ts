import { describe, expect, it } from 'vitest';
import { compareVersions, parseModelId, parseTriggerLabel } from '@/content/claude/parse';

describe('parseTriggerLabel', () => {
  it('splits model name and effort', () => {
    expect(parseTriggerLabel('Model: Haiku 5.5 Medium')).toEqual({
      modelName: 'Haiku 5.5',
      effort: 'Medium',
    });
    expect(parseTriggerLabel('Model: Opus 5.5 Extra high')).toEqual({
      modelName: 'Opus 5.5',
      effort: 'Extra high',
    });
  });

  it('handles labels without effort', () => {
    expect(parseTriggerLabel('Model: Sonnet 4')).toEqual({ modelName: 'Sonnet 4', effort: null });
  });

  it('rejects unrelated labels', () => {
    expect(parseTriggerLabel('Send message')).toBeNull();
  });
});

describe('parseModelId', () => {
  it('extracts family and version, ignoring date suffixes', () => {
    expect(parseModelId('claude-opus-5-5')).toEqual({ family: 'opus', version: [5, 5] });
    expect(parseModelId('claude-sonnet-4-5-20250929')).toEqual({
      family: 'sonnet',
      version: [4, 5],
    });
    expect(parseModelId('gpt-4')).toBeNull();
  });
});

describe('compareVersions', () => {
  it('orders numerically', () => {
    expect(compareVersions([5, 5], [5, 10])).toBeLessThan(0);
    expect(compareVersions([6], [5, 9])).toBeGreaterThan(0);
    expect(compareVersions([5], [5, 0])).toBe(0);
  });
});
