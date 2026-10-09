import { normalizeSettings } from './migrate';
import type { Settings } from './schema';

const STORAGE_KEY = 'settings';
const area = (): chrome.storage.StorageArea => chrome.storage.sync;

export async function loadSettings(): Promise<Settings> {
  const result = await area().get(STORAGE_KEY);
  return normalizeSettings(result[STORAGE_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await area().set({ [STORAGE_KEY]: settings });
}

export async function updateSettings(update: (current: Settings) => Settings): Promise<Settings> {
  const next = update(await loadSettings());
  await saveSettings(next);
  return next;
}

/** Calls `listener` whenever settings change (from any extension page). Returns an unsubscribe. */
export function subscribeSettings(listener: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName === 'sync' && STORAGE_KEY in changes) {
      listener(normalizeSettings(changes[STORAGE_KEY]?.newValue));
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
