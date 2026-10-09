import type { CommandDefinition } from './types';

/**
 * Every command the extension offers. This is metadata only (shared by the options page and
 * the content script); behavior lives in src/content/commands/handlers.
 *
 * To add a command: add an entry here, then register a handler in
 * src/content/commands/registry.ts (the compiler enforces that every id has one).
 */
export const COMMANDS = [
  {
    id: 'model.switchToOpus',
    title: 'Switch to latest Opus',
    category: 'Model',
    description: 'Selects the newest Opus model.',
    defaultKey: 'Alt+Digit1',
  },
  {
    id: 'model.switchToSonnet',
    title: 'Switch to latest Sonnet',
    category: 'Model',
    description: 'Selects the newest Sonnet model.',
    defaultKey: 'Alt+Digit2',
  },
  {
    id: 'model.switchToHaiku',
    title: 'Switch to latest Haiku',
    category: 'Model',
    description: 'Selects the newest Haiku model.',
    defaultKey: 'Alt+Digit3',
  },
  {
    id: 'model.cycle',
    title: 'Cycle model',
    category: 'Model',
    description: 'Selects the next model in the model menu.',
    defaultKey: 'Alt+Digit0',
  },
  {
    id: 'effort.cycle',
    title: 'Cycle effort',
    category: 'Effort',
    description: 'Selects the next effort level.',
    defaultKey: 'Alt+Digit9',
  },
  {
    id: 'effort.setLow',
    title: 'Set effort: Low',
    category: 'Effort',
    description: 'Sets the effort level to Low.',
    defaultKey: null,
  },
  {
    id: 'effort.setMedium',
    title: 'Set effort: Medium',
    category: 'Effort',
    description: 'Sets the effort level to Medium.',
    defaultKey: null,
  },
  {
    id: 'effort.setHigh',
    title: 'Set effort: High',
    category: 'Effort',
    description: 'Sets the effort level to High.',
    defaultKey: null,
  },
] as const satisfies readonly CommandDefinition[];

export type CommandId = (typeof COMMANDS)[number]['id'];

const COMMANDS_BY_ID = new Map<string, CommandDefinition>(COMMANDS.map((c) => [c.id, c]));

export function getCommand(id: string): CommandDefinition | undefined {
  return COMMANDS_BY_ID.get(id);
}

export function isCommandId(id: string): id is CommandId {
  return COMMANDS_BY_ID.has(id);
}
