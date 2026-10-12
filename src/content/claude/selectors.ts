/**
 * Every claude.ai DOM assumption lives in this file. When claude.ai changes its markup,
 * this should be the only file that needs updating.
 *
 * Reference snapshots: docs/claude_ai_dom.html (picker), docs/claude_ai_effort_selector_dom.html
 * (Effort submenu).
 */
export const SELECTORS = {
  /** The model picker button in the composer. Its aria-label is "Model: <name> <effort>". */
  modelTrigger: 'button[data-testid="model-selector-dropdown"]',
  /** Model choices inside the opened picker. `data-model-id` is e.g. "claude-opus-5-5". */
  modelItem: '[role="menuitemradio"][data-model-id]',
  /** Rows that open a nested menu (Effort, More models). */
  submenuTrigger: '[role="menuitem"][aria-haspopup="menu"]',
  /** Levels inside the Effort submenu. `data-effort-id` is e.g. "medium" (see EFFORT_LEVELS). */
  effortItem: '[role="menuitemradio"][data-effort-id]',
  /** Any open menu popup. */
  menu: '[role="menu"]',
  /** Portal containers menus are rendered into — hidden while we automate the picker. */
  portal: '[data-base-ui-portal]',
  /** The message composer. */
  chatInput: '[data-testid="chat-input"]',
} as const;

/** Visible label of the submenu row that holds the effort levels. */
export const EFFORT_SUBMENU_LABEL = 'Effort';

/** Prefix of the trigger's aria-label. */
export const MODEL_TRIGGER_LABEL_PREFIX = 'Model:';

/** Model id format: claude-<family>-<version parts>[-<date>]. */
export const MODEL_ID_PATTERN = /^claude-([a-z]+)-(.+)$/;
