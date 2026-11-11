const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert').strict;
const base=fs.readFileSync('vowel-release-v0.2.60/index.html','utf8');
const test=fs.readFileSync('pulmonic-bottom-trial/index.html','utf8');
const patch='\n/* Pulmonic only: add glyph-bottom breathing room without creating a white gap below gray impossible spans. */\n#chart #pulmonicConsonants tbody td > span{padding-bottom:3px}\n/* Pulmonic place-of-articulation header: restore breathing room independently of body rows. */\n#chart #pulmonicConsonants thead th{padding-top:4px;padding-bottom:4px}';
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
      glyphPadding:[...new Set([...table.querySelectorAll('tbody td > span')].map(x=>style(x).paddingBottom))],
      graySpanPadding:[...new Set([...table.querySelectorAll('span.impossible')].map(x=>style(x).paddingBottom))],
      headerTop:[...new Set([...table.querySelectorAll('thead th')].map(x=>style(x).paddingTop))],
      headerBottom:[...new Set([...table.querySelectorAll('thead th')].map(x=>style(x).paddingBottom))],
      tableWidth:table.getBoundingClientRect().width,chartWidth:document.querySelector('#chart').getBoundingClientRect().width};
   });
   assert(data.cellCount>30,'Missing pulmonic cells');
   assert.deepEqual(data.bottoms,['0px'],'Cell padding must stay zero so gray spans reach bottom');
   assert.deepEqual(data.glyphPadding,['3px'],'Glyph bottom padding absent');
   assert.deepEqual(data.graySpanPadding,['3px'],'Gray impossible span padding absent');
   assert.deepEqual(data.headerTop,['4px'],'Place header top padding not restored');
   assert.deepEqual(data.headerBottom,['4px'],'Place header bottom padding not restored');
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
