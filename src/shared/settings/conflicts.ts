import type { CommandId } from '../commands';
import type { Keybindings } from './schema';

/** Ids of other commands bound to `chord`. */
export function findConflicts(
  keybindings: Keybindings,
  chord: string,
  exclude?: CommandId,
): CommandId[] {
  return (Object.entries(keybindings) as [CommandId, string | null][])
    .filter(([id, value]) => id !== exclude && value === chord)
    .map(([id]) => id);
}
