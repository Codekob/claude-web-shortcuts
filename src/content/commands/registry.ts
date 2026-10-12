import type { CommandId } from '@/shared/commands';
import { cycleEffort, setEffort } from './handlers/effort';
import { cycleModel, switchToFamily } from './handlers/model';
import type { CommandHandler } from './types';

/** Behavior for every command in src/shared/commands/catalog.ts. */
export const COMMAND_HANDLERS: Record<CommandId, CommandHandler> = {
  'model.switchToOpus': switchToFamily('opus'),
  'model.switchToSonnet': switchToFamily('sonnet'),
  'model.switchToHaiku': switchToFamily('haiku'),
  'model.cycle': cycleModel,
  'effort.cycle': cycleEffort,
  'effort.setLow': setEffort('low'),
  'effort.setMedium': setEffort('medium'),
  'effort.setHigh': setEffort('high'),
  'effort.setExtra': setEffort('xhigh'),
  'effort.setMax': setEffort('max'),
};
