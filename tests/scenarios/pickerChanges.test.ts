/**
 * What happens to the shortcuts when claude.ai changes its picker: new or renamed models, new
 * effort levels, different labels, slow or unresponsive UI. Each scenario runs real handlers
 * against the fake page and expects the right selection or a clear error — never a wrong one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetKnownModels } from '@/content/claude/modelMenu';
import { cycleEffort, setEffort } from '@/content/commands/handlers/effort';
import { cycleModel, switchToFamily } from '@/content/commands/handlers/model';
import type { CommandHandler } from '@/content/commands/types';
import { defaultSettings, type EffortOnSwitch } from '@/shared/settings';
import {
  mountClaudePage,
  SNAPSHOT_EFFORTS,
  SNAPSHOT_MODELS,
  type ClaudePage,
  type ClaudePageConfig,
  type FakeModel,
} from '../mock/claudePage';

let page: ClaudePage | undefined;

function mount(config: Partial<ClaudePageConfig> = {}): ClaudePage {
  page = mountClaudePage(config);
  return page;
}

async function run(
  handler: CommandHandler,
  { count = 1, effortOnSwitch = 'keep' }: { count?: number; effortOnSwitch?: EffortOnSwitch } = {},
) {
  const notify = vi.fn<(message: string) => void>();
  await handler({ settings: { ...defaultSettings(), effortOnSwitch }, count, notify });
  return notify;
}

const model = (id: string, name: string, extra: Partial<FakeModel> = {}): FakeModel => ({
  id,
  name,
  ...extra,
});

const [fable, opus, sonnet, haiku] = SNAPSHOT_MODELS as [
  FakeModel,
  FakeModel,
  FakeModel,
  FakeModel,
];

beforeEach(() => resetKnownModels());

afterEach(() => {
  // Whatever happened, the picker must not be left open.
  expect(page?.trigger.getAttribute('aria-expanded')).toBe('false');
  page?.destroy();
  page = undefined;
});

describe('cycling models', () => {
  const sonnet56 = model('claude-sonnet-5-6', 'Sonnet 5.6');

  it('visits a fourth selectable model and wraps around', async () => {
    const p = mount({ models: [fable, opus, sonnet, sonnet56, haiku] });
    const visited: string[] = [];
    for (let i = 0; i < 4; i++) {
      await run(cycleModel);
      visited.push(p.state.model);
    }
    expect(visited).toEqual([opus.id, sonnet.id, sonnet56.id, haiku.id]);
  });

  it('advances by the batched press count', async () => {
    const p = mount({ models: [fable, opus, sonnet, sonnet56, haiku] });
    await run(cycleModel, { count: 3 });
    expect(p.state.model).toBe(sonnet56.id);
  });

  it('follows the order claude.ai lists models in', async () => {
    const p = mount({ models: [haiku, sonnet, opus] });
    await run(cycleModel);
    expect(p.state.model).toBe(sonnet.id);
  });

  it('picks up a model added between two commands', async () => {
    const p = mount();
    await run(cycleModel);
    expect(p.state.model).toBe(opus.id);
    p.update({ models: [fable, opus, sonnet56, sonnet, haiku] });
    await run(cycleModel);
    expect(p.state.model).toBe(sonnet56.id);
  });

  it('includes a model once it no longer requires credits', async () => {
    const p = mount({ models: [{ ...fable, gated: false }, opus, sonnet, haiku] });
    await run(cycleModel);
    expect(p.state.model).toBe(fable.id);
  });
});

describe('switching to a family', () => {
  it('picks the newest version when one ships', async () => {
    const p = mount({ models: [...SNAPSHOT_MODELS, model('claude-opus-6', 'Opus 6')] });
    await run(switchToFamily('opus'));
    expect(p.state.model).toBe('claude-opus-6');
  });

  it('ignores date suffixes when comparing versions', async () => {
    const p = mount({
      models: [model('claude-sonnet-4-5-20250929', 'Sonnet 4.5'), sonnet, haiku],
    });
    await run(switchToFamily('sonnet'));
    expect(p.state.model).toBe(sonnet.id);
  });

  it('finds a model whose id has no version', async () => {
    const p = mount({ models: [model('claude-opus', 'Opus'), haiku] });
    await run(switchToFamily('opus'));
    expect(p.state.model).toBe('claude-opus');
  });

  it('falls back to the display name when the id scheme changes', async () => {
    const p = mount({ models: [model('opus-next', 'Opus 6'), haiku] });
    await run(switchToFamily('opus'));
    expect(p.state.model).toBe('opus-next');
  });

  it('reports a clear error when the family is gone', async () => {
    mount({ models: [opus, sonnet], selected: { model: opus.id, effort: 'medium' } });
    await expect(run(switchToFamily('haiku'))).rejects.toThrow('No haiku model available');
  });

  it('skips the picker when already on the newest model', async () => {
    const p = mount({ selected: { model: opus.id, effort: 'medium' } });
    await run(switchToFamily('opus')); // learns the model list
    p.log.length = 0;
    const notify = await run(switchToFamily('opus'));
    expect(p.log).toEqual([]);
    expect(notify).toHaveBeenCalledWith('Opus 5.5 · Medium');
  });
});

describe('renamed models', () => {
  it('handles a name without a version number', async () => {
    const p = mount({ models: [fable, model(opus.id, 'Opus'), sonnet, haiku] });
    const notify = await run(switchToFamily('opus'));
    expect(p.state.model).toBe(opus.id);
    expect(notify).toHaveBeenCalledWith('Opus · Medium');
  });

  it('handles a name with text after the version', async () => {
    const p = mount({ models: [fable, model(opus.id, 'Opus 5.5 Thinking'), sonnet, haiku] });
    const notify = await run(switchToFamily('opus'));
    expect(p.state.model).toBe(opus.id);
    expect(notify).toHaveBeenCalledWith('Opus 5.5 Thinking · Medium');
  });

  it('still uses the fast path for effort on a renamed model', async () => {
    const p = mount({
      models: [fable, model(opus.id, 'Opus'), sonnet, haiku],
      selected: { model: opus.id, effort: 'high' },
    });
    await run(cycleModel, { count: 3 }); // learns the model list, lands back on Opus
    p.log.length = 0;
    await run(setEffort('high'));
    expect(p.log).toEqual([]);
  });

  it('switches correctly after a model is renamed mid-session', async () => {
    const p = mount();
    await run(switchToFamily('opus'));
    p.update({ models: [fable, model(opus.id, 'Opus 5.5 (new)'), sonnet, haiku] });
    await run(switchToFamily('haiku'));
    await run(switchToFamily('opus'));
    expect(p.state.model).toBe(opus.id);
  });
});

describe('effort levels', () => {
  it('selects a renamed level by its id', async () => {
    const efforts = SNAPSHOT_EFFORTS.map((e) =>
      e.id === 'xhigh' ? { ...e, label: 'Extra high' } : e,
    );
    const p = mount({ efforts });
    await run(setEffort('xhigh'));
    expect(p.state.effort).toBe('xhigh');
  });

  it('cycles into a newly added level', async () => {
    const efforts = [...SNAPSHOT_EFFORTS];
    efforts.splice(4, 0, { id: 'ultra', label: 'Ultra' });
    const p = mount({ efforts, selected: { model: haiku.id, effort: 'xhigh' } });
    await run(cycleEffort);
    expect(p.state.effort).toBe('ultra');
  });

  it('never cycles onto Max', async () => {
    const p = mount({ selected: { model: haiku.id, effort: 'high' } });
    await run(cycleEffort, { count: 2 });
    expect(p.state.effort).toBe('low');
  });

  it('switches to a model without effort despite an effort preference', async () => {
    const p = mount({
      models: [opus, model(haiku.id, haiku.name, { efforts: null })],
      selected: { model: opus.id, effort: 'medium' },
    });
    await run(switchToFamily('haiku'), { effortOnSwitch: 'high' });
    expect(p.state).toEqual({ model: haiku.id, effort: null });
  });

  it('leaves effort alone when the new model lacks the preferred level', async () => {
    const p = mount({
      models: [opus, model(haiku.id, haiku.name, { efforts: ['low', 'medium'] })],
      selected: { model: opus.id, effort: 'medium' },
    });
    await run(switchToFamily('haiku'), { effortOnSwitch: 'max' });
    expect(p.state).toEqual({ model: haiku.id, effort: 'medium' });
  });

  it('applies the preferred level when switching', async () => {
    const p = mount();
    await run(switchToFamily('opus'), { effortOnSwitch: 'high' });
    expect(p.state).toEqual({ model: opus.id, effort: 'high' });
  });

  it('reports a clear error when the model has no effort setting', async () => {
    mount({
      models: [model(haiku.id, haiku.name, { efforts: null })],
      selected: { model: haiku.id, effort: null },
    });
    await expect(run(setEffort('high'))).rejects.toThrow('This model has no effort setting');
  });

  it('finds the Effort row when it is renamed', async () => {
    const p = mount({ effortRowLabel: 'Thinking' });
    await run(setEffort('high'));
    expect(p.state.effort).toBe('high');
  });
});

describe('a translated UI', () => {
  const german = {
    effortRowLabel: 'Aufwand',
    efforts: SNAPSHOT_EFFORTS.map((e, i) => ({
      ...e,
      label: ['Niedrig', 'Mittel', 'Hoch', 'Sehr hoch', 'Maximal'][i]!,
    })),
    triggerLabel: (m: FakeModel, e: { label: string } | null) =>
      `Modell: ${m.name}${e ? ` ${e.label}` : ''}`,
  };

  it('sets and cycles effort', async () => {
    const p = mount(german);
    await run(setEffort('high'));
    expect(p.state.effort).toBe('high');
    await run(cycleEffort);
    expect(p.state.effort).toBe('xhigh');
  });

  it('applies the preferred level when switching', async () => {
    const p = mount(german);
    await run(switchToFamily('opus'), { effortOnSwitch: 'high' });
    expect(p.state).toEqual({ model: opus.id, effort: 'high' });
  });

  it('skips the picker once translated levels are known', async () => {
    const p = mount(german);
    await run(setEffort('high'));
    const notify = await run(setEffort('high'));
    expect(p.log.filter((entry) => entry === 'open')).toHaveLength(1);
    expect(notify).toHaveBeenCalledWith('Haiku 5.5 · Hoch');
  });

  it('does not open "More models" for a model without effort', async () => {
    const p = mount({
      ...german,
      models: [model(haiku.id, haiku.name, { efforts: null })],
      selected: { model: haiku.id, effort: null },
    });
    await expect(run(setEffort('high'))).rejects.toThrow('This model has no effort setting');
    expect(p.log).toEqual(['open', 'close']);
  });
});

describe('unexpected UI behaviour', () => {
  it('reports an error when claude.ai ignores the selection', async () => {
    const p = mount({ models: [fable, { ...opus, rejectsSelection: true }, sonnet, haiku] });
    await expect(run(switchToFamily('opus'))).rejects.toThrow(/Opus 5\.5/);
    expect(p.state.model).toBe(haiku.id);
  });

  it('works when popups mount asynchronously', async () => {
    const p = mount({ latencyMs: 40 });
    await run(switchToFamily('opus'), { effortOnSwitch: 'high' });
    expect(p.state).toEqual({ model: opus.id, effort: 'high' });
    await run(cycleEffort);
    expect(p.state.effort).toBe('xhigh');
  });

  it('still switches when the trigger label format changes', async () => {
    const p = mount({ triggerLabel: (m, e) => `${m.name} · ${e?.label ?? ''}` });
    await run(switchToFamily('opus'));
    expect(p.state.model).toBe(opus.id);
  });
});
