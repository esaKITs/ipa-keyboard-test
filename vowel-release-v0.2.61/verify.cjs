const {chromium,webkit}=require('playwright'); const fs=require('fs'),path=require('path'),assert=require('assert').strict;
(async()=>{
 const out='audit-output/v061';fs.mkdirSync(out,{recursive:true});
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});
  for(const width of [390,1280]){
   const p=await browser.newPage({viewport:{width,height:950},deviceScaleFactor:1});
   const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto('file://'+path.resolve('vowel-release-v0.2.61/index.html'));
   await p.evaluate(()=>document.fonts.ready);
   const data=await p.evaluate(()=>{
    const table=document.querySelector('#pulmonicConsonants'), css=e=>getComputedStyle(e), rect=e=>e.getBoundingClientRect();
    const cells=[...table.querySelectorAll('tbody td')],heads=[...table.querySelectorAll('thead th')];
    const gray=[...table.querySelectorAll('tbody td.impossible,tbody td:has(span.impossible)')];
    const grayDetails=gray.map(td=>{
      const span=td.querySelector('span.impossible'),tr=rect(td),sr=span&&rect(span);
      return {tag:span?'span':'cell',bottomGap:span?tr.bottom-sr.bottom:0,topGap:span?sr.top-tr.top:0,outerHeight:tr.height,spanHeight:sr?.height||0}
    });
    const glyphs=[...table.querySelectorAll('tbody td > span')];
    const data={version:document.querySelector('#appVersion')?.textContent,headingTop:[...new Set(heads.map(x=>css(x).paddingTop))],headingBottom:[...new Set(heads.map(x=>css(x).paddingBottom))],
      cellBottom:[...new Set(cells.map(x=>css(x).paddingBottom))],glyphBottom:[...new Set(glyphs.map(x=>css(x).paddingBottom))],
      grayCount:gray.length,grayDetails,characters:glyphs.length,
      headingBoxes:heads.map(x=>({height:rect(x).height,scrollHeight:x.scrollHeight,clientHeight:x.clientHeight})),
      tableWidth:rect(table).width};
    return data;
   });
   assert.equal(data.version,'0.2.61');
   assert.deepEqual(data.headingTop,['4px']);assert.deepEqual(data.headingBottom,['4px']);
   assert.deepEqual(data.cellBottom,['0px']);assert.deepEqual(data.glyphBottom,['3px']);
   assert(data.grayCount>0);assert(data.characters>50);
   assert.deepEqual(errors,[]);
   fs.writeFileSync(`${out}/${name}-${width}.json`,JSON.stringify(data,null,2));
   await p.locator('#pulmonicConsonants').screenshot({path:`${out}/${name}-${width}-pulmonic.png`});
   const tooShort=data.grayDetails.filter(x=>x.tag==='span' && x.bottomGap>2.2);
   if(tooShort.length)throw new Error(`${name} ${width}: gray span misses bottom by ${tooShort.map(x=>x.bottomGap.toFixed(2)).join(',')}px`);
   console.log('PASS',name,width,'gray',data.grayCount,'glyph',data.characters);
   await p.close();
  }
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
