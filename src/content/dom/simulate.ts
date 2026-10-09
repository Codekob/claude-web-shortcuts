/**
 * Synthetic input helpers. They dispatch the full event sequence a real user produces so they
 * work regardless of whether a widget listens to pointer, mouse or click events.
 */

const PointerEventCtor: typeof MouseEvent =
  typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;

export function press(element: Element): void {
  const rect = element.getBoundingClientRect();
  const base = {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  };
  const pointer = { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true };

  element.dispatchEvent(new PointerEventCtor('pointerdown', { ...pointer, buttons: 1 }));
  element.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }));
  element.dispatchEvent(new PointerEventCtor('pointerup', pointer));
  element.dispatchEvent(new MouseEvent('mouseup', base));
  element.dispatchEvent(new MouseEvent('click', { ...base, detail: 1 }));
}

export function pressKey(target: EventTarget, key: string, code = key): void {
  const init = { key, code, bubbles: true, cancelable: true, composed: true };
  target.dispatchEvent(new KeyboardEvent('keydown', init));
  target.dispatchEvent(new KeyboardEvent('keyup', init));
}
