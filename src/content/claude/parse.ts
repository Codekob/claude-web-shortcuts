import { MODEL_ID_PATTERN, MODEL_TRIGGER_LABEL_PREFIX } from './selectors';

export interface SelectorState {
  /** e.g. "Opus 5.5" */
  modelName: string;
  /** e.g. "Medium"; null if the label shows no effort. */
  effort: string | null;
}

/**
 * Parses the picker's aria-label, e.g. "Model: Haiku 5.5 Medium". `knownNames` are model names
 * seen in the picker; matching against them splits names of any shape ("Opus", "Opus 5.5
 * Thinking"). Without a match, model names are assumed to end with their version number.
 */
export function parseTriggerLabel(
  label: string,
  knownNames: readonly string[] = [],
): SelectorState | null {
  if (!label.startsWith(MODEL_TRIGGER_LABEL_PREFIX)) return null;
  const rest = label.slice(MODEL_TRIGGER_LABEL_PREFIX.length).trim();
  const known = knownNames
    .filter((name) => {
      const head = rest.slice(0, name.length);
      const next = rest.charAt(name.length);
      return head.toLowerCase() === name.toLowerCase() && (next === '' || next === ' ');
    })
    .sort((a, b) => b.length - a.length)[0];
  if (known) {
    return {
      modelName: rest.slice(0, known.length),
      effort: rest.slice(known.length).trim() || null,
    };
  }
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
  const version = (match[2] ?? '')
    .split('-')
    .filter((part) => /^\d{1,4}$/.test(part))
    .map(Number);
  return { family: match[1]!, version };
}

/**
 * Family and version from a display name like "Opus 6" or "Sonnet 4.5", for ids that do not
 * follow MODEL_ID_PATTERN.
 */
export function parseModelName(name: string): ParsedModelId | null {
  const match = /^([a-z]+)\b\s*(\d+(?:\.\d+)*)?/i.exec(name.trim());
  if (!match) return null;
  return { family: match[1]!.toLowerCase(), version: match[2]?.split('.').map(Number) ?? [] };
}

/** Compares numeric version arrays: negative if a < b. */
export function compareVersions(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Texts of all descendants that have text but no child elements, in document order. */
export function leafTexts(element: Element): string[] {
  const texts: string[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node as Element;
    const text = el.textContent?.trim();
    if (text && el.childElementCount === 0) texts.push(text);
  }
  return texts;
}

/** Text of the first leaf with text (a row's title), or the element's whole text. */
export function leafText(element: Element): string {
  return leafTexts(element)[0] ?? element.textContent?.trim() ?? '';
}
