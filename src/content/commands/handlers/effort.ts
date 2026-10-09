import type { ModelMenu } from '../../claude';
import { withModelMenu } from '../../claude';
import type { CommandContext, CommandHandler } from '../types';
import { CommandError } from '../types';
import { notifySelectorState } from './feedback';

/** Selects the effort after the current one, wrapping around. */
async function selectNextEffort(menu: ModelMenu): Promise<void> {
  const efforts = await menu.listEfforts();
  if (efforts.length === 0) throw new CommandError('No effort levels available');
  const current = efforts.findIndex((e) => e.selected);
  const next = efforts[(current + 1) % efforts.length]!;
  await menu.selectEffort(next.label);
}

export const cycleEffort: CommandHandler = async (context: CommandContext) => {
  await withModelMenu(selectNextEffort);
  notifySelectorState(context);
};

export function setEffort(level: string): CommandHandler {
  return async (context) => {
    await withModelMenu((menu) => menu.selectEffort(level));
    notifySelectorState(context);
  };
}
