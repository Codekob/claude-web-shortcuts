# Claude Web Shortcuts

Chrome extension (Manifest V3) that adds configurable keyboard shortcuts to [claude.ai](https://claude.ai).

| Shortcut | Command                                     |
| -------- | ------------------------------------------- |
| `Alt+1`  | Switch to latest Opus                       |
| `Alt+2`  | Switch to latest Sonnet                     |
| `Alt+3`  | Switch to latest Haiku                      |
| `Alt+0`  | Cycle model                                 |
| `Alt+9`  | Cycle effort                                |
| —        | Set effort Low / Medium / High (assignable) |

Model switches also set the effort (default **Medium**; configurable, or "Keep current").

## Getting started

```bash
npm install
npm run build        # outputs dist/
```

Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and pick `dist/`.
Click the extension's toolbar icon to open the shortcut editor.

For development, `npm run dev` builds with hot reload (load `dist/` the same way).

| Script              | Purpose                      |
| ------------------- | ---------------------------- |
| `npm run build`     | Typecheck + production build |
| `npm run dev`       | Watch build with HMR         |
| `npm test`          | Unit tests (Vitest + jsdom)  |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | `tsc --noEmit`               |
| `npm run format`    | Prettier                     |

## How it works

- **Shortcuts** are caught by a capture-phase `keydown` listener in the content script, so they work
  even while typing in the composer. Chords are stored by physical key (`KeyboardEvent.code`, e.g.
  `Alt+Digit1`), so they behave the same on every keyboard layout and on macOS (where ⌥ changes the
  typed character).
- **Model switching** drives claude.ai's own model picker, so the page state stays consistent.
  While a command runs, the picker's popups are made invisible with injected CSS; the
  command opens the picker, clicks the item, closes it, waits for it to unmount, and puts focus
  back in the composer. A small toast confirms the result (e.g. "Opus 5.5 · Medium").
- **Latest model** = highest version among the picker's items of that family (from `data-model-id`),
  so new releases are picked up automatically.
- Commands run through a serial queue, so holding or hammering a shortcut never interleaves runs.
- Settings live in `chrome.storage.sync` and open claude.ai tabs pick up changes without reloading.

## Project layout

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
    ui/toast.ts           # shadow-DOM toast
  options/                # shortcut editor (Preact)
  background/             # toolbar icon → options page
tests/                    # unit tests + fixture trimmed from docs/claude_ai_dom.html
```

### Adding a command

1. Add an entry to `src/shared/commands/catalog.ts` (id, title, category, description, default key).
2. Add its handler to `src/content/commands/registry.ts`; TypeScript errors until every id has one.
   Put the implementation in `src/content/commands/handlers/`.
3. If it needs new claude.ai DOM access, add selectors to `src/content/claude/selectors.ts` and an
   adapter function in `src/content/claude/`.

The editor lists the new command automatically.

### When claude.ai changes its markup

Update `src/content/claude/selectors.ts` (and the fixture in `tests/fixtures/` if needed). Failures
are logged to the page console with the prefix `[claude-web-shortcuts]`.
