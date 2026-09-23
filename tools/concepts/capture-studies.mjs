import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const directory=path.join(path.dirname(fileURLToPath(import.meta.url)),'previews','round-two');
const origin=process.env.CONCEPT_ORIGIN??'http://127.0.0.1:5173';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
const results=[];
const errors=[];
const stills={};
try {
  const context=await browser.newContext({viewport:{width:1600,height:1150},deviceScaleFactor:1});
  await context.addInitScript(()=>{
    const denied=()=>{throw new Error('Art study accessed player storage.');};
    Storage.prototype.getItem=denied;Storage.prototype.setItem=denied;Storage.prototype.removeItem=denied;Storage.prototype.clear=denied;
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().startsWith('http')&&new URL(request.url()).origin!==origin)errors.push(`External request: ${request.url()}`);});
  await page.goto(`${origin}/tools/concepts/studies.html`);
  await page.waitForFunction(()=>window.artStudies?.ready===true);
  const measurements=await page.evaluate(()=>window.artStudies.diagnostics);
  const names={press:'curio-press',glass:'glass-engine'};
  for(const id of ['press','glass']) {
    assert.equal(measurements[id].slots,46);
    assert.ok(measurements[id].scores.every(item=>item.size<=28),'Score type exceeds the restrained design limit.');
    assert.deepEqual(measurements[id].croppedText,[],'Text is clipped by an illustration edge.');
    const data=await page.locator(`#${id}-canvas`).evaluate(canvas=>canvas.toDataURL('image/png'));
    const bytes=Buffer.from(data.split(',')[1],'base64');
    const stats=await sharp(bytes).stats();
    assert.ok(stats.channels.slice(0,3).every(channel=>channel.stdev>20),'Flat or blank artwork.');
    await sharp(bytes).webp({quality:90}).toFile(path.join(directory,`${names[id]}.webp`));
    const detail=id==='press'?{left:1365,top:450,width:465,height:640}:{left:395,top:440,width:510,height:685};
    await sharp(bytes).extract(detail).png().toFile(path.join(directory,`${names[id]}-detail.png`));
    results.push({id,file:`${names[id]}.webp`,width:2400,height:1500,slots:measurements[id].slots,largestScore:Math.max(...measurements[id].scores.map(item=>item.size)),texts:measurements[id].texts,croppedText:measurements[id].croppedText});
    stills[id]=bytes;
  }
  const tiles=await Promise.all(Object.keys(names).map(async(id,index)=>({input:await sharp(stills[id]).resize(1200,750).toBuffer(),left:0,top:index*750})));
  await sharp({create:{width:1200,height:1500,channels:3,background:'#e6e9e4'}}).composite(tiles).png().toFile(path.join(directory,'comparison.png'));
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:width===1440?1040:844});
    for(const id of ['press','glass']) {
      await page.getByRole('button',{name:id==='press'?'A / The Curio Press':'B / The Glass Engine',exact:true}).click();
      const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,active:document.querySelector('nav button[aria-pressed="true"]').dataset.study}));
      assert.equal(state.active,id);assert.ok(state.scrollWidth<=width,'Viewer overflow');
      await page.screenshot({path:path.join(directory,`${names[id]}-viewer-${width}.png`),fullPage:true});
    }
  }
  assert.deepEqual(errors,[]);
  await writeFile(path.join(directory,'validation.json'),JSON.stringify({generatedAt:new Date().toISOString(),results,errors,storage:'blocked',boundary:'Original art-first stills; not a playable game or mobile layout proposal.'},null,2));
  console.log('Rendered two 2400x1500 original art studies: 46 sockets each, compact score type, local-only resources, no storage access; desktop/mobile viewer checks passed.');
} finally {await browser.close();}