'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out='audit-output/v071';fs.mkdirSync(out,{recursive:true});
const before=fs.readFileSync('vowel-release-v0.2.69/index.html','utf8'),after=fs.readFileSync('vowel-release-v0.2.71/index.html','utf8');
assert.equal(after.match(/id="stressExample"/g)?.length,1);
assert(after.includes('aria-label="バージョン0.2.71">0.2.71</span>'));
assert(after.includes('#chart #suprasegmentals table{table-layout:fixed;width:281px}'));
(async()=>{const browser=await chromium.launch({headless:true});try{
const report=[];
for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:1200},deviceScaleFactor:3});
 const issues=[];page.on('pageerror',e=>issues.push(e.message));
 const url='file://'+path.resolve('vowel-release-v0.2.71/index.html');
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
 await Promise.race([page.evaluate(()=>document.fonts.ready),page.waitForTimeout(4000)]);
 const data=await page.evaluate(()=>{
  const q=id=>document.getElementById(id),rect=e=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
  const supr=q('suprasegmentals'), rows=[...supr.querySelectorAll('tbody tr')],chart=q('chart'),scale=rect(chart).width/1040;
  return {version:q('appVersion').textContent.trim(),scale,root:rect(supr),vowels:rect(q('vowels')),table:rect(supr.querySelector('table')),
  rows:rows.map(row=>({rect:rect(row),cells:[...row.cells].map(c=>({tag:c.tagName,text:c.textContent.trim(),colspan:c.colSpan,font:getComputedStyle(c).fontSize,rect:rect(c),scrollWidth:c.scrollWidth,clientWidth:c.clientWidth}))})),
  siblings:['vowels','diacritics','tonesAndWordAccents'].map(id=>({id,rect:rect(q(id))})),
  fontLoaded:document.fonts.check('22px "Doulos SIL Local"')};
 });
 assert.equal(data.version,'0.2.71');assert(data.fontLoaded);
 assert.equal(data.rows.length,9,'Expected nine rows after moving stress example into first row');
 assert.equal(data.rows[0].cells.length,3);
 assert.equal(data.rows[0].cells[2].text,'ˌfoʊnəˈtɪʃən');
 assert.equal(data.rows[0].cells[2].font,'17px');
 assert.equal(data.rows[0].cells[0].text,'ˈ');assert.equal(data.rows[1].cells[0].text,'ˌ');
 assert.equal(data.rows[0].cells[0].font,'22px');
 assert(Math.abs(data.root.width/data.scale-281)<.2,'Width should be 281 chart px');
 assert(Math.abs(data.root.x-data.vowels.x)/data.scale<.25,'Section should start at vowel chart left edge');
 assert(data.rows.every(r=>r.rect.height>0));
 assert(data.rows[1].cells[0].font==='22px');
 const shifts=await page.evaluate(()=>{
 const rows=[...document.querySelectorAll('#suprasegmentals tbody tr')];
 return {secondary:getComputedStyle(rows[1].cells[0]).top,undertie:getComputedStyle(rows[rows.length-1].cells[0]).top,bottomPadding:getComputedStyle(rows[rows.length-1].cells[0]).paddingBottom};
 });
 assert.equal(shifts.secondary,'-7px');assert.equal(shifts.undertie,'-8px');assert.equal(shifts.bottomPadding,'8px');
 const collisions=[];
 for(const row of data.rows){for(let i=0;i<row.cells.length;i++)for(let j=i+1;j<row.cells.length;j++){
 const a=row.cells[i].rect,b=row.cells[j].rect;
 if(a.right>b.x+0.3 && b.right>a.x+0.3)collisions.push([row.cells[i].text,row.cells[j].text]);
 }}
 assert.equal(collisions.length,0,'Cell boxes overlap');
 const overflows=data.rows.flatMap((r,i)=>r.cells.filter(c=>c.scrollWidth>c.clientWidth+2).map(c=>({i,text:c.text,scroll:c.scrollWidth,client:c.clientWidth})));
 assert.equal(overflows.length,0,'Content overflow: '+JSON.stringify(overflows));
 assert.equal(issues.length,0,issues.join(';'));
 await page.locator('#suprasegmentals').screenshot({path:`${out}/suprasegmentals-${width}.png`,animations:'disabled'});
 await page.locator('#vowels').screenshot({path:`${out}/vowels-${width}.png`,animations:'disabled'});
 fs.writeFileSync(`${out}/measurements-${width}.json`,JSON.stringify({...data,overflows,issues},null,2));
 report.push({viewport:width,sectionWidthCSS:data.root.width/data.scale,alignedToVowels:true,rows:data.rows.length,fontPrimary:data.rows[0].cells[0].font,stressExampleOnFirstLine:true,overflowCount:overflows.length,shifts});
 await page.close();
}
fs.writeFileSync(out+'/summary.json',JSON.stringify(report,null,2));console.log('V070 LAYOUT AUDIT PASSED',JSON.stringify(report));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
