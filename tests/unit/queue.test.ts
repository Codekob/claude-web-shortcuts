import { describe, expect, it } from 'vitest';
import { SerialQueue } from '@/content/commands/queue';

describe('SerialQueue', () => {
  it('runs tasks one after another, even after a failure', async () => {
    const queue = new SerialQueue();
    const log: string[] = [];
    const task =
      (name: string, fail = false) =>
      async () => {
        log.push(`start ${name}`);
        await new Promise((r) => setTimeout(r, 5));
        log.push(`end ${name}`);
        if (fail) throw new Error(name);
      };

    const a = queue.run(task('a', true));
    const b = queue.run(task('b'));
    await expect(a).rejects.toThrow('a');
    await b;
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b']);
  });
});
