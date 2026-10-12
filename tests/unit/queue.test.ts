import { describe, expect, it } from 'vitest';
import { CommandQueue } from '@/content/commands/queue';

const tick = () => new Promise((r) => setTimeout(r, 5));

describe('CommandQueue', () => {
  it('runs one at a time and batches repeated presses made meanwhile', async () => {
    const log: string[] = [];
    const queue = new CommandQueue<string>(async (key, count) => {
      log.push(`start ${key}×${count}`);
      await tick();
      log.push(`end ${key}`);
    });

    queue.push('a');
    queue.push('a');
    queue.push('a');
    queue.push('b');
    queue.push('a');
    await tick();
    await tick();
    await tick();
    await tick();

    expect(log).toEqual([
      'start a×1',
      'end a',
      'start a×2',
      'end a',
      'start b×1',
      'end b',
      'start a×1',
      'end a',
    ]);
  });

  it('keeps going after a failure', async () => {
    const log: string[] = [];
    const queue = new CommandQueue<string>(async (key) => {
      log.push(key);
      if (key === 'a') throw new Error('a');
    });
    queue.push('a');
    queue.push('b');
    await tick();
    expect(log).toEqual(['a', 'b']);
  });
});
