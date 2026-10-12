import { useState } from 'preact/hooks';
import logoUrl from '../../branding/icon.svg';
import type { CommandId } from '@/shared/commands';
import { GeneralSettings } from './components/GeneralSettings';
import { KeybindingsTable } from './components/KeybindingsTable';
import { KeyRecorder } from './components/KeyRecorder';
import { useSettings } from './hooks/useSettings';
import { resetAllKeybindings, resetKeybinding, setKeybinding } from './keybindingActions';

export function App() {
  const [settings, update] = useSettings();
  const [editing, setEditing] = useState<CommandId | null>(null);

  if (!settings) return null;

  return (
    <main class="page">
      <header class="page-header">
        <img class="logo" src={logoUrl} alt="" width={48} height={48} />
        <div>
          <h1>Claude Web Shortcuts</h1>
          <p class="muted">
            Keyboard shortcuts for claude.ai. Changes apply instantly to open tabs.
          </p>
        </div>
      </header>

      <GeneralSettings settings={settings} onChange={update} />

      <KeybindingsTable
        keybindings={settings.keybindings}
        onEdit={setEditing}
        onReset={(id) => update((s) => resetKeybinding(s, id))}
        onRemove={(id) => update((s) => setKeybinding(s, id, null))}
        onResetAll={() => update(resetAllKeybindings)}
      />

      {editing && (
        <KeyRecorder
          commandId={editing}
          keybindings={settings.keybindings}
          onSave={(chord) => {
            update((s) => setKeybinding(s, editing, chord));
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </main>
  );
}
