import { defaultSettings, loadSettings, subscribeSettings, type Settings } from '@/shared/settings';
import { installSelfCheck } from './claude';
import { createDispatcher } from './commands/dispatcher';
import { buildKeymap, installShortcutListener } from './keyboard/listener';
import { hideWarningBanner, showWarningBanner } from './ui/banner';
import { showToast } from './ui/toast';

let settings: Settings = defaultSettings();
let keymap = buildKeymap(settings.keybindings);

let stopSelfCheck: (() => void) | null = null;

function applySettings(next: Settings): void {
  settings = next;
  keymap = buildKeymap(next.keybindings);
  if (next.debugMode && !stopSelfCheck) {
    stopSelfCheck = installSelfCheck(reportProblems);
  } else if (!next.debugMode && stopSelfCheck) {
    stopSelfCheck();
    stopSelfCheck = null;
    reported.clear();
    hideWarningBanner();
  }
}

const dispatch = createDispatcher({ getSettings: () => settings, showToast });
installShortcutListener(
  () => keymap,
  (id) => dispatch(id),
);

/** Self-check problems seen on this page so far; the banner lists them all. */
const reported = new Set<string>();

function reportProblems(problems: string[]): void {
  for (const problem of problems) {
    if (!reported.has(problem)) console.warn('[claude-web-shortcuts] Self-check:', problem);
    reported.add(problem);
  }
  showWarningBanner(
    "Claude Web Shortcuts: claude.ai's model picker looks different than expected, so some shortcuts may not work.",
    [...reported],
  );
}

subscribeSettings(applySettings);
loadSettings().then(applySettings, (error) =>
  console.warn('[claude-web-shortcuts] Using default settings:', error),
);
