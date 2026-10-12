import type { CommandId } from '../commands';

/**
 * Effort levels in claude.ai's Effort submenu, in menu order. `id` is the item's
 * `data-effort-id`; `label` is its visible name. Not every model offers every level.
 */
export const EFFORT_LEVELS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra' },
  { id: 'max', label: 'Max' },
] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number]['id'];

/** What to do with effort when a "switch model" command runs. */
export type EffortOnSwitch = 'keep' | EffortLevel;

export type Keybindings = Record<CommandId, string | null>;

export interface Settings {
  version: number;
  /** Serialized chord per command; null means explicitly unbound. */
  keybindings: Keybindings;
  effortOnSwitch: EffortOnSwitch;
  /** Show a small confirmation toast on claude.ai after a command runs. */
  showToast: boolean;
}

export const SETTINGS_VERSION = 1;
