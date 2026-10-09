import { useCallback, useEffect, useState } from 'preact/hooks';
import { loadSettings, saveSettings, subscribeSettings, type Settings } from '@/shared/settings';

/** Live view of the stored settings plus a setter that persists changes. */
export function useSettings(): [Settings | null, (update: (s: Settings) => Settings) => void] {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
    return subscribeSettings(setSettings);
  }, []);

  const update = useCallback((fn: (s: Settings) => Settings) => {
    setSettings((current) => {
      if (!current) return current;
      const next = fn(current);
      void saveSettings(next);
      return next;
    });
  }, []);

  return [settings, update];
}
