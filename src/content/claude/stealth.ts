import { SELECTORS } from './selectors';

const BUSY_ATTRIBUTE = 'data-cws-busy';
const STYLE_ID = 'cws-stealth-style';

/**
 * While the busy flag is set, claude.ai's menu popups are rendered fully transparent and
 * non-interactive, so automating the model picker causes no visible flicker.
 */
const STEALTH_CSS = `
html[${BUSY_ATTRIBUTE}] ${SELECTORS.portal}:has(${SELECTORS.menu}) {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: none !important;
  animation: none !important;
}
html[${BUSY_ATTRIBUTE}] ${SELECTORS.portal}:has(${SELECTORS.menu}) * {
  transition: none !important;
  animation: none !important;
}
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STEALTH_CSS;
  (document.head ?? document.documentElement).append(style);
}

export function beginStealth(): void {
  ensureStyle();
  document.documentElement.setAttribute(BUSY_ATTRIBUTE, '');
}

export function endStealth(): void {
  document.documentElement.removeAttribute(BUSY_ATTRIBUTE);
}
