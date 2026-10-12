import { EFFORT_LEVELS, type EffortOnSwitch, type Settings } from '@/shared/settings';

interface Props {
  settings: Settings;
  onChange: (update: (s: Settings) => Settings) => void;
}

export function GeneralSettings({ settings, onChange }: Props) {
  return (
    <section class="card general">
      <label class="field">
        <span>Effort when switching model</span>
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
      <label class="field checkbox">
        <input
          type="checkbox"
          checked={settings.showToast}
          onChange={(e) => {
            const showToast = e.currentTarget.checked;
            onChange((s) => ({ ...s, showToast }));
          }}
        />
        <span>Show confirmation on claude.ai</span>
      </label>
    </section>
  );
}
