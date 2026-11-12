'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out='audit-output/v069';fs.mkdirSync(out,{recursive:true});
const before=fs.readFileSync('vowel-release-v0.2.68/index.html','utf8'),after=fs.readFileSync('vowel-release-v0.2.69/index.html','utf8');
const anchor='#chart #suprasegmentals :is(td,th){padding-top:0;padding-bottom:0}';
const extra='\n/* v0.2.69: suprasegmentals match 27% of the 1040px IPA chart; keep Japanese labels readable. */\n#chart>.ipa-pdf-right>#suprasegmentals{width:281px;align-self:flex-start}\n#chart #suprasegmentals tbody td.symbol{font-size:24px}\n#chart #suprasegmentals tbody td.example,#chart #suprasegmentals tbody td#stressExample{font-size:18px}';
assert.equal(after,before.replaceAll('0.2.68','0.2.69').replace(anchor,anchor+extra),'Unrequested source edits');
(async()=>{
const browser=await chromium.launch({headless:true});
try{
 const results=[];
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:1100},deviceScaleFactor:3});
  const entries=[];
  for(const version of ['68','69']){
    const errors=[],onError=e=>errors.push(e.message);page.on('pageerror',onError);
    const url='file://'+path.resolve('vowel-release-v0.2.'+version+'/index.html');
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
    await Promise.race([page.evaluate(()=>document.fonts.ready),page.waitForTimeout(3000)]);
    const data=await page.evaluate(()=>{
      const root=document.querySelector('#suprasegmentals'),chart=document.querySelector('#chart');
      const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
      const scale=rect(chart).width/1040, cells=[...root.querySelectorAll('tbody td')], labels=[...root.querySelectorAll('tbody th')];
      return {version:document.querySelector('#appVersion').textContent.trim(),scale,chart:rect(chart),root:rect(root),table:rect(root.querySelector('table')),cellCount:cells.length,labelCount:labels.length,
        symbols:[...root.querySelectorAll('td.symbol')].map(e=>({text:e.textContent,font:getComputedStyle(e).fontSize,box:rect(e)})),
        examples:[...root.querySelectorAll('td.example,td#stressExample')].map(e=>({text:e.textContent,font:getComputedStyle(e).fontSize,box:rect(e)})),
        labels:labels.map(e=>({text:e.textContent,font:getComputedStyle(e).fontSize,scroll:e.scrollWidth,client:e.clientWidth,box:rect(e)})),
        rows:[...root.querySelectorAll('tbody tr')].map(e=>({text:e.textContent.trim(),height:rect(e).height})),
        siblings:['vowels','tonesAndWordAccents','diacritics'].map(id=>({id,box:rect(document.getElementById(id))})),
        fontLoaded:document.fonts.check('24px "Doulos SIL Local"')};
    });
    assert.equal(errors.length,0,errors.join('; '));assert(data.fontLoaded);
    await page.locator('#suprasegmentals').screenshot({path:`${out}/v0.2.${version}-${width}.png`,animations:'disabled',timeout:12000});
    fs.writeFileSync(`${out}/v0.2.${version}-${width}.json`,JSON.stringify(data,null,2));
    entries.push(data);page.off('pageerror',onError);
  }
  const [a,b]=entries;assert.equal(b.version,'0.2.69');assert.equal(a.version,'0.2.68');
  const actual=b.root.width/b.scale;
  assert(Math.abs(actual-281)<0.15,'Width differs from 281 CSS px: '+actual);
  assert(Math.abs(actual/1040-.27)<.001,'Not 27% overall chart');
  assert(Math.abs(b.table.width/b.scale-281)<.15,'Table width not matched');
  assert.equal(b.symbols.length,a.symbols.length);assert.equal(b.examples.length,a.examples.length);
  assert(b.symbols.every(x=>x.font==='24px'),'Symbols must be 24px');
  assert(b.examples.every(x=>x.font==='18px'),'Examples must be 18px');
  assert(b.labels.every(x=>x.font==='11px'),'Japanese labels should remain 11px');
  assert(b.labels.every(x=>x.scroll<=x.client+1),'A Japanese label exceeds available width');
  assert(b.rows.every(x=>x.height>10),'Rows collapsed');
  for(let i=0;i<a.siblings.length;i++){for(const dim of ['x','y','width','height']){if(a.siblings[i].id==='tonesAndWordAccents'&&dim==='y')continue;assert(Math.abs(a.siblings[i].box[dim]-b.siblings[i].box[dim])<.2,'Unrelated section geometry modified: '+a.siblings[i].id+' '+dim);}}
  results.push({viewport:width,widthCSSpx:actual,overallChartRatio:actual/1040,symbols:b.symbols.length,examples:b.examples.length,labelOverflow:false,siblingsPreserved:true});
  await page.close();
 }
 fs.writeFileSync(out+'/result.json',JSON.stringify(results,null,2));
 console.log('SUPRASEGMENTAL V069 CHECK PASSED',JSON.stringify(results));
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
