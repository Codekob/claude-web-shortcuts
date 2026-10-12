import type { EffortLevel } from '@/shared/settings';
import type { ModelMenu } from '../../claude';
import { withModelMenu } from '../../claude';
import type { CommandContext, CommandHandler } from '../types';
import { CommandError } from '../types';
import { notifySelectorState } from './feedback';

/** Levels cycling never lands on: Max uses limits 5× or more faster, so it must be chosen. */
const SKIPPED_BY_CYCLE: ReadonlySet<string> = new Set<EffortLevel>(['max']);

/** Selects the effort after the current one, wrapping around. */
async function selectNextEffort(menu: ModelMenu): Promise<void> {
  const efforts = (await menu.listEfforts()).filter((e) => !SKIPPED_BY_CYCLE.has(e.id));
  if (efforts.length === 0) throw new CommandError('No effort levels available');
  // From a skipped level (Max), index -1 wraps to the first level.
  const current = efforts.findIndex((e) => e.selected);
  const next = efforts[(current + 1) % efforts.length]!;
  await menu.selectEffort(next.id);
}

export const cycleEffort: CommandHandler = async (context: CommandContext) => {
  await withModelMenu(selectNextEffort);
  notifySelectorState(context);
};

export function setEffort(level: EffortLevel): CommandHandler {
  return async (context) => {
    await withModelMenu((menu) => menu.selectEffort(level));
    notifySelectorState(context);
  };
}
