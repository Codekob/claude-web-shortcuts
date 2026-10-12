import {
  knownModels,
  latestOfFamily,
  readSelectorState,
  withModelMenu,
  type ModelMenu,
  type ModelOption,
} from '../../claude';
import type { CommandContext, CommandHandler } from '../types';
import { CommandError } from '../types';
import { effortSatisfied } from './effort';
import { notifySelectorState } from './feedback';

/**
 * Applies the user's "effort when switching model" preference. Skipped when the effort already
 * matches (no submenu needed) or the new model does not offer that level.
 */
async function applyEffortPreference(menu: ModelMenu, { settings }: CommandContext): Promise<void> {
  const target = settings.effortOnSwitch;
  if (target === 'keep') return;
  if (effortSatisfied(await menu.currentEffortLabel(), target)) return;
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
  return async (context) => {
    // Already there (judged from the picker button and the last seen model list)? Then
    // there is nothing to click; just confirm.
    const known = latestOfFamily(knownModels(), family);
    const state = readSelectorState();
    if (
      known &&
      state?.modelName === known.name &&
      effortSatisfied(state.effort, context.settings.effortOnSwitch)
    ) {
      notifySelectorState(context);
      return;
    }

    await switchTo(context, (models) => {
      const target = latestOfFamily(models, family);
      if (!target) throw new CommandError(`No ${family} model available`);
      return target;
    });
  };
}

/** Switches to the model `count` places after the current one in the picker, wrapping around. */
export const cycleModel: CommandHandler = (context) =>
  switchTo(context, (models) => {
    if (models.length === 0) return null;
    const current = models.findIndex((m) => m.selected);
    return models[(current + context.count) % models.length]!;
  });
