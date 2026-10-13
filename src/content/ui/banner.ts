const HOST_ID = 'cws-banner-host';

const STYLES = `
:host { all: initial; }
.banner {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  box-sizing: border-box;
  width: max-content;
  max-width: min(560px, calc(100vw - 32px));
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 12px 10px 14px;
  border-radius: 10px;
  font: 13px/1.45 ui-sans-serif, system-ui, sans-serif;
  color: #fff;
  background: rgba(160, 40, 30, 0.96);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}
.title { margin: 0; font-weight: 600; }
ul { margin: 4px 0 0; padding-left: 18px; }
button {
  flex: none;
  margin: 0;
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  font: inherit;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
button:hover { background: rgba(255, 255, 255, 0.15); }
`;

let list: HTMLUListElement | null = null;
let dismissed = false;

/**
 * Shows a persistent warning at the top of the page, isolated from the page's CSS via shadow
 * DOM. Calling it again while visible updates the details. Once the user dismisses it, it stays
 * hidden until the page reloads.
 */
export function showWarningBanner(title: string, details: readonly string[]): void {
  if (dismissed) return;
  if (!list?.isConnected) list = mount(title);
  list.replaceChildren(
    ...details.map((detail) => {
      const item = document.createElement('li');
      item.textContent = detail;
      return item;
    }),
  );
}

/** Removes the banner, e.g. when debug mode is turned off; it may be shown again later. */
export function hideWarningBanner(): void {
  document.getElementById(HOST_ID)?.remove();
  list = null;
}

function mount(title: string): HTMLUListElement {
  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STYLES;

  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.setAttribute('role', 'alert');
  const body = document.createElement('div');
  const heading = document.createElement('p');
  heading.className = 'title';
  heading.textContent = title;
  const details = document.createElement('ul');
  body.append(heading, details);

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Dismiss';
  close.addEventListener('click', () => {
    dismissed = true;
    host.remove();
  });

  banner.append(body, close);
  shadow.append(style, banner);
  document.documentElement.append(host);
  return details;
}
