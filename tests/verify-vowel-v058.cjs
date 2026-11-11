const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 fs.mkdirSync('audit-output/v058',{recursive:true});
 const records=[];
 for(const [engine,browserType] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await browserType.launch({headless:true});
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve('vowel-release-v0.2.58/index.html'),{waitUntil:'load'});
   for(const size of [32,48,32]){
    const result=await page.evaluate(async s=>{
      const field=document.getElementById('vowelFontSize');
      field.value=s;field.dispatchEvent(new Event('input',{bubbles:true}));
      await document.fonts.ready;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const svg=document.querySelector('#vowelQuadrilateral svg');
      return {size:s,font:document.fonts.check(s+'px "Doulos SIL Local"'),
        glyphCount:svg.querySelectorAll('.vowel-dynamic-glyph').length,
        dots:svg.querySelectorAll('.vowel-dots circle').length,
        lines:[...svg.querySelectorAll('path.official-vowel-rule')].map(x=>({id:x.dataset.officialDrawing||'front',d:x.getAttribute('d')})),
        audit:window.__ipaLineAudit,mask:svg.querySelector('.vowel-lines').hasAttribute('mask')
      };
    },size);
    assert.equal(result.font,true);assert.equal(result.glyphCount,28);
    assert.equal(result.dots,11);assert.equal(result.lines.length,7);
    assert.equal(result.mask,false);
    assert.equal(result.audit.glyphs.length,28);
    assert.equal(result.audit.rules.length,7);
    assert(result.lines.every(x=>x.d.includes(' L')));
    if(result.lines.length>1)assert(result.lines.find(x=>x.id==='40').d.match(/M/g).length>=2);
    records.push({engine,width,...result});
    if(width===390&&size===48)await page.locator('#vowelQuadrilateral svg').screenshot({path:'audit-output/v058/'+engine.toLowerCase()+'-48.png'});
   }
   assert.deepEqual(records.at(-1).lines,records.at(-3).lines,'Geometry does not reset after 32->48->32');
   assert.deepEqual(errors,[],'Unexpected page errors');
   await page.close();
  }
  await browser.close();
 }
 fs.writeFileSync('audit-output/v058/geometry.json',JSON.stringify(records,null,2));
 console.log('V058_BROWSER_PASS '+JSON.stringify(records.map(r=>({engine:r.engine,width:r.width,size:r.size,clearance:r.audit.clearance,rules:r.lines.map(x=>x.id)}))));
})().catch(e=>{console.error(e);process.exitCode=1});
