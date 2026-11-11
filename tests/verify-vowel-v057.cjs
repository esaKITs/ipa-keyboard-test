'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert').strict;
(async()=>{
 const browser=await chromium.launch({headless:true});
 const saveDir='audit-output/v057';fs.mkdirSync(saveDir,{recursive:true});
 const data=[];
 for(const width of [390,1280])for(const size of [32,48]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('vowel-release-v0.2.57/index.html'),{waitUntil:'load'});
  const state=await page.evaluate(async s=>{
    const input=document.getElementById('vowelFontSize');input.value=s;input.dispatchEvent(new Event('input',{bubbles:true}));
    if(document.fonts)await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(requestAnimationFrame(r)))));
    const svg=document.querySelector('#vowelQuadrilateral svg');
    const glyphs=[...svg.querySelectorAll('.vowel-dynamic-glyph')];
    const lines=[...svg.querySelectorAll('path.official-vowel-rule')].map(p=>({id:p.dataset.officialDrawing||'front',d:p.getAttribute('d')}));
    const placed=glyphs.map((el,i)=>{
       const fs=Number.parseFloat(getComputedStyle(el).fontSize);
       const x=Number(el.getAttribute('x'))+Number(el.getAttribute('dx')||0),
             y=Number(el.getAttribute('y'))+Number(el.getAttribute('dy')||0);
       return {char:el.textContent,polygon:window.__ipaDoulosHulls[i].polygon.map(([px,py])=>[x+px*fs,y+py*fs])};
    });
    return {lines,placed,fontSize:s,fontLoaded:document.fonts.check(s+'px "Doulos SIL Local"'),glyphCount:glyphs.length,
       dotCount:svg.querySelectorAll('.vowel-dots circle').length,maskActive:svg.querySelector('.vowel-lines').hasAttribute('mask'),
       audit:window.__ipaGlyphClipAudit,svgViewBox:svg.getAttribute('viewBox')};
  },size);
  assert.deepEqual(errors,[]);
  assert.equal(state.glyphCount,28);assert.equal(state.dotCount,11);assert.equal(state.lines.length,7);
  assert.equal(state.maskActive,false);assert.equal(state.fontLoaded,true);
  assert.equal(state.audit.polygonCount,28);
  const bad=state.lines.filter(x=>!x.d);assert.deepEqual(bad,[],'empty rule path');
  // Recover originals to prove fixed semantic subpath coordinates are not overwritten.
  if(size===32&&width===390)await page.locator('#vowelQuadrilateral svg').screenshot({path:saveDir+'/chart32.png'});
  if(size===48&&width===390)await page.locator('#vowelQuadrilateral svg').screenshot({path:saveDir+'/chart48.png'});
  data.push({width,...state});
  await page.close();
 }
 await browser.close();
 const base=data.filter(x=>x.width===390);
 for(const x of base){
  const large=data.find(y=>y.width===1280&&y.fontSize===x.fontSize);
  assert.deepEqual(x.lines,large.lines,'Viewport-sensitive SVG paths');
 }
 fs.writeFileSync(saveDir+'/geometry.json',JSON.stringify(data,null,2));
 console.log('V057_BROWSER_PASS '+JSON.stringify(base.map(x=>({fontSize:x.fontSize,fontLoaded:x.fontLoaded,lines:x.lines,glyphs:x.glyphCount,dots:x.dotCount,maskActive:x.maskActive}))));
})().catch(e=>{console.error(e);process.exitCode=1});
