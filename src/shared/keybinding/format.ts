import { parseChord, type KeyChord } from './chord';

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const SPECIAL_KEYS: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Tab: 'Tab',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
};

/** Human readable key name for a KeyboardEvent.code. */
export function formatCode(code: string): string {
  if (code in SPECIAL_KEYS) return SPECIAL_KEYS[code]!;
  const match = /^(?:Key|Digit|Numpad)(.+)$/.exec(code);
  if (match) return code.startsWith('Numpad') ? `Num ${match[1]}` : match[1]!;
  return code;
}

/** Formats a chord for display, e.g. "Alt+1" (or "⌥1" on macOS). */
export function formatChord(chord: KeyChord, mac = isMac): string {
  const key = formatCode(chord.code);
  if (mac) {
    return [chord.ctrl && '⌃', chord.alt && '⌥', chord.shift && '⇧', chord.meta && '⌘', key]
      .filter(Boolean)
      .join('');
  }
  return [
    chord.ctrl && 'Ctrl',
    chord.alt && 'Alt',
    chord.shift && 'Shift',
    chord.meta && 'Win',
    key,
  ]
    .filter(Boolean)
    .join('+');
}

/** Formats a serialized chord; returns an empty string for null/invalid values. */
export function formatSerializedChord(value: string | null, mac = isMac): string {
  const chord = value ? parseChord(value) : null;
  return chord ? formatChord(chord, mac) : '';
}
