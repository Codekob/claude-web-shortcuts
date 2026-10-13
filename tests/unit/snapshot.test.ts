import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { capturePickerSnapshot, checkPicker } from '@/content/claude';
import { ModelMenu, resetKnownModels } from '@/content/claude/modelMenu';
import fixture from '../fixtures/model-menu.html?raw';
import { mountClaudePage } from '../mock/claudePage';

const $ = (selector: string) => document.querySelector<HTMLElement>(selector)!;

describe('capturePickerSnapshot', () => {
  beforeEach(() => {
    resetKnownModels();
    // The snapshot plus what a real page has around it: chats, a draft, styling and icons.
    document.body.innerHTML = `
      <nav><a href="/chat/1">Secret chat title</a></nav>
      <main><p>Private conversation</p>${fixture}</main>`;
    const composer = $('[data-testid="chat-input"]');
    composer.innerHTML = '<p>my draft</p>';
    composer.className = 'tiptap ProseMirror';
    const item = $('[data-model-id="claude-opus-5-5"]');
    item.className = 'flex gap-2';
    item.style.color = 'red';
    item.insertAdjacentHTML('afterbegin', '<svg><path d="M0 0"/></svg>');
  });
  afterEach(() => document.body.replaceChildren());

  it('keeps the picker and leaves out chats, drafts, styling and icons', () => {
    const { html, menusOpen } = capturePickerSnapshot();
    expect(menusOpen).toBe(true);
    expect(html).toContain('data-model-id="claude-opus-5-5"');
    expect(html).toContain('Opus 5.5');
    expect(html).toContain('data-effort-id="xhigh"');
    expect(html).toContain('data-base-ui-portal');
    for (const leaked of ['Secret chat', 'Private conversation', 'my draft', 'class=', 'style=']) {
      expect(html).not.toContain(leaked);
    }
    expect(html).not.toMatch(/<svg|<!--/);
  });

  it('produces markup the adapter reads like the original', async () => {
    const { html } = capturePickerSnapshot();
    document.body.innerHTML = html;
    expect(checkPicker()).toEqual([]);
    const trigger = $('[data-testid="model-selector-dropdown"]');
    expect((await new ModelMenu(trigger).listEfforts()).map((e) => e.id)).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
  });

  it('still finds the open picker after its test id changed', () => {
    $('[data-testid="model-selector-dropdown"]').dataset.testid = 'model-picker';
    const { html } = capturePickerSnapshot();
    expect(html).toContain('data-testid="model-picker"');
    expect(html).toContain('data-effort-id="xhigh"');
  });

  it('captures only the button of a closed picker', () => {
    mountClaudePage();
    const { html, menusOpen } = capturePickerSnapshot();
    expect(menusOpen).toBe(false);
    expect(html).toContain('aria-label="Model: Haiku 5.5 Medium"');
    expect(html).not.toContain('role="menu"');
  });

  it('fails without a picker', () => {
    document.body.innerHTML = '<p>Settings</p>';
    expect(() => capturePickerSnapshot()).toThrow(/Model picker not found/);
  });
});
