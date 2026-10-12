import { waitForRemoval } from '../dom/waitFor';
import { ClaudeUiError, findModelTrigger, ModelMenu } from './modelMenu';
import { SELECTORS } from './selectors';
import { beginStealth } from './stealth';

/**
 * Runs `task` against the model picker while it is invisible, then closes the picker and puts
 * focus back where the user was (usually the composer, caret intact).
 *
 * Resolves as soon as the picker reports itself closed. Its popups may still be animating out;
 * they stay hidden until unmounted in the background, so the next command need not wait.
 */
export async function withModelMenu<T>(task: (menu: ModelMenu) => Promise<T>): Promise<T> {
  const trigger = findModelTrigger();
  if (!trigger) throw new ClaudeUiError('Model picker not found on this page');

  const previousFocus = document.activeElement as HTMLElement | null;
  const menu = new ModelMenu(trigger);
  const release = beginStealth();
  try {
    return await task(menu);
  } finally {
    const openPopups = [...document.querySelectorAll(`${SELECTORS.portal} ${SELECTORS.menu}`)];
    await menu.close();
    restoreFocus(previousFocus);
    void Promise.all(openPopups.map((el) => waitForRemoval(el))).then(() => {
      release();
      // The picker may hand focus back to its trigger as it unmounts; undo that.
      if (focusWasTakenBy(trigger)) restoreFocus(previousFocus);
    });
  }
}

function focusWasTakenBy(trigger: HTMLElement): boolean {
  const active = document.activeElement;
  return !active || active === document.body || active === trigger;
}

function restoreFocus(previous: HTMLElement | null): void {
  const target =
    previous?.isConnected && previous !== document.body
      ? previous
      : document.querySelector<HTMLElement>(SELECTORS.chatInput);
  target?.focus({ preventScroll: true });
}
