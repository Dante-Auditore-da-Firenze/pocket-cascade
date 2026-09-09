import { PARTS } from '../game/content';
import {
  BOARD_HEIGHT, BOARD_WIDTH, SLOTS, TRAY_MULTIPLIERS, lanePosition,
  type Board, type Peg, type PegKind, type Slot,
} from '../game/model';
import { ink, luminance, mix, type CabinetPalette, type Tone } from './palette';

export interface Materials {
  dark: Tone;
  light: Tone;
  enamel: Tone;
  recess: Tone;
  brass: Tone;
  rose: Tone;
}

export const COLLECTORS = [
  { left: 14, right: 185, center: 99.5 },
  { left: 185, right: 315, center: 250 },
  { left: 315, right: 486, center: 400.5 },
] as const;

export const CIRCUITS = SLOTS.flatMap((source, index) => SLOTS.slice(index + 1)
  .filter((destination) => Math.hypot(source.x - destination.x, source.y - destination.y) < 78)
  .map((destination) => ({ source, destination })));

export function cabinetMaterials(palette: CabinetPalette): Materials {
  const neutrals = [palette.bg, palette.surface, palette.text, palette.border]
    .sort((first, second) => luminance(first) - luminance(second));
  const dark = neutrals[0];
  const light = neutrals[neutrals.length - 1];
  return {
    dark,
    light,
    enamel: mix(dark, palette.success, 0.29),
    recess: mix(dark, palette.success, 0.09),
    brass: mix(palette.warning, light, 0.34),
    rose: mix(palette.accent, light, 0.33),
  };
}

export function roundRect(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient,
  stroke?: string,
  lineWidth = 1,
): void {
  context.beginPath();
  context.roundRect(left, top, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}

export function circle(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
}

export function circuitPath(context: CanvasRenderingContext2D, source: Slot, destination: Slot): void {
  context.beginPath();
  if (source.row === destination.row) {
    context.moveTo(source.x, source.y);
    context.bezierCurveTo(source.x + 25, source.y - 12, destination.x - 25, destination.y - 12, destination.x, destination.y);
  } else {
    const middle = (source.y + destination.y) / 2;
    context.moveTo(source.x, source.y);
    context.lineTo(source.x, middle - 9);
    context.quadraticCurveTo(source.x, middle, (source.x + destination.x) / 2, middle);
    context.quadraticCurveTo(destination.x, middle, destination.x, middle + 9);
    context.lineTo(destination.x, destination.y);
  }
}

function screw(context: CanvasRenderingContext2D, centerX: number, centerY: number, angle: number, material: Materials): void {
  context.save();
  context.translate(centerX, centerY);
  context.rotate(angle);
  circle(context, 0, 1, 4.8);
  context.fillStyle = ink(material.dark, 0.8);
  context.fill();
  const bevel = context.createLinearGradient(-3, -3, 4, 4);
  bevel.addColorStop(0, ink(material.light));
  bevel.addColorStop(0.45, ink(material.brass));
  bevel.addColorStop(1, ink(mix(material.brass, material.dark, 0.58)));
  circle(context, 0, 0, 3.7);
  context.fillStyle = bevel;
  context.fill();
  context.strokeStyle = ink(material.dark, 0.85);
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-2.2, 0);
  context.lineTo(2.2, 0);
  context.stroke();
  context.restore();
}

function partShape(kind: PegKind): Path2D {
  const shape = new Path2D();
  const polygon = (points: readonly (readonly [number, number])[]): void => {
    points.forEach(([pointX, pointY], index) => {
      if (index === 0) shape.moveTo(pointX, pointY);
      else shape.lineTo(pointX, pointY);
    });
    shape.closePath();
  };
  switch (kind) {
    case 'mint':
      shape.roundRect(-13, -13, 26, 26, 4);
      break;
    case 'doubler':
      polygon([[0, -17], [16, 0], [0, 17], [-16, 0]]);
      break;
    case 'splitter':
      polygon([[0, -17], [16, 10], [10, 16], [0, 9], [-10, 16], [-16, 10]]);
      break;
    case 'kicker':
      polygon([[-13, -12], [3, -12], [17, 0], [3, 12], [-13, 12], [-7, 0]]);
      break;
    case 'relay':
      polygon(Array.from({ length: 24 }, (_, index) => {
        const angle = index * Math.PI / 12;
        const radius = index % 4 < 2 ? 16 : 12.5;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
      }));
      break;
    case 'vault':
      shape.roundRect(-15, -12, 30, 24, 3);
      break;
    case 'echo':
      shape.roundRect(-17, -11, 34, 22, 10);
      break;
    case 'crown':
      polygon([[-15, 12], [-16, -10], [-7, -4], [0, -17], [7, -4], [16, -10], [15, 12]]);
      break;
  }
  return shape;
}

function partGlyph(context: CanvasRenderingContext2D, kind: PegKind, palette: CabinetPalette, material: Materials): void {
  context.strokeStyle = ink(mix(material.light, palette[PARTS[kind].color], 0.17));
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 1.8;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  switch (kind) {
    case 'mint':
      context.moveTo(-5.5, 0);
      context.lineTo(5.5, 0);
      context.moveTo(0, -5.5);
      context.lineTo(0, 5.5);
      break;
    case 'doubler':
      context.font = `700 11px ${palette.font}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('x2', 0, 0.5);
      break;
    case 'splitter':
      context.moveTo(0, -8);
      context.lineTo(0, 0);
      context.lineTo(-7, 7);
      context.moveTo(0, 0);
      context.lineTo(7, 7);
      context.moveTo(-7, 3);
      context.lineTo(-7, 7);
      context.lineTo(-3, 7);
      context.moveTo(7, 3);
      context.lineTo(7, 7);
      context.lineTo(3, 7);
      break;
    case 'kicker':
      context.moveTo(-7, 0);
      context.lineTo(8, 0);
      context.moveTo(2, -5);
      context.lineTo(8, 0);
      context.lineTo(2, 5);
      break;
    case 'relay':
      for (let spoke = 0; spoke < 6; spoke += 1) {
        const angle = spoke * Math.PI / 3;
        context.moveTo(Math.cos(angle) * 3, Math.sin(angle) * 3);
        context.lineTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
      }
      context.stroke();
      circle(context, 0, 0, 3);
      break;
    case 'vault':
      context.moveTo(-9, -5);
      context.lineTo(-9, 5);
      context.moveTo(9, -5);
      context.lineTo(9, 5);
      context.stroke();
      circle(context, 0, 0, 5.5);
      context.stroke();
      context.beginPath();
      context.moveTo(0, -3);
      context.lineTo(0, 3);
      context.moveTo(-3, 0);
      context.lineTo(3, 0);
      break;
    case 'echo':
      context.moveTo(-10, 2);
      context.bezierCurveTo(-4, -9, -3, 10, 3, -1);
      context.moveTo(-3, 2);
      context.bezierCurveTo(3, -9, 4, 10, 10, -1);
      break;
    case 'crown':
      context.moveTo(-7, 3);
      context.lineTo(-8, -3);
      context.lineTo(-3, 0);
      context.lineTo(0, -7);
      context.lineTo(3, 0);
      context.lineTo(8, -3);
      context.lineTo(7, 3);
      context.closePath();
      context.moveTo(-6, 7);
      context.lineTo(6, 7);
      break;
  }
  context.stroke();
}

function paintSocket(context: CanvasRenderingContext2D, slot: Slot, peg: Peg | undefined, palette: CabinetPalette, material: Materials): void {
  context.save();
  context.translate(slot.x, slot.y);
  circle(context, 0, 1, 12);
  context.fillStyle = ink(material.dark, 0.85);
  context.fill();
  context.strokeStyle = ink(material.brass, 0.35);
  context.lineWidth = 1;
  context.stroke();
  circle(context, 0, 0, 9);
  context.strokeStyle = ink(mix(palette.border, material.brass, 0.45), 0.7);
  context.stroke();

  if (peg) {
    context.save();
    if (peg.kind === 'kicker') context.scale(peg.direction, 1);
    const shape = partShape(peg.kind);
    const tint = palette[PARTS[peg.kind].color];
    const metal = context.createLinearGradient(-12, -16, 14, 17);
    metal.addColorStop(0, ink(mix(tint, material.light, 0.62)));
    metal.addColorStop(0.36, ink(mix(tint, material.brass, 0.35)));
    metal.addColorStop(0.52, ink(mix(tint, material.dark, 0.45)));
    metal.addColorStop(1, ink(mix(tint, material.light, 0.33)));
    context.translate(0, 2.5);
    context.fillStyle = ink(material.dark, 0.85);
    context.fill(shape);
    context.translate(0, -2.5);
    context.fillStyle = metal;
    context.fill(shape);
    context.strokeStyle = ink(mix(tint, material.light, 0.55));
    context.lineWidth = 0.7;
    context.stroke(shape);
    context.save();
    context.scale(0.76, 0.76);
    context.fillStyle = ink(mix(material.dark, tint, 0.2));
    context.fill(shape);
    context.strokeStyle = ink(material.dark, 0.7);
    context.stroke(shape);
    context.restore();
    partGlyph(context, peg.kind, palette, material);
    context.restore();
  } else {
    const pin = context.createLinearGradient(-4, -5, 4, 5);
    pin.addColorStop(0, ink(mix(material.light, material.brass, 0.3)));
    pin.addColorStop(0.5, ink(palette.border));
    pin.addColorStop(1, ink(mix(palette.border, material.dark, 0.7)));
    circle(context, 0, 0, 4.8);
    context.fillStyle = pin;
    context.fill();
    context.fillStyle = ink(material.light, 0.5);
    context.fillRect(-2, -2.5, 2.5, 0.8);
    context.fillStyle = ink(material.brass, 0.45);
    context.fillRect(-9, -0.7, 1.5, 1.5);
    context.fillRect(7.5, -0.7, 1.5, 1.5);
  }

  context.font = '8px Consolas, "Courier New", monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = ink(material.dark, 0.95);
  context.fillText(slot.id, 0, 25);
  context.fillStyle = ink(mix(material.brass, material.light, 0.2), peg ? 0.7 : 0.43);
  context.fillText(slot.id, 0, 24);
  context.restore();
}

export function paintCabinet(context: CanvasRenderingContext2D, palette: CabinetPalette, board: Board): void {
  const material = cabinetMaterials(palette);
  const rim = context.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  rim.addColorStop(0, ink(mix(material.brass, material.light, 0.45)));
  rim.addColorStop(0.2, ink(material.brass));
  rim.addColorStop(0.49, ink(mix(material.brass, material.dark, 0.52)));
  rim.addColorStop(0.77, ink(material.brass));
  rim.addColorStop(1, ink(mix(material.brass, material.dark, 0.35)));
  context.fillStyle = ink(material.dark);
  context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  roundRect(context, 1, 1, 498, 648, 17, rim);
  roundRect(context, 5, 5, 490, 640, 13, ink(material.recess), ink(material.light, 0.3));
  const enamel = context.createLinearGradient(30, 90, 420, 565);
  enamel.addColorStop(0, ink(mix(material.enamel, palette.success, 0.08)));
  enamel.addColorStop(0.5, ink(material.enamel));
  enamel.addColorStop(1, ink(mix(material.enamel, material.dark, 0.32)));
  roundRect(context, 20, 94, 460, 470, 8, enamel, ink(material.brass, 0.5));
  roundRect(context, 23, 97, 454, 464, 6, ink(material.enamel, 0.15), ink(material.dark, 0.8));

  context.save();
  context.beginPath();
  context.roundRect(24, 98, 452, 462, 5);
  context.clip();
  for (let row = 104; row < 560; row += 5) {
    context.fillStyle = ink(material.light, row % 10 === 4 ? 0.025 : 0.012);
    context.fillRect(24, row, 452, 0.55);
  }
  for (let column = 31; column < 475; column += 13) {
    for (let row = 108; row < 560; row += 13) {
      context.fillStyle = ink(material.brass, 0.035 + ((column * 17 + row * 31) % 11) * 0.004);
      context.fillRect(column, row, 0.8, 0.8);
    }
  }
  const reflection = context.createLinearGradient(50, 130, 410, 500);
  reflection.addColorStop(0, ink(material.light, 0));
  reflection.addColorStop(0.4, ink(material.light, 0.035));
  reflection.addColorStop(0.42, ink(material.light, 0.065));
  reflection.addColorStop(0.8, ink(material.light, 0));
  context.fillStyle = reflection;
  context.fillRect(24, 98, 452, 462);
  context.restore();

  for (const { source, destination } of CIRCUITS) {
    const connected = Boolean(board[source.id] && board[destination.id]);
    circuitPath(context, source, destination);
    context.lineWidth = connected ? 3.5 : 2.5;
    context.strokeStyle = ink(material.dark, 0.36);
    context.stroke();
    context.lineWidth = 0.8;
    context.strokeStyle = ink(connected ? palette.success : material.brass, connected ? 0.32 : 0.13);
    context.stroke();
  }

  roundRect(context, 25, 16, 450, 43, 6, ink(material.enamel), ink(material.brass, 0.4));
  for (let lane = 0; lane < 9; lane += 1) {
    const laneX = lanePosition(lane);
    roundRect(context, laneX - 17, 20, 34, 32, 4, ink(material.recess), ink(material.brass, 0.3));
    circle(context, laneX, 36, 10.5);
    context.fillStyle = ink(material.dark, 0.65);
    context.fill();
    context.strokeStyle = ink(material.brass, 0.22);
    context.lineWidth = 1;
    context.stroke();
    context.font = `600 11px ${palette.font}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = ink(material.brass, 0.85);
    context.fillText(String(lane + 1), laneX, 36.5);
    context.fillStyle = ink(material.brass, 0.32);
    context.fillRect(laneX - 3, 55, 6, 1);
  }

  roundRect(context, 160, 66, 180, 20, 3, rim, ink(material.light, 0.25));
  context.font = `750 16px ${palette.font}`;
  context.fillStyle = ink(material.dark);
  context.fillText('CASCADE', 250, 77);
  context.font = `600 8px ${palette.font}`;
  context.fillStyle = ink(material.brass, 0.75);
  context.fillText('POCKET', 70, 76);
  context.fillText('No. 046', 430, 76);
  for (let tick = 28; tick <= 472; tick += 8) {
    context.fillStyle = ink(material.brass, tick % 32 === 28 ? 0.7 : 0.27);
    context.fillRect(tick, 90, 0.8, tick % 32 === 28 ? 4 : 2);
  }

  for (const side of [14, 486]) {
    const rail = context.createLinearGradient(side - 5, 0, side + 5, 0);
    rail.addColorStop(0, ink(material.dark));
    rail.addColorStop(0.3, ink(material.brass));
    rail.addColorStop(0.5, ink(mix(material.light, material.brass, 0.4)));
    rail.addColorStop(1, ink(mix(material.brass, material.dark, 0.65)));
    roundRect(context, side - 4, 93, 8, 471, 3, rail);
    for (let notch = 113; notch < 555; notch += 27) {
      context.fillStyle = ink(material.dark, 0.7);
      context.fillRect(side - 2.5, notch, 5, 1);
    }
  }

  for (const slot of SLOTS) paintSocket(context, slot, board[slot.id], palette, material);

  COLLECTORS.forEach((tray, index) => {
    const width = tray.right - tray.left;
    const tint = index === 1 ? material.rose : material.brass;
    roundRect(context, tray.left + 1, 567, width - 2, 65, 5, ink(mix(tint, material.dark, 0.66)), ink(material.brass, 0.7));
    const mouth = context.createLinearGradient(0, 570, 0, 599);
    mouth.addColorStop(0, ink(material.dark));
    mouth.addColorStop(0.45, ink(mix(tint, material.dark, 0.82)));
    mouth.addColorStop(1, ink(mix(tint, material.dark, 0.36)));
    roundRect(context, tray.left + 6, 571, width - 12, 27, 3, mouth, ink(tint, 0.35));
    context.fillStyle = ink(mix(tint, material.light, 0.35));
    context.font = `750 16px ${palette.font}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`x${TRAY_MULTIPLIERS[index]}`, tray.center, 582);
    for (let tooth = tray.left + 12; tooth < tray.right - 10; tooth += 8) {
      context.fillStyle = ink(tint, 0.35);
      context.fillRect(tooth, 594, 3, 3);
    }
    roundRect(context, tray.left + 10, 604, width - 20, 23, 2, ink(material.recess), ink(tint, 0.4));
    context.font = '7px Consolas, "Courier New", monospace';
    context.fillStyle = ink(material.brass, 0.6);
    context.fillText(`0${index + 1}`, tray.center, 638);
  });

  for (const boundary of [185, 315]) {
    roundRect(context, boundary - 1.5, 566, 3, 67, 1.5, rim);
  }
  screw(context, 12, 13, 0.65, material);
  screw(context, 488, 13, -0.35, material);
  screw(context, 12, 638, -0.6, material);
  screw(context, 488, 638, 0.35, material);
  screw(context, 32, 76, -0.2, material);
  screw(context, 468, 76, 0.4, material);
}