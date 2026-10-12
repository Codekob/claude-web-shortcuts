import { COMMANDS } from '../commands';
import { SETTINGS_VERSION, type Keybindings, type Settings } from './schema';

export function defaultKeybindings(): Keybindings {
  return Object.fromEntries(COMMANDS.map((c) => [c.id, c.defaultKey])) as Keybindings;
}

export function defaultSettings(): Settings {
  return {
    version: SETTINGS_VERSION,
    keybindings: defaultKeybindings(),
    effortOnSwitch: 'medium',
    showToast: true,
  };
}
