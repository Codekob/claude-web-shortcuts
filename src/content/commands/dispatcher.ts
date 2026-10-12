import { getCommand, type CommandId } from '@/shared/commands';
import type { Settings } from '@/shared/settings';
import { ClaudeUiError } from '../claude';
import { CommandQueue } from './queue';
import { COMMAND_HANDLERS } from './registry';
import { CommandError, type CommandContext } from './types';

export interface DispatcherDeps {
  getSettings: () => Settings;
  showToast: (message: string, kind?: 'info' | 'error') => void;
}

export function createDispatcher({ getSettings, showToast }: DispatcherDeps) {
  const queue = new CommandQueue<CommandId>(async (id, count) => {
    const settings = getSettings();
    const context: CommandContext = {
      settings,
      count,
      notify: (message) => settings.showToast && showToast(message),
    };
    const started = performance.now();
    try {
      await COMMAND_HANDLERS[id](context);
    } catch (error) {
      const title = getCommand(id)?.title ?? id;
      console.warn(`[claude-web-shortcuts] "${title}" failed:`, error);
      const expected = error instanceof CommandError || error instanceof ClaudeUiError;
      showToast(expected ? error.message : `${title} failed`, 'error');
    } finally {
      const ms = Math.round(performance.now() - started);
      console.debug(`[claude-web-shortcuts] ${id} ×${count}: ${ms}ms`);
    }
  });

  return (id: CommandId): void => queue.push(id);
}
