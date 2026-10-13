import { capturePickerSnapshot, checkPicker } from '../../claude';
import type { CommandHandler } from '../types';
import { CommandError } from '../types';

/**
 * Copies the model picker's markup, with a header saying what the self-check found, for
 * refreshing tests/fixtures/model-menu.html after claude.ai changed.
 */
export const copyPickerSnapshot: CommandHandler = async ({ notify }) => {
  const { html, menusOpen } = capturePickerSnapshot();
  const problems = checkPicker();
  const version = globalThis.chrome?.runtime?.getManifest?.().version ?? 'unknown';
  const header = [
    '<!--',
    `  claude.ai model picker snapshot, taken ${new Date().toISOString()} by Claude Web Shortcuts ${version}.`,
    '  Classes, styles, icons and text outside the picker were removed; review before committing.',
    ...(menusOpen ? [] : ['  The picker was closed, so only its button is included.']),
    problems.length > 0 ? '  Self-check problems:' : '  Self-check: no problems found.',
    ...problems.map((problem) => `  - ${problem}`),
    '-->',
  ].join('\n');

  try {
    await navigator.clipboard.writeText(`${header}\n${html}\n`);
  } catch (error) {
    console.info('[claude-web-shortcuts] Model picker snapshot:\n' + `${header}\n${html}`);
    throw new CommandError('Could not copy the snapshot; it was logged to the console', {
      cause: error,
    });
  }
  notify(menusOpen ? 'Picker snapshot copied' : 'Snapshot copied (open the picker for more)');
};
