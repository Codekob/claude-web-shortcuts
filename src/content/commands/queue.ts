/**
 * Runs commands one at a time: they drive shared page UI (the model picker), so runs must not
 * overlap. Presses that arrive while a command runs are batched instead of queued one by one:
 * consecutive presses of the same command become a single run with a count. Hammering a key
 * therefore never builds a backlog that keeps switching models seconds later.
 */
export class CommandQueue<K> {
  private readonly pending: { key: K; count: number }[] = [];
  private running = false;

  /** `execute` must handle its own errors; a rejection is ignored so the queue keeps going. */
  constructor(private readonly execute: (key: K, count: number) => Promise<void>) {}

  push(key: K): void {
    const last = this.pending.at(-1);
    if (last && last.key === key) last.count++;
    else this.pending.push({ key, count: 1 });
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (let next = this.pending.shift(); next; next = this.pending.shift()) {
        await this.execute(next.key, next.count).catch(() => undefined);
      }
    } finally {
      this.running = false;
    }
  }
}
