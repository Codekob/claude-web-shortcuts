/**
 * Runs tasks one at a time, in order. Commands drive shared page UI (the model picker), so
 * overlapping runs — e.g. from holding a shortcut — would interfere with each other.
 */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
