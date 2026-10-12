import { latestOfFamily, withModelMenu, type ModelMenu, type ModelOption } from '../../claude';
import type { CommandContext, CommandHandler } from '../types';
import { CommandError } from '../types';
import { notifySelectorState } from './feedback';

/**
 * Applies the user's "effort when switching model" preference. Skipped when the new model does
 * not offer that level, so the switch itself still succeeds.
 */
async function applyEffortPreference(menu: ModelMenu, { settings }: CommandContext): Promise<void> {
  const target = settings.effortOnSwitch;
  if (target === 'keep') return;
  const efforts = await menu.listEfforts();
  if (efforts.some((e) => e.id === target)) await menu.selectEffort(target);
}

async function switchTo(
  context: CommandContext,
  pick: (models: ModelOption[]) => ModelOption | null,
): Promise<void> {
  await withModelMenu(async (menu) => {
    const target = pick(await menu.listModels());
    if (!target) throw new CommandError('Model not available');
    await menu.selectModel(target.id);
    await applyEffortPreference(menu, context);
  });
  notifySelectorState(context);
}

/** Switches to the newest model of a family, e.g. "opus". */
export function switchToFamily(family: string): CommandHandler {
  return (context) =>
    switchTo(context, (models) => {
      const target = latestOfFamily(models, family);
      if (!target) throw new CommandError(`No ${family} model available`);
      return target;
    });
}

/** Switches to the model after the current one in the picker, wrapping around. */
export const cycleModel: CommandHandler = (context) =>
  switchTo(context, (models) => {
    if (models.length === 0) return null;
    const current = models.findIndex((m) => m.selected);
    return models[(current + 1) % models.length]!;
  });
