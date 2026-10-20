# Claude Web Shortcuts

[![CI](https://github.com/Codekob/claude-web-shortcuts/actions/workflows/ci.yml/badge.svg)](https://github.com/Codekob/claude-web-shortcuts/actions/workflows/ci.yml)

Chrome extension (Manifest V3) that adds **configurable** keyboard shortcuts to [claude.ai](https://claude.ai),
so you can switch model and effort without reaching for the mouse.

> Unofficial project, not affiliated with or endorsed by Anthropic.

| Shortcut | Command                                                   |
| -------- | --------------------------------------------------------- |
| `Alt+1`  | Switch to latest Opus                                     |
| `Alt+2`  | Switch to latest Sonnet                                   |
| `Alt+3`  | Switch to latest Haiku                                    |
| `Alt+0`  | Cycle model                                               |
| `Alt+9`  | Cycle effort (Low → Medium → High → Extra; never Max)     |
| —        | Set effort Low / Medium / High / Extra / Max (assignable) |
| —        | New chat / New incognito chat (assignable)                |

Model switches also set the effort (default **Medium**; configurable, or "Keep current"). If the
new model doesn't offer that level, its effort is left as is. Every shortcut can be rebound or
unbound in the options page, which warns about conflicting bindings.

New chat and New incognito chat are rebindable versions of claude.ai's own `Ctrl+Shift+O` and
`Ctrl+Shift+I`, which clash with Chrome's bookmark manager and DevTools. New chat clicks the
sidebar's "New" link (no page reload); incognito loads `claude.ai/new?incognito`.

## Install

### Chrome Web Store

Coming soon. <!-- TODO: link the store listing once it is published -->

### From a release

1. Download `claude-web-shortcuts-vX.Y.Z.zip` from the
   [latest release](https://github.com/Codekob/claude-web-shortcuts/releases/latest) and unzip it
   into a folder you'll keep (Chrome loads the extension from there, so don't delete it).
2. Open `chrome://extensions` and enable **Developer mode** (top right).
3. Click **Load unpacked** and pick the unzipped folder.

To update, replace the folder's contents with a newer release and click the reload icon on the
extension's card in `chrome://extensions`.

### From source

```bash
npm install
npm run build        # outputs dist/
```

Then load `dist/` with **Load unpacked** as above.

Once installed, click the extension's toolbar icon to open the shortcut editor.

## How it works

- **Shortcuts** are caught by a capture-phase `keydown` listener in the content script, so they work
  even while typing in the composer. Chords are stored by physical key (`KeyboardEvent.code`, e.g.
  `Alt+Digit1`), so they behave the same on every keyboard layout and on macOS (where ⌥ changes the
  typed character).
- **Model switching** drives claude.ai's own model picker, so the page state stays consistent.
  While a command runs, the picker's popups are made invisible with injected CSS; the command
  opens the picker, clicks the item, closes it and puts focus back in the composer. Popups finish
  unmounting in the background while still hidden. A small toast confirms the result
  (e.g. "Opus 5.5 · Medium").
- **Fast paths** skip the picker entirely when its trigger label already shows the target model or
  effort.
- **Latest model** = highest version among the picker's items of that family (from `data-model-id`),
  so new releases are picked up automatically.
- Commands run through a serial queue, so holding or hammering a shortcut never interleaves runs.
- Settings live in `chrome.storage.sync` and open claude.ai tabs pick up changes without reloading.

## Design decisions

**Drive the real UI instead of calling an API.** claude.ai has no public API for the chat page's
model selection, and changing it behind the page's back would leave the UI showing the wrong model.
Clicking through the picker keeps claude.ai the source of truth. The cost is depending on its
markup, so that dependency is contained (next point) and tested against changes (see
[Testing](#testing)).

**One adapter owns all claude.ai knowledge.** `src/content/claude/` is the only code that knows the
page's markup, and every selector or label assumption lives in `selectors.ts`. Command handlers talk
to the adapter (`withModelMenu`, `ModelMenu`, …), never to the DOM. When claude.ai ships a redesign,
the fix is in one place.

**Prefer stable attributes over visible text.** Models are identified by `data-model-id` and effort
levels by `data-effort-id`, not by their labels, so renames and new releases keep working. Where no
stable attribute exists yet, the gap is documented as an expected-failure test.

**Invisible automation.** A ref-counted `data-cws-busy` attribute on `<html>` hides the picker's
popups with injected CSS while a command runs, so there is no flicker. Because holds are counted, a
popup still animating out from one command stays hidden while the next command already runs, and
the queue never has to wait for unmount animations.

**Batch repeated presses instead of queueing them.** Commands must not overlap because they share
one picker, but queueing every keypress would mean hammering `Alt+0` keeps switching models for
seconds after you let go. Consecutive identical presses that arrive during a run collapse into one
run with a count, and step-wise commands advance by that count.

**Settings that can't break.** `normalizeSettings` turns any stored value (old schema, partial or
corrupt) into valid settings: unknown commands are dropped, new ones get defaults, and `null` means
explicitly unbound. Schema changes bump `SETTINGS_VERSION`.

**Type-checked command registry.** The handler registry is typed `Record<CommandId, Handler>`, so a
command added to the catalog without a handler fails the build.

## Testing

```bash
npm test
```

Tests run in Vitest with jsdom, at three levels:

- **Unit tests** for chords, settings migration, the command queue and parsing.
- **A contract test** that runs the adapter against a fixture trimmed from the real claude.ai page
  (`tests/fixtures/model-menu.html`).
- **Scenario tests** against a behavioural fake of claude.ai's picker (`tests/mock/claudePage.ts`)
  that simulate claude.ai shipping changes: new or renamed models, new effort levels, changed id
  schemes, asynchronous popups, a selection the page refuses. The contract test checks that the
  fake still reads exactly like the real snapshot, so the scenarios stay realistic.

## Development

| Script                 | Purpose                      |
| ---------------------- | ---------------------------- |
| `npm run build`        | Typecheck + production build |
| `npm run dev`          | Watch build with HMR         |
| `npm test`             | Unit and scenario tests      |
| `npm run lint`         | ESLint                       |
| `npm run typecheck`    | `tsc --noEmit`               |
| `npm run format`       | Prettier                     |
| `npm run format:check` | Prettier, without writing    |

Built with TypeScript, Vite and [`@crxjs/vite-plugin`](https://github.com/crxjs/chrome-extension-tools);
the options page uses Preact.

### Project layout

```
src/
  shared/                 # no claude.ai knowledge; used by every entry point
    commands/catalog.ts   # list of commands (metadata + default keys)
    keybinding/           # chord model: parse/serialize, from KeyboardEvent, display formatting
    settings/             # schema, defaults, validation/migration, chrome.storage wrapper, conflicts
  content/                # runs on claude.ai
    index.ts              # bootstrap
    keyboard/listener.ts  # shortcut → command id
    commands/             # registry (id → handler), dispatcher, serial queue, handlers/
    claude/               # claude.ai DOM adapter, the only code that knows claude.ai's markup
      selectors.ts        # every selector/label assumption, in one place
    dom/                  # generic waitFor / synthetic input helpers
    ui/                   # shadow-DOM toast and warning banner
  options/                # shortcut editor (Preact)
  background/             # toolbar icon → options page
tests/
  unit/                   # unit and contract tests
  scenarios/              # behaviour under simulated claude.ai changes
  mock/claudePage.ts      # behavioural fake of claude.ai's model picker
  fixtures/               # markup trimmed from the real claude.ai page
```

### Adding a command

1. Add an entry to `src/shared/commands/catalog.ts` (id, title, category, description, default key).
2. Add its handler to `src/content/commands/registry.ts`; TypeScript errors until every id has one.
   Put the implementation in `src/content/commands/handlers/`.
3. If it needs new claude.ai DOM access, add selectors to `src/content/claude/selectors.ts` and an
   adapter function in `src/content/claude/`.

The editor lists the new command automatically.

### When claude.ai changes its markup

With **Debug mode** turned on in the options page, the content script checks claude.ai against the
assumptions in `selectors.ts` once a chat page has loaded, and again whenever you open the model
picker or its Effort submenu yourself. If something no longer matches, it shows a dismissible
warning on the page and logs the details to the console with the prefix `[claude-web-shortcuts]`.

To update the extension after such a change:

1. Bind **Copy model picker snapshot** (category Diagnostics) in the options page.
2. On claude.ai, open the model picker and its Effort submenu, then press that shortcut. This copies
   the picker's markup, in the shape of `tests/fixtures/model-menu.html` and with the self-check
   result in a header comment. Classes, styles, icons, the draft and all text outside the picker are
   removed, so no chat titles end up in it. The snapshot finds the open picker through standard ARIA
   attributes, so it works even after our selectors stop matching.
3. Replace `tests/fixtures/model-menu.html` with the snapshot (check it for personal data first),
   run `npm test`, and update `selectors.ts` and `tests/mock/claudePage.ts` until the tests pass.

## Privacy

The extension collects no data and makes no network requests. Its only permission is `storage`, used
to sync your shortcut settings through your Chrome profile, and it runs only on `claude.ai`.

## License

[MIT](LICENSE)
