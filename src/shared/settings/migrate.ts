import { isCommandId } from '../commands';
import { parseChord } from '../keybinding';
import { defaultSettings } from './defaults';
import { EFFORT_LEVELS, SETTINGS_VERSION, type EffortOnSwitch, type Settings } from './schema';

/**
 * Turns whatever is in storage (possibly from an older version, partial or corrupt) into a
 * complete, valid Settings object. Unknown commands are dropped, new commands get defaults.
 */
export function normalizeSettings(raw: unknown): Settings {
  const settings = defaultSettings();
  if (!raw || typeof raw !== 'object') return settings;
  const stored = raw as Partial<Record<keyof Settings, unknown>>;

  if (stored.keybindings && typeof stored.keybindings === 'object') {
    for (const [id, value] of Object.entries(stored.keybindings)) {
      if (!isCommandId(id)) continue;
      if (value === null) settings.keybindings[id] = null;
      else if (typeof value === 'string' && parseChord(value)) settings.keybindings[id] = value;
    }
  }

  if (isEffortOnSwitch(stored.effortOnSwitch)) settings.effortOnSwitch = stored.effortOnSwitch;
  if (typeof stored.showToast === 'boolean') settings.showToast = stored.showToast;

  settings.version = SETTINGS_VERSION;
  return settings;
}

function isEffortOnSwitch(value: unknown): value is EffortOnSwitch {
  return value === 'keep' || (EFFORT_LEVELS as readonly unknown[]).includes(value);
}
