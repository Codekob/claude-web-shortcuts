import { useMemo, useState } from 'preact/hooks';
import { COMMANDS, type CommandId } from '@/shared/commands';
import { formatSerializedChord } from '@/shared/keybinding';
import type { Keybindings } from '@/shared/settings';
import { Kbd } from './Kbd';

interface Props {
  keybindings: Keybindings;
  onEdit: (id: CommandId) => void;
  onReset: (id: CommandId) => void;
  onRemove: (id: CommandId) => void;
  onResetAll: () => void;
}

export function KeybindingsTable({ keybindings, onEdit, onReset, onRemove, onResetAll }: Props) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMMANDS.filter((c) =>
      [c.title, c.category, c.id, formatSerializedChord(keybindings[c.id])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query, keybindings]);

  return (
    <section class="section">
      <div class="section-header">
        <h2>Keyboard shortcuts</h2>
        <button type="button" class="link" onClick={onResetAll}>
          Reset all
        </button>
      </div>
      <div class="card">
        <input
          class="search"
          type="search"
          placeholder="Search shortcuts"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />

        <table class="keybindings">
          <thead>
            <tr>
              <th>Command</th>
              <th>Keybinding</th>
              <th>Source</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((command) => {
              const chord = keybindings[command.id];
              const isDefault = chord === command.defaultKey;
              return (
                <tr
                  key={command.id}
                  onDblClick={() => onEdit(command.id)}
                  title="Double-click to change"
                >
                  <td>
                    <div>
                      <span class="category">{command.category}: </span>
                      {command.title}
                    </div>
                    <div class="muted small">{command.description}</div>
                  </td>
                  <td>
                    <Kbd chord={chord} />
                  </td>
                  <td class="muted small">
                    {chord === null && isDefault ? '' : isDefault ? 'Default' : 'User'}
                  </td>
                  <td class="actions">
                    <button
                      type="button"
                      title="Change keybinding"
                      onClick={() => onEdit(command.id)}
                    >
                      ✎
                    </button>
                    {!isDefault && (
                      <button
                        type="button"
                        title="Reset to default"
                        onClick={() => onReset(command.id)}
                      >
                        ↺
                      </button>
                    )}
                    {chord && (
                      <button
                        type="button"
                        title="Remove keybinding"
                        onClick={() => onRemove(command.id)}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} class="muted empty">
                  No commands match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
