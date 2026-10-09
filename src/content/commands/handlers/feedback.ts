import { readSelectorState } from '../../claude';
import type { CommandContext } from '../types';

/** Notifies the user of the picker's current state, e.g. "Opus 5.5 · Medium". */
export function notifySelectorState({ notify }: CommandContext): void {
  const state = readSelectorState();
  if (state) notify([state.modelName, state.effort].filter(Boolean).join(' · '));
}
