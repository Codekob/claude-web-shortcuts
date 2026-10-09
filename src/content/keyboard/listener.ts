import type { CommandId } from '@/shared/commands';
import { chordFromEvent, serializeChord } from '@/shared/keybinding';
import type { Keybindings } from '@/shared/settings';

export type KeymapLookup = (chord: string) => CommandId | undefined;

/** Builds a chord → command lookup from the user's keybindings. */
export function buildKeymap(keybindings: Keybindings): KeymapLookup {
  const map = new Map<string, CommandId>();
  for (const [id, chord] of Object.entries(keybindings) as [CommandId, string | null][]) {
    if (chord && !map.has(chord)) map.set(chord, id);
  }
  return (chord) => map.get(chord);
}

/**
 * Listens for bound shortcuts in the capture phase, before claude.ai's own handlers, so a
 * shortcut also works while typing in the composer. Returns a function that removes it.
 */
export function installShortcutListener(
  lookup: () => KeymapLookup,
  onCommand: (id: CommandId) => void,
): () => void {
  const handler = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    const chord = chordFromEvent(event);
    const id = chord && lookup()(serializeChord(chord));
    if (!id) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) onCommand(id);
  };
  window.addEventListener('keydown', handler, { capture: true });
  return () => window.removeEventListener('keydown', handler, { capture: true });
}
