import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readSelectorState } from '@/content/claude';
import { ModelMenu, resetKnownModels } from '@/content/claude/modelMenu';
import fixture from '../fixtures/model-menu.html?raw';
import { mountClaudePage } from '../mock/claudePage';

/**
 * The fake page must read exactly like the real claude.ai snapshot. If this fails after
 * refreshing the fixture, update tests/mock/claudePage.ts to match the new markup.
 */
const pages: [string, () => () => void][] = [
  [
    'claude.ai snapshot',
    () => {
      document.body.innerHTML = fixture;
      return () => (document.body.innerHTML = '');
    },
  ],
  [
    'fake page',
    () => {
      const page = mountClaudePage();
      return () => page.destroy();
    },
  ],
];

describe.each(pages)('adapter reads the %s', (_name, mount) => {
  let unmount: () => void;
  const menu = () =>
    new ModelMenu(document.querySelector<HTMLElement>('[data-testid="model-selector-dropdown"]')!);

  beforeEach(() => {
    resetKnownModels();
    unmount = mount();
  });
  afterEach(() => unmount());

  it('reads the trigger label', () => {
    expect(readSelectorState()).toEqual({ modelName: 'Haiku 5.5', effort: 'Medium' });
  });

  it('lists the selectable models', async () => {
    const models = await menu().listModels();
    expect(models.map((m) => [m.id, m.name, m.family, m.version, m.selected])).toEqual([
      ['claude-opus-5-5', 'Opus 5.5', 'opus', [5, 5], false],
      ['claude-sonnet-5-5', 'Sonnet 5.5', 'sonnet', [5, 5], false],
      ['claude-haiku-5-5', 'Haiku 5.5', 'haiku', [5, 5], true],
    ]);
  });

  it('reads the current effort from the Effort row', async () => {
    expect(await menu().currentEffortLabel()).toBe('Medium');
  });

  it('lists the effort levels', async () => {
    expect(await menu().listEfforts()).toEqual([
      { id: 'low', label: 'Low', selected: false },
      { id: 'medium', label: 'Medium', selected: true },
      { id: 'high', label: 'High', selected: false },
      { id: 'xhigh', label: 'Extra', selected: false },
      { id: 'max', label: 'Max', selected: false },
    ]);
  });
});
