import type { CommandId } from '../commands';

/** Effort levels as labelled in claude.ai's Effort submenu. */
export const EFFORT_LEVELS = ['Low', 'Medium', 'High'] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

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
