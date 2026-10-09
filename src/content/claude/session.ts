import { waitForRemoval } from '../dom/waitFor';
import { ClaudeUiError, findModelTrigger, ModelMenu } from './modelMenu';
import { SELECTORS } from './selectors';
import { beginStealth, endStealth } from './stealth';

/**
 * Runs `task` against the model picker while it is invisible, then closes the picker and puts
 * focus back where the user was (usually the composer, caret intact).
 */
export async function withModelMenu<T>(task: (menu: ModelMenu) => Promise<T>): Promise<T> {
  const trigger = findModelTrigger();
  if (!trigger) throw new ClaudeUiError('Model picker not found on this page');

  const previousFocus = document.activeElement as HTMLElement | null;
  const menu = new ModelMenu(trigger);
  beginStealth();
  try {
    return await task(menu);
  } finally {
    const openPopups = [...document.querySelectorAll(`${SELECTORS.portal} ${SELECTORS.menu}`)];
    menu.close();
    // Keep popups hidden until their close animation has finished and they are unmounted.
    await Promise.all(openPopups.map((el) => waitForRemoval(el)));
    endStealth();
    restoreFocus(previousFocus);
  }
}

function restoreFocus(previous: HTMLElement | null): void {
  const target =
    previous?.isConnected && previous !== document.body
      ? previous
      : document.querySelector<HTMLElement>(SELECTORS.chatInput);
  target?.focus({ preventScroll: true });
}
