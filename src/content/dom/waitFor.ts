export class TimeoutError extends Error {
  constructor(what: string, ms: number) {
    super(`Timed out after ${ms}ms waiting for ${what}`);
    this.name = 'TimeoutError';
  }
}

interface WaitOptions {
  timeout?: number;
  /** Used in the timeout error message. */
  description?: string;
  root?: Node;
}

/**
 * Resolves with the first truthy value returned by `probe`, re-evaluated on every DOM mutation.
 */
export function waitFor<T>(
  probe: () => T | null | undefined | false,
  { timeout = 1000, description = 'condition', root = document }: WaitOptions = {},
): Promise<T> {
  const immediate = probe();
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const value = probe();
      if (value) finish(() => resolve(value));
    });
    const timer = setTimeout(
      () => finish(() => reject(new TimeoutError(description, timeout))),
      timeout,
    );
    const finish = (settle: () => void) => {
      observer.disconnect();
      clearTimeout(timer);
      settle();
    };
    observer.observe(root, { childList: true, subtree: true, attributes: true });
  });
}

/** Resolves once `element` is detached from the document (or after `timeout`, silently). */
export async function waitForRemoval(element: Element, timeout = 600): Promise<void> {
  try {
    await waitFor(() => !element.isConnected, { timeout, description: 'element removal' });
  } catch {
    // Not removed in time (e.g. the page keeps it mounted); callers treat this as done.
  }
}

/** Waits for the next animation frame — lets the page's framework commit pending updates. */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
