import { ClaudeUiError } from './modelMenu';
import { SELECTORS } from './selectors';

/**
 * An open menu button per the WAI-ARIA menu button pattern. Deliberately independent of
 * SELECTORS, so a snapshot can still be taken after claude.ai changed the markup they target.
 */
const OPEN_MENU_BUTTON = '[aria-haspopup="menu"][aria-expanded="true"][aria-controls]';

/** Elements dropped from snapshots: icons, images and anything executable or styling. */
const DROPPED = 'svg, img, picture, video, canvas, script, style, link, iframe';

export interface PickerSnapshot {
  /** Markup in the shape of tests/fixtures/model-menu.html. */
  html: string;
  /** Whether any menu was open; a closed picker only yields its button. */
  menusOpen: boolean;
}

/**
 * Captures the model picker's markup for updating tests/fixtures/model-menu.html: the composer
 * (emptied), the picker button and every open menu it leads to, with the portal wrappers they
 * are rendered in. Classes, styles and icons are removed, and only text inside the button and
 * the menus is kept, so no chat titles or drafts end up in the snapshot.
 *
 * Open the picker (and the Effort submenu) before capturing for a complete snapshot.
 */
export function capturePickerSnapshot(): PickerSnapshot {
  const trigger =
    document.querySelector<HTMLElement>(SELECTORS.modelTrigger) ??
    [...document.querySelectorAll<HTMLElement>(OPEN_MENU_BUTTON)].find(
      (el) => !el.closest('[role="menu"]'),
    );
  if (!trigger) throw new ClaudeUiError('Model picker not found. Open it, then try again');

  const menus = openMenusFrom(trigger);
  const containers = topmost(menus.map((menu) => outermostWrapper(menu, trigger)));
  const composer = document.querySelector(SELECTORS.chatInput);

  const parts: Element[] = [];
  if (composer) parts.push(sanitize(composer.cloneNode(false) as Element, () => false));
  parts.push(sanitize(trigger, () => true));
  for (const container of containers) {
    parts.push(sanitize(container, (el) => menus.some((menu) => menu.contains(el))));
  }
  const html = parts.map((el) => el.outerHTML).join('\n');
  return { html, menusOpen: menus.length > 0 };
}

/** The menus opened from `trigger`, followed through nested submenus. */
function openMenusFrom(trigger: Element): HTMLElement[] {
  const menus: HTMLElement[] = [];
  const buttons: Element[] = [trigger];
  for (let button = buttons.shift(); button; button = buttons.shift()) {
    if (button.getAttribute('aria-expanded') !== 'true') continue;
    const menu = document.getElementById(button.getAttribute('aria-controls') ?? '');
    if (!menu || menus.includes(menu)) continue;
    menus.push(menu);
    buttons.push(...menu.querySelectorAll(OPEN_MENU_BUTTON));
  }
  return menus;
}

/** The largest ancestor of `menu` (below <body>) that does not also hold the picker button. */
function outermostWrapper(menu: HTMLElement, trigger: Element): HTMLElement {
  let wrapper = menu;
  while (
    wrapper.parentElement &&
    wrapper.parentElement !== document.body &&
    !wrapper.parentElement.contains(trigger)
  ) {
    wrapper = wrapper.parentElement;
  }
  return wrapper;
}

/** Distinct elements that are not inside another one of them, in document order. */
function topmost(elements: HTMLElement[]): HTMLElement[] {
  const unique = [...new Set(elements)];
  return unique
    .filter((el) => !unique.some((other) => other !== el && other.contains(el)))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

/**
 * A copy of `root` without classes, styles and dropped elements, keeping text only where
 * `keepText` allows it (checked against the original element the text belongs to).
 */
function sanitize(root: Element, keepText: (original: Element) => boolean): Element {
  const textAllowed = new WeakSet<Node>();
  const originals = [root, ...root.querySelectorAll('*')];
  const copy = root.cloneNode(true) as Element;
  const copies = [copy, ...copy.querySelectorAll('*')];
  copies.forEach((el, i) => {
    if (keepText(originals[i]!)) textAllowed.add(el);
  });

  copy.querySelectorAll(DROPPED).forEach((el) => el.remove());
  for (const el of [copy, ...copy.querySelectorAll('*')]) {
    el.removeAttribute('class');
    el.removeAttribute('style');
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.COMMENT_NODE) node.remove();
      else if (node.nodeType === Node.TEXT_NODE && !textAllowed.has(el)) node.textContent = '';
    }
  }
  return copy;
}
