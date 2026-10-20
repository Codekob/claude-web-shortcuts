import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type * as Navigation from '@/content/claude/navigation';
import { COMMAND_HANDLERS } from '@/content/commands/registry';
import type { CommandContext } from '@/content/commands/types';
import { getCommand } from '@/shared/commands';
import { defaultSettings } from '@/shared/settings';
import fixture from '../fixtures/new-chat.html?raw';

const navigation = vi.hoisted(() => ({ navigate: vi.fn(), url: 'https://claude.ai/chat/abc' }));

vi.mock('@/content/claude/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof Navigation>();
  const env = () => ({ location: new URL(navigation.url), navigate: navigation.navigate });
  return {
    ...actual,
    startNewChat: () => actual.startNewChat(env()),
    startIncognitoChat: () => actual.startIncognitoChat(env()),
  };
});

function context(): CommandContext & { notify: Mock } {
  return { settings: defaultSettings(), count: 1, notify: vi.fn<(message: string) => void>() };
}

describe('chat commands', () => {
  beforeEach(() => {
    document.body.innerHTML = fixture;
    navigation.navigate.mockReset();
    navigation.url = 'https://claude.ai/chat/abc';
  });

  it('are in the catalog and unbound by default', () => {
    for (const id of ['chat.new', 'chat.newIncognito'] as const) {
      expect(getCommand(id)?.defaultKey).toBeNull();
      expect(defaultSettings().keybindings[id]).toBeNull();
    }
  });

  it('chat.new opens a new chat through the sidebar link', async () => {
    const link = document.querySelector<HTMLElement>('[aria-keyshortcuts]')!;
    const onClick = vi.fn((event: Event) => event.preventDefault());
    link.addEventListener('click', onClick);
    const ctx = context();

    await COMMAND_HANDLERS['chat.new'](ctx);

    expect(onClick).toHaveBeenCalledOnce();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(ctx.notify).toHaveBeenCalledWith('New chat');
  });

  it('chat.newIncognito loads an incognito chat', async () => {
    const ctx = context();
    await COMMAND_HANDLERS['chat.newIncognito'](ctx);
    expect(navigation.navigate).toHaveBeenCalledWith('/new?incognito');
  });

  it('chat.newIncognito says so when already incognito', async () => {
    navigation.url = 'https://claude.ai/new?incognito';
    const ctx = context();
    await COMMAND_HANDLERS['chat.newIncognito'](ctx);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(ctx.notify).toHaveBeenCalledWith('Already in an incognito chat');
  });
});
