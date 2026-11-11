'use strict';
const {webkit}=require('playwright'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
const browser=await webkit.launch({headless:true});
for(const width of [390,1280]){
const page=await browser.newPage({viewport:{width,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+path.resolve('vowel-release-v0.2.57/index.html'),{waitUntil:'load'});
for(const size of [32,48,32]){
 const result=await page.evaluate(async size=>{
  const input=document.getElementById('vowelFontSize');input.value=size;input.dispatchEvent(new Event('input',{bubbles:true}));
  await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const svg=document.querySelector('#vowelQuadrilateral svg');
  const rules=[...svg.querySelectorAll('path.official-vowel-rule')].map(p=>({id:p.dataset.officialDrawing||'front',d:p.getAttribute('d')}));
  return {size,loaded:document.fonts.check(size+'px "Doulos SIL Local"'),rules,glyphs:svg.querySelectorAll('.vowel-dynamic-glyph').length,dots:svg.querySelectorAll('.vowel-dots circle').length,
  clip:window.__ipaGlyphClipAudit,view:svg.getAttribute('viewBox')};
 },size);
 assert.equal(result.loaded,true);
 assert.equal(result.glyphs,28);assert.equal(result.dots,11);assert.equal(result.rules.length,7);
 assert(result.rules.every(x=>x.d?.includes(' L')));assert.equal(result.clip.polygonCount,28);
 // The original right vertical must not be erased at any size.
 const right=result.rules.find(x=>x.id==='98').d;
 assert.match(right,/M450\.652 260\.540 L450\.652 26\.844/);
 // Central diagonal must avoid the schwa and be computed as multiple subpaths.
 const center=result.rules.find(x=>x.id==='40').d;
 assert(center.split('M').length>=3,'schwa intersection was not subtracted in WebKit');
 console.log('WEBKIT_PASS '+JSON.stringify({width,size,glyphs:result.glyphs,dots:result.dots,centerDiagonal:center,rightVertical:right}));
}
assert.deepEqual(errors,[]);
await page.close();
}
await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
