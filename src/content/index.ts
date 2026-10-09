import { defaultSettings, loadSettings, subscribeSettings, type Settings } from '@/shared/settings';
import { createDispatcher } from './commands/dispatcher';
import { buildKeymap, installShortcutListener } from './keyboard/listener';
import { showToast } from './ui/toast';

let settings: Settings = defaultSettings();
let keymap = buildKeymap(settings.keybindings);

function applySettings(next: Settings): void {
  settings = next;
  keymap = buildKeymap(next.keybindings);
}

const dispatch = createDispatcher({ getSettings: () => settings, showToast });
installShortcutListener(
  () => keymap,
  (id) => void dispatch(id),
);

subscribeSettings(applySettings);
loadSettings().then(applySettings, (error) =>
  console.warn('[claude-web-shortcuts] Using default settings:', error),
);
