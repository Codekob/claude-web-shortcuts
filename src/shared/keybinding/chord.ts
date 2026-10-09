/**
 * A keyboard chord, e.g. Alt+1. `code` is a KeyboardEvent.code value ("Digit1", "KeyK", ...)
 * so bindings are independent of keyboard layout and of the characters macOS produces with ⌥.
 */
export interface KeyChord {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  code: string;
}

const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;
type ModifierName = (typeof MODIFIER_ORDER)[number];
const MODIFIER_FIELD: Record<ModifierName, keyof Omit<KeyChord, 'code'>> = {
  Ctrl: 'ctrl',
  Alt: 'alt',
  Shift: 'shift',
  Meta: 'meta',
};

/** Serializes a chord to its canonical storage form, e.g. "Ctrl+Alt+KeyK". */
export function serializeChord(chord: KeyChord): string {
  const parts: string[] = MODIFIER_ORDER.filter((m) => chord[MODIFIER_FIELD[m]]);
  parts.push(chord.code);
  return parts.join('+');
}

/** Parses the canonical storage form. Returns null for malformed input. */
export function parseChord(value: string): KeyChord | null {
  const parts = value.split('+');
  if (parts.some((part) => part === '')) return null;
  const code = parts.pop();
  if (!code || code in MODIFIER_FIELD || isModifierCode(code)) return null;

  const chord: KeyChord = { ctrl: false, alt: false, shift: false, meta: false, code };
  for (const part of parts) {
    if (!(part in MODIFIER_FIELD)) return null;
    chord[MODIFIER_FIELD[part as ModifierName]] = true;
  }
  return chord;
}

export function chordsEqual(a: KeyChord, b: KeyChord): boolean {
  return serializeChord(a) === serializeChord(b);
}

export function hasModifier(chord: KeyChord): boolean {
  return chord.ctrl || chord.alt || chord.meta;
}

const FUNCTION_KEY = /^F([1-9]|1[0-9]|2[0-4])$/;

/**
 * Whether a chord may be bound. Plain keys (or Shift+key) would hijack normal typing,
 * so a non-Shift modifier is required unless the key is a function key.
 */
export function isBindableChord(chord: KeyChord): boolean {
  return hasModifier(chord) || FUNCTION_KEY.test(chord.code);
}

const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'ShiftLeft',
  'ShiftRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight',
]);

export function isModifierCode(code: string): boolean {
  return MODIFIER_CODES.has(code);
}
