'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out='audit-output/v065';fs.mkdirSync(out,{recursive:true});
const old=fs.readFileSync('vowel-release-v0.2.64/index.html','utf8');
const now=fs.readFileSync('vowel-release-v0.2.65/index.html','utf8');
assert.equal(now,old.replaceAll('v0.2.64','v0.2.65').replaceAll('0.2.63','0.2.65'),'Unrequested source change');
assert(now.includes('aria-label="バージョン0.2.65">0.2.65</span>'));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const results=[];
 for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:1100},deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const url=process.env.PUBLIC_BASE?process.env.PUBLIC_BASE+'/vowel-release-v0.2.65/':'file://'+path.resolve('vowel-release-v0.2.65/index.html');
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});if(process.env.PUBLIC_BASE)assert.equal(response.status(),200);
   await Promise.race([page.evaluate(()=>document.fonts.ready),page.waitForTimeout(3000)]);
   const d=await page.evaluate(()=>{
      const root=document.querySelector('#nonPulmonicConsonants'),table=root.querySelector('table'),rows=[...root.querySelectorAll('tbody tr')];
      const r=e=>{const x=e.getBoundingClientRect();return {top:x.top,bottom:x.bottom,height:x.height,width:x.width}};
      return {version:document.querySelector('#appVersion')?.textContent.trim(),aria:document.querySelector('#appVersion')?.getAttribute('aria-label'),title:document.title,scale:document.querySelector('#chart').getBoundingClientRect().width/1040,table:r(table),rows:rows.map(e=>({cells:[...e.children].map(c=>({text:c.textContent.trim(),box:r(c),paddingTop:getComputedStyle(c).paddingTop,paddingBottom:getComputedStyle(c).paddingBottom}))}))};
   });
   assert.equal(d.version,'0.2.65','On-page version label does not match release');
   assert.equal(d.aria,'バージョン0.2.65');
   assert(d.title.includes('v0.2.65'),'Document title mismatch');
   assert.equal(d.rows.length,5);
   ['ʘ','ǀ','ǃ','ǂ','ǁ'].forEach((v,i)=>assert.equal(d.rows[i].cells[0].text,v));
   for(const row of d.rows){for(const cell of row.cells.slice(0,2)){assert.equal(cell.paddingTop,'6px');assert.equal(cell.paddingBottom,'7px');assert(cell.box.height/d.scale>20);}}
   assert(d.rows[4].cells[0].box.bottom<=d.table.bottom+0.25,'Bottom cell beyond border');
   assert.equal(errors.length,0,errors.join('; '));
   await page.locator('#nonPulmonicConsonants').screenshot({path:`${out}/non-pulmonic-${width}.png`,timeout:12000,animations:'disabled'});
   fs.writeFileSync(`${out}/inspection-${width}.json`,JSON.stringify(d,null,2));
   results.push({width,version:d.version,clickRows:5,screenVersionMatches:true});
   await page.close();
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log('V065 VISUAL LABEL CHECK PASS',JSON.stringify(results));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
