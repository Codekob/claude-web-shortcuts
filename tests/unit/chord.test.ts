import { describe, expect, it } from 'vitest';
import {
  chordFromEvent,
  formatChord,
  isBindableChord,
  parseChord,
  serializeChord,
} from '@/shared/keybinding';

describe('chord serialization', () => {
  it('round-trips with canonical modifier order', () => {
    const chord = parseChord('Shift+Ctrl+KeyK');
    expect(chord).toEqual({ ctrl: true, alt: false, shift: true, meta: false, code: 'KeyK' });
    expect(serializeChord(chord!)).toBe('Ctrl+Shift+KeyK');
  });

  it('rejects malformed values', () => {
    expect(parseChord('')).toBeNull();
    expect(parseChord('Alt+')).toBeNull();
    expect(parseChord('Hyper+KeyK')).toBeNull();
    expect(parseChord('Alt+AltLeft')).toBeNull();
  });
});

describe('chordFromEvent', () => {
  it('uses the physical key code', () => {
    const event = new KeyboardEvent('keydown', { code: 'Digit1', key: '¡', altKey: true });
    expect(serializeChord(chordFromEvent(event)!)).toBe('Alt+Digit1');
  });

  it('ignores modifier-only presses', () => {
    expect(
      chordFromEvent(new KeyboardEvent('keydown', { code: 'AltLeft', altKey: true })),
    ).toBeNull();
  });
});

describe('formatChord', () => {
  const chord = parseChord('Alt+Shift+Digit1')!;
  it('formats for Windows/Linux', () => expect(formatChord(chord, false)).toBe('Alt+Shift+1'));
  it('formats for macOS', () => expect(formatChord(chord, true)).toBe('⌥⇧1'));
});

describe('isBindableChord', () => {
  it('requires a non-shift modifier unless it is a function key', () => {
    expect(isBindableChord(parseChord('KeyA')!)).toBe(false);
    expect(isBindableChord(parseChord('Shift+KeyA')!)).toBe(false);
    expect(isBindableChord(parseChord('Alt+KeyA')!)).toBe(true);
    expect(isBindableChord(parseChord('F2')!)).toBe(true);
  });
});
