import { describe, expect, it } from 'vitest';
import { COMMANDS } from '@/shared/commands';
import { defaultSettings, findConflicts, normalizeSettings } from '@/shared/settings';

describe('defaultSettings', () => {
  it('matches the shortcuts from docs/idea.md', () => {
    const { keybindings, effortOnSwitch } = defaultSettings();
    expect(keybindings['model.switchToOpus']).toBe('Alt+Digit1');
    expect(keybindings['model.switchToSonnet']).toBe('Alt+Digit2');
    expect(keybindings['model.switchToHaiku']).toBe('Alt+Digit3');
    expect(keybindings['model.cycle']).toBe('Alt+Digit0');
    expect(keybindings['effort.cycle']).toBe('Alt+Digit9');
    expect(effortOnSwitch).toBe('medium');
  });

  it('has a keybinding entry for every command', () => {
    expect(Object.keys(defaultSettings().keybindings).sort()).toEqual(
      COMMANDS.map((c) => c.id).sort(),
    );
  });
});

describe('normalizeSettings', () => {
  it('returns defaults for garbage', () => {
    expect(normalizeSettings(undefined)).toEqual(defaultSettings());
    expect(normalizeSettings('nope')).toEqual(defaultSettings());
  });

  it('keeps valid user values and drops unknown or invalid ones', () => {
    const settings = normalizeSettings({
      keybindings: {
        'model.cycle': 'Ctrl+KeyM',
        'model.switchToOpus': null,
        'model.switchToHaiku': 'Bogus+',
        'removed.command': 'Alt+KeyX',
      },
      effortOnSwitch: 'keep',
      showToast: false,
      debugMode: true,
    });
    expect(settings.keybindings['model.cycle']).toBe('Ctrl+KeyM');
    expect(settings.keybindings['model.switchToOpus']).toBeNull();
    expect(settings.keybindings['model.switchToHaiku']).toBe('Alt+Digit3');
    expect('removed.command' in settings.keybindings).toBe(false);
    expect(settings.effortOnSwitch).toBe('keep');
    expect(settings.showToast).toBe(false);
    expect(settings.debugMode).toBe(true);
  });

  it('leaves commands added after the settings were stored unbound', () => {
    const settings = normalizeSettings({ keybindings: { 'model.cycle': 'Ctrl+KeyM' } });
    expect(settings.keybindings['chat.new']).toBeNull();
    expect(settings.keybindings['chat.newIncognito']).toBeNull();
  });
});

describe('normalizeSettings effort', () => {
  it('migrates effort labels stored before ids were used', () => {
    expect(normalizeSettings({ effortOnSwitch: 'High' }).effortOnSwitch).toBe('high');
  });

  it('falls back to the default for unknown levels', () => {
    expect(normalizeSettings({ effortOnSwitch: 'ultra' }).effortOnSwitch).toBe('medium');
  });
});

describe('findConflicts', () => {
  it('lists other commands sharing a chord', () => {
    const { keybindings } = defaultSettings();
    expect(findConflicts(keybindings, 'Alt+Digit1', 'model.cycle')).toEqual(['model.switchToOpus']);
    expect(findConflicts(keybindings, 'Alt+Digit1', 'model.switchToOpus')).toEqual([]);
  });
});
