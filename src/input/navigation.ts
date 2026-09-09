import type { Direction } from './gamepad';

export type ControlInput = Direction | 'activate' | 'previous' | 'next';

const controlSelector = 'button, input:not([type="hidden"]), select, textarea, a[href], [tabindex], [role="button"], [role="checkbox"], [role="switch"], [role="tab"]';

function isVisible(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view || element.getClientRects().length === 0 || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const rectangle = element.getBoundingClientRect();
  if (rectangle.width <= 0 || rectangle.height <= 0) return false;
  const proxy = element.matches('input[type="checkbox"], input[type="radio"]')
    && Array.from((element as HTMLInputElement).labels ?? []).some((label) => isVisible(label));
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = view.getComputedStyle(ancestor);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.contentVisibility === 'hidden') return false;
    if (Number(style.opacity) === 0 && !(ancestor === element && proxy)) return false;
  }
  return true;
}

export function getNavigationScope(document: Document): Document | HTMLDialogElement {
  const dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).filter(isVisible);
  return dialogs.at(-1) ?? document;
}

export function getFocusableControls(scope: Document | HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(controlSelector)).filter((element) =>
    element.tabIndex >= 0
    && !element.matches(':disabled, [disabled]')
    && !element.closest('[aria-disabled="true"]')
    && isVisible(element),
  );
}

function focusControl(element: HTMLElement): void {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}

function adjustRange(input: HTMLInputElement, direction: 'left' | 'right'): void {
  const view = input.ownerDocument.defaultView;
  const setter = view && Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')?.set;
  if (!view || !setter || input.readOnly) return;
  const previous = input.value;
  if (input.step === 'any') {
    const minimum = input.min === '' ? 0 : Number(input.min);
    const maximum = input.max === '' ? 100 : Number(input.max);
    const value = Math.max(minimum, Math.min(maximum, input.valueAsNumber + (direction === 'right' ? 1 : -1)));
    setter.call(input, String(value));
  } else {
    if (direction === 'right') input.stepUp();
    else input.stepDown();
    setter.call(input, input.value);
  }
  if (input.value === previous) return;
  input.dispatchEvent(new view.Event('input', { bubbles: true, composed: true }));
  input.dispatchEvent(new view.Event('change', { bubbles: true }));
}

function nearestControl(current: HTMLElement, controls: HTMLElement[], direction: Direction): HTMLElement | undefined {
  const origin = current.getBoundingClientRect();
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  let nearest: HTMLElement | undefined;
  let nearestDistance = Infinity;
  for (const candidate of controls) {
    if (candidate === current) continue;
    const rectangle = candidate.getBoundingClientRect();
    const deltaHorizontal = rectangle.left + rectangle.width / 2 - origin.left - origin.width / 2;
    const deltaVertical = rectangle.top + rectangle.height / 2 - origin.top - origin.height / 2;
    const forward = (horizontal ? deltaHorizontal : deltaVertical) * sign;
    if (forward <= 1) continue;
    const distance = deltaHorizontal ** 2 + deltaVertical ** 2;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function handleControlInput(document: Document, input: ControlInput): void {
  const scope = getNavigationScope(document);
  const paused = scope === document && Boolean(document.querySelector('.cabinet-board[data-paused="true"]'));
  if (paused && input !== 'activate') return;
  const controls = getFocusableControls(scope);
  let current = controls.find((element) => element === document.activeElement);
  if (!current) {
    if (paused) return;
    current = controls.find((element) => element.matches('button[aria-label="Launch token"]')) ?? controls[0];
    if (!current) return;
    focusControl(current);
    if (input !== 'activate') return;
  }

  if (input === 'activate') {
    if (!current.matches('input[type="range"]')) current.click();
    return;
  }
  if (input === 'previous' || input === 'next') {
    const index = controls.indexOf(current);
    focusControl(controls[(index + (input === 'next' ? 1 : -1) + controls.length) % controls.length]);
    return;
  }
  if (current.matches('input[type="range"]') && (input === 'left' || input === 'right')) {
    adjustRange(current as HTMLInputElement, input);
    return;
  }
  const next = nearestControl(current, controls, input);
  if (next) focusControl(next);
}