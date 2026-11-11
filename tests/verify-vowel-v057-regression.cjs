'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const html=fs.readFileSync('vowel-release-v0.2.57/index.html','utf8');
const source=fs.readFileSync('vowel-release-v0.2.55/index.html','utf8');
const take=(s,regexp)=>[...s.matchAll(regexp)].map(m=>m[0]);
for(const re of [/<circle cx="[^"]+" cy="[^"]+" r="[^"]+"\/>/g,/<text class="vowel-dynamic-glyph"[^>]*>[^<]+<\/text>/g]){
 assert.deepEqual(take(html,re),take(source,re),'A baseline glyph/dot was modified');
}
const approved=take(source,/<path class="official-vowel-rule[^>]+\/>/g);
assert.equal(approved.length,7);assert.deepEqual(take(html,/<path class="official-vowel-rule[^>]+\/>/g),approved);
assert(!html.includes('<g class="vowel-lines" mask='));
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',x=>errors.push(x.message));
  await page.goto('file://'+path.resolve('vowel-release-v0.2.57/index.html'),{waitUntil:'load'});
  const sample=await page.evaluate(async()=>{
    const f=document.getElementById('vowelFontSize');
    const svg=document.querySelector('#vowelQuadrilateral svg');
    async function get(size){
      f.value=size;f.dispatchEvent(new Event('input',{bubbles:true}));
      await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      return [...svg.querySelectorAll('path.official-vowel-rule')].map(x=>({id:x.dataset.officialDrawing||'front',d:x.getAttribute('d')}));
    }
    return {a:await get(32),b:await get(48),c:await get(32)};
  });
  assert.deepEqual(sample.a,sample.c,'line geometries drift when font returns to 32');
  assert.notDeepEqual(sample.a,sample.b,'font size change did not trigger recalc');
  const ids=sample.b.map(x=>x.id);
  assert.deepEqual(ids,['front','40','36','37','38','39','98']);
  assert.deepEqual(errors,[]);
  console.log('V057_RESIZE_RETURN_PASS',width);
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
