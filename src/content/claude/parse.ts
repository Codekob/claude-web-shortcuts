import { MODEL_ID_PATTERN, MODEL_TRIGGER_LABEL_PREFIX } from './selectors';

export interface SelectorState {
  /** e.g. "Opus 5.5" */
  modelName: string;
  /** e.g. "Medium"; null if the label shows no effort. */
  effort: string | null;
}

/** Parses the picker's aria-label, e.g. "Model: Haiku 5.5 Medium". */
export function parseTriggerLabel(label: string): SelectorState | null {
  if (!label.startsWith(MODEL_TRIGGER_LABEL_PREFIX)) return null;
  const rest = label.slice(MODEL_TRIGGER_LABEL_PREFIX.length).trim();
  // Model names end with their version number ("Opus 5.5"); anything after is the effort.
  const match = /^(.*?\d+(?:\.\d+)*)\s*(.*)$/.exec(rest);
  if (!match) return rest ? { modelName: rest, effort: null } : null;
  return { modelName: match[1]!, effort: match[2] || null };
}

export interface ParsedModelId {
  family: string;
  /** Numeric version parts, e.g. [5, 5]. Date suffixes are ignored. */
  version: number[];
}

/** Parses ids like "claude-opus-5-5" or "claude-sonnet-4-5-20250929". */
export function parseModelId(id: string): ParsedModelId | null {
  const match = MODEL_ID_PATTERN.exec(id);
  if (!match) return null;
  const version = match[2]!
    .split('-')
    .filter((part) => /^\d{1,4}$/.test(part))
    .map(Number);
  return { family: match[1]!, version };
}

/** Compares numeric version arrays: negative if a < b. */
export function compareVersions(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Text of the first descendant that has text but no child elements (the row's title). */
export function leafText(element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node as Element;
    const text = el.textContent?.trim();
    if (text && el.childElementCount === 0) return text;
  }
  return element.textContent?.trim() ?? '';
}
