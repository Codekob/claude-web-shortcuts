import { press } from '../dom/simulate';
import { INCOGNITO_PARAM, NEW_CHAT_PATH, SELECTORS } from './selectors';

/** Where we are and how to go elsewhere; injectable because jsdom cannot navigate. */
export interface NavigationEnv {
  location: Pick<Location, 'pathname' | 'search'>;
  navigate: (url: string) => void;
}

const browserEnv = (): NavigationEnv => ({
  location: window.location,
  navigate: (url) => window.location.assign(url),
});

/**
 * Opens a new chat through the sidebar's "New" link, so claude.ai's router switches pages
 * without a reload. Falls back to loading /new if the link is not on the page.
 */
export function startNewChat(env: NavigationEnv = browserEnv()): void {
  const link = document.querySelector<HTMLElement>(SELECTORS.newChatLink);
  if (link) press(link);
  else env.navigate(NEW_CHAT_PATH);
}

/** Whether the page is a new chat opened in incognito mode (/new?incognito). */
export function isIncognitoNewChat(env: NavigationEnv = browserEnv()): boolean {
  const { pathname, search } = env.location;
  return pathname === NEW_CHAT_PATH && new URLSearchParams(search).has(INCOGNITO_PARAM);
}

/**
 * Loads a new incognito chat. This is a full page load: the in-page incognito toggle only
 * exists on /new and cannot tell us reliably whether it is on.
 */
export function startIncognitoChat(env: NavigationEnv = browserEnv()): 'already' | 'navigating' {
  if (isIncognitoNewChat(env)) return 'already';
  env.navigate(`${NEW_CHAT_PATH}?${INCOGNITO_PARAM}`);
  return 'navigating';
}
