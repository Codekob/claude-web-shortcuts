import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPicker, installSelfCheck } from '@/content/claude';
import { resetKnownModels } from '@/content/claude/modelMenu';
import { beginStealth } from '@/content/claude/stealth';
import fixture from '../fixtures/model-menu.html?raw';
import { mountClaudePage, SNAPSHOT_MODELS } from '../mock/claudePage';

const $ = (selector: string) => document.querySelector<HTMLElement>(selector)!;

describe('checkPicker against the claude.ai snapshot', () => {
  beforeEach(() => {
    resetKnownModels();
    document.body.innerHTML = fixture;
  });

  it('finds no problems in the open picker and Effort submenu', () => {
    expect(checkPicker()).toEqual([]);
  });

  it('reports a missing picker button', () => {
    $('[data-testid="model-selector-dropdown"]').dataset.testid = 'model-picker';
    expect(checkPicker()).toEqual(['Model picker button not found']);
  });

  it('reports a label in an unknown format', () => {
    $('[data-testid="model-selector-dropdown"]').setAttribute('aria-label', 'Haiku 5.5 Medium');
    expect(checkPicker()).toEqual([
      'Model picker label has an unexpected format: "Haiku 5.5 Medium"',
    ]);
  });

  it('reports a menu it cannot reach', () => {
    $('[data-testid="model-selector-dropdown"]').setAttribute('aria-controls', 'gone');
    expect(checkPicker()).toEqual(['Model picker is open but its menu was not found']);
  });

  it('reports models it cannot find or parse', () => {
    for (const item of document.querySelectorAll<HTMLElement>('[data-model-id]')) {
      item.dataset.modelId = item.dataset.modelId!.replace('claude-', '');
    }
    expect(checkPicker()).toEqual([
      'Unrecognized model id: "opus-5-5"',
      'Unrecognized model id: "sonnet-5-5"',
      'Unrecognized model id: "haiku-5-5"',
    ]);

    for (const item of document.querySelectorAll('[data-model-id]')) {
      item.removeAttribute('data-model-id');
    }
    expect(checkPicker()).toEqual(['No models found in the model picker']);
  });

  it('reports a renamed Effort row', () => {
    $('[aria-controls="_r_effort_"] span').textContent = 'Thinking';
    expect(checkPicker()).toEqual(['Effort row not found in the model picker']);
  });

  it('reports effort levels it cannot find or does not know', () => {
    $('[data-effort-id="max"]').dataset.effortId = 'ultra';
    expect(checkPicker()).toEqual(['Unknown effort level: "ultra"']);

    for (const item of document.querySelectorAll('[data-effort-id]')) {
      item.removeAttribute('data-effort-id');
    }
    expect(checkPicker()).toEqual(['No effort levels found in the Effort submenu']);
  });
});

describe('checkPicker against the fake page', () => {
  afterEach(() => document.body.replaceChildren());

  it('accepts the closed picker', () => {
    mountClaudePage();
    expect(checkPicker()).toEqual([]);
  });

  it('accepts a model without an effort setting', () => {
    const page = mountClaudePage({
      models: SNAPSHOT_MODELS.map((m) =>
        m.id === 'claude-opus-5-5' ? { ...m, efforts: null } : m,
      ),
      selected: { model: 'claude-opus-5-5', effort: null },
    });
    page.trigger.click();
    expect(checkPicker()).toEqual([]);
  });
});

describe('installSelfCheck', () => {
  let stop: () => void;
  let reports: string[][];

  beforeEach(() => {
    vi.useFakeTimers();
    resetKnownModels();
    reports = [];
  });
  afterEach(() => {
    stop();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  const install = () => (stop = installSelfCheck((problems) => reports.push(problems)));

  it('checks the page once the composer is there', async () => {
    document.body.innerHTML = '<div data-testid="chat-input"></div>';
    install();
    await vi.advanceTimersByTimeAsync(2000);
    expect(reports).toEqual([['Model picker button not found']]);
  });

  it('stays quiet on pages without a composer', async () => {
    install();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reports).toEqual([]);
  });

  it('checks again when the user opens the picker', async () => {
    const page = mountClaudePage({ effortRowLabel: 'Thinking' });
    install();
    await vi.advanceTimersByTimeAsync(2000);
    expect(reports).toEqual([]);

    page.trigger.click();
    await vi.advanceTimersByTimeAsync(2000);
    expect(reports).toEqual([['Effort row not found in the model picker']]);
  });

  it('ignores the picker while the extension automates it', async () => {
    const page = mountClaudePage({ effortRowLabel: 'Thinking' });
    install();
    const release = beginStealth();
    page.trigger.click();
    await vi.advanceTimersByTimeAsync(2000);
    release();
    expect(reports).toEqual([]);
  });

  it('gives the page time to settle before reporting', async () => {
    const page = mountClaudePage();
    install();
    await vi.advanceTimersByTimeAsync(2000);
    page.trigger.setAttribute('aria-label', 'Loading…');
    setTimeout(() => page.update({}), 500);
    page.trigger.click();
    await vi.advanceTimersByTimeAsync(2000);
    expect(reports).toEqual([]);
  });
});
