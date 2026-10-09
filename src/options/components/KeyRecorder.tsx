import { useEffect, useState } from 'preact/hooks';
import { getCommand, type CommandId } from '@/shared/commands';
import {
  chordFromEvent,
  isBindableChord,
  serializeChord,
  type KeyChord,
} from '@/shared/keybinding';
import { findConflicts, type Keybindings } from '@/shared/settings';
import { Kbd } from './Kbd';

interface Props {
  commandId: CommandId;
  keybindings: Keybindings;
  onSave: (chord: string) => void;
  onCancel: () => void;
}

const isPlain = (e: KeyboardEvent) => !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;

/**
 * VS Code-style modal: press the desired combination, then Enter to save or Escape to cancel.
 */
export function KeyRecorder({ commandId, keybindings, onSave, onCancel }: Props) {
  const [chord, setChord] = useState<KeyChord | null>(null);
  const serialized = chord ? serializeChord(chord) : null;
  const valid = chord !== null && isBindableChord(chord);
  const conflicts = serialized ? findConflicts(keybindings, serialized, commandId) : [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;

      // Unmodified Enter/Escape control the dialog; with modifiers they are recordable.
      if (event.code === 'Escape' && isPlain(event)) return onCancel();
      if ((event.code === 'Enter' || event.code === 'NumpadEnter') && isPlain(event)) {
        if (serialized && valid) onSave(serialized);
        return;
      }
      const next = chordFromEvent(event);
      if (next) setChord(next);
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [serialized, valid, onSave, onCancel]);

  return (
    <div class="overlay" onClick={onCancel}>
      <div
        class="recorder"
        role="dialog"
        aria-modal="true"
        aria-label="Record keybinding"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="muted small">{getCommand(commandId)?.title}</div>
        <p>Press desired key combination and then press Enter.</p>
        <div class="recorder-display">
          {serialized ? <Kbd chord={serialized} /> : <span class="muted">…</span>}
        </div>

        {chord && !valid && (
          <p class="warning">
            Add Ctrl, Alt or {navigatorMetaName()} so the shortcut doesn't block typing.
          </p>
        )}
        {valid && conflicts.length > 0 && (
          <p class="warning">
            {conflicts.length === 1
              ? '1 other command has'
              : `${conflicts.length} other commands have`}{' '}
            this keybinding: {conflicts.map((id) => getCommand(id)?.title ?? id).join(', ')}
          </p>
        )}
        <div class="recorder-actions">
          <button type="button" onClick={onCancel}>
            Cancel (Esc)
          </button>
          <button
            type="button"
            class="primary"
            disabled={!valid}
            onClick={() => serialized && onSave(serialized)}
          >
            Save (Enter)
          </button>
        </div>
      </div>
    </div>
  );
}

function navigatorMetaName(): string {
  return /Mac/.test(navigator.platform) ? '⌘' : 'Win';
}
