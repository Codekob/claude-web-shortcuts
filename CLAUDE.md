# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Chrome MV3 extension (Vite + `@crxjs/vite-plugin`, TypeScript, Preact options page) that adds
configurable keyboard shortcuts to claude.ai — mainly switching model and effort by driving
claude.ai's own model picker. README.md covers usage, layout and the "adding a command" steps.

## Commands

```bash
npm run build                 # tsc --noEmit + vite build → dist/ (load unpacked in chrome://extensions)
npm run dev                   # watch build with HMR, also into dist/
npm test                      # vitest run (jsdom), tests/**/*.test.ts
npx vitest run tests/unit/queue.test.ts      # single file
npx vitest run -t "selects a model"          # single test by name
npm run lint                  # eslint .
npm run typecheck             # tsc --noEmit
npm run format                # prettier --write .
```

`@/` is aliased to `src/` (vite, vitest and tsconfig).

## Architecture

Three entry points, wired in `manifest.config.ts`: content script on `https://claude.ai/*`
(`src/content/index.ts`), options page (`src/options/`), and a background worker that only opens
the options page from the toolbar icon.

**Layering rule:** `src/shared/` has no claude.ai knowledge and is used by every entry point.
`src/content/claude/` is the only code that knows claude.ai's markup, and every selector/label
assumption lives in `src/content/claude/selectors.ts`. Handlers in `src/content/commands/handlers/`
go through the adapter (`withModelMenu`, `ModelMenu`, `readSelectorState`, …), never raw selectors.

**Command flow:** capture-phase `keydown` (`keyboard/listener.ts`, chords keyed by
`KeyboardEvent.code`) → command id → `createDispatcher` → `CommandQueue` → handler from
`COMMAND_HANDLERS` (`registry.ts` is typed `Record<CommandId, …>`, so a catalog entry without a
handler fails typecheck).

- `CommandQueue` runs one command at a time and **batches** presses that arrive during a run:
  consecutive identical presses collapse into one run with `context.count`. Step-wise handlers
  (cycle model/effort) must advance by `count` rather than assume one step.
- Handlers throw `CommandError` (or the adapter's `ClaudeUiError`) for expected failures — the
  message is shown in the error toast; anything else shows a generic "<title> failed". Errors and
  per-command timing are logged with the `[claude-web-shortcuts]` prefix.
- Success feedback goes through `context.notify`, which respects the `showToast` setting.

**Driving the picker (`claude/session.ts`, `stealth.ts`):** `withModelMenu` sets a ref-counted
`data-cws-busy` attribute on `<html>` that makes menu portals invisible via injected CSS, runs the
task, closes the menu, restores focus to the composer, and resolves immediately — popups finish
unmounting in the background while still hidden, so the next queued command doesn't wait. Handlers
use fast paths that skip opening the picker when the trigger label already shows the target
model/effort; keep that behaviour when changing handlers.

**"Latest model"** is computed from `data-model-id` versions in the picker (`latestOfFamily`), and
effort levels are keyed by `data-effort-id` (`EFFORT_LEVELS` in `shared/settings/schema.ts`).

**Settings** live in `chrome.storage.sync`. `normalizeSettings` (`shared/settings/migrate.ts`)
turns any stored value — old, partial or corrupt — into a valid `Settings`: unknown command ids
are dropped, new ones get catalog defaults, `null` means explicitly unbound. Bump
`SETTINGS_VERSION` and extend `normalizeSettings` when the schema changes. Open claude.ai tabs pick
up changes live via `subscribeSettings`.

**Self-check (`claude/selfCheck.ts`):** `checkPicker` compares the page with `selectors.ts`. Only
with the `debugMode` setting on, it runs once a composer appears and whenever the user opens the
picker (skipped while stealth is active). Failures show `ui/banner.ts`. When adding a selector the handlers depend on, add a matching
check. `claude/snapshot.ts` captures the picker for the fixture (command
`debug.copyPickerSnapshot`); it locates menus via generic ARIA so it survives broken selectors, and
must never keep text outside the picker.

## Tests and claude.ai snapshots

DOM adapter tests run against `tests/fixtures/model-menu.html` (imported with `?raw`), trimmed
from full-page snapshots in `docs/claude_ai_*.html`. `docs/` is gitignored and local-only. When
claude.ai's markup changes, update `selectors.ts` and the fixture together.
