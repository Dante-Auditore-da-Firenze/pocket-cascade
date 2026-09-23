const WIDTH = 1600;
const HEIGHT = 1000;
const TYPE = '"Space Grotesk", sans-serif';
const DISPLAY = '"Fraunces", serif';
const INK = '#203a38';
const slots = Array.from({ length: 7 }, (_, row) => Array.from({ length: row % 2 ? 6 : 7 }, (_, column) => ({
  id: `${row}-${column}`, horizontal: 52 + column * 66 + (row % 2 ? 33 : 0), vertical: 122 + row * 62,
}))).flat();
const installed = {
  '0-3': 'mint', '1-2': 'relay', '1-3': 'mint', '2-2': 'doubler', '2-4': 'fork',
  '3-2': 'vault', '4-3': 'dividend', '5-2': 'doubler', '6-3': 'mint',
};
const colors = { mint: '#79a890', doubler: '#e6bd60', fork: '#d97869', vault: '#81b4c2', relay: '#79a890', dividend: '#e6bd60' };
const diagnostics = { press: { slots: 0, scores: [], texts: 0, croppedText: [] }, glass: { slots: 0, scores: [], texts: 0, croppedText: [] } };
let currentStudy = 'press';

function shape(context, path, fill, stroke = INK, width = 2) {
  const outline = new Path2D(path);
  if (fill) { context.fillStyle = fill; context.fill(outline); }
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = width; context.stroke(outline); }
}

function rounded(context, left, top, width, height, radius, fill, stroke = INK, lineWidth = 1.5) {
  context.beginPath(); context.roundRect(left, top, width, height, radius);
  if (fill) { context.fillStyle = fill; context.fill(); }
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = lineWidth; context.stroke(); }
}

function ellipse(context, centerX, centerY, radiusX, radiusY, fill, stroke = null, width = 1) {
  context.beginPath(); context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  if (fill) { context.fillStyle = fill; context.fill(); }
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = width; context.stroke(); }
}

function line(context, points, stroke, width = 2) {
  context.beginPath();
  for (const [index, point] of points.entries()) index ? context.lineTo(...point) : context.moveTo(...point);
  context.lineWidth = width; context.strokeStyle = stroke; context.stroke();
}

function gradient(context, left, top, right, bottom, stops) {
  const fill = context.createLinearGradient(left, top, right, bottom);
  for (const [position, color] of stops) fill.addColorStop(position, color);
  return fill;
}

function text(context, content, left, top, size = 14, color = INK, weight = 500, align = 'left', family = TYPE, score = false) {
  context.font = `${weight} ${size}px ${family}`;
  context.textAlign = align; context.textBaseline = 'alphabetic'; context.fillStyle = color;
  context.fillText(content, left, top);
  const metrics = context.measureText(content);
  const transform = context.getTransform();
  const corners = [
    [left - metrics.actualBoundingBoxLeft, top - metrics.actualBoundingBoxAscent],
    [left + metrics.actualBoundingBoxRight, top - metrics.actualBoundingBoxAscent],
    [left - metrics.actualBoundingBoxLeft, top + metrics.actualBoundingBoxDescent],
    [left + metrics.actualBoundingBoxRight, top + metrics.actualBoundingBoxDescent],
  ].map(([horizontal, vertical]) => transform.transformPoint({ x: horizontal, y: vertical }));
  if (corners.some(point => point.x < 0 || point.y < 0 || point.x > 2400 || point.y > 1500)) diagnostics[currentStudy].croppedText.push(content);
  diagnostics[currentStudy].texts += 1;
  if (score) diagnostics[currentStudy].scores.push({ content, size, width: metrics.width });
}

function shadow(context, draw, blur = 14, offset = 8, color = '#182a2840') {
  context.save(); context.shadowColor = color; context.shadowBlur = blur; context.shadowOffsetY = offset;
  draw(); context.restore();
}

function screw(context, centerX, centerY, radius = 4, rotation = -.55, metal = '#bbccc3') {
  ellipse(context, centerX, centerY + 1.5, radius + .7, radius, '#152b2844');
  ellipse(context, centerX, centerY, radius, radius, gradient(context, centerX - radius, centerY - radius, centerX + radius, centerY + radius,
    [[0, '#eef4e8'], [.45, metal], [1, '#5e7b70']]), '#42635b', .8);
  context.save(); context.translate(centerX, centerY); context.rotate(rotation);
  line(context, [[-radius * .65, 0], [radius * .65, 0]], '#476359', 1.2); context.restore();
}

function random(seed) {
  let state = seed;
  return () => { state = Math.imul(state ^ state >>> 15, 1 | state); state ^= state + Math.imul(state ^ state >>> 7, 61 | state); return ((state ^ state >>> 14) >>> 0) / 4294967296; };
}

function grain(context, region, seed = 13, alpha = .055, count = 9500) {
  const next = random(seed);
  context.save(); context.globalAlpha = alpha;
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = index % 2 ? '#fffef0' : '#152b27';
    const diameter = .6 + next() * 1.5;
    context.fillRect(region[0] + next() * region[2], region[1] + next() * region[3], diameter, diameter * .45);
  }
  context.restore();
}

function gear(context, centerX, centerY, radius, teeth, dark = false, angle = 0) {
  context.save(); context.translate(centerX, centerY); context.rotate(angle);
  const body = new Path2D();
  for (let index = 0; index < teeth * 4; index += 1) {
    const theta = index * Math.PI * 2 / (teeth * 4);
    const distance = radius * (index % 4 < 2 ? 1 : .9);
    const horizontal = Math.cos(theta) * distance;
    const vertical = Math.sin(theta) * distance;
    index ? body.lineTo(horizontal, vertical) : body.moveTo(horizontal, vertical);
  }
  body.closePath();
  context.translate(0, 4); context.fillStyle = '#172d2b'; context.fill(body); context.translate(0, -4);
  context.fillStyle = gradient(context, -radius, -radius, radius, radius, [[0, dark ? '#688b7e' : '#ead09a'], [.5, dark ? '#42665c' : '#b99c60'], [1, dark ? '#2a4c42' : '#8c7849']]);
  context.fill(body); context.strokeStyle = '#385347'; context.lineWidth = 1.5; context.stroke(body);
  ellipse(context, 0, 0, radius * .76, radius * .76, '#294b43', '#f4e0b480', 1.5);
  for (let spoke = 0; spoke < 5; spoke += 1) {
    context.save(); context.rotate(spoke * Math.PI * 2 / 5);
    shape(context, `M-5 0 L${-radius * .11} ${-radius * .64} Q0 ${-radius * .82} ${radius * .11} ${-radius * .64} L5 0 Z`, dark ? '#668e77' : '#c8af6c', '#26463c', 1);
    context.restore();
  }
  ellipse(context, 0, 0, radius * .22, radius * .22, '#ddd0a3', '#486352', 1.5);
  screw(context, 0, 0, radius * .08, .4);
  context.restore();
}

function gadget(context, kind, centerX, centerY, scale = 1, glass = false) {
  context.save(); context.translate(centerX, centerY); context.scale(scale, scale);
  context.lineCap = 'round'; context.lineJoin = 'round';
  const edge = glass ? '#e9d8a685' : '#203d34';
  const metal = gradient(context, -21, -24, 23, 27, [[0, '#eff2d9'], [.25, '#cfceab'], [.55, '#788b76'], [1, '#c1c7a1']]);
  ellipse(context, 2, 17, 28, 14, glass ? '#05191744' : '#28433330');
  if (kind === 'mint') {
    rounded(context, -23, 10, 46, 16, 4, '#416e5a', edge, 1.4);
    rounded(context, -18, -16, 36, 31, 5, gradient(context, -20, -16, 20, 20, [[0, '#c6dbb8'], [.5, colors.mint], [1, '#487962']]), edge, 1.8);
    for (const horizontal of [-13, 13]) { rounded(context, horizontal - 2.5, -29, 5, 33, 1, metal, '#476a51', .8); screw(context, horizontal, 16, 2.8); }
    rounded(context, -21, -29, 42, 8, 2, '#e9d391', edge, 1.2);
    rounded(context, -10, -19, 20, 5, 1, '#35564a', null);
    rounded(context, -6, -8, 12, 11, 2, '#e4ecce', '#305246', 1);
    line(context, [[-3, -2], [3, -2]], '#375e48', 1.5); line(context, [[0, -5], [0, 1]], '#375e48', 1.5);
    line(context, [[-18, 11], [18, 11]], '#cce1b8', 1.4);
  } else if (kind === 'doubler') {
    rounded(context, -26, -17, 52, 40, 9, '#bd9246', edge, 1.8);
    shape(context, 'M-24 -13 Q-2 -25 24 -13 L24 3 Q0 -6 -24 3Z', '#efd18a', '#6d622f', 1);
    for (const horizontal of [-11, 11]) {
      rounded(context, horizontal - 8, -7, 16, 23, 5, metal, '#5b6744', 1.2);
      line(context, [[horizontal - 5, -4], [horizontal - 5, 12]], '#ffffff70', 2);
      screw(context, horizontal, 3, 3.3, horizontal / 18);
    }
    line(context, [[-23, 18], [23, 18]], '#f2d48b', 1.2);
    text(context, 'x2', 0, -9, 9.5, '#4f4a2d', 700, 'center');
    for (const horizontal of [-23, 23]) screw(context, horizontal, 20, 2.5);
  } else if (kind === 'fork') {
    shape(context, 'M-25 -16 Q-18 -25 -10 -16 L0 -6 L10 -16 Q20 -26 25 -16 L18 9 L6 18 L6 28 L-6 28 L-6 18 L-18 9Z', '#c36553', edge, 1.7);
    line(context, [[-17, -16], [-12, 0], [0, 11], [12, 0], [17, -16]], '#f1c4a2', 7);
    line(context, [[-17, -16], [-12, 0], [0, 11], [12, 0], [17, -16]], '#435f50', 3);
    ellipse(context, 0, 11, 7, 7, metal, '#305544', 1.5);
    screw(context, 0, 11, 3.1);
    for (const horizontal of [-17, 17]) ellipse(context, horizontal, -17, 4.5, 4.5, '#efd788', '#31503f', 1.2);
    line(context, [[-4, 24], [4, 24]], '#eaa682', 2);
  } else if (kind === 'vault') {
    rounded(context, -26, -22, 52, 47, 6, '#416d73', edge, 1.7);
    rounded(context, -21, -20, 41, 39, 4, gradient(context, -22, -19, 24, 25, [[0, '#b8d9d4'], [.45, colors.vault], [1, '#58878b']]), '#20484c', 1.2);
    for (const vertical of [-12, 10]) rounded(context, -29, vertical, 8, 7, 2, metal, '#46604c', 1);
    ellipse(context, 2, 0, 13, 13, '#d7e0c5', '#305450', 1.3);
    for (let spoke = 0; spoke < 3; spoke += 1) { context.save(); context.translate(2, 0); context.rotate(spoke * Math.PI * 2 / 3); line(context, [[0,0],[0,-9]], '#34655f', 2.5); context.restore(); }
    screw(context, 2, 0, 3.5); screw(context, 16, -14, 2.1); screw(context, 16, 14, 2.1);
  } else if (kind === 'relay') {
    gear(context, 0, 0, 26, 12, glass, .1);
    for (const horizontal of [-27, 27]) rounded(context, horizontal - 3, -4, 6, 10, 1.5, '#d7b269', '#3f5945', 1);
    ellipse(context, 0, 0, 9, 9, '#b8d4b5', '#3d614d', 1.2);
    line(context, [[-4,0],[4,0]], '#3d614d', 2); line(context, [[0,-4],[0,4]], '#3d614d', 2);
  } else {
    rounded(context, -24, -20, 48, 44, 8, '#ab8346', edge, 1.7);
    shape(context, 'M-23 -10 Q0 -26 23 -10 L23 2 Q0 -7 -23 2Z', '#edc975', '#6a6036', 1.2);
    rounded(context, -14, -10, 28, 19, 3, '#375747', '#f3d28c', 1);
    for (const horizontal of [-7, 0, 7]) line(context, [[horizontal,-6],[horizontal,6]], '#d8bc75', 1.5);
    rounded(context, -18, 13, 36, 6, 2, '#294e40', '#e7d195', 1.1);
    ellipse(context, 15, 0, 5, 5, '#9cba96', '#2d5448', 1);
  }
  context.restore();
}

function paperTag(context, left, top, width, title, subtitle, angle = -.025, dark = false) {
  context.save(); context.translate(left, top); context.rotate(angle);
  shadow(context, () => rounded(context, 0, 0, width, 63, 2, '#f0efdc', '#77877a', 1), 5, 4);
  line(context, [[11, 47], [width - 11, 47]], '#acb9a4', 1);
  text(context, title, 13, 22, 13, dark ? '#53474b' : '#38564d', 600);
  text(context, subtitle, 13, 41, 12, '#69756a', 400);
  rounded(context, width - 36, -7, 19, 17, 3, '#698477', '#2d5549', 1.2);
  line(context, [[width-32,-3],[width-21,-3]], '#b2c6b1', 1);
  context.restore();
}

function register(context, left, top, glass = false) {
  rounded(context, left, top, 256, 72, 8, glass ? '#a3956d' : '#6e8170', '#263e32', 1.5);
  rounded(context, left + 6, top + 6, 244, 60, 5, '#243c36', '#e2dbb29c', 1);
  text(context, 'POINTS', left + 19, top + 23, 10, '#b5c8ac', 500);
  text(context, 'TARGET', left + 157, top + 23, 10, '#b5c8ac', 500);
  for (let digit = 0; digit < 4; digit += 1) {
    rounded(context, left + 17 + digit * 26, top + 30, 23, 29, 2, glass ? '#e1e3cc' : '#eee9cc', '#102e27', .8);
    text(context, '2480'[digit], left + 28.5 + digit * 26, top + 52, 24, '#2b4940', 600, 'center', TYPE, true);
    line(context, [[left+18+digit*26, top+44],[left+38+digit*26,top+44]], '#55716030', .6);
  }
  text(context, '6,000', left + 157, top + 51, 25, '#e5dfba', 500, 'left', TYPE, true);
  screw(context, left + 7, top + 7, 2.5); screw(context, left + 249, top + 65, 2.5);
}

function baseScene(context, kind) {
  currentStudy = kind;
  diagnostics[kind] = { slots: 0, scores: [], texts: 0, croppedText: [] };
  context.setTransform(1.5, 0, 0, 1.5, 0, 0);
  context.lineCap = 'round'; context.lineJoin = 'round';
  context.fillStyle = gradient(context, 0, 0, WIDTH, HEIGHT,
    kind === 'press' ? [[0, '#f1f2e9'], [.45, '#dfe8de'], [1, '#bed1c6']] : [[0, '#d4e2e3'], [.5, '#afc8cc'], [1, '#88a9ae']]);
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const deskTop = kind === 'press' ? 807 : 819;
  context.fillStyle = gradient(context, 0, deskTop, 0, HEIGHT, [[0, kind === 'press' ? '#a2bbad' : '#668f94'], [1, kind === 'press' ? '#bfd0bd' : '#92b5b5']]);
  context.fillRect(0, deskTop, WIDTH, HEIGHT - deskTop);
  line(context, [[0, deskTop],[WIDTH,deskTop]], kind === 'press' ? '#91aa9c' : '#557f86', 2);
  grain(context, [0,0,WIDTH,HEIGHT], kind === 'press' ? 16 : 24, .045, 19000);
  text(context, 'POCKET CASCADE', 63, 64, 25, kind === 'press' ? '#315a4d' : '#284e54', 600, 'left', DISPLAY);
  text(context, 'WORKSHOP 042', 64, 87, 11, '#54766c', 500);
  text(context, 'COMMISSION 06 / CASH FLOW', WIDTH - 63, 65, 12, '#355c56', 500, 'right');
  text(context, '3 LAUNCHES REMAINING', WIDTH - 63, 85, 11, '#5a7972', 400, 'right');
  text(context, 'AIM 05', 63, HEIGHT - 38, 12, '#365c4f', 500);
  text(context, 'ART DIRECTION STUDY / NOT GAMEPLAY', WIDTH - 63, HEIGHT - 38, 10, '#426d67', 500, 'right');
}

function boardObjects(context, left, top, scale, glass = false) {
  context.save(); context.translate(left, top); context.scale(scale, scale);
  for (const slot of slots) {
    diagnostics[currentStudy].slots += 1;
    const kind = installed[slot.id];
    if (kind) {
      ellipse(context, slot.horizontal, slot.vertical + 2, 20, 19, glass ? '#e0d7a526' : '#92ad9336', glass ? '#d8e5d050' : '#60836d36', .8);
      gadget(context, kind, slot.horizontal, slot.vertical, .88, glass);
    } else {
      ellipse(context, slot.horizontal + .5, slot.vertical + 2.5, 5, 3.4, glass ? '#22434444' : '#45654c35');
      ellipse(context, slot.horizontal, slot.vertical, 3.4, 3.4, glass ? '#edf0d1' : '#bacbab', glass ? '#799b8c' : '#65816b', .8);
      ellipse(context, slot.horizontal - .8, slot.vertical - .9, 1.2, .8, '#ffffffa0');
    }
  }
  context.restore();
}

function rail(context, left, top, width, selected = 4, glass = false) {
  rounded(context, left, top, width, 30, 7, glass ? '#325857' : '#8ca696', '#315748', 1.5);
  line(context, [[left+16,top+11],[left+width-16,top+11]], '#152e29', 4);
  line(context, [[left+16,top+9],[left+width-16,top+9]], '#ddd9b7', 2.5);
  for (let lane = 0; lane < 9; lane += 1) {
    const center = left + 22 + lane * (width-44) / 8;
    line(context, [[center,top+16],[center,top+19]], '#b8ccac', .8);
    text(context, String(lane+1), center, top+44, 10, glass ? '#47695f' : '#64816f', 500, 'center');
  }
  const center = left + 22 + selected * (width-44) / 8;
  shadow(context, () => rounded(context, center-18, top-10, 36, 54, 9, '#c47b63', '#673e37', 1.5), 4, 4);
  rounded(context, center-10, top-3, 20, 29, 5, '#264e40', '#edc6a2', 1.2);
  ellipse(context, center, top+10, 7, 7, '#edcd76', '#765e36', 1);
  line(context, [[center-7,top+32],[center+7,top+32]], '#ead3a3', 2);
  shape(context, `M${center-6} ${top+42} L${center+6} ${top+42} L${center} ${top+49}Z`, '#805d48', null);
}

function collectors(context, left, top, totalWidth, glass = false) {
  const gap = 9;
  const width = (totalWidth - gap * 2) / 3;
  for (let index = 0; index < 3; index += 1) {
    const position = left + index * (width + gap);
    rounded(context, position, top, width, 58, 5, glass ? '#729993' : '#7d9b83', '#355b46', 1.5);
    rounded(context, position+7, top+6, width-14, 17, 3, '#1f3d34', '#abc1a1', 1);
    shape(context, `M${position+8} ${top+18} L${position+width-8} ${top+18} L${position+width-14} ${top+25} L${position+14} ${top+25}Z`, '#bdc8a9', '#304d3c', .6);
    text(context, index === 1 ? 'x2' : 'x1', position+width/2, top+47, 19, index === 1 ? '#fff0b9' : '#e3e9d0', 600, 'center');
    if (index === 1) line(context, [[position+width/2-15,top+52],[position+width/2+15,top+52]], '#c96446', 3);
  }
}

function launches(context, left, top, dark = false) {
  text(context, 'LAUNCHES', left, top, 10, dark ? '#cdddc4' : '#345c49', 600);
  for (let index = 0; index < 5; index += 1) {
    const position = left + 11 + index * 24;
    ellipse(context, position, top+20, 9, 9, index < 3 ? '#dbbf6d' : '#466b5755', dark ? '#b7c69b' : '#5f764b', .8);
    if (index < 3) { ellipse(context, position, top+20, 6, 6, null, '#f8e2a8', .8); line(context, [[position-2,top+18],[position+2,top+18]], '#8b783d', .8); }
  }
}

function pressStudy(context) {
  baseScene(context, 'press');
  context.save(); context.translate(-25, -2);
  shadow(context, () => ellipse(context, 837, 871, 475, 33, '#405a4c30'), 25, 9);
  shape(context, 'M519 162 Q517 111 569 109 L794 109 Q848 112 847 165', null, '#2d5146', 15);
  shape(context, 'M525 160 Q524 122 568 120 L795 120 Q837 123 839 160', null, '#8da693', 3);
  rounded(context, 402, 831, 95, 44, 13, '#294d41', '#1a392e', 2);
  rounded(context, 835, 831, 95, 44, 13, '#294d41', '#1a392e', 2);
  line(context, [[415,837],[483,837]], '#84a18c', 2);
  line(context, [[846,837],[915,837]], '#84a18c', 2);
  const hull = 'M429 166 Q455 147 516 146 L803 146 Q889 146 914 191 L937 315 L937 765 Q937 818 902 843 L448 843 Q407 829 398 788 L398 296 Q398 212 429 166Z';
  shadow(context, () => shape(context, hull, '#824a43', '#35493b', 3), 18, 13);
  const front = 'M437 157 Q475 136 522 138 L799 138 Q873 138 895 180 L922 305 L922 763 Q922 811 893 826 L450 826 Q421 814 414 782 L414 293 Q414 210 437 157Z';
  shape(context, front, gradient(context, 402, 154, 930, 840, [[0, '#dc9280'], [.23, '#c86659'], [.66, '#b95149'], [1, '#843f3c']]), '#734a40', 2);
  shape(context, 'M437 258 Q439 197 461 181 Q492 161 539 160', null, '#f3c0a0', 3);
  line(context, [[441,803],[882,803]], '#f2a58255', 2);
  context.save(); context.clip(new Path2D(front)); grain(context, [406,140,520,685], 53, .075, 9000); context.restore();
  register(context, 531, 167);
  rounded(context, 803, 178, 76, 61, 5, '#bdd0b8', '#546b55', 1.5);
  text(context, '06', 841, 210, 27, '#3d6251', 550, 'center', TYPE, true);
  text(context, 'OF 12', 841, 226, 10, '#647b61', 500, 'center');
  screw(context, 822,186,3); screw(context, 861,231,3);
  text(context, 'POCKET', 472, 194, 14, '#ffebc5', 650, 'center', DISPLAY);
  text(context, 'CASCADE', 472, 214, 13, '#ffebc5', 650, 'center', DISPLAY);
  line(context, [[446,223],[500,223]], '#733f3666', 1);
  const bezel = 'M467 258 Q454 258 452 274 L450 714 Q450 742 476 746 L859 746 Q887 742 887 714 L885 274 Q883 258 867 258Z';
  shape(context, bezel, gradient(context, 451,256,881,738,[[0,'#e5e7cb'],[.15,'#a7b89a'],[.75,'#92ab90'],[1,'#d4d9b8']]), '#3c634b', 2);
  rounded(context, 465, 276, 407, 450, 20, gradient(context,465,276,872,726,[[0,'#e0e7d5'],[.5,'#c4d8c0'],[1,'#a8c5ac']]), '#6d8b70', 2);
  context.save(); context.beginPath(); context.roundRect(467,278,403,446,18); context.clip();
  for (let rule = 294; rule < 720; rule += 10) line(context, [[470,rule],[870,rule]], '#587b5108', .7);
  shape(context, 'M492 290 L714 284 L594 723 L475 721Z', '#fcfff225', null);
  grain(context, [466,278,406,448], 29, .065, 5600); context.restore();
  rail(context, 481, 282, 375);
  boardObjects(context, 442, 263, .9);
  collectors(context, 476, 735, 386);
  text(context, 'CASH FLOW', 669, 820, 12, '#f3c6a5', 600, 'center');
  for (const [horizontal,vertical] of [[434,262],[904,262],[434,786],[904,786],[466,756],[869,756]]) screw(context,horizontal,vertical,4.3,.3);

  shape(context, 'M414 410 L359 410 Q338 410 338 439 L338 526 Q340 553 414 553Z', '#4e7464', '#2b4e40', 2);
  gear(context, 371, 459, 80, 28, true, .1);
  ellipse(context, 371, 459, 65, 65, null, '#bdd1b17a', 3);
  line(context, [[371,459],[325,480]], '#dbc487', 12);
  line(context, [[371,457],[325,478]], '#f4dfaa', 3);
  rounded(context, 306, 470, 24, 41, 9, '#a8584e', '#633d35', 2);
  line(context, [[312,479],[312,501]], '#edaa8460', 2);
  gear(context, 401, 354, 31, 12, false, -.25);
  line(context, [[382,382],[347,395]], '#496c51', 6);
  paperTag(context, 215, 588, 152, 'HAND ASSEMBLED', 'SERIES 06 / 042', -.09);
  line(context, [[293,651],[385,699]], '#5c756255', 1.5);

  shape(context, 'M932 303 L972 308 L968 719 L924 722Z', '#6a7f61', '#3d5945', 2);
  for (const vertical of [339, 666]) {
    rounded(context, 913, vertical, 87, 30, 5, '#adba90', '#4c674b', 1.5);
    for (const horizontal of [924,977]) screw(context,horizontal,vertical+15,4);
  }
  shadow(context, () => shape(context, 'M971 308 L1204 324 Q1223 327 1228 355 L1228 700 Q1225 727 1208 735 L971 719Z', '#426f5b', '#214734', 2), 13, 9);
  shape(context, 'M985 325 L1203 340 L1205 699 L985 702Z', '#abc7a7', '#41644d', 2);
  rounded(context, 1000, 349, 189, 275, 12, '#466e5a', '#d2e0b28c', 1.5);
  line(context, [[1094,361],[1094,612]], '#213f31', 3);
  line(context, [[1011,487],[1179,487]], '#213f31', 3);
  for (const [horizontal,vertical] of [[1045,420],[1142,420],[1045,548],[1142,548]]) ellipse(context,horizontal,vertical+4,36,40,'#25463255','#81a28180',1);
  gadget(context,'mint',1045,410,1.16);
  gadget(context,'fork',1142,410,1.16);
  gadget(context,'doubler',1045,541,1.15);
  gadget(context,'vault',1142,541,1.15);
  for (const [label,horizontal,vertical] of [['Mint',1045,469],['Fork',1142,469],['Doubler',1045,599],['Vault',1142,599]]) text(context,label,horizontal,vertical,13,'#e2e8cb',500,'center');
  paperTag(context, 1005, 641, 178, 'WORKSHOP CREDITS', '14 available', .022);
  text(context, 'SPARES / 04', 1094, 326, 12, '#d9e6bd', 600, 'center');
  for (const [horizontal,vertical] of [[984,331],[1209,352],[984,701],[1209,710]]) screw(context,horizontal,vertical,4);

  shadow(context, () => shape(context, 'M481 826 L856 826 L930 860 Q940 875 919 888 L452 888 Q426 880 451 861Z', '#718f72', '#355740', 2), 7, 3);
  shape(context, 'M484 830 L853 830 L903 857 L464 857Z', '#d4dac0', '#628062', 1);
  launches(context, 487, 850);
  rounded(context, 657, 833, 139, 39, 8, '#2c5745', '#8d9f73', 1.5);
  for (const [index,label] of ['1x','2x','4x'].entries()) {
    rounded(context, 665 + index*42, 839, 36, 25, 4, index === 0 ? '#c8d4ac' : '#648368', '#25482f', .8);
    text(context,label,683+index*42,856,12,index===0?'#2a503b':'#e6e8ce',600,'center');
  }
  shadow(context, () => ellipse(context, 932, 817, 55, 24, '#345845', '#244732', 2), 9, 4);
  line(context, [[931,807],[970,767]], '#5a7055', 15);
  line(context, [[933,801],[973,763]], '#d2cda0', 4);
  ellipse(context, 977, 749, 35, 26, '#9c453e', '#573a32', 2);
  ellipse(context, 977, 742, 34, 25, gradient(context,960,717,996,768,[[0,'#efb59a'],[.45,'#cb6353'],[1,'#93483f']]), '#794637', 1.5);
  text(context,'DROP',977,748,14,'#fff0cc',650,'center');
  text(context,'25 BASE',978,790,10,'#426b51',500,'center');
  context.restore();
}

function glassStudy(context) {
  baseScene(context,'glass');
  context.save(); context.translate(-18,-3);
  shadow(context, () => ellipse(context, 851, 879, 506, 33, '#203f4340'), 26, 9);
  shape(context,'M649 801 L690 783 L1017 783 L1066 811 L1100 861 Q1109 880 1083 887 L626 887 Q606 876 624 857Z',
    gradient(context,620,780,1100,890,[[0,'#596f71'],[.4,'#284d50'],[1,'#213e43']]),'#244749',2.5);
  shape(context,'M652 813 L1063 813 L1085 853 L632 853Z','#88aaa2','#c4d5b875',1.5);
  rounded(context, 650, 876, 92, 21, 6, '#244146', '#426267', 1.4);
  rounded(context, 982, 876, 92, 21, 6, '#244146', '#426267', 1.4);
  const casing = 'M665 729 Q575 626 594 429 Q610 203 777 137 Q915 82 1045 190 Q1185 309 1173 521 Q1171 730 1051 803 Q916 879 766 811 Q707 784 665 729Z';
  shadow(context,()=>shape(context,casing,gradient(context,601,170,1177,827,[[0,'#678f85'],[.3,'#416c66'],[.65,'#2c5358'],[1,'#426f68']]),'#274b4c',3),23,13);
  shape(context,'M660 702 Q604 609 616 431 Q631 224 786 162 Q914 109 1029 212 Q1150 320 1141 522 Q1138 708 1033 777 Q913 840 780 789 Q708 760 660 702Z',
    gradient(context,615,173,1142,800,[[0,'#e5dbaa'],[.25,'#a39564'],[.5,'#d7c88f'],[.78,'#7e8360'],[1,'#ddd2a0']]),'#506b59',2);
  const glassFace='M683 696 Q635 602 646 434 Q659 248 799 191 Q914 145 1012 232 Q1120 331 1111 522 Q1108 688 1015 750 Q910 807 791 759 Q726 733 683 696Z';
  shape(context,glassFace,gradient(context,680,221,1100,760,[[0,'#e3edda'],[.25,'#c3ddd0'],[.6,'#a0c7bf'],[1,'#6ba19e']]),'#315c58',2.5);
  context.save(); context.clip(new Path2D(glassFace));
  for (let position=690;position<1100;position+=48) {
    shape(context,`M${position} 191 Q${position-29} 450 ${position} 785`,null,'#4f807422',1.1);
  }
  shape(context,'M701 288 L790 243 L732 718 L692 679Z','#ffffff20',null);
  shape(context,'M1003 237 Q1076 335 1092 522 L1077 641 Q1106 412 976 213Z','#fffde92b',null);
  context.globalAlpha=.12; gear(context,1028,655,45,18,false,.4); gear(context,1019,574,31,14,true,-.2); context.globalAlpha=1;
  grain(context,[650,192,467,587],81,.055,7400);
  context.restore();

  shape(context,'M1151 591 Q1204 594 1198 627 L1178 690 Q1171 711 1138 704 L1129 688Z','#325b59','#204744',1.7);
  gear(context,1160,670,29,16,false,.13);
  gear(context,1179,621,22,12,true,-.2);
  screw(context,1147,697,3.7,.6); screw(context,1181,598,3.7,-.3);

  const arch='M682 636 Q615 438 734 271 Q802 181 899 184 Q1007 189 1073 325';
  shape(context,arch,null,'#3a615b',14);
  shape(context,arch,null,'#c5c8a0',5);
  shape(context,'M692 636 Q630 446 743 282 Q803 206 898 199',null,'#f0e2b975',2);
  shape(context,'M1070 392 Q1153 627 1011 729',null,'#315754',13);
  shape(context,'M1070 392 Q1153 627 1011 729',null,'#b7bc90',4);
  for (const [horizontal,vertical] of [[695,634],[729,277],[899,184],[1071,327],[1071,393],[1012,729]]) screw(context,horizontal,vertical,5.2,.1,'#c9c199');

  rail(context,700,259,365,4,true);
  boardObjects(context,657,233,.89,true);
  collectors(context,724,703,326,true);
  register(context,747,768,true);
  text(context,'POCKET CASCADE',892,226,18,'#46695a',650,'center',DISPLAY);
  text(context,'06 / CASH FLOW',892,246,10,'#64836a',500,'center');
  ellipse(context,1005,153,12,12,'#b38f57','#365443',2);
  line(context,[[1005,141],[1005,123]],'#5b775e',6);
  rounded(context,989,111,32,15,5,'#caba7c','#5a7154',1.5);

  const rack='M284 325 L532 267 Q554 263 566 280 L624 668 Q626 694 603 702 L345 773 Q318 777 313 753 L259 361 Q257 335 284 325Z';
  shadow(context,()=>shape(context,rack,'#60424c','#324f4c',2.5),17,12);
  shape(context,'M285 341 L529 284 L604 681 L333 751Z',gradient(context,285,320,588,728,[[0,'#97616a'],[.48,'#795360'],[1,'#533d50']]),'#af858482',2);
  context.save(); context.clip(new Path2D('M285 341 L529 284 L604 681 L333 751Z')); grain(context,[282,290,328,460],44,.10,4600);context.restore();
  for(const [horizontal,vertical] of [[558,309],[606,621]]) {
    context.save();context.translate(horizontal,vertical);context.rotate(-.17);
    rounded(context,-5,0,53,30,4,'#b7a774','#34554a',1.3);
    for(const position of [2,44])screw(context,position,15,3.5);
    context.restore();
  }
  context.save();context.translate(312,361);context.rotate(-.16);
  text(context,'THE PARTS RACK',0,0,14,'#f1e1bf',600);
  line(context,[[0,10],[187,10]],'#bc9382',1);
  for(const [index,kind] of ['mint','fork','doubler','vault'].entries()) {
    const centerX=index%2?155:48; const centerY=index<2?83:240;
    rounded(context,centerX-38,centerY-39,77,89,8,'#492f3c66','#b78c7680',1.1);
    rounded(context,centerX-27,centerY+25,54,15,3,'#705747','#baaa7766',1.2);
    gadget(context,kind,centerX,centerY,1.14,true);
    text(context,kind==='fork'?'Fork':kind[0].toUpperCase()+kind.slice(1),centerX,centerY+65,13,'#f0dfc7',500,'center');
  }
  text(context,'04 SPARES',0,345,11,'#ddc6b6',500);
  text(context,'14 CREDITS',208,345,11,'#ddc6b6',600,'right');
  context.restore();
  paperTag(context,280,220,218,'WORKSHOP 042','9 / 10 PARTS INSTALLED',-.045,true);

  launches(context,681,847,true);
  rounded(context,1026,818,84,36,7,'#2c5251','#809d88',1.4);
  text(context,'1x',1068,842,15,'#eadcb0',600,'center');
  text(context,'SPEED',1068,865,9,'#b1c5aa',500,'center');
  shape(context,'M1170 536 L1232 564 L1219 579 L1164 556Z','#9c9868','#38594d',1.7);
  gear(context,1191,544,28,13,false,.08);
  line(context,[[1191,544],[1233,515]],'#d6c082',9);
  ellipse(context,1243,507,21,21,'#af6256','#593f3c',2);
  ellipse(context,1240,502,18,18,'#d7816c','#e5b993',1);
  text(context,'DROP',1243,553,12,'#325955',650,'center');
  text(context,'25 BASE',1243,571,10,'#527a70',400,'center');

  context.save();context.translate(390,850);context.rotate(-.15);
  shape(context,'M-47 -1 L37 -1 L47 -8 L63 -4 L67 5 L53 16 L41 12 L33 6 L-47 6Z','#cfceaa','#456253',1.3);
  rounded(context,-54,-6,60,17,4,'#496f66','#2a514a',1.2);
  line(context,[[-47,-1],[-9,-1]],'#b1ccac66',1.3);
  context.restore();
  gear(context,494,855,24,12,false,.27);
  screw(context,531,872,5,.4); screw(context,539,846,4,-.4);
  context.restore();
}

function selectStudy(id) {
  document.getElementById('press-study').hidden=id!=='press';
  document.getElementById('glass-study').hidden=id!=='glass';
  for(const button of document.querySelectorAll('[data-study]')) button.setAttribute('aria-pressed',String(button.dataset.study===id));
  const url=new URL(location.href);url.searchParams.set('study',id);history.replaceState(null,'',url);
}

async function render() {
  await Promise.all([document.fonts.load(`500 14px ${TYPE}`),document.fonts.load(`600 25px ${DISPLAY}`)]);
  for(const [id,draw] of [['press',pressStudy],['glass',glassStudy]]) {
    const canvas=document.getElementById(`${id}-canvas`);
    const context=canvas.getContext('2d');
    if(!context) throw new Error('Canvas is unavailable.');
    draw(context);
  }
  for(const button of document.querySelectorAll('[data-study]'))button.addEventListener('click',()=>selectStudy(button.dataset.study));
  selectStudy(new URLSearchParams(location.search).get('study')==='glass'?'glass':'press');
  document.getElementById('status').hidden=true;
  window.artStudies={ready:true,diagnostics};
}

render().catch(error=>{document.getElementById('status').textContent=`The studies could not be drawn: ${error.message}`;throw error;});