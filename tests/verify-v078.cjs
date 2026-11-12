'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out='audit-output/v078';fs.mkdirSync(out,{recursive:true});
const prev=fs.readFileSync('vowel-release-v0.2.77/index.html','utf8'),now=fs.readFileSync('vowel-release-v0.2.78/index.html','utf8');
const marker='</style></head>';
const extra='\n/* v0.2.78 final positioning: no panel overlap; keep diacritics 68% of chart. */\n#chart>.ipa-pdf-right>#tonesAndWordAccents{width:305px;align-self:flex-end}\n#chart #tonesAndWordAccents table{width:100%;max-width:100%;table-layout:fixed}\n#chart #tonesAndWordAccents tbody th{overflow-wrap:anywhere;padding-left:1px;padding-right:1px}\n';
assert.equal(now,prev.replaceAll('0.2.77','0.2.78').replace(marker,extra+marker),'Unexpected edits');
const rect=e=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
(async()=>{const browser=await chromium.launch({headless:true});try{
const results=[];
for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:1300},deviceScaleFactor:2});
 let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve('vowel-release-v0.2.78/index.html'),{waitUntil:'domcontentloaded',timeout:25000});
 await Promise.race([page.evaluate(()=>document.fonts.ready),page.waitForTimeout(4000)]);
 const d=await page.evaluate(()=>{
  const R=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
  const di=document.querySelector('#diacritics'),table=di.querySelector('table'),chart=document.querySelector('#chart'),scale=R(chart).width/1040;
  return {version:document.querySelector('#appVersion').textContent.trim(),scale,section:R(di),table:R(table),
   cells:[...di.querySelectorAll('tbody td')].map(e=>({text:e.textContent.trim(),font:getComputedStyle(e).fontSize,scroll:e.scrollWidth,client:e.clientWidth,rect:R(e)})),
   other:['vowels','suprasegmentals','tonesAndWordAccents','otherSymbols'].map(id=>({id,rect:R(document.getElementById(id))})),fontLoaded:document.fonts.check('32px "Doulos SIL Local"')};
 });
 fs.writeFileSync(`${out}/metrics-${width}.json`,JSON.stringify(d,null,2));
 await page.locator('#diacritics').screenshot({path:`${out}/diacritics-${width}.png`,animations:'disabled',timeout:15000});
 results.push({viewport:width,width:d.section.width/d.scale,actualTableWidth:d.table.width/d.scale,version:d.version,overflows:d.cells.filter(c=>c.scroll>c.client+2).map(c=>c.text),collisions:d.other.filter(o=>d.section.x<o.rect.right-1&&d.section.right>o.rect.x+1&&d.section.y<o.rect.bottom-1&&d.section.bottom>o.rect.y+1).map(x=>x.id),fontCounts:[...new Set(d.cells.map(c=>c.font))],tonePanelWidth:d.other.find(o=>o.id==='tonesAndWordAccents').rect.width/d.scale,issues:errors});
 await page.close();
}
console.log('V076 MEASUREMENT',JSON.stringify(results));
fs.writeFileSync(out+'/summary.json',JSON.stringify(results,null,2));
assert(results.every(d=>d.version==='0.2.78'),'Version mismatch');
assert(results.every(d=>Math.abs(d.width-707)<.2),'Section width not 707px');
assert(results.every(d=>Math.abs(d.actualTableWidth-707)<.2),'Table width not 707px');
assert(results.every(d=>d.fontCounts.length===1&&d.fontCounts[0]==='32px'),'Glyph font not 32px');
assert(results.every(d=>d.overflows.length===0),'Cell content overflows');
assert(results.every(d=>d.collisions.length===0),'Sections overlap');
assert(results.every(d=>Math.abs(d.tonePanelWidth-305)<.2),'Tone panel should remain beside 707px diacritics');
assert(results.every(d=>d.issues.length===0),'Page errors');
console.log('V076 DIACRITICS CHECK PASSED');
}finally{await browser.close()}})().catch(e=>{console.error('V076 FAILED',e);process.exit(1)});
