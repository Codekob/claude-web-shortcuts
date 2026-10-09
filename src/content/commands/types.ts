import type { Settings } from '@/shared/settings';

export interface CommandContext {
  settings: Settings;
  /** Shows a short confirmation to the user (respects the showToast setting). */
  notify: (message: string) => void;
}

export type CommandHandler = (context: CommandContext) => Promise<void>;

/** An expected failure with a message that is safe to show to the user. */
export class CommandError extends Error {
  override name = 'CommandError';
}
