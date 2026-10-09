import { getCommand, type CommandId } from '@/shared/commands';
import type { Settings } from '@/shared/settings';
import { ClaudeUiError } from '../claude';
import { SerialQueue } from './queue';
import { COMMAND_HANDLERS } from './registry';
import { CommandError, type CommandContext } from './types';

export interface DispatcherDeps {
  getSettings: () => Settings;
  showToast: (message: string, kind?: 'info' | 'error') => void;
}

export function createDispatcher({ getSettings, showToast }: DispatcherDeps) {
  const queue = new SerialQueue();

  return function dispatch(id: CommandId): Promise<void> {
    return queue.run(async () => {
      const settings = getSettings();
      const context: CommandContext = {
        settings,
        notify: (message) => settings.showToast && showToast(message),
      };
      try {
        await COMMAND_HANDLERS[id](context);
      } catch (error) {
        const title = getCommand(id)?.title ?? id;
        console.warn(`[claude-web-shortcuts] "${title}" failed:`, error);
        const expected = error instanceof CommandError || error instanceof ClaudeUiError;
        showToast(expected ? error.message : `${title} failed`, 'error');
      }
    });
  };
}
