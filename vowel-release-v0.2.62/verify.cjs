const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
(async()=>{
  const browser=await chromium.launch({headless:true});
  const out='audit-output/v062';fs.mkdirSync(out,{recursive:true});
  for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('file://'+path.resolve('vowel-release-v0.2.62/index.html'));
    await page.evaluate(()=>document.fonts.ready);
    const data=await page.evaluate(()=>{
      const table=document.querySelector('#pulmonicConsonants');
      const rect=e=>e.getBoundingClientRect(),style=e=>getComputedStyle(e);
      const td=[...table.querySelectorAll('tbody td')], th=[...table.querySelectorAll('thead th')];
      const spans=[...table.querySelectorAll('tbody td > span')];
      const grays=[...table.querySelectorAll('tbody td > span.impossible')];
      const borderGaps=grays.map(x=>({glyph:x.textContent.trim(),gap:rect(x.parentElement).bottom-rect(x).bottom}));
      const overflow=spans.map(x=>({glyph:x.textContent.trim(),gap:rect(x.parentElement).bottom-rect(x).bottom})).filter(x=>x.gap < -0.6);
      return {version:document.querySelector('#appVersion')?.textContent,
        tableCells:td.length,glyphCount:spans.length,grayCount:grays.length,
        cellPadding:[...new Set(td.map(x=>style(x).paddingBottom))],
        spanPadding:[...new Set(spans.map(x=>style(x).paddingBottom))],
        headerTop:[...new Set(th.map(x=>style(x).paddingTop))],
        headerBottom:[...new Set(th.map(x=>style(x).paddingBottom))],
        grayBottomGaps:borderGaps,overflow};
    });
    await page.locator('#pulmonicConsonants').screenshot({path:`${out}/chromium-${width}-pulmonic.png`});
    fs.writeFileSync(`${out}/chromium-${width}.json`,JSON.stringify(data,null,2));
    console.log('PULMONIC_RENDER',width,JSON.stringify(data));
    assert.equal(data.version,'0.2.62','Version must appear in UI');
    assert(data.tableCells>50 && data.glyphCount>50 && data.grayCount>0,'Table data missing');
    assert.deepEqual(data.cellPadding,['0px'],'Cell padding causes gray-cell white strips');
    assert.deepEqual(data.spanPadding,['3px'],'Glyph bottom space missing');
    assert.deepEqual(data.headerTop,['4px'],'Place header top padding missing');
    assert.deepEqual(data.headerBottom,['4px'],'Place header bottom padding missing');
    assert(data.grayBottomGaps.every(x=>x.gap<=1.5),'Gray spans fail to reach bottom');
    assert.equal(data.overflow.length,0,'Glyph spans overflow below cell border');
    assert.deepEqual(errors,[],'Javascript errors');
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
