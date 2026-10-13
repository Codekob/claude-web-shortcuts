import { EFFORT_LEVELS, type EffortOnSwitch, type Settings } from '@/shared/settings';

interface Props {
  settings: Settings;
  onChange: (update: (s: Settings) => Settings) => void;
}

export function GeneralSettings({ settings, onChange }: Props) {
  return (
    <section class="section">
      <h2>General</h2>
      <div class="card settings-list">
        <label class="setting">
          <span class="setting-text">
            <span>Effort when switching model</span>
            <span class="muted small">Effort level applied after a model shortcut.</span>
          </span>
          <select
            value={settings.effortOnSwitch}
            onChange={(e) => {
              const effortOnSwitch = e.currentTarget.value as EffortOnSwitch;
              onChange((s) => ({ ...s, effortOnSwitch }));
            }}
          >
            <option value="keep">Keep current</option>
            {EFFORT_LEVELS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label class="setting">
          <span class="setting-text">
            <span>Show confirmation on claude.ai</span>
            <span class="muted small">Briefly show a toast after a shortcut runs.</span>
          </span>
          <input
            class="switch"
            type="checkbox"
            role="switch"
            checked={settings.showToast}
            onChange={(e) => {
              const showToast = e.currentTarget.checked;
              onChange((s) => ({ ...s, showToast }));
            }}
          />
        </label>
        <label class="setting">
          <span class="setting-text">
            <span>Debug mode</span>
            <span class="muted small">
              Check whether claude.ai still looks the way the shortcuts expect, and show a warning
              on the page if it changed.
            </span>
          </span>
          <input
            class="switch"
            type="checkbox"
            role="switch"
            checked={settings.debugMode}
            onChange={(e) => {
              const debugMode = e.currentTarget.checked;
              onChange((s) => ({ ...s, debugMode }));
            }}
          />
        </label>
      </div>
    </section>
  );
}
