const HOST_ID = 'cws-toast-host';
const VISIBLE_MS = 1400;

const STYLES = `
:host { all: initial; }
.toast {
  position: fixed;
  left: 50%;
  bottom: 96px;
  transform: translate(-50%, 6px);
  z-index: 2147483647;
  padding: 6px 12px;
  border-radius: 8px;
  font: 500 13px/1.4 ui-sans-serif, system-ui, sans-serif;
  color: #fff;
  background: rgba(31, 30, 29, 0.92);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease, transform 120ms ease;
}
.toast.visible { opacity: 1; transform: translate(-50%, 0); }
.toast.error { background: rgba(160, 40, 30, 0.95); }
`;

let element: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function getToastElement(): HTMLDivElement {
  if (element?.isConnected) return element;
  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STYLES;
  element = document.createElement('div');
  element.className = 'toast';
  element.setAttribute('role', 'status');
  shadow.append(style, element);
  document.documentElement.append(host);
  return element;
}

/** Shows a small transient message, isolated from the page's CSS via shadow DOM. */
export function showToast(message: string, kind: 'info' | 'error' = 'info'): void {
  const toast = getToastElement();
  toast.textContent = message;
  toast.classList.toggle('error', kind === 'error');
  // Force a reflow so the entry transition plays even on the very first toast.
  void toast.offsetWidth;
  toast.classList.add('visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.remove('visible'), VISIBLE_MS);
}
