const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert').strict;
const base=fs.readFileSync('vowel-release-v0.2.60/index.html','utf8');
const test=fs.readFileSync('pulmonic-bottom-trial/index.html','utf8');
const patch='\n/* Isolated trial: reserve 3px below pulmonic consonant glyphs only. */\n#chart #pulmonicConsonants tbody td{padding-bottom:3px}';
assert.equal(test.replace(patch,'').replaceAll('0.2.60-pulmonic-trial</span>','0.2.60</span>').replaceAll('バージョン0.2.60 肺気流試験','バージョン0.2.60'),base,'trial unexpectedly changes other content');
(async()=>{
 const out='audit-output/pulmonic-trial';fs.mkdirSync(out,{recursive:true});
 for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]) {
  const browser=await browserType.launch({headless:true});
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve('pulmonic-bottom-trial/index.html'));
   await page.evaluate(()=>document.fonts.ready);
   const data=await page.evaluate(()=>{
    const table=document.querySelector('#pulmonicConsonants');
    const cells=[...table.querySelectorAll('tbody td')];
    const lower=[...document.querySelectorAll('#nonPulmonicConsonants tbody td')];
    const style=e=>getComputedStyle(e);
    return {cellCount:cells.length,bottoms:[...new Set(cells.map(x=>style(x).paddingBottom))],
      top:[...new Set(cells.map(x=>style(x).paddingTop))],
      lowerBottoms:[...new Set(lower.map(x=>style(x).paddingBottom))],
      tableWidth:table.getBoundingClientRect().width,chartWidth:document.querySelector('#chart').getBoundingClientRect().width};
   });
   assert(data.cellCount>30,'Missing pulmonic cells');
   assert.deepEqual(data.bottoms,['3px'],'Trial padding absent');
   assert.deepEqual(data.top,['0px'],'Top padding changed');
   assert.deepEqual(data.lowerBottoms,['0px'],'Other table affected');
   assert.deepEqual(errors,[],'Page errors');
   await page.screenshot({path:`${out}/${engine}-${width}.png`,fullPage:true});
   console.log(JSON.stringify({engine,width,...data,errors}));
   await page.close();
  }
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
