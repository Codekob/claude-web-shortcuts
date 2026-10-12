/**
 * A behavioural fake of claude.ai's model picker for jsdom tests.
 *
 * It renders the same markup as tests/fixtures/model-menu.html (trimmed from the real page) and
 * reacts to clicks and keys the way claude.ai does: the trigger opens a menu in a portal,
 * submenu rows open nested menus, picking an item updates the selection and the trigger's
 * aria-label and closes the picker, Escape closes one level. Model and effort lists, labels and
 * timing are configurable, so tests can simulate claude.ai shipping changes.
 *
 * It deliberately imports nothing from src/: it stands in for claude.ai, not for our adapter.
 * tests/unit/claudePageContract.test.ts checks that it still reads like the real snapshot.
 */

export interface FakeModel {
  id: string;
  name: string;
  description?: string;
  /** Listed but not selectable, like "Requires usage credits" (a plain menuitem). */
  gated?: boolean;
  /** Effort ids this model offers; null for a model without an Effort row. Default: all. */
  efforts?: string[] | null;
  /** Clicking it closes the picker without switching (e.g. an upgrade prompt intervenes). */
  rejectsSelection?: boolean;
}

export interface FakeEffort {
  id: string;
  label: string;
  badge?: string;
}

export interface ClaudePageConfig {
  models: FakeModel[];
  efforts: FakeEffort[];
  selected: { model: string; effort: string | null };
  /** Visible label of the submenu row holding the effort levels. */
  effortRowLabel: string;
  /** Builds the trigger's aria-label from the current selection. */
  triggerLabel: (model: FakeModel, effort: FakeEffort | null) => string;
  /** Delay before popups mount and unmount, like React committing asynchronously. */
  latencyMs: number;
}

export interface ClaudePage {
  /** What claude.ai considers selected. */
  readonly state: { model: string; effort: string | null };
  /** Picker interactions in order: "open", "select <id>", "effort <id>", "close", … */
  readonly log: string[];
  readonly trigger: HTMLElement;
  /** Changes the page, e.g. a model ships or is renamed. Open menus keep their old content. */
  update(changes: Partial<ClaudePageConfig>): void;
  destroy(): void;
}

/** The models of the snapshot in tests/fixtures/model-menu.html. */
export const SNAPSHOT_MODELS: FakeModel[] = [
  {
    id: 'claude-fable-5-1',
    name: 'Fable 5.1',
    description: 'For your toughest challenges',
    gated: true,
  },
  {
    id: 'claude-opus-5-5',
    name: 'Opus 5.5',
    description: 'For complex work and everyday tasks',
  },
  {
    id: 'claude-sonnet-5-5',
    name: 'Sonnet 5.5',
    description: 'Most efficient for simpler tasks',
  },
  { id: 'claude-haiku-5-5', name: 'Haiku 5.5', description: 'Fastest for quick answers' },
];

/** The effort levels of the snapshot. */
export const SNAPSHOT_EFFORTS: FakeEffort[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium', badge: 'Recommended' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra' },
  { id: 'max', label: 'Max', badge: '5× or more usage' },
];

function defaultConfig(): ClaudePageConfig {
  return {
    models: SNAPSHOT_MODELS,
    efforts: SNAPSHOT_EFFORTS,
    selected: { model: 'claude-haiku-5-5', effort: 'medium' },
    effortRowLabel: 'Effort',
    triggerLabel: (model, effort) => `Model: ${model.name}${effort ? ` ${effort.label}` : ''}`,
    latencyMs: 0,
  };
}

interface Popup {
  portal: HTMLElement;
  menu: HTMLElement;
}

let nextId = 0;
const uniqueId = (prefix: string) => `_fake_${prefix}_${++nextId}_`;

function fromHtml(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}

const badgeHtml = (text?: string) =>
  text ? `<span data-cds="Badge"><span><span>${text}</span></span></span>` : '';

/** Mounts the fake page into document.body, replacing its content. */
export function mountClaudePage(overrides: Partial<ClaudePageConfig> = {}): ClaudePage {
  const config: ClaudePageConfig = { ...defaultConfig(), ...overrides };
  const state = { ...config.selected };
  const log: string[] = [];
  const abort = new AbortController();
  const { signal } = abort;

  document.body.innerHTML = '<div data-testid="chat-input" contenteditable="true"></div>';
  const trigger = fromHtml(
    `<button type="button" data-cds="ModelSelector" data-testid="model-selector-dropdown"
       aria-haspopup="menu" aria-expanded="false"></button>`,
  );
  document.body.append(trigger);

  let main: Popup | null = null;
  let sub: { popup: Popup; row: HTMLElement } | null = null;
  let opening = false;

  const later = (fn: () => void) => {
    if (config.latencyMs === 0) return fn();
    setTimeout(() => signal.aborted || fn(), config.latencyMs);
  };
  const unmount = (popup: Popup) => later(() => popup.portal.remove());

  const modelById = (id: string) => config.models.find((m) => m.id === id);
  const effortById = (id: string | null) => config.efforts.find((e) => e.id === id) ?? null;
  const effortsOf = (model: FakeModel | undefined): FakeEffort[] => {
    if (model?.efforts === null) return [];
    const ids = model?.efforts ?? config.efforts.map((e) => e.id);
    return config.efforts.filter((e) => ids.includes(e.id));
  };

  function renderTrigger(): void {
    const model = modelById(state.model)!;
    trigger.setAttribute('aria-label', config.triggerLabel(model, effortById(state.effort)));
    trigger.innerHTML = `<span>${model.name}</span>`;
  }

  function mountPopup(menu: HTMLElement): Popup {
    const portal = fromHtml(
      '<div data-base-ui-portal=""><div data-cds-portal=""><div data-open="" role="presentation"></div></div></div>',
    );
    portal.querySelector('[data-open]')!.append(menu);
    document.body.append(portal);
    return { portal, menu };
  }

  function buildMainMenu(): HTMLElement {
    const menu = fromHtml(
      `<div id="${uniqueId('menu')}" role="menu" data-cds="ModelSelector">
         <div data-cds-sheet-scroll=""><div role="group"></div></div>
       </div>`,
    );
    const scroll = menu.firstElementChild!;
    const group = scroll.firstElementChild!;
    for (const model of config.models) {
      const role = model.gated
        ? 'role="menuitem"'
        : `role="menuitemradio" aria-checked="${model.id === state.model}"`;
      const item = fromHtml(
        `<div ${role} data-model-id="${model.id}">
           <span><span><span><span>${model.name}</span>${badgeHtml(model.gated ? 'Requires usage credits' : undefined)}</span></span><span>${model.description ?? ''}</span></span>
         </div>`,
      );
      if (!model.gated) item.addEventListener('click', () => selectModel(model), { signal });
      group.append(item);
    }
    scroll.append(fromHtml('<div role="separator"></div>'));
    if (effortsOf(modelById(state.model)).length > 0) {
      const current = effortById(state.effort)?.label ?? '';
      scroll.append(
        submenuRow(
          `<span>${config.effortRowLabel}</span><span><span>${current}</span></span>`,
          buildEffortMenu,
        ),
      );
      scroll.append(fromHtml('<div role="separator"></div>'));
    }
    scroll.append(submenuRow('<span>More models</span>', buildMoreModelsMenu));
    return menu;
  }

  function buildEffortMenu(): HTMLElement {
    const menu = fromHtml(
      `<div id="${uniqueId('effort')}" role="menu" data-nested="" data-cds="Menu">
         <div data-cds-sheet-scroll="">
           <div role="presentation">Higher effort means more thorough responses.</div>
           <div role="group"></div>
         </div>
       </div>`,
    );
    const group = menu.querySelector('[role="group"]')!;
    for (const effort of effortsOf(modelById(state.model))) {
      const item = fromHtml(
        `<div role="menuitemradio" data-effort-id="${effort.id}" aria-checked="${effort.id === state.effort}">
           <span><span><span>${effort.label}</span>${badgeHtml(effort.badge)}</span></span><span><span></span></span>
         </div>`,
      );
      item.addEventListener('click', () => selectEffort(effort), { signal });
      group.append(item);
    }
    return menu;
  }

  function buildMoreModelsMenu(): HTMLElement {
    return fromHtml(
      `<div id="${uniqueId('more')}" role="menu" data-nested="" data-cds="Menu">
         <div role="group"><div role="menuitem"><span>Legacy models</span></div></div>
       </div>`,
    );
  }

  /** A menu row that opens a nested menu on click or ArrowRight. */
  function submenuRow(content: string, build: () => HTMLElement): HTMLElement {
    const row = fromHtml(
      `<div role="menuitem" aria-haspopup="menu" aria-expanded="false" id="${uniqueId('row')}">${content}</div>`,
    );
    const open = () => openSubmenu(row, build);
    row.addEventListener('click', open, { signal });
    row.addEventListener('keydown', (e) => e.key === 'ArrowRight' && open(), { signal });
    return row;
  }

  function openMain(): void {
    if (main || opening) return;
    opening = true;
    log.push('open');
    later(() => {
      opening = false;
      main = mountPopup(buildMainMenu());
      trigger.setAttribute('aria-controls', main.menu.id);
      trigger.setAttribute('aria-expanded', 'true');
    });
  }

  function openSubmenu(row: HTMLElement, build: () => HTMLElement): void {
    if (sub?.row === row) return;
    closeSubmenu();
    later(() => {
      if (!main) return;
      const popup = mountPopup(build());
      sub = { popup, row };
      row.setAttribute('aria-controls', popup.menu.id);
      row.setAttribute('aria-expanded', 'true');
    });
  }

  function closeSubmenu(): void {
    if (!sub) return;
    sub.row.setAttribute('aria-expanded', 'false');
    sub.row.removeAttribute('aria-controls');
    unmount(sub.popup);
    sub = null;
  }

  function closeAll(): void {
    if (!main) return;
    log.push('close');
    closeSubmenu();
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-controls');
    unmount(main);
    main = null;
  }

  function selectModel(model: FakeModel): void {
    log.push(`select ${model.id}`);
    if (!model.rejectsSelection) {
      state.model = model.id;
      const offered = effortsOf(model).map((e) => e.id);
      if (!state.effort || !offered.includes(state.effort)) {
        state.effort = offered.includes('medium') ? 'medium' : (offered[0] ?? null);
      }
      renderTrigger();
    }
    closeAll();
  }

  function selectEffort(effort: FakeEffort): void {
    log.push(`effort ${effort.id}`);
    state.effort = effort.id;
    renderTrigger();
    closeAll();
  }

  trigger.addEventListener('click', () => (main ? closeAll() : openMain()), { signal });
  trigger.addEventListener(
    'keydown',
    (e) => ['Enter', ' ', 'ArrowDown'].includes(e.key) && openMain(),
    { signal },
  );
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape') return;
      if (sub) closeSubmenu();
      else closeAll();
    },
    { signal },
  );

  renderTrigger();

  return {
    state,
    log,
    trigger,
    update(changes) {
      Object.assign(config, changes);
      if (changes.selected) Object.assign(state, changes.selected);
      renderTrigger();
    },
    destroy() {
      abort.abort();
      document.body.innerHTML = '';
    },
  };
}
