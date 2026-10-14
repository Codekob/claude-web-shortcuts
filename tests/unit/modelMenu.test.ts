import { beforeEach, describe, expect, it } from 'vitest';
import { latestOfFamily, readSelectorState, type ModelOption } from '@/content/claude';
import { ModelMenu, resetKnownModels } from '@/content/claude/modelMenu';
import fixture from '../fixtures/model-menu.html?raw';

function trigger(): HTMLElement {
  return document.querySelector('[data-testid="model-selector-dropdown"]')!;
}

describe('ModelMenu against the claude.ai snapshot', () => {
  beforeEach(() => {
    document.body.innerHTML = fixture;
  });

  it('reads the current state from the trigger label', () => {
    expect(readSelectorState()).toEqual({ modelName: 'Haiku 5.5', effort: 'Medium' });
  });

  it('lists selectable models only (skips credit-gated menuitems)', async () => {
    const models = await new ModelMenu(trigger()).listModels();
    expect(models.map((m) => [m.id, m.name, m.selected])).toEqual([
      ['claude-opus-5-5', 'Opus 5.5', false],
      ['claude-sonnet-5-5', 'Sonnet 5.5', false],
      ['claude-haiku-5-5', 'Haiku 5.5', true],
    ]);
  });

  it('selects a model by clicking its item', async () => {
    const item = document.querySelector<HTMLElement>('[data-model-id="claude-opus-5-5"]')!;
    item.addEventListener('click', () => item.setAttribute('aria-checked', 'true'));
    await new ModelMenu(trigger()).selectModel('claude-opus-5-5');
    expect(item.getAttribute('aria-checked')).toBe('true');
  });

  it('reads the current effort from the Effort row without the submenu', async () => {
    expect(await new ModelMenu(trigger()).currentEffortLabel()).toBe('Medium');
  });

  it('lists effort levels by id, ignoring badges', async () => {
    const efforts = await new ModelMenu(trigger()).listEfforts();
    expect(efforts).toEqual([
      { id: 'low', label: 'Low', selected: false },
      { id: 'medium', label: 'Medium', selected: true },
      { id: 'high', label: 'High', selected: false },
      { id: 'xhigh', label: 'Extra', selected: false },
      { id: 'max', label: 'Max', selected: false },
    ]);
  });

  it('selects an effort level by id', async () => {
    const item = document.querySelector<HTMLElement>('[data-effort-id="xhigh"]')!;
    item.addEventListener('click', () => item.setAttribute('aria-checked', 'true'));
    await new ModelMenu(trigger()).selectEffort('xhigh');
    expect(item.getAttribute('aria-checked')).toBe('true');
  });

  it('rejects unknown effort levels', async () => {
    await expect(new ModelMenu(trigger()).selectEffort('ultra')).rejects.toThrow(/not available/);
  });

  it('reports no efforts when the model has no Effort row', async () => {
    document.querySelector('[aria-controls="_r_effort_"]')!.remove();
    expect(await new ModelMenu(trigger()).listEfforts()).toEqual([]);
  });
});

describe('ModelMenu against a translated snapshot', () => {
  beforeEach(() => {
    resetKnownModels();
    document.body.innerHTML = fixture
      .replace('aria-label="Model:', 'aria-label="Modell:')
      .replace('<span>Effort</span>', '<span>Aufwand</span>')
      .replace('<span>More models</span>', '<span>Weitere Modelle</span>');
  });

  it('reads the current state from the trigger label', () => {
    expect(readSelectorState()).toEqual({ modelName: 'Haiku 5.5', effort: 'Medium' });
  });

  it('finds the Effort row by its structure', async () => {
    const menu = new ModelMenu(trigger());
    expect(await menu.currentEffortLabel()).toBe('Medium');
    expect((await menu.listEfforts()).map((e) => e.id)).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
  });
});

describe('latestOfFamily', () => {
  const model = (id: string, version: number[]): ModelOption => ({
    id,
    name: id,
    family: 'opus',
    version,
    selected: false,
  });

  it('picks the highest version', () => {
    const models = [model('a', [4, 1]), model('b', [5, 5]), model('c', [5, 0])];
    expect(latestOfFamily(models, 'opus')?.id).toBe('b');
    expect(latestOfFamily(models, 'haiku')).toBeNull();
  });
});
