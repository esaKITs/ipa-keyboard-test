'use strict';
const {chromium}=require('playwright'),{PNG}=require('pngjs'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out='audit-output/v065-ink';fs.mkdirSync(out,{recursive:true});
const detect=(png,x0,x1,y0,y1)=>{let n=0,minY=Infinity,maxY=-Infinity;for(let y=Math.max(0,Math.floor(y0));y<Math.min(png.height,Math.ceil(y1));y++)for(let x=Math.max(0,Math.floor(x0));x<Math.min(png.width,Math.ceil(x1));x++){const i=(y*png.width+x)*4;if(png.data[i]<145&&png.data[i+1]<145&&png.data[i+2]<145&&png.data[i+3]>180){n++;minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}return {count:n,minY,maxY};};
(async()=>{const browser=await chromium.launch({headless:true});try{
const result=[];
for(const width of [1280,390]){
const page=await browser.newPage({viewport:{width,height:1300},deviceScaleFactor:3});
const url=process.env.PUBLIC_BASE?process.env.PUBLIC_BASE+'/vowel-release-v0.2.65/':'file://'+path.resolve('vowel-release-v0.2.65/index.html');
const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});if(process.env.PUBLIC_BASE)assert.equal(response.status(),200);
await Promise.race([page.evaluate(()=>document.fonts.ready),page.waitForTimeout(3500)]);
const details=await page.evaluate(()=>{const root=document.querySelector('#nonPulmonicConsonants'),rows=[...root.querySelectorAll('tbody tr')],table=root.querySelector('table');const R=e=>{let q=e.getBoundingClientRect();return {x:q.x,y:q.y,width:q.width,height:q.height,bottom:q.bottom,right:q.right}};return {version:document.querySelector('#appVersion').textContent.trim(),fontLoaded:document.fonts.check('32px "Doulos SIL Local"'),table:R(table),root:R(root),rows:rows.map(r=>({rect:R(r),cells:[...r.cells].map(c=>({text:c.textContent.trim(),rect:R(c),font:getComputedStyle(c).font,paddingBottom:getComputedStyle(c).paddingBottom}))}))};});
assert.equal(details.version,'0.2.65');assert(details.fontLoaded);assert.equal(details.rows.length,5);const clicks=['ʘ','ǀ','ǃ','ǂ','ǁ'];clicks.forEach((v,i)=>assert.equal(details.rows[i].cells[0].text,v));
const measurements=[];
for(let i=0;i<5;i++){
 const cell=page.locator('#nonPulmonicConsonants tbody tr').nth(i).locator('td').first();
 const bytes=await cell.screenshot({timeout:15000,animations:'disabled'}),png=PNG.sync.read(bytes);
 const measured=detect(png,Math.ceil(png.width*.25),Math.floor(png.width*.75),2,png.height-2);
 const gap=(png.height-1-measured.maxY)/3;
 const r={glyph:clicks[i],cellPixels:{w:png.width,h:png.height},inkPixelBottom:measured.maxY,inkBottomGapCSS:gap,inkCount:measured.count};
 assert(measured.count>10,'Missing rendered glyph '+clicks[i]);
 assert(gap>=2,'Rendered ink too close to lower border for '+clicks[i]+': '+gap);
 measurements.push(r);
 fs.writeFileSync(`${out}/click-${i+1}-${width}.png`,bytes);
}
const last=details.rows[4].cells[0].rect;const tab=details.table;
const clip={x:Math.max(0,last.x+last.width*.15),y:Math.max(0,tab.bottom-12),width:last.width*.7,height:20};
const bytes=await page.screenshot({clip,animations:'disabled'}),png=PNG.sync.read(bytes);
const borderY=(tab.bottom-clip.y)*3;
const spill=detect(png,3,png.width-3,borderY+5,png.height);
assert.equal(spill.count,0,'Dark glyph ink extends beneath table bottom border');
fs.writeFileSync(`${out}/last-row-border-${width}.png`,bytes);
fs.writeFileSync(`${out}/section-${width}.png`,await page.locator('#nonPulmonicConsonants').screenshot({timeout:15000,animations:'disabled'}));
result.push({viewport:width,measurements,spillPixels:spill.count,table:tab,version:details.version});
await page.close();
}
fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log('INK-BOUNDARY CHECK PASS',JSON.stringify(result.map(r=>({viewport:r.viewport,gaps:r.measurements.map(x=>[x.glyph,x.inkBottomGapCSS]),spillPixels:r.spillPixels}))));
}finally{await browser.close()}})().catch(e=>{console.error('INK AUDIT FAILED',e);process.exit(1)});
