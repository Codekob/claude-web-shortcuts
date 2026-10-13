import { waitFor } from '../dom/waitFor';
import { press, pressKey } from '../dom/simulate';
import {
  compareVersions,
  leafText,
  leafTexts,
  parseModelId,
  parseModelName,
  parseTriggerLabel,
  type SelectorState,
} from './parse';
import { EFFORT_SUBMENU_LABEL, MODEL_TRIGGER_LABEL_PREFIX, SELECTORS } from './selectors';

export interface ModelOption {
  id: string;
  name: string;
  family: string | null;
  version: number[];
  selected: boolean;
}

export interface EffortOption {
  /** claude.ai's `data-effort-id`, e.g. "medium". */
  id: string;
  label: string;
  selected: boolean;
}

export class ClaudeUiError extends Error {
  override name = 'ClaudeUiError';
}

const OPEN_TIMEOUT_MS = 1500;
/** How long a click gets to open a popup before falling back to the keyboard. */
const CLICK_OPEN_TIMEOUT_MS = 250;
const CLOSE_TIMEOUT_MS = 300;
/** How long the trigger label gets to reflect a selection before we report a failure. */
const CONFIRM_TIMEOUT_MS = 500;

/** Models seen the last time the picker was opened, for shortcuts that can skip opening it. */
let lastSeenModels: ModelOption[] = [];

export function knownModels(): readonly ModelOption[] {
  return lastSeenModels;
}

/** Forgets the models seen so far, as on a fresh page load (used by tests). */
export function resetKnownModels(): void {
  lastSeenModels = [];
}

export function findModelTrigger(): HTMLElement | null {
  return document.querySelector<HTMLElement>(SELECTORS.modelTrigger);
}

/** Current model and effort, read from the picker button without opening it. */
export function readSelectorState(): SelectorState | null {
  const label = findModelTrigger()?.getAttribute('aria-label');
  if (!label) return null;
  return parseTriggerLabel(
    label,
    lastSeenModels.map((m) => m.name),
  );
}

/** The popup a trigger controls (via aria-controls), if it is currently open. */
export function controlledMenu(trigger: Element): HTMLElement | null {
  if (trigger.getAttribute('aria-expanded') !== 'true') return null;
  const id = trigger.getAttribute('aria-controls');
  const menu = id ? document.getElementById(id) : null;
  return menu?.matches(SELECTORS.menu) ? menu : null;
}

/** Opens the popup controlled by `trigger` and resolves with it. */
async function openMenuFrom(trigger: HTMLElement, what: string): Promise<HTMLElement> {
  const open = controlledMenu(trigger);
  if (open) return open;

  press(trigger);
  try {
    return await waitFor(() => controlledMenu(trigger), {
      timeout: CLICK_OPEN_TIMEOUT_MS,
      description: what,
    });
  } catch {
    // Fallback: keyboard activation (Enter on the main trigger, ArrowRight on submenu rows).
    trigger.focus();
    pressKey(trigger, trigger.getAttribute('role') === 'menuitem' ? 'ArrowRight' : 'Enter');
    return waitFor(() => controlledMenu(trigger), {
      timeout: OPEN_TIMEOUT_MS - CLICK_OPEN_TIMEOUT_MS,
      description: what,
    });
  }
}

/**
 * A handle on claude.ai's model picker. Every method (re)opens the picker as needed, because
 * selecting an item may close it. Use through `withModelMenu` so it stays invisible.
 */
export class ModelMenu {
  constructor(private readonly trigger: HTMLElement) {}

  async open(): Promise<HTMLElement> {
    return openMenuFrom(this.trigger, 'model menu');
  }

  isOpen(): boolean {
    return controlledMenu(this.trigger) !== null;
  }

  async listModels(): Promise<ModelOption[]> {
    const menu = await this.open();
    lastSeenModels = [...menu.querySelectorAll<HTMLElement>(SELECTORS.modelItem)].map(
      toModelOption,
    );
    return lastSeenModels;
  }

  async selectModel(id: string): Promise<void> {
    const menu = await this.open();
    const item = [...menu.querySelectorAll<HTMLElement>(SELECTORS.modelItem)].find(
      (el) => el.dataset.modelId === id,
    );
    if (!item) throw new ClaudeUiError(`Model ${id} is not available`);
    if (item.getAttribute('aria-checked') === 'true') return;
    await this.pressAndConfirm(item, leafText(item) || id);
  }

  /**
   * Current effort as shown on the picker's Effort row (e.g. "Medium"), without opening the
   * submenu; null if the model has no effort setting.
   */
  async currentEffortLabel(): Promise<string | null> {
    const row = findEffortRow(await this.open());
    return row ? (leafTexts(row)[1] ?? null) : null;
  }

  /** Effort levels the current model offers; empty if it has no effort setting. */
  async listEfforts(): Promise<EffortOption[]> {
    const submenu = await this.openEffortSubmenu();
    return submenu ? effortItems(submenu).map(toEffortOption) : [];
  }

  async selectEffort(id: string): Promise<void> {
    const submenu = await this.openEffortSubmenu();
    if (!submenu) throw new ClaudeUiError('This model has no effort setting');
    const item = effortItems(submenu).find((el) => el.dataset.effortId === id);
    if (!item) throw new ClaudeUiError(`Effort "${id}" is not available for this model`);
    if (item.getAttribute('aria-checked') === 'true') return;
    await this.pressAndConfirm(item, leafText(item) || id);
  }

  /** Closes the picker and waits (briefly) until it reports itself closed. */
  async close(): Promise<void> {
    const menu = controlledMenu(this.trigger);
    if (!menu) return;
    pressKey(document.activeElement ?? menu, 'Escape');
    // Escape may only close a nested submenu; press again if the picker is still open.
    if (this.isOpen()) pressKey(document.activeElement ?? menu, 'Escape');
    await waitFor(() => !this.isOpen(), {
      timeout: CLOSE_TIMEOUT_MS,
      description: 'model menu to close',
    }).catch(() => undefined);
  }

  /**
   * Clicks an unselected item and waits until claude.ai took the selection: the item turns
   * checked, or the picker closes and the trigger label changes. A picker that closes without
   * the label changing (e.g. an upgrade prompt intervened) is reported as a failure. Labels in
   * an unknown format are not checked.
   */
  private async pressAndConfirm(item: HTMLElement, name: string): Promise<void> {
    const labelBefore = this.trigger.getAttribute('aria-label');
    const checked = () => item.isConnected && item.getAttribute('aria-checked') === 'true';
    press(item);
    await waitFor(() => checked() || !item.isConnected || !this.isOpen(), {
      timeout: OPEN_TIMEOUT_MS,
      description: `selection of ${name}`,
    });
    if (checked() || !labelBefore?.startsWith(MODEL_TRIGGER_LABEL_PREFIX)) return;
    await waitFor(() => this.trigger.getAttribute('aria-label') !== labelBefore, {
      timeout: CONFIRM_TIMEOUT_MS,
      description: `selection of ${name}`,
    }).catch(() => {
      throw new ClaudeUiError(`claude.ai did not switch to ${name}`);
    });
  }

  /** Opens the Effort submenu, or returns null if the current model has none. */
  private async openEffortSubmenu(): Promise<HTMLElement | null> {
    const row = findEffortRow(await this.open());
    return row ? openMenuFrom(row, 'effort submenu') : null;
  }
}

function toModelOption(item: HTMLElement): ModelOption {
  const id = item.dataset.modelId ?? '';
  const name = leafText(item);
  const parsed = parseModelId(id) ?? parseModelName(name);
  return {
    id,
    name,
    family: parsed?.family ?? null,
    version: parsed?.version ?? [],
    selected: item.getAttribute('aria-checked') === 'true',
  };
}

function toEffortOption(item: HTMLElement): EffortOption {
  return {
    id: item.dataset.effortId ?? '',
    // The first leaf is the level name; badges such as "Recommended" come after it.
    label: leafText(item),
    selected: item.getAttribute('aria-checked') === 'true',
  };
}

/** The picker row that opens the Effort submenu, if the current model has one. */
export function findEffortRow(menu: HTMLElement): HTMLElement | undefined {
  return [...menu.querySelectorAll<HTMLElement>(SELECTORS.submenuTrigger)].find((el) =>
    sameLabel(leafText(el), EFFORT_SUBMENU_LABEL),
  );
}

export function effortItems(submenu: HTMLElement): HTMLElement[] {
  return [...submenu.querySelectorAll<HTMLElement>(SELECTORS.effortItem)];
}

export function sameLabel(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;
}

/** Newest model of a family among the given options. */
export function latestOfFamily(models: readonly ModelOption[], family: string): ModelOption | null {
  return (
    models
      .filter((m) => m.family === family)
      .sort((a, b) => compareVersions(b.version, a.version))[0] ?? null
  );
}
