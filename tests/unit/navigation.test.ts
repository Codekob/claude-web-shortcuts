import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  isIncognitoNewChat,
  startIncognitoChat,
  startNewChat,
  type NavigationEnv,
} from '@/content/claude';
import fixture from '../fixtures/new-chat.html?raw';

function env(url = 'https://claude.ai/chat/abc'): NavigationEnv & { navigate: Mock } {
  return { location: new URL(url), navigate: vi.fn<(url: string) => void>() };
}

describe('startNewChat', () => {
  beforeEach(() => {
    document.body.innerHTML = fixture;
  });

  it('clicks the sidebar "New" row so claude.ai navigates without a reload', () => {
    const link = document.querySelector<HTMLElement>('[aria-keyshortcuts]')!;
    const clicks: Event[] = [];
    link.addEventListener('click', (event) => {
      event.preventDefault(); // what claude.ai's router does
      clicks.push(event);
    });
    const e = env();

    startNewChat(e);

    expect(clicks).toHaveLength(1);
    expect(e.navigate).not.toHaveBeenCalled();
  });

  it('loads /new when the sidebar link is missing', () => {
    document.body.innerHTML = '';
    const e = env();

    startNewChat(e);

    expect(e.navigate).toHaveBeenCalledWith('/new');
  });
});

describe('startIncognitoChat', () => {
  it('loads /new?incognito', () => {
    const e = env();
    expect(startIncognitoChat(e)).toBe('navigating');
    expect(e.navigate).toHaveBeenCalledWith('/new?incognito');
  });

  it('loads /new?incognito from a regular new chat', () => {
    const e = env('https://claude.ai/new');
    expect(startIncognitoChat(e)).toBe('navigating');
    expect(e.navigate).toHaveBeenCalledWith('/new?incognito');
  });

  it('does nothing when already in a new incognito chat', () => {
    const e = env('https://claude.ai/new?incognito');
    expect(startIncognitoChat(e)).toBe('already');
    expect(e.navigate).not.toHaveBeenCalled();
  });
});

describe('isIncognitoNewChat', () => {
  it.each([
    ['https://claude.ai/new?incognito', true],
    ['https://claude.ai/new?incognito=true', true],
    ['https://claude.ai/new', false],
    ['https://claude.ai/chat/abc?incognito', false],
  ])('%s → %s', (url, expected) => {
    expect(isIncognitoNewChat(env(url))).toBe(expected);
  });
});
