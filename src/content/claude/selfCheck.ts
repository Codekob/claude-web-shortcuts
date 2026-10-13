import { EFFORT_LEVELS } from '@/shared/settings';
import { waitFor } from '../dom/waitFor';
import {
  controlledMenu,
  effortItems,
  findEffortRow,
  findModelTrigger,
  readSelectorState,
} from './modelMenu';
import { MODEL_ID_PATTERN, SELECTORS } from './selectors';
import { isStealthActive } from './stealth';

/** How long the composer gets to appear after load before the page is assumed not a chat. */
const COMPOSER_TIMEOUT_MS = 30_000;
/** How long the page gets to settle (picker rendering, menus mounting) before we complain. */
const SETTLE_TIMEOUT_MS = 1500;

/**
 * Compares what claude.ai currently renders with the assumptions in selectors.ts and returns a
 * description of every mismatch (empty if all is well). Checks the closed picker button, and
 * the menu and Effort submenu too while they are open.
 */
export function checkPicker(): string[] {
  const trigger = findModelTrigger();
  if (!trigger) return ['Model picker button not found'];

  const problems: string[] = [];
  const label = trigger.getAttribute('aria-label') ?? '';
  const state = readSelectorState();
  if (!state) problems.push(`Model picker label has an unexpected format: "${label}"`);

  if (trigger.getAttribute('aria-expanded') !== 'true') return problems;
  const menu = controlledMenu(trigger);
  if (!menu) return [...problems, 'Model picker is open but its menu was not found'];

  const models = [...menu.querySelectorAll<HTMLElement>(SELECTORS.modelItem)];
  if (models.length === 0) problems.push('No models found in the model picker');
  for (const id of models.map((el) => el.dataset.modelId ?? '')) {
    if (!MODEL_ID_PATTERN.test(id)) problems.push(`Unrecognized model id: "${id}"`);
  }

  const effortRow = findEffortRow(menu);
  if (!effortRow) {
    // Models without an effort setting have no Effort row, but then the label shows no effort.
    if (state?.effort) problems.push('Effort row not found in the model picker');
    return problems;
  }
  if (effortRow.getAttribute('aria-expanded') !== 'true') return problems;
  const submenu = controlledMenu(effortRow);
  if (!submenu) return [...problems, 'Effort submenu is open but was not found'];

  const efforts = effortItems(submenu);
  if (efforts.length === 0) problems.push('No effort levels found in the Effort submenu');
  for (const id of efforts.map((el) => el.dataset.effortId ?? '')) {
    if (!EFFORT_LEVELS.some((level) => level.id === id)) {
      problems.push(`Unknown effort level: "${id}"`);
    }
  }
  return problems;
}

/** Problems that persist after the page had a moment to settle; transient states pass. */
async function settledProblems(): Promise<string[]> {
  try {
    await waitFor(() => checkPicker().length === 0, {
      timeout: SETTLE_TIMEOUT_MS,
      description: 'model picker self-check',
    });
    return [];
  } catch {
    return checkPicker();
  }
}

/**
 * Runs `checkPicker` once a chat composer is on the page, and again whenever the user opens
 * the picker or one of its submenus (our own hidden automation reports failures itself).
 * `report` is called with the problems of each failed check. Returns a function to stop.
 */
export function installSelfCheck(report: (problems: string[]) => void): () => void {
  let stopped = false;
  let checking = false;
  const run = async () => {
    if (checking || isStealthActive()) return;
    checking = true;
    const problems = await settledProblems();
    checking = false;
    if (!stopped && !isStealthActive() && problems.length > 0) report(problems);
  };

  // Pages without a composer (settings, project lists, …) have no model picker to check.
  waitFor(() => document.querySelector(SELECTORS.chatInput), {
    timeout: COMPOSER_TIMEOUT_MS,
    description: 'composer',
  }).then(run, () => undefined);

  const observer = new MutationObserver((mutations) => {
    const opened = mutations.some(
      (m) => m.target instanceof Element && m.target.getAttribute('aria-expanded') === 'true',
    );
    if (opened && findModelTrigger()?.getAttribute('aria-expanded') === 'true') void run();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['aria-expanded'],
    subtree: true,
  });

  return () => {
    stopped = true;
    observer.disconnect();
  };
}
