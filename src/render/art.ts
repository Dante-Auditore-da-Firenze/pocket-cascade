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
  field: Tone;
  steel: Tone;
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
  const neutral = (tone: Tone): Tone => {
    const value = tone.red * 0.2126 + tone.green * 0.7152 + tone.blue * 0.0722;
    return { red: value, green: value, blue: value, alpha: tone.alpha };
  };
  const dark = neutral(neutrals[0]);
  const light = neutral(neutrals[neutrals.length - 1]);
  return {
    dark,
    light,
    enamel: mix({ ...palette.accent, green: palette.accent.green * 0.55, blue: palette.accent.blue * 0.6 }, dark, 0.38),
    recess: mix(dark, light, 0.025),
    field: luminance(palette.surface) > 0.5 ? mix(light, dark, 0.12) : mix(dark, light, 0.14),
    steel: mix(dark, light, 0.64),
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
  const face = mix(palette[PARTS[kind].color], material.dark, 0.12);
  context.strokeStyle = ink(luminance(face) > 0.28 ? material.dark : material.light);
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 2;
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
      context.font = `700 12px ${palette.font}`;
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

export function paintGear(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, material: Materials, rotation = 0): void {
  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotation);
  context.beginPath();
  for (let index = 0; index < 48; index += 1) {
    const angle = index * Math.PI / 24;
    const distance = radius * (index % 4 < 2 ? 1 : 0.8);
    if (index === 0) context.moveTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
    else context.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
  }
  context.closePath();
  context.fillStyle = ink(material.brass);
  context.strokeStyle = ink(material.light, 0.65);
  context.lineWidth = 0.7;
  context.fill();
  context.stroke();
  circle(context, 0, 0, radius * 0.63);
  context.fillStyle = ink(material.recess);
  context.fill();
  context.strokeStyle = ink(material.brass);
  context.lineWidth = radius * 0.12;
  for (let index = 0; index < 5; index += 1) {
    const angle = index * Math.PI * 2 / 5;
    context.beginPath();
    context.moveTo(Math.cos(angle) * radius * 0.16, Math.sin(angle) * radius * 0.16);
    context.lineTo(Math.cos(angle) * radius * 0.63, Math.sin(angle) * radius * 0.63);
    context.stroke();
  }
  circle(context, 0, 0, radius * 0.19);
  context.fillStyle = ink(material.light);
  context.fill();
  circle(context, 0, 0, radius * 0.07);
  context.fillStyle = ink(material.dark);
  context.fill();
  context.restore();
}

export function paintMechanism(context: CanvasRenderingContext2D, peg: Peg, palette: CabinetPalette, material: Materials, activation = 1): void {
  context.save();
  if (peg.kind === 'kicker') context.scale(peg.direction, 1);
  const shape = partShape(peg.kind);
  const tint = palette[PARTS[peg.kind].color];
  const motion = Math.sin(activation * Math.PI * 4) * (1 - activation);
  const metal = context.createLinearGradient(-12, -16, 14, 17);
  metal.addColorStop(0, ink(material.light));
  metal.addColorStop(0.42, ink(material.steel));
  metal.addColorStop(0.48, ink(mix(material.steel, material.dark, 0.5)));
  metal.addColorStop(1, ink(material.steel));
  if (peg.kind === 'relay') paintGear(context, 0, 0, 20, material, motion * 0.5);
  context.translate(0, 2.5);
  context.fillStyle = ink(material.dark, 0.85);
  context.fill(shape);
  context.translate(0, -2.5);
  context.fillStyle = metal;
  context.fill(shape);
  context.strokeStyle = ink(material.light, 0.85);
  context.lineWidth = 0.8;
  context.stroke(shape);
  context.save();
  context.scale(0.82, 0.82);
  context.fillStyle = ink(mix(tint, material.dark, 0.12));
  context.fill(shape);
  context.strokeStyle = ink(material.dark, 0.7);
  context.stroke(shape);
  context.restore();
  if (peg.kind === 'mint') {
    roundRect(context, -8, -19 + motion * 2, 16, 4, 1, ink(material.brass), ink(material.light, 0.5));
    context.fillStyle = ink(material.brass);
    context.fillRect(-10, 12, 3, 5);
    context.fillRect(7, 12, 3, 5);
  }
  if (peg.kind === 'vault') {
    roundRect(context, -18, -8, 4, 6, 1, ink(material.brass));
    roundRect(context, -18, 3, 4, 6, 1, ink(material.brass));
    roundRect(context, 11 + motion, -6, 3, 12, 1, ink(material.brass));
  }
  if (peg.kind === 'splitter') {
    context.strokeStyle = ink(material.light);
    context.lineWidth = 1.6;
    context.beginPath();
    const direction = peg.direction;
    context.moveTo(direction * 7, 15);
    context.lineTo(direction * (18 + motion * 2), 15);
    context.lineTo(direction * (15 + motion * 2), 12);
    context.stroke();
  }
  context.translate(peg.kind === 'kicker' || peg.kind === 'echo' ? motion * 2 : 0, peg.kind === 'mint' ? motion * 1.5 : 0);
  if (peg.kind === 'crown') context.rotate(motion * 0.13);
  partGlyph(context, peg.kind, palette, material);
  context.restore();
}

function paintSocket(context: CanvasRenderingContext2D, slot: Slot, peg: Peg | undefined, palette: CabinetPalette, material: Materials): void {
  context.save();
  context.translate(slot.x, slot.y);
  circle(context, 0, 1, peg ? 12 : 9);
  context.fillStyle = ink(material.dark, peg ? 0.85 : 0.45);
  context.fill();
  context.strokeStyle = ink(material.steel, peg ? 0.45 : 0.28);
  context.lineWidth = 1;
  context.stroke();

  if (peg) {
    paintMechanism(context, peg, palette, material);
  } else {
    const pin = context.createLinearGradient(-4, -5, 4, 5);
    pin.addColorStop(0, ink(material.light));
    pin.addColorStop(0.5, ink(material.steel));
    pin.addColorStop(1, ink(mix(material.steel, material.dark, 0.7)));
    circle(context, 0, 0, 4.8);
    context.fillStyle = pin;
    context.fill();
    context.fillStyle = ink(material.light, 0.5);
    context.fillRect(-2, -2.5, 2.5, 0.8);
  }
  context.restore();
}

export function paintCollector(context: CanvasRenderingContext2D, index: number, palette: CabinetPalette, material: Materials, activation = 1): void {
  const tray = COLLECTORS[index];
  const width = tray.right - tray.left;
  const center = index === 1;
  const edge = center ? material.brass : material.steel;
  context.save();
  const throat = context.createLinearGradient(0, 566, 0, 595);
  throat.addColorStop(0, ink(mix(material.dark, material.steel, 0.14)));
  throat.addColorStop(0.45, ink(material.dark));
  throat.addColorStop(1, ink(material.recess));
  roundRect(context, tray.left + 5, 564, width - 10, 33, 3, throat, ink(material.dark), 2);

  context.beginPath();
  context.moveTo(tray.left + 6, 566);
  context.lineTo(tray.left + 18, 576);
  context.lineTo(tray.left + 18, 589);
  context.lineTo(tray.left + 6, 596);
  context.closePath();
  context.fillStyle = ink(mix(edge, material.dark, 0.42));
  context.fill();
  context.beginPath();
  context.moveTo(tray.right - 6, 566);
  context.lineTo(tray.right - 18, 576);
  context.lineTo(tray.right - 18, 589);
  context.lineTo(tray.right - 6, 596);
  context.closePath();
  context.fillStyle = ink(mix(edge, material.dark, 0.68));
  context.fill();

  const recoil = Math.sin(Math.min(1, activation * 3) * Math.PI) * (1 - activation);
  const flapTop = 588 - recoil * 5;
  context.beginPath();
  context.moveTo(tray.left + 18, flapTop);
  context.lineTo(tray.right - 18, flapTop);
  context.lineTo(tray.right - 6, 596);
  context.lineTo(tray.left + 6, 596);
  context.closePath();
  const lip = context.createLinearGradient(0, flapTop, 0, 597);
  lip.addColorStop(0, ink(mix(edge, material.dark, 0.63)));
  lip.addColorStop(1, ink(edge));
  context.fillStyle = lip;
  context.fill();
  context.strokeStyle = ink(edge, 0.8);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(tray.left + 18, flapTop);
  context.lineTo(tray.right - 18, flapTop);
  context.stroke();
  context.strokeStyle = ink(material.light, 0.75);
  context.beginPath();
  context.moveTo(tray.left + 7, 565);
  context.lineTo(tray.right - 7, 565);
  context.stroke();

  if (center) roundRect(context, tray.left + 4, 601, width - 8, 31, 2, ink(material.enamel), ink(material.brass, 0.45));
  roundRect(context, tray.center - 51, 608, 28, 18, 2, ink(center ? material.brass : material.light), ink(material.dark, 0.4));
  context.fillStyle = ink(material.dark);
  context.font = `750 14px ${palette.font}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(`x${TRAY_MULTIPLIERS[index]}`, tray.center - 37, 617);
  roundRect(context, tray.center - 15, 607, 67, 21, 2, ink(material.recess), ink(edge, 0.65));
  for (const offset of [-22, -7, 8, 23]) {
    context.fillStyle = ink(material.steel, 0.07);
    context.fillRect(tray.center + 18 + offset, 609, 1, 17);
  }
  context.restore();
}

export function paintCabinet(context: CanvasRenderingContext2D, palette: CabinetPalette, board: Board): void {
  const material = cabinetMaterials(palette);
  const rim = context.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  rim.addColorStop(0, ink(mix(material.steel, material.light, 0.45)));
  rim.addColorStop(0.2, ink(material.steel));
  rim.addColorStop(0.49, ink(mix(material.steel, material.dark, 0.52)));
  rim.addColorStop(0.77, ink(material.steel));
  rim.addColorStop(1, ink(mix(material.steel, material.dark, 0.35)));
  context.fillStyle = ink(material.dark);
  context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  roundRect(context, 1, 1, 498, 648, 17, rim);
  roundRect(context, 5, 5, 490, 640, 13, ink(material.enamel), ink(material.light, 0.3));
  const enamel = context.createLinearGradient(30, 90, 420, 565);
  enamel.addColorStop(0, ink(mix(material.field, material.light, 0.04)));
  enamel.addColorStop(0.5, ink(material.field));
  enamel.addColorStop(1, ink(mix(material.field, material.dark, 0.12)));
  roundRect(context, 20, 94, 460, 470, 8, enamel, ink(material.steel, 0.7));
  roundRect(context, 23, 97, 454, 464, 6, ink(material.field, 0.15), ink(material.dark, 0.8));

  context.save();
  context.beginPath();
  context.roundRect(24, 98, 452, 462, 5);
  context.clip();
  for (let row = 104; row < 560; row += 7) {
    context.fillStyle = ink(material.light, 0.014);
    context.fillRect(24, row, 452, 0.55);
  }
  const reflection = context.createLinearGradient(50, 130, 410, 500);
  reflection.addColorStop(0, ink(material.light, 0));
  reflection.addColorStop(0.4, ink(material.light, 0.035));
  reflection.addColorStop(0.42, ink(material.light, 0.065));
  reflection.addColorStop(0.8, ink(material.light, 0));
  context.fillStyle = reflection;
  context.fillRect(24, 98, 452, 462);
  context.restore();

  roundRect(context, 25, 16, 450, 46, 7, ink(material.recess), ink(material.steel, 0.45));
  roundRect(context, 34, 25, 432, 7, 3, rim, ink(material.light, 0.4));
  roundRect(context, 34, 48, 432, 5, 2, rim);
  for (let lane = 0; lane < 9; lane += 1) {
    const laneX = lanePosition(lane);
    context.fillStyle = ink(material.steel, 0.7);
    context.fillRect(laneX - 0.7, 59, 1.4, 5);
    context.font = `600 10px ${palette.font}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = ink(material.light, 0.85);
    context.fillText(String(lane + 1), laneX, 76);
  }

  context.fillStyle = ink(material.steel, 0.45);
  context.fillRect(30, 89, 440, 1);

  for (const side of [14, 486]) {
    const rail = context.createLinearGradient(side - 5, 0, side + 5, 0);
    rail.addColorStop(0, ink(material.dark));
    rail.addColorStop(0.3, ink(material.steel));
    rail.addColorStop(0.5, ink(mix(material.light, material.steel, 0.4)));
    rail.addColorStop(1, ink(mix(material.steel, material.dark, 0.65)));
    roundRect(context, side - 4, 93, 8, 471, 3, rail);
  }

  for (const slot of SLOTS) paintSocket(context, slot, board[slot.id], palette, material);

  const fascia = context.createLinearGradient(0, 560, 0, 635);
  fascia.addColorStop(0, ink(mix(material.steel, material.dark, 0.3)));
  fascia.addColorStop(0.49, ink(material.dark));
  fascia.addColorStop(0.52, ink(mix(material.steel, material.dark, 0.45)));
  fascia.addColorStop(1, ink(mix(material.steel, material.dark, 0.7)));
  roundRect(context, 13, 560, 474, 75, 4, fascia, ink(material.steel, 0.65));
  context.fillStyle = ink(material.light, 0.3);
  context.fillRect(18, 600, 464, 1);
  COLLECTORS.forEach((_, index) => paintCollector(context, index, palette, material));
  context.font = `700 8px ${palette.font}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = ink(material.light, 0.8);
  context.fillText('POCKET CASCADE', 250, 642);
  screw(context, 12, 13, 0.65, material);
  screw(context, 488, 13, -0.35, material);
  screw(context, 12, 638, -0.6, material);
  screw(context, 488, 638, 0.35, material);
  screw(context, 29, 78, -0.2, material);
  screw(context, 471, 78, 0.4, material);
}