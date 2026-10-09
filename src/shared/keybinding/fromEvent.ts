import { isModifierCode, type KeyChord } from './chord';

/** Builds a chord from a keydown event, or null if only modifiers are held. */
export function chordFromEvent(event: KeyboardEvent): KeyChord | null {
  if (!event.code || isModifierCode(event.code)) return null;
  return {
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
    code: event.code,
  };
}
