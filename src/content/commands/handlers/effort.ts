import type { EffortLevel, EffortOnSwitch } from '@/shared/settings';
import type { ModelMenu } from '../../claude';
import { effortIdFromLabel, readSelectorState, withModelMenu } from '../../claude';
import type { CommandContext, CommandHandler } from '../types';
import { CommandError } from '../types';
import { notifySelectorState } from './feedback';

/** Whether an effort shown by claude.ai (e.g. "Medium") satisfies `preference`. */
export function effortSatisfied(shown: string | null, preference: EffortOnSwitch): boolean {
  if (preference === 'keep') return true;
  return shown !== null && effortIdFromLabel(shown) === preference;
}

/** Levels cycling never lands on: Max uses limits 5× or more faster, so it must be chosen. */
const SKIPPED_BY_CYCLE: ReadonlySet<string> = new Set<EffortLevel>(['max']);

/** Selects the effort `steps` places after the current one, wrapping around. */
async function selectNextEffort(menu: ModelMenu, steps: number): Promise<void> {
  const efforts = (await menu.listEfforts()).filter((e) => !SKIPPED_BY_CYCLE.has(e.id));
  if (efforts.length === 0) throw new CommandError('No effort levels available');
  // From a skipped level (Max), index -1 wraps to the first level.
  const current = efforts.findIndex((e) => e.selected);
  const next = efforts[(current + steps) % efforts.length]!;
  await menu.selectEffort(next.id);
}

export const cycleEffort: CommandHandler = async (context: CommandContext) => {
  await withModelMenu((menu) => selectNextEffort(menu, context.count));
  notifySelectorState(context);
};

export function setEffort(level: EffortLevel): CommandHandler {
  return async (context) => {
    // Skip the picker entirely if the button already shows this level.
    if (!effortSatisfied(readSelectorState()?.effort ?? null, level)) {
      await withModelMenu((menu) => menu.selectEffort(level));
    }
    notifySelectorState(context);
  };
}
