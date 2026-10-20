import { startIncognitoChat, startNewChat } from '../../claude/navigation';
import type { CommandHandler } from '../types';

export const newChat: CommandHandler = async ({ notify }) => {
  startNewChat();
  notify('New chat');
};

/** The page reloads, so there is only feedback when nothing needs to happen. */
export const newIncognitoChat: CommandHandler = async ({ notify }) => {
  if (startIncognitoChat() === 'already') notify('Already in an incognito chat');
};
