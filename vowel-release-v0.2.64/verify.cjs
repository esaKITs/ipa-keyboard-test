'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out=process.env.ARTIFACT_DIR||'audit-output/v064';fs.mkdirSync(out,{recursive:true});
const base=fs.readFileSync('vowel-release-v0.2.63/index.html','utf8'),candidate=fs.readFileSync('vowel-release-v0.2.64/index.html','utf8');
const extra='\n/* v0.2.64: restore clearance around the five click symbols and their labels only. */\n#chart #nonPulmonicConsonants tbody tr > :nth-child(-n+2){padding-top:6px;padding-bottom:7px;line-height:1.25;vertical-align:middle}';
assert(base.includes('#chart #nonPulmonicConsonants :is(td,th){padding-top:0;padding-bottom:0}'));
assert.equal(candidate,base.replaceAll('v0.2.63','v0.2.64').replace('#chart #nonPulmonicConsonants :is(td,th){padding-top:0;padding-bottom:0}', '#chart #nonPulmonicConsonants :is(td,th){padding-top:0;padding-bottom:0}'+extra),'Unexpected changes to prior version');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:1100},deviceScaleFactor:2});
  const pair=[];
  for(const version of ['63','64']){
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const url=process.env.PUBLIC_BASE?process.env.PUBLIC_BASE+'/vowel-release-v0.2.'+version+'/':'file://'+path.resolve('vowel-release-v0.2.'+version+'/index.html');
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});if(process.env.PUBLIC_BASE)assert.equal(response.status(),200);
   await Promise.race([page.evaluate(()=>document.fonts.ready),page.waitForTimeout(3000)]);
   const data=await page.evaluate(()=>{
    const root=document.querySelector('#nonPulmonicConsonants'),rows=[...root.querySelectorAll('tbody tr')],r=e=>{const x=e.getBoundingClientRect();return {x:x.x,y:x.y,right:x.right,bottom:x.bottom,width:x.width,height:x.height}},cs=e=>getComputedStyle(e);
    const table=root.querySelector('table'),scale=document.querySelector('#chart').getBoundingClientRect().width/1040;
    return {version:document.querySelector('#appVersion')?.textContent?.trim(),table:r(table),scale,rows:rows.map(row=>({rect:r(row),cells:[...row.children].map(cell=>({text:cell.textContent.trim(),rect:r(cell),paddingTop:cs(cell).paddingTop,paddingBottom:cs(cell).paddingBottom,fontSize:cs(cell).fontSize,lineHeight:cs(cell).lineHeight}))})),fontLoaded:document.fonts.check('32px "Doulos SIL Local"')};
   });
   assert.equal(data.rows.length,5);assert(data.fontLoaded,'IPA font missing');assert.equal(errors.length,0,errors.join(';'));
   const glyphs=['ʘ','ǀ','ǃ','ǂ','ǁ'];for(let i=0;i<5;i++)assert.equal(data.rows[i].cells[0].text,glyphs[i]);
   if(version==='64'){
    for(let i=0;i<5;i++){const [glyph,label]=data.rows[i].cells;assert.equal(glyph.paddingTop,'6px');assert.equal(glyph.paddingBottom,'7px');assert.equal(label.paddingTop,'6px');assert.equal(label.paddingBottom,'7px');assert(glyph.rect.height>20,'Click row too short');}
    const last=data.rows[4].cells[0];assert(last.rect.bottom<=data.table.bottom+0.25,'Last click cell overflows table');
   }
   await page.locator('#nonPulmonicConsonants').screenshot({path:`${out}/v0.2.${version}-${width}.png`,timeout:12000,animations:'disabled'});
   fs.writeFileSync(`${out}/v0.2.${version}-${width}.json`,JSON.stringify({url,errors,...data},null,2));pair.push(data);
  }
  const [before,after]=pair;for(let i=0;i<5;i++){
   assert(after.rows[i].cells[0].rect.height>before.rows[i].cells[0].rect.height+5,'Click rows did not gain clearance');
   assert(Math.abs(after.rows[i].cells[0].rect.width-before.rows[i].cells[0].rect.width)<.1,'Click widths changed');
  }
  results.push({width,version:'0.2.64',clickRows:5,extraCellHeight:after.rows[0].cells[0].rect.height-before.rows[0].cells[0].rect.height,sourceChangeRestricted:true,allChecksPassed:true});
  await page.close();
 }
 await browser.close();fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log('CLICK ROW VERIFICATION PASSED',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
