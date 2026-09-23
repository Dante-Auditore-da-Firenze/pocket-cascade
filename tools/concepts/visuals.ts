import { SLOTS, type Board, type Peg } from '../../src/game/model';

export type Direction = 'toy' | 'arcade' | 'paper' | 'instrument';
export const themes = {
  toy: { background: '#c5d8d1', surface: '#eff1e6', ink: '#243b38', muted: '#61736a', accent: '#d54032', secondary: '#14665c', highlight: '#f1c64e', border: '#94aaa0', field: '#dce5d4' },
  arcade: { background: '#151614', surface: '#242623', ink: '#f0f1e7', muted: '#a2a99a', accent: '#eaff58', secondary: '#ff675e', highlight: '#a6eee1', border: '#545a4c', field: '#171c18' },
  paper: { background: '#e9edf0', surface: '#fbfbf6', ink: '#203c66', muted: '#697c91', accent: '#dc4734', secondary: '#346baf', highlight: '#f4cf51', border: '#bac8d3', field: '#f5f6ee' },
  instrument: { background: '#ced3d5', surface: '#e9eded', ink: '#262e30', muted: '#647175', accent: '#db4236', secondary: '#386778', highlight: '#cbdced', border: '#a0aaad', field: '#ecf1f0' },
} as const;

function disc(context: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string, stroke?: string, width = 1) {
  context.beginPath(); context.arc(x,y,radius,0,Math.PI*2); context.fillStyle=fill; context.fill();
  if(stroke) { context.strokeStyle=stroke; context.lineWidth=width; context.stroke(); }
}
function plate(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string, line = 1) {
  context.beginPath(); context.roundRect(x,y,width,height,radius); context.fillStyle=fill; context.fill();
  if(stroke) { context.strokeStyle=stroke; context.lineWidth=line; context.stroke(); }
}

export function paintPart(context: CanvasRenderingContext2D, part: Peg, direction: Direction) {
  const theme=themes[direction];
  const color=part.kind==='mint'||part.kind==='relay'? (direction==='arcade'?'#abefd2':'#277f68')
    :part.kind==='doubler'||part.kind==='dividend'? '#efbd49' :part.kind==='splitter'?'#e6604d':part.kind==='vault'?'#86b6c4':'#c88e76';
  const dark=direction==='arcade'?'#070a07':theme.ink;
  context.save();
  context.lineJoin='round'; context.lineCap='round';
  if(direction==='paper') context.rotate(-.07);
  const shape=new Path2D();
  if(part.kind==='mint') shape.roundRect(-19,-21,38,42,direction==='toy'?8:3);
  else if(part.kind==='doubler') { shape.moveTo(0,-24); shape.lineTo(24,0); shape.lineTo(0,24); shape.lineTo(-24,0); shape.closePath(); }
  else if(part.kind==='splitter') { shape.moveTo(-22,-20); shape.lineTo(0,-9); shape.lineTo(22,-20); shape.lineTo(22,18); shape.lineTo(10,23); shape.lineTo(0,13); shape.lineTo(-10,23); shape.lineTo(-22,18); shape.closePath(); }
  else if(part.kind==='relay') { for(let index=0;index<48;index+=1) {const angle=index*Math.PI/24;const radius=index%4<2?25:21;const x=Math.cos(angle)*radius;const y=Math.sin(angle)*radius; if(index===0)shape.moveTo(x,y);else shape.lineTo(x,y);} shape.closePath(); }
  else if(part.kind==='vault') shape.roundRect(-23,-19,46,38,5);
  else if(part.kind==='dividend') { for(let index=0;index<8;index+=1) {const angle=index*Math.PI/4+Math.PI/8;const x=Math.cos(angle)*25;const y=Math.sin(angle)*25;if(index===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath(); }
  else shape.arc(0,0,22,0,Math.PI*2);
  context.translate(0,direction==='paper'?2:4);
  context.fillStyle=direction==='paper'?'#9daabb':dark;context.fill(shape);
  context.translate(0,direction==='paper'?-2:-4);
  context.fillStyle=direction==='paper'?theme.surface:color;context.fill(shape);
  context.strokeStyle=dark;context.lineWidth=direction==='toy'?2.5:direction==='paper'?1.6:1.5;context.stroke(shape);
  if(direction==='toy'||direction==='instrument') { context.save();context.scale(.83,.83);context.strokeStyle='rgba(255,255,255,.6)';context.lineWidth=1.5;context.stroke(shape);context.restore(); }
  context.strokeStyle=direction==='paper'?theme.accent:dark;context.fillStyle=context.strokeStyle;context.lineWidth=3;
  if(part.kind==='mint') { plate(context,-12,-26,24,7,2,direction==='paper'?theme.accent:'#e0e4cd',dark,1.5);context.beginPath();context.moveTo(-9,1);context.lineTo(9,1);context.moveTo(0,-8);context.lineTo(0,10);context.stroke(); }
  if(part.kind==='doubler') { context.font='700 22px "Barlow Condensed"';context.textAlign='center';context.textBaseline='middle';context.fillText('x2',0,0); }
  if(part.kind==='splitter') {context.beginPath();context.moveTo(0,13);context.lineTo(0,0);context.lineTo(-12,-9);context.moveTo(0,0);context.lineTo(12,-9);context.stroke();disc(context,-12,-9,3,theme.surface,dark);disc(context,12,-9,3,theme.surface,dark);}
  if(part.kind==='relay') {disc(context,0,0,13,direction==='paper'?theme.surface:'#dde7cf',dark,2);disc(context,0,0,5,dark);for(let index=0;index<4;index+=1){context.save();context.rotate(index*Math.PI/2);plate(context,-2,-16,4,9,1,dark);context.restore();}}
  if(part.kind==='vault') {plate(context,-14,-13,29,26,2,direction==='paper'?theme.surface:'#a7c9cf',dark,2);disc(context,1,0,8,'transparent',dark,2);context.beginPath();context.moveTo(-4,0);context.lineTo(6,0);context.moveTo(1,-5);context.lineTo(1,5);context.stroke();plate(context,-26,-9,5,6,1,dark);plate(context,-26,5,5,6,1,dark);}
  if(part.kind==='dividend') {context.font='700 24px "Barlow Condensed"';context.textAlign='center';context.textBaseline='middle';context.fillText('$',0,0);plate(context,-12,15,24,3,1,dark);}
  if(part.tuned) {disc(context,16,20,6,theme.accent,theme.surface,1.5);context.fillStyle=theme.surface;context.font='bold 9px "DM Sans"';context.textAlign='center';context.fillText('+',16,23);}
  context.restore();
}

export function paintBoard(context: CanvasRenderingContext2D, direction: Direction, board: Board, lane: number) {
  const theme=themes[direction];
  context.setTransform(2,0,0,2,0,0);
  context.clearRect(0,0,500,650);
  context.lineCap='round';context.lineJoin='round';
  const rim=direction==='toy'?'#14665c':direction==='arcade'?'#454c3e':direction==='paper'?'#f5f6ee':'#b7c0c3';
  plate(context,3,3,494,644,direction==='toy'?26:direction==='paper'?2:8,rim,theme.ink,direction==='paper'?2:3);
  plate(context,15,92,470,457,8,theme.field,theme.ink,direction==='paper'?1:2);
  if(direction==='paper'||direction==='instrument') {context.strokeStyle=direction==='paper'?'#dbe3e8':'#dae2e2';context.lineWidth=.7;for(let position=26;position<480;position+=18){context.beginPath();context.moveTo(position,101);context.lineTo(position,541);context.stroke();}for(let position=108;position<543;position+=18){context.beginPath();context.moveTo(24,position);context.lineTo(476,position);context.stroke();}}
  plate(context,28,18,444,39,6,direction==='arcade'?'#0b0e0a':theme.surface,theme.ink,1.5);
  context.fillStyle=theme.ink;context.fillRect(44,35,412,3);
  for(let index=0;index<9;index+=1) disc(context,58+index*48,36,3,index===lane?theme.accent:theme.border);
  const head=58+lane*48;
  plate(context,head-17,15,34,45,5,theme.accent,theme.ink,2);
  plate(context,head-9,24,18,22,2,theme.ink);
  disc(context,head,33,6,theme.highlight,theme.ink,1);
  context.fillStyle=theme.accent;context.beginPath();context.moveTo(head-7,61);context.lineTo(head+7,61);context.lineTo(head,69);context.fill();
  for(const slot of SLOTS) {
    if(board[slot.id]) {disc(context,slot.x,slot.y+4,27,direction==='arcade'?'#090c08':'#b9c9bd');context.save();context.translate(slot.x,slot.y);context.scale(.83,.83);paintPart(context,board[slot.id],direction);context.restore();}
    else {disc(context,slot.x,slot.y+2,direction==='arcade'?3:5,direction==='arcade'?'#485241':theme.border);disc(context,slot.x,slot.y,3.3,direction==='paper'?theme.surface:direction==='arcade'?'#d1dfba':'#edf1e5',direction==='arcade'?undefined:theme.ink,.7);}
  }
  const collectors=[{center:100,label:'x1',width:155},{center:250,label:'x2',width:139},{center:400,label:'x1',width:155}];
  for(const [index,tray] of collectors.entries()) {plate(context,tray.center-tray.width/2,563,tray.width,58,5,index===1?theme.accent:theme.surface,theme.ink,2);plate(context,tray.center-tray.width/2+7,566,tray.width-14,13,3,theme.ink);context.font='700 25px "Barlow Condensed"';context.textAlign='center';context.fillStyle=index===1?(direction==='arcade'?'#161b10':'#fffef3'):theme.ink;context.fillText(tray.label,tray.center,608);}
  for(const [x,y] of [[13,13],[487,13],[13,637],[487,637]]) {disc(context,x,y,3.5,theme.surface,theme.ink,1);context.strokeStyle=theme.ink;context.lineWidth=1;context.beginPath();context.moveTo(x-2,y+1);context.lineTo(x+2,y-1);context.stroke();}
  context.font='500 8px "DM Sans"';context.fillStyle=theme.ink;context.textAlign='center';context.fillText('POCKET CASCADE / MECHANICAL WORKS / No. 042',250,638);
}