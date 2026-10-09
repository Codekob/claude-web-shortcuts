import { getCommand, type CommandId } from '@/shared/commands';
import { defaultSettings, type Settings } from '@/shared/settings';

/** Pure settings transforms used by the editor. */

export function setKeybinding(settings: Settings, id: CommandId, chord: string | null): Settings {
  return { ...settings, keybindings: { ...settings.keybindings, [id]: chord } };
}

export function resetKeybinding(settings: Settings, id: CommandId): Settings {
  return setKeybinding(settings, id, getCommand(id)?.defaultKey ?? null);
}

export function resetAllKeybindings(settings: Settings): Settings {
  return { ...settings, keybindings: defaultSettings().keybindings };
}
