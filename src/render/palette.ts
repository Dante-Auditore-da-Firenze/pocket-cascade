export interface Tone {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const THEME_PROPERTIES = {
  surface: '--cp-surface',
  bg: '--cp-bg',
  border: '--cp-border',
  text: '--cp-text',
  success: '--cp-success',
  warning: '--cp-warning',
  accent: '--cp-accent',
  link: '--cp-link',
} as const;

export type CabinetPalette = Record<keyof typeof THEME_PROPERTIES, Tone> & {
  font: string;
};

export function ink(tone: Tone, opacity = 1): string {
  return `rgb(${Math.round(tone.red)} ${Math.round(tone.green)} ${Math.round(tone.blue)} / ${Math.max(0, Math.min(1, tone.alpha * opacity))})`;
}

export function mix(first: Tone, second: Tone, amount: number): Tone {
  const weight = Math.max(0, Math.min(1, amount));
  return {
    red: first.red + (second.red - first.red) * weight,
    green: first.green + (second.green - first.green) * weight,
    blue: first.blue + (second.blue - first.blue) * weight,
    alpha: first.alpha + (second.alpha - first.alpha) * weight,
  };
}

export function luminance(tone: Tone): number {
  return 0.2126 * (tone.red / 255) ** 2.2
    + 0.7152 * (tone.green / 255) ** 2.2
    + 0.0722 * (tone.blue / 255) ** 2.2;
}

export function readCabinetPalette(element: HTMLElement): CabinetPalette {
  const ownerDocument = element.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  if (!ownerWindow) throw new Error('The cabinet palette requires a browser document.');

  const styles = ownerWindow.getComputedStyle(element);
  const probe = ownerDocument.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  const sampler = ownerDocument.createElement('canvas');
  sampler.width = 1;
  sampler.height = 1;
  const context = sampler.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The cabinet requires Canvas 2D support.');

  element.appendChild(probe);
  try {
    const colors = Object.fromEntries(Object.entries(THEME_PROPERTIES).map(([name, property]) => {
      probe.style.color = `var(${property}, ${styles.color})`;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = ownerWindow.getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      const channels = context.getImageData(0, 0, 1, 1).data;
      return [name, {
        red: channels[0],
        green: channels[1],
        blue: channels[2],
        alpha: channels[3] / 255,
      }];
    })) as Record<keyof typeof THEME_PROPERTIES, Tone>;
    return { ...colors, font: styles.fontFamily || '"Segoe UI", Aptos, Calibri, sans-serif' };
  } finally {
    probe.remove();
  }
}